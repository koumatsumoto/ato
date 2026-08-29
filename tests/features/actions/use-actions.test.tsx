import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "@koumatsumoto/gh-auth-bridge-client/react";
import { useOpenActions, useAction, useCloseAction, useReopenAction, useUpdateAction } from "@/features/actions/hooks/use-actions";
import { useCreateAction } from "@/features/actions/hooks/use-create-action";
import { makeIssue } from "../../factories";
import { createWrapper, setupAuthenticatedUser, mockFetchResponses } from "../../test-utils";

const userResponse = { login: "testuser", id: 1, avatar_url: "https://example.com/avatar" };

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
    it("checks repository readiness before creating when no list has been fetched", async () => {
      setupAuthenticatedUser();
      localStorage.removeItem("ato:repo-initialized");
      const created = makeIssue({ number: 10, title: "Direct create" });
      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: {} }, { body: created, status: 201 });

      const { result } = renderHook(() => ({ auth: useAuth(), create: useCreateAction() }), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.auth.state.user?.login).toBe("testuser");
      });

      act(() => {
        result.current.create.mutate({ title: "Direct create" });
      });

      await waitFor(() => {
        expect(result.current.create.isSuccess).toBe(true);
      });
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/repos/testuser/ato-datastore");
      expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/repos/testuser/ato-datastore/issues");
    });

    it("does not create an issue when repository readiness fails", async () => {
      setupAuthenticatedUser();
      localStorage.removeItem("ato:repo-initialized");
      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: { message: "Not Found" }, status: 404 });

      const { result } = renderHook(() => ({ auth: useAuth(), create: useCreateAction() }), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(result.current.auth.state.user?.login).toBe("testuser");
      });
      act(() => {
        result.current.create.mutate({ title: "Keep as draft" });
      });

      await waitFor(() => {
        expect(result.current.create.isError).toBe(true);
      });
      expect(result.current.create.error?.name).toBe("RepoNotConfiguredError");
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("keeps the created action visible even when the server list lags behind the write", async () => {
      // GitHub's issue-list endpoint is eventually consistent: a refetch right
      // after creation may not include the new issue yet. The optimistic item is
      // reconciled from the authoritative POST response and must not disappear,
      // even if a subsequent list fetch would omit it.
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1, title: "Existing" })];
      const created = makeIssue({ number: 10, title: "New action" });
      const laggingList = [makeIssue({ number: 1, title: "Existing" })]; // #10 not indexed yet

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues }, { body: created, status: 201 }, { body: laggingList });

      const wrapper = createWrapper();
      const { result: actionsResult } = renderHook(() => useOpenActions(), { wrapper });

      await waitFor(() => {
        expect(actionsResult.current.data?.actions).toHaveLength(1);
      });

      const { result: createResult } = renderHook(() => useCreateAction(), { wrapper });

      act(() => {
        createResult.current.mutate({ title: "New action" });
      });

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });

      // The created item is reconciled to its real positive ID and stays in place.
      await waitFor(() => {
        const actions = actionsResult.current.data?.actions ?? [];
        expect(actions).toHaveLength(2);
        expect(actions.find((a) => a.id === 10)?.title).toBe("New action");
        expect(actions.every((a) => a.id > 0)).toBe(true);
      });
    });

    it("rolls back optimistic update on mutation error", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1, title: "Existing" })];
      const refreshedIssues = [makeIssue({ number: 1, title: "Existing" })];

      globalThis.fetch = mockFetchResponses(
        { body: userResponse },
        { body: issues },
        { body: { message: "Server error" }, status: 500 },
        { body: refreshedIssues },
      );

      const wrapper = createWrapper();
      const { result: actionsResult } = renderHook(() => useOpenActions(), { wrapper });

      await waitFor(() => {
        expect(actionsResult.current.data).toBeDefined();
      });

      const { result: createResult } = renderHook(() => useCreateAction(), { wrapper });

      act(() => {
        createResult.current.mutate({ title: "Will fail" });
      });

      await waitFor(() => {
        expect(createResult.current.isError).toBe(true);
      });

      // After error rollback + server refetch, only original item exists
      await waitFor(() => {
        const actions = actionsResult.current.data?.actions ?? [];
        expect(actions).toHaveLength(1);
        expect(actions[0]?.id).toBe(1);
      });
    });
  });

  describe("useCloseAction", () => {
    it("keeps a closed action removed even when the server list still reports it open", async () => {
      // The optimistic removal is authoritative for the open list; GitHub's list
      // endpoint lags writes and may still report the just-closed item as open, so
      // the open list must not be refetched-and-resurrected on close.
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2 })];
      const closed = makeIssue({ number: 1, state: "closed", closed_at: "2026-01-02T00:00:00Z" });
      const laggingList = [makeIssue({ number: 1 }), makeIssue({ number: 2 })]; // #1 still reported open

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues }, { body: closed }, { body: laggingList });

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

      // The closed item stays removed and is not resurrected by a lagging refetch.
      const actions = actionsResult.current.data?.actions ?? [];
      expect(actions).toHaveLength(1);
      expect(actions.some((a) => a.id === 1)).toBe(false);
    });

    it("rolls back optimistic removal on close error", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2 })];
      const refreshedIssues = [makeIssue({ number: 1 }), makeIssue({ number: 2 })];

      globalThis.fetch = mockFetchResponses(
        { body: userResponse },
        { body: issues },
        { body: { message: "Server error" }, status: 500 },
        { body: refreshedIssues },
      );

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

      // Rolled back + server refetch: both items restored
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

    it("invalidates action caches and refetches on successful update", async () => {
      setupAuthenticatedUser();
      const issues = [makeIssue({ number: 5, title: "Original" })];
      const updated = makeIssue({ number: 5, title: "Updated" });
      const refreshedIssues = [makeIssue({ number: 5, title: "Updated" })];

      globalThis.fetch = mockFetchResponses({ body: userResponse }, { body: issues }, { body: updated }, { body: refreshedIssues });

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

      // After server refetch, title should be updated
      await waitFor(() => {
        const actions = actionsResult.current.data?.actions ?? [];
        expect(actions.find((a) => a.id === 5)?.title).toBe("Updated");
      });
    });
  });
});
