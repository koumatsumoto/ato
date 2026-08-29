import { GitHubApiError, githubFetch } from "@koumatsumoto/gh-auth-bridge-client";
import { RepoNotConfiguredError } from "@/shared/lib/errors";
import { REPO_INITIALIZED_KEY } from "@/shared/lib/storage-keys";

const repositoryChecks = new Map<string, Promise<void>>();

async function checkRepository(login: string): Promise<void> {
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

export function ensureRepository(login: string): Promise<void> {
  if (localStorage.getItem(REPO_INITIALIZED_KEY) === "true") return Promise.resolve();

  const existingCheck = repositoryChecks.get(login);
  if (existingCheck) return existingCheck;

  const check = checkRepository(login).finally(() => {
    if (repositoryChecks.get(login) === check) repositoryChecks.delete(login);
  });
  repositoryChecks.set(login, check);

  return check;
}
