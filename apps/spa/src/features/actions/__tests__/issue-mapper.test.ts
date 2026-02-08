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
      labels: [],
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

  it("maps issue with labels to action with label names", () => {
    const issue: GitHubIssue = {
      ...baseIssue,
      labels: [
        { id: 1, name: "bug", color: "d73a4a", description: null },
        { id: 2, name: "urgent", color: "e4e669", description: "Urgent issue" },
      ],
    };
    const action = mapIssueToAction(issue);

    expect(action.labels).toEqual(["bug", "urgent"]);
  });

  it("maps issue without labels field to action with empty labels array", () => {
    const action = mapIssueToAction(baseIssue);

    expect(action.labels).toEqual([]);
  });

  it("maps issue with empty labels array to action with empty labels array", () => {
    const issue: GitHubIssue = { ...baseIssue, labels: [] };
    const action = mapIssueToAction(issue);

    expect(action.labels).toEqual([]);
  });

  it("preserves label order", () => {
    const issue: GitHubIssue = {
      ...baseIssue,
      labels: [
        { id: 3, name: "zzz", color: "000000", description: null },
        { id: 1, name: "aaa", color: "000000", description: null },
        { id: 2, name: "mmm", color: "000000", description: null },
      ],
    };
    const action = mapIssueToAction(issue);

    expect(action.labels).toEqual(["zzz", "aaa", "mmm"]);
  });
});
