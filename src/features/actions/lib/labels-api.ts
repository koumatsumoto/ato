import type { GitHubLabel } from "@/features/actions/types";
import { githubFetch, throwIfNotOk } from "@koumatsumoto/gh-auth-bridge-client";
import { repoPath } from "./repo-constants";

export async function fetchLabels(login: string): Promise<readonly GitHubLabel[]> {
  const response = await githubFetch(`${repoPath(login)}/labels?per_page=100&sort=name`);

  await throwIfNotOk(response);

  return (await response.json()) as unknown as readonly GitHubLabel[];
}
