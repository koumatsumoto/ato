const REDIRECT_KEY = "ato:redirect-after-login";

export function saveRedirectPath(path: string): void {
  if (path && path !== "/") {
    sessionStorage.setItem(REDIRECT_KEY, path);
  }
}

export function consumeRedirectPath(): string | null {
  const path = sessionStorage.getItem(REDIRECT_KEY);
  if (path) {
    sessionStorage.removeItem(REDIRECT_KEY);
  }
  return path;
}
