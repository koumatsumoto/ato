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
    return import("@/features/todos/lib/github-api");
  }

  describe("fetchTodos", () => {
    it("fetches open todos and filters out pull requests", async () => {
      const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2, pull_request: {} }), makeIssue({ number: 3 })];

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(issues), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const { fetchTodos } = await loadApi();
      const result = await fetchTodos("testuser", { state: "open" });

      expect(result.todos).toHaveLength(2);
      expect(result.todos[0]!.id).toBe(1);
      expect(result.todos[1]!.id).toBe(3);
    });

    it("parses pagination from Link header", async () => {
      const linkHeader = '<https://api.github.com/repos/testuser/ato-datastore/issues?page=2>; rel="next"';

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([makeIssue()]), {
          status: 200,
          headers: { Link: linkHeader },
        }),
      );

      const { fetchTodos } = await loadApi();
      const result = await fetchTodos("testuser", { state: "open" });

      expect(result.hasNextPage).toBe(true);
      expect(result.nextPage).toBe(2);
    });

    it("throws GitHubApiError on non-ok response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('{"message":"Not Found"}', { status: 404 }));

      const { fetchTodos } = await loadApi();
      await expect(fetchTodos("testuser", { state: "open" })).rejects.toThrow(GitHubApiError);
    });
  });

  describe("createTodo", () => {
    it("creates a todo and returns mapped result", async () => {
      const created = makeIssue({ number: 10, title: "New todo" });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(created), { status: 201 }));

      const { createTodo } = await loadApi();
      const todo = await createTodo("testuser", { title: "New todo" });

      expect(todo.id).toBe(10);
      expect(todo.title).toBe("New todo");
    });

    it("throws GitHubApiError on failure", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('{"message":"Validation Failed"}', { status: 422 }));

      const { createTodo } = await loadApi();
      await expect(createTodo("testuser", { title: "" })).rejects.toThrow(GitHubApiError);
    });
  });

  describe("fetchTodo", () => {
    it("fetches a single todo", async () => {
      const issue = makeIssue({ number: 5, title: "Specific todo" });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(issue), { status: 200 }));

      const { fetchTodo } = await loadApi();
      const todo = await fetchTodo("testuser", 5);

      expect(todo.id).toBe(5);
      expect(todo.title).toBe("Specific todo");
    });

    it("throws NotFoundError if item is a pull request", async () => {
      const issue = makeIssue({ number: 5, pull_request: {} });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(issue), { status: 200 }));

      const { fetchTodo } = await loadApi();
      await expect(fetchTodo("testuser", 5)).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateTodo", () => {
    it("updates and returns mapped todo", async () => {
      const updated = makeIssue({ number: 5, title: "Updated title" });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(updated), { status: 200 }));

      const { updateTodo } = await loadApi();
      const todo = await updateTodo("testuser", 5, { title: "Updated title" });

      expect(todo.title).toBe("Updated title");
    });
  });

  describe("closeTodo", () => {
    it("closes a todo with state=closed and state_reason=completed", async () => {
      const closed = makeIssue({ number: 5, state: "closed", closed_at: "2026-01-02T00:00:00Z" });
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(closed), { status: 200 }));
      globalThis.fetch = mockFetch;

      const { closeTodo } = await loadApi();
      const todo = await closeTodo("testuser", 5);

      expect(todo.state).toBe("closed");
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.state).toBe("closed");
      expect(body.state_reason).toBe("completed");
    });
  });

  describe("reopenTodo", () => {
    it("reopens a todo with state=open and state_reason=reopened", async () => {
      const reopened = makeIssue({ number: 5, state: "open" });
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(reopened), { status: 200 }));
      globalThis.fetch = mockFetch;

      const { reopenTodo } = await loadApi();
      const todo = await reopenTodo("testuser", 5);

      expect(todo.state).toBe("open");
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.state).toBe("open");
      expect(body.state_reason).toBe("reopened");
    });
  });
});
