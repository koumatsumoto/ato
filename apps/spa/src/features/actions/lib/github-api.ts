import type { Action, CreateActionInput, UpdateActionInput, GitHubIssue } from "@/features/actions/types";
import { NotFoundError } from "@/shared/lib/errors";
import { githubFetch, throwIfNotOk } from "@/shared/lib/github-client";
import { mapIssueToAction } from "./issue-mapper";
import { parseLinkHeader } from "./pagination";
import { repoPath } from "./repo-constants";

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

  await throwIfNotOk(response);

  const issues = (await response.json()) as unknown as GitHubIssue[];
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
      body: input.memo,
      labels: input.labels,
    }),
  });

  await throwIfNotOk(response);

  return mapIssueToAction((await response.json()) as unknown as GitHubIssue);
}

export async function fetchAction(login: string, id: number): Promise<Action> {
  const response = await githubFetch(`${repoPath(login)}/issues/${String(id)}`);

  await throwIfNotOk(response);

  const issue = (await response.json()) as unknown as GitHubIssue;
  if (issue.pull_request) {
    throw new NotFoundError("Not an action item");
  }

  return mapIssueToAction(issue);
}

export async function updateAction(login: string, id: number, input: UpdateActionInput): Promise<Action> {
  const response = await githubFetch(`${repoPath(login)}/issues/${String(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.memo !== undefined && { body: input.memo }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.state_reason !== undefined && { state_reason: input.state_reason }),
      ...(input.labels !== undefined && { labels: input.labels }),
    }),
  });

  await throwIfNotOk(response);

  return mapIssueToAction((await response.json()) as unknown as GitHubIssue);
}

export async function closeAction(login: string, id: number): Promise<Action> {
  return updateAction(login, id, { state: "closed", state_reason: "completed" });
}

export async function reopenAction(login: string, id: number): Promise<Action> {
  return updateAction(login, id, { state: "open", state_reason: "reopened" });
}
