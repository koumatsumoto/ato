import type { GitHubIssue, Action } from "@/features/actions/types";

export function mapIssueToAction(issue: GitHubIssue): Action {
  return {
    id: issue.number,
    title: issue.title,
    memo: issue.body ?? "",
    state: issue.state as "open" | "closed",
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at,
    url: issue.html_url,
    labels: (issue.labels ?? []).map((label) => label.name),
  };
}
