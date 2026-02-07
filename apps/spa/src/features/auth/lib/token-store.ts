const TOKEN_KEY = "ato:token";
const USER_KEY = "ato:user";
const REPO_INITIALIZED_KEY = "ato:repo-initialized";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REPO_INITIALIZED_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
