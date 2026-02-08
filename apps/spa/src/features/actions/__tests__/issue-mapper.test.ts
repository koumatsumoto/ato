import { describe, it, expect } from "vitest";
import { mapIssueToAction } from "@/features/actions/lib/issue-mapper";
import type { GitHubIssue } from "@/types";

describe("mapIssueToAction", () => {
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

  it("maps a GitHub Issue to an Action", () => {
    const action = mapIssueToAction(baseIssue);

    expect(action).toEqual({
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
    const action = mapIssueToAction(issue);

    expect(action.body).toBe("");
  });

  it("maps closed issue correctly", () => {
    const issue: GitHubIssue = {
      ...baseIssue,
      state: "closed",
      closed_at: "2026-01-03T00:00:00Z",
    };
    const action = mapIssueToAction(issue);

    expect(action.state).toBe("closed");
    expect(action.closedAt).toBe("2026-01-03T00:00:00Z");
  });
});
