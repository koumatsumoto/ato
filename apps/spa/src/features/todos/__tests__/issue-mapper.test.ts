import { describe, it, expect } from "vitest";
import { mapIssueToTodo } from "@/features/todos/lib/issue-mapper";
import type { GitHubIssue } from "@/types";

describe("mapIssueToTodo", () => {
  const baseIssue: GitHubIssue = {
    number: 42,
    title: "Buy groceries",
    body: "Milk, eggs, bread",
    state: "open",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    closed_at: null,
    html_url: "https://github.com/user/repo/issues/42",
  };

  it("maps a GitHub Issue to a Todo", () => {
    const todo = mapIssueToTodo(baseIssue);

    expect(todo).toEqual({
      id: 42,
      title: "Buy groceries",
      body: "Milk, eggs, bread",
      state: "open",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      closedAt: null,
      url: "https://github.com/user/repo/issues/42",
    });
  });

  it("converts null body to empty string", () => {
    const issue: GitHubIssue = { ...baseIssue, body: null };
    const todo = mapIssueToTodo(issue);

    expect(todo.body).toBe("");
  });

  it("maps closed issue correctly", () => {
    const issue: GitHubIssue = {
      ...baseIssue,
      state: "closed",
      closed_at: "2026-01-03T00:00:00Z",
    };
    const todo = mapIssueToTodo(issue);

    expect(todo.state).toBe("closed");
    expect(todo.closedAt).toBe("2026-01-03T00:00:00Z");
  });
});
