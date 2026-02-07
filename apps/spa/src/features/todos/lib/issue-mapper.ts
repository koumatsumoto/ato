import type { GitHubIssue, Todo } from "@/types";

export function mapIssueToTodo(issue: GitHubIssue): Todo {
  return {
    id: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    state: issue.state as "open" | "closed",
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at,
    url: issue.html_url,
  };
}
