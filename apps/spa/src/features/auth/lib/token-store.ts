import type { TokenSet } from "@/features/auth/types";
import { authLog } from "@/shared/lib/auth-log";
import { TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_AT_KEY, REFRESH_EXPIRES_AT_KEY, USER_KEY, REPO_INITIALIZED_KEY } from "@/shared/lib/storage-keys";

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  authLog("getToken", token ? "found" : "missing");
  return token;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  authLog("setToken");
}

export function setTokenSet(tokenSet: TokenSet): void {
  setToken(tokenSet.accessToken);
  if (tokenSet.refreshToken !== undefined) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokenSet.refreshToken);
  }
  if (tokenSet.expiresAt !== undefined) {
    localStorage.setItem(EXPIRES_AT_KEY, String(tokenSet.expiresAt));
  }
  if (tokenSet.refreshExpiresAt !== undefined) {
    localStorage.setItem(REFRESH_EXPIRES_AT_KEY, String(tokenSet.refreshExpiresAt));
  }
  authLog("setTokenSet", tokenSet.refreshToken ? "with-refresh" : "access-only");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export const TOKEN_CLEARED_EVENT = "ato:token-cleared";

export function clearToken(): void {
  const hadToken = localStorage.getItem(TOKEN_KEY) !== null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REPO_INITIALIZED_KEY);
  if (!hadToken) return;
  authLog("clearToken");
  window.dispatchEvent(new Event(TOKEN_CLEARED_EVENT));
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
