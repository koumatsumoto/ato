export function getOAuthProxyUrl(): string {
  const url = (import.meta.env["VITE_OAUTH_PROXY_URL"] as string | undefined) ?? "";
  if (!url) {
    throw new Error("VITE_OAUTH_PROXY_URL environment variable is not set");
  }
  return url;
}
