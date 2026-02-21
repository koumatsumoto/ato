import { authLog } from "@/shared/lib/auth-log";

const TOKEN_KEY = "ato:token";
const USER_KEY = "ato:user";
const REPO_INITIALIZED_KEY = "ato:repo-initialized";

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  authLog("getToken", token ? "found" : "missing");
  return token;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  authLog("setToken");
}

export const TOKEN_CLEARED_EVENT = "ato:token-cleared";

export function clearToken(): void {
  const hadToken = localStorage.getItem(TOKEN_KEY) !== null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REPO_INITIALIZED_KEY);
  if (!hadToken) return;
  authLog("clearToken");
  window.dispatchEvent(new Event(TOKEN_CLEARED_EVENT));
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
