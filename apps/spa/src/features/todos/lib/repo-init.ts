import { GitHubApiError, RepoCreationError } from "@/types";
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

  const createRes = await githubFetch("/user/repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "ato-datastore",
      private: true,
      description: "Data store for ATO app",
      auto_init: true,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
    }),
  });

  if (createRes.ok || createRes.status === 422) {
    localStorage.setItem(REPO_INITIALIZED_KEY, "true");
    return;
  }

  throw new RepoCreationError("Failed to create ato-datastore repository");
}
