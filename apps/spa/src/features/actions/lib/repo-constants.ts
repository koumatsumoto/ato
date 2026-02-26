export const REPO_NAME = "ato-datastore";

export function repoPath(login: string): string {
  return `/repos/${login}/${REPO_NAME}`;
}
