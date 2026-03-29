import type { Action, GitHubSearchResult } from "@/features/actions/types";
import { githubFetch, throwIfNotOk } from "@/shared/lib/github-client";
import { mapIssueToAction } from "./issue-mapper";
import { REPO_NAME } from "./repo-constants";

export async function searchActions(
  login: string,
  params: { readonly query: string; readonly includeCompleted: boolean; readonly label?: string },
): Promise<readonly Action[]> {
  const qualifiers = [`repo:${login}/${REPO_NAME}`, "is:issue"];
  if (params.query) {
    qualifiers.push(params.query);
  }
  if (params.label) {
    const sanitizedLabel = params.label.replaceAll('"', "");
    qualifiers.push(`label:"${sanitizedLabel}"`);
  }
  if (params.includeCompleted) {
    qualifiers.push("state:closed");
  } else {
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

  await throwIfNotOk(response);

  const result = (await response.json()) as unknown as GitHubSearchResult;
  return result.items.filter((issue) => !issue.pull_request).map(mapIssueToAction);
}
