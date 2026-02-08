import type { Action, GitHubSearchResult } from "@/types";
import { GitHubApiError } from "@/types";
import { githubFetch } from "@/shared/lib/github-client";
import { mapIssueToAction } from "./issue-mapper";

const REPO_NAME = "ato-datastore";

export async function searchActions(
  login: string,
  params: { readonly query: string; readonly includeCompleted: boolean },
): Promise<readonly Action[]> {
  const qualifiers = [`repo:${login}/${REPO_NAME}`, "is:issue", params.query];
  if (!params.includeCompleted) {
    qualifiers.push("state:open");
  }

  const q = qualifiers.join(" ");
  const searchParams = new URLSearchParams({
    q,
    sort: "updated",
    order: "desc",
    per_page: "30",
  });

  const response = await githubFetch(`/search/issues?${searchParams}`);

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  const result: GitHubSearchResult = await response.json();
  return result.items.filter((issue) => !issue.pull_request).map(mapIssueToAction);
}
