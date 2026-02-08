import { GitHubApiError, RepoNotConfiguredError } from "@/shared/lib/errors";
import { githubFetch } from "@/shared/lib/github-client";

const REPO_INITIALIZED_KEY = "ato:repo-initialized";

export async function ensureRepository(login: string): Promise<void> {
  if (localStorage.getItem(REPO_INITIALIZED_KEY) === "true") {
    return;
  }

  const checkRes = await githubFetch(`/repos/${login}/ato-datastore`);
  if (checkRes.ok) {
    localStorage.setItem(REPO_INITIALIZED_KEY, "true");
    return;
  }

  if (checkRes.status !== 404) {
    throw new GitHubApiError(checkRes.status, await checkRes.json());
  }

  throw new RepoNotConfiguredError();
}
