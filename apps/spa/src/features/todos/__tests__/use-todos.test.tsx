import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/features/auth/hooks/use-auth";
import { useOpenTodos, useTodo, useCreateTodo, useCloseTodo, useReopenTodo, useUpdateTodo } from "@/features/todos/hooks/use-todos";
import type { GitHubIssue } from "@/types";

function makeIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 1,
    title: "Test todo",
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

describe("use-todos hooks", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("useOpenTodos", () => {
    it("fetches open todos when user is authenticated", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2 })];

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues });

      const { result } = renderHook(() => useOpenTodos(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.todos).toHaveLength(2);
    });
  });

  describe("useTodo", () => {
    it("fetches a single todo", async () => {
      setupAuthenticatedUser();
      const issue = makeIssue({ number: 5, title: "Specific todo" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issue });

      const { result } = renderHook(() => useTodo(5), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.title).toBe("Specific todo");
    });
  });

  describe("useCreateTodo", () => {
    it("creates a todo with optimistic update", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1, title: "Existing" })];
      const created = makeIssue({ number: 10, title: "New todo" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues }, { body: created, status: 201 });

      const wrapper = createWrapper();
      const { result: todosResult } = renderHook(() => useOpenTodos(), { wrapper });

      await waitFor(() => {
        expect(todosResult.current.data).toBeDefined();
      });

      const { result: createResult } = renderHook(() => useCreateTodo(), { wrapper });

      act(() => {
        createResult.current.mutate({ title: "New todo" });
      });

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });
    });
  });

  describe("useCloseTodo", () => {
    it("closes a todo", async () => {
      setupAuthenticatedUser();
      const closed = makeIssue({ number: 1, state: "closed" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: [makeIssue({ number: 1 })] }, { body: closed });

      const wrapper = createWrapper();
      const { result: todosResult } = renderHook(() => useOpenTodos(), { wrapper });

      await waitFor(() => {
        expect(todosResult.current.data).toBeDefined();
      });

      const { result: closeResult } = renderHook(() => useCloseTodo(), { wrapper });

      act(() => {
        closeResult.current.mutate(1);
      });

      await waitFor(() => {
        expect(closeResult.current.isSuccess).toBe(true);
      });
    });
  });

  describe("useReopenTodo", () => {
    it("reopens a todo", async () => {
      setupAuthenticatedUser();
      const reopened = makeIssue({ number: 1, state: "open" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: reopened });

      const wrapper = createWrapper();
      // Wait for auth to load by rendering useAuth
      const { result: authResult } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(authResult.current.state.user).not.toBeNull();
      });

      const { result } = renderHook(() => useReopenTodo(), { wrapper });

      act(() => {
        result.current.mutate(1);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe("useUpdateTodo", () => {
    it("updates a todo", async () => {
      setupAuthenticatedUser();
      const updated = makeIssue({ number: 5, title: "Updated" });

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: updated });

      const wrapper = createWrapper();
      const { result: authResult } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(authResult.current.state.user).not.toBeNull();
      });

      const { result } = renderHook(() => useUpdateTodo(), { wrapper });

      act(() => {
        result.current.mutate({ id: 5, title: "Updated" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});
