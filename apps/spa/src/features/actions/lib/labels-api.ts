import type { GitHubLabel } from "@/types";
import { GitHubApiError } from "@/types";
import { githubFetch } from "@/shared/lib/github-client";

const REPO_NAME = "ato-datastore";

function repoPath(login: string): string {
  return `/repos/${login}/${REPO_NAME}`;
}

export async function fetchLabels(login: string): Promise<readonly GitHubLabel[]> {
  const response = await githubFetch(`${repoPath(login)}/labels?per_page=100&sort=name`);

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  return response.json();
}
