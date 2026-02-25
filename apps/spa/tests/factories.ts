import type { Action, GitHubIssue, GitHubLabel } from "@/features/actions/types";

export function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: 1,
    title: "Test action",
    memo: "",
    state: "open",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    closedAt: null,
    url: "https://github.com/user/ato-datastore/issues/1",
    labels: [],
    ...overrides,
  };
}

export function makeIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
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

export function makeGitHubLabel(overrides: Partial<GitHubLabel> = {}): GitHubLabel {
  return {
    id: 1,
    name: "bug",
    color: "d73a4a",
    description: null,
    ...overrides,
  };
}
