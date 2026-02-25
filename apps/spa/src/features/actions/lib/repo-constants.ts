export const REPO_NAME = "ato-datastore";
export const REPO_INITIALIZED_KEY = "ato:repo-initialized";

export function repoPath(login: string): string {
  return `/repos/${login}/${REPO_NAME}`;
}
