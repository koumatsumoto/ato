import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/features/auth/hooks/use-auth";
import { useOpenActions, useAction, useCreateAction, useCloseAction, useReopenAction, useUpdateAction } from "@/features/actions/hooks/use-actions";
import type { GitHubIssue } from "@/features/actions/types";

function makeIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 1,
    title: "Test action",
    body: "Test body",
    state: "open",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    closed_at: null,
    html_url: "https://github.com/user/ato-datastore/issues/1",
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

function setupAuthenticatedUser() {
  localStorage.setItem("ato:token", "test-token");
  localStorage.setItem("ato:repo-initialized", "true");
}

const userResponse = { login: "testuser", id: 1, avatar_url: "https://example.com/avatar" };

function mockFetchResponses(...responses: Array<{ body: unknown; status?: number; headers?: Record<string, string> }>) {
  const fn = vi.fn();
  for (const { body, status = 200, headers = {} } of responses) {
    fn.mockResolvedValueOnce(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...headers },
      }),
    );
  }
  // Default: keep returning empty arrays for invalidation queries
  fn.mockResolvedValue(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }));
  return fn;
}

describe("use-actions hooks", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("useOpenActions", () => {
    it("fetches open actions when user is authenticated", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2 })];

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues });

      const { result } = renderHook(() => useOpenActions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.actions).toHaveLength(2);
    });
  });

  describe("useAction", () => {
    it("fetches a single action", async () => {
      setupAuthenticatedUser();
      const issue = makeIssue({ number: 5, title: "Specific action" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issue });

      const { result } = renderHook(() => useAction(5), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.title).toBe("Specific action");
    });
  });

  describe("useCreateAction", () => {
    it("creates an action with optimistic update and replaces temp ID with real ID", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1, title: "Existing" })];
      const created = makeIssue({ number: 10, title: "New action" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues }, { body: created, status: 201 });

      const wrapper = createWrapper();
      const { result: actionsResult } = renderHook(() => useOpenActions(), { wrapper });

      await waitFor(() => {
        expect(actionsResult.current.data).toBeDefined();
      });

      expect(actionsResult.current.data?.actions).toHaveLength(1);

      const { result: createResult } = renderHook(() => useCreateAction(), { wrapper });

      act(() => {
        createResult.current.mutate({ title: "New action" });
      });

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });

      // After mutation success: both items exist with real positive IDs (no refetch needed)
      const actions = actionsResult.current.data?.actions ?? [];
      expect(actions).toHaveLength(2);
      expect(actions.every((t) => t.id > 0)).toBe(true);
      expect(actions.find((t) => t.id === 10)).toBeDefined();
      expect(actions.find((t) => t.id === 1)).toBeDefined();
    });

    it("rolls back optimistic update on mutation error", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1, title: "Existing" })];

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues }, { body: { message: "Server error" }, status: 500 });

      const wrapper = createWrapper();
      const { result: actionsResult } = renderHook(() => useOpenActions(), { wrapper });

      await waitFor(() => {
        expect(actionsResult.current.data).toBeDefined();
      });

      const { result: createResult } = renderHook(() => useCreateAction(), { wrapper });

      act(() => {
        createResult.current.mutate({ title: "Will fail" });
      });

      // After error, rolled back to original single item
      await waitFor(() => {
        expect(createResult.current.isError).toBe(true);
      });

      await waitFor(() => {
        const actions = actionsResult.current.data?.actions ?? [];
        expect(actions).toHaveLength(1);
        expect(actions[0]?.id).toBe(1);
      });
    });
  });

  describe("useCloseAction", () => {
    it("closes an action with optimistic removal", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2 })];
      const closed = makeIssue({ number: 1, state: "closed", closed_at: "2026-01-02T00:00:00Z" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues }, { body: closed });

      const wrapper = createWrapper();
      const { result: actionsResult } = renderHook(() => useOpenActions(), { wrapper });

      await waitFor(() => {
        expect(actionsResult.current.data?.actions).toHaveLength(2);
      });

      const { result: closeResult } = renderHook(() => useCloseAction(), { wrapper });

      act(() => {
        closeResult.current.mutate(1);
      });

      // Optimistic removal: item disappears immediately
      await waitFor(() => {
        const actions = actionsResult.current.data?.actions ?? [];
        expect(actions).toHaveLength(1);
        expect(actions[0]?.id).toBe(2);
      });

      await waitFor(() => {
        expect(closeResult.current.isSuccess).toBe(true);
      });

      // Item remains removed from open list after mutation completes
      expect(actionsResult.current.data?.actions).toHaveLength(1);
    });

    it("rolls back optimistic removal on close error", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2 })];

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues }, { body: { message: "Server error" }, status: 500 });

      const wrapper = createWrapper();
      const { result: actionsResult } = renderHook(() => useOpenActions(), { wrapper });

      await waitFor(() => {
        expect(actionsResult.current.data?.actions).toHaveLength(2);
      });

      const { result: closeResult } = renderHook(() => useCloseAction(), { wrapper });

      act(() => {
        closeResult.current.mutate(1);
      });

      await waitFor(() => {
        expect(closeResult.current.isError).toBe(true);
      });

      // Rolled back: both items restored
      await waitFor(() => {
        expect(actionsResult.current.data?.actions).toHaveLength(2);
      });
    });
  });

  describe("useReopenAction", () => {
    it("reopens an action", async () => {
      setupAuthenticatedUser();
      const reopened = makeIssue({ number: 1, state: "open" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: reopened });

      const wrapper = createWrapper();
      // Wait for auth to load by rendering useAuth
      const { result: authResult } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(authResult.current.state.user).not.toBeNull();
      });

      const { result } = renderHook(() => useReopenAction(), { wrapper });

      act(() => {
        result.current.mutate(1);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe("useUpdateAction", () => {
    it("updates an action", async () => {
      setupAuthenticatedUser();
      const updated = makeIssue({ number: 5, title: "Updated" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: updated });

      const wrapper = createWrapper();
      const { result: authResult } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(authResult.current.state.user).not.toBeNull();
      });

      const { result } = renderHook(() => useUpdateAction(), { wrapper });

      act(() => {
        result.current.mutate({ id: 5, title: "Updated" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("updates the open actions list cache directly on success", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 5, title: "Original" })];
      const updated = makeIssue({ number: 5, title: "Updated" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues }, { body: updated });

      const wrapper = createWrapper();
      const { result: actionsResult } = renderHook(() => useOpenActions(), { wrapper });

      await waitFor(() => {
        expect(actionsResult.current.data).toBeDefined();
      });

      const { result } = renderHook(() => useUpdateAction(), { wrapper });

      act(() => {
        result.current.mutate({ id: 5, title: "Updated" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Open list cache should be updated directly without refetch
      const actions = actionsResult.current.data?.actions ?? [];
      expect(actions.find((a) => a.id === 5)?.title).toBe("Updated");
    });
  });
});
