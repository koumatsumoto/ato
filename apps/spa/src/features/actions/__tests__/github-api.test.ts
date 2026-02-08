import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubApiError, NotFoundError } from "@/types";
import type { GitHubIssue } from "@/types";

function makeIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 1,
    title: "Test issue",
    body: "Test body",
    state: "open",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    closed_at: null,
    html_url: "https://github.com/user/ato-datastore/issues/1",
    ...overrides,
  };
}

describe("github-api", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("ato:token", "test-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  async function loadApi() {
    return import("@/features/actions/lib/github-api");
  }

  describe("fetchActions", () => {
    it("fetches open actions and filters out pull requests", async () => {
      const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2, pull_request: {} }), makeIssue({ number: 3 })];

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(issues), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { fetchActions } = await loadApi();
      const result = await fetchActions("testuser", { state: "open" });

      expect(result.actions).toHaveLength(2);
      expect(result.actions[0]!.id).toBe(1);
      expect(result.actions[1]!.id).toBe(3);
    });

    it("parses pagination from Link header", async () => {
      const linkHeader = '<https://api.github.com/repos/testuser/ato-datastore/issues?page=2>; rel="next"';

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([makeIssue()]), {
          status: 200,
          headers: { Link: linkHeader },
        }),
      );

      const { fetchActions } = await loadApi();
      const result = await fetchActions("testuser", { state: "open" });

      expect(result.hasNextPage).toBe(true);
      expect(result.nextPage).toBe(2);
    });

    it("throws GitHubApiError on non-ok response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('{"message":"Not Found"}', { status: 404 }));

      const { fetchActions } = await loadApi();
      await expect(fetchActions("testuser", { state: "open" })).rejects.toThrow(GitHubApiError);
    });
  });

  describe("createAction", () => {
    it("creates an action and returns mapped result", async () => {
      const created = makeIssue({ number: 10, title: "New action" });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(created), { status: 201 }));

      const { createAction } = await loadApi();
      const action = await createAction("testuser", { title: "New action" });

      expect(action.id).toBe(10);
      expect(action.title).toBe("New action");
    });

    it("sends labels in request body when provided", async () => {
      const created = makeIssue({ number: 10, title: "New action" });
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(created), { status: 201 }));
      globalThis.fetch = mockFetch;

      const { createAction } = await loadApi();
      await createAction("testuser", { title: "New action", labels: ["bug", "urgent"] });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.labels).toEqual(["bug", "urgent"]);
    });

    it("throws GitHubApiError on failure", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('{"message":"Validation Failed"}', { status: 422 }));

      const { createAction } = await loadApi();
      await expect(createAction("testuser", { title: "" })).rejects.toThrow(GitHubApiError);
    });
  });

  describe("fetchAction", () => {
    it("fetches a single action", async () => {
      const issue = makeIssue({ number: 5, title: "Specific action" });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(issue), { status: 200 }));

      const { fetchAction } = await loadApi();
      const action = await fetchAction("testuser", 5);

      expect(action.id).toBe(5);
      expect(action.title).toBe("Specific action");
    });

    it("throws NotFoundError if item is a pull request", async () => {
      const issue = makeIssue({ number: 5, pull_request: {} });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(issue), { status: 200 }));

      const { fetchAction } = await loadApi();
      await expect(fetchAction("testuser", 5)).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateAction", () => {
    it("updates and returns mapped action", async () => {
      const updated = makeIssue({ number: 5, title: "Updated title" });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(updated), { status: 200 }));

      const { updateAction } = await loadApi();
      const action = await updateAction("testuser", 5, { title: "Updated title" });

      expect(action.title).toBe("Updated title");
    });
  });

  describe("closeAction", () => {
    it("closes an action with state=closed and state_reason=completed", async () => {
      const closed = makeIssue({ number: 5, state: "closed", closed_at: "2026-01-02T00:00:00Z" });
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(closed), { status: 200 }));
      globalThis.fetch = mockFetch;

      const { closeAction } = await loadApi();
      const action = await closeAction("testuser", 5);

      expect(action.state).toBe("closed");
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.state).toBe("closed");
      expect(body.state_reason).toBe("completed");
    });
  });

  describe("reopenAction", () => {
    it("reopens an action with state=open and state_reason=reopened", async () => {
      const reopened = makeIssue({ number: 5, state: "open" });
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(reopened), { status: 200 }));
      globalThis.fetch = mockFetch;

      const { reopenAction } = await loadApi();
      const action = await reopenAction("testuser", 5);

      expect(action.state).toBe("open");
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.state).toBe("open");
      expect(body.state_reason).toBe("reopened");
    });
  });
});
