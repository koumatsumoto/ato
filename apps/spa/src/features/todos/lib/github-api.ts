import type { Todo, CreateTodoInput, UpdateTodoInput, GitHubIssue } from "@/types";
import { GitHubApiError, NotFoundError } from "@/types";
import { githubFetch } from "@/shared/lib/github-client";
import { mapIssueToTodo } from "./issue-mapper";
import { parseLinkHeader } from "./pagination";

const REPO_NAME = "ato-datastore";

function repoPath(login: string): string {
  return `/repos/${login}/${REPO_NAME}`;
}

export interface FetchTodosResult {
  readonly todos: readonly Todo[];
  readonly hasNextPage: boolean;
  readonly nextPage: number | null;
}

export async function fetchTodos(
  login: string,
  params: {
    state?: "open" | "closed";
    perPage?: number;
    page?: number;
    sort?: "created" | "updated";
    direction?: "asc" | "desc";
  },
): Promise<FetchTodosResult> {
  const query = new URLSearchParams({
    state: params.state ?? "open",
    per_page: String(params.perPage ?? 30),
    page: String(params.page ?? 1),
    sort: params.sort ?? "updated",
    direction: params.direction ?? "desc",
  });

  const response = await githubFetch(`${repoPath(login)}/issues?${query}`);

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  const issues: GitHubIssue[] = await response.json();
  const todos = issues.filter((issue) => !issue.pull_request).map(mapIssueToTodo);

  const linkHeader = response.headers.get("Link");
  const { hasNextPage, nextPage } = parseLinkHeader(linkHeader);

  return { todos, hasNextPage, nextPage };
}

export async function createTodo(login: string, input: CreateTodoInput): Promise<Todo> {
  const response = await githubFetch(`${repoPath(login)}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
    }),
  });

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  return mapIssueToTodo(await response.json());
}

export async function fetchTodo(login: string, id: number): Promise<Todo> {
  const response = await githubFetch(`${repoPath(login)}/issues/${id}`);

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  const issue: GitHubIssue = await response.json();
  if (issue.pull_request) {
    throw new NotFoundError("Not a todo item");
  }

  return mapIssueToTodo(issue);
}

export async function updateTodo(login: string, id: number, input: UpdateTodoInput): Promise<Todo> {
  const response = await githubFetch(`${repoPath(login)}/issues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  return mapIssueToTodo(await response.json());
}

export async function closeTodo(login: string, id: number): Promise<Todo> {
  return updateTodo(login, id, { state: "closed", state_reason: "completed" });
}

export async function reopenTodo(login: string, id: number): Promise<Todo> {
  return updateTodo(login, id, { state: "open", state_reason: "reopened" });
}
