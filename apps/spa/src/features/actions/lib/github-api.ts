import type { Action, CreateActionInput, UpdateActionInput, GitHubIssue } from "@/types";
import { GitHubApiError, NotFoundError } from "@/types";
import { githubFetch } from "@/shared/lib/github-client";
import { mapIssueToAction } from "./issue-mapper";
import { parseLinkHeader } from "./pagination";

const REPO_NAME = "ato-datastore";

function repoPath(login: string): string {
  return `/repos/${login}/${REPO_NAME}`;
}

export interface FetchActionsResult {
  readonly actions: readonly Action[];
  readonly hasNextPage: boolean;
  readonly nextPage: number | null;
}

export async function fetchActions(
  login: string,
  params: {
    state?: "open" | "closed";
    perPage?: number;
    page?: number;
    sort?: "created" | "updated";
    direction?: "asc" | "desc";
  },
): Promise<FetchActionsResult> {
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
  const actions = issues.filter((issue) => !issue.pull_request).map(mapIssueToAction);

  const linkHeader = response.headers.get("Link");
  const { hasNextPage, nextPage } = parseLinkHeader(linkHeader);

  return { actions, hasNextPage, nextPage };
}

export async function createAction(login: string, input: CreateActionInput): Promise<Action> {
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

  return mapIssueToAction(await response.json());
}

export async function fetchAction(login: string, id: number): Promise<Action> {
  const response = await githubFetch(`${repoPath(login)}/issues/${id}`);

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  const issue: GitHubIssue = await response.json();
  if (issue.pull_request) {
    throw new NotFoundError("Not an action item");
  }

  return mapIssueToAction(issue);
}

export async function updateAction(login: string, id: number, input: UpdateActionInput): Promise<Action> {
  const response = await githubFetch(`${repoPath(login)}/issues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  return mapIssueToAction(await response.json());
}

export async function closeAction(login: string, id: number): Promise<Action> {
  return updateAction(login, id, { state: "closed", state_reason: "completed" });
}

export async function reopenAction(login: string, id: number): Promise<Action> {
  return updateAction(login, id, { state: "open", state_reason: "reopened" });
}
