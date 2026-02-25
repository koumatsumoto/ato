import type { GitHubLabel } from "@/features/actions/types";
import { GitHubApiError } from "@/shared/lib/errors";
import { githubFetch } from "@/shared/lib/github-client";
import { repoPath } from "./repo-constants";

export async function fetchLabels(login: string): Promise<readonly GitHubLabel[]> {
  const response = await githubFetch(`${repoPath(login)}/labels?per_page=100&sort=name`);

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  return response.json();
}
