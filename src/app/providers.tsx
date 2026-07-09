import { QueryClientProvider } from "@tanstack/react-query";
import { configure, setupTokenRefresh, createAuthQueryClient, AuthProvider, TOKEN_CLEARED_EVENT } from "@koumatsumoto/gh-auth-bridge-client/react";
import { USER_KEY, REPO_INITIALIZED_KEY } from "@/shared/lib/storage-keys";

const proxyUrl = import.meta.env["VITE_OAUTH_PROXY_URL"] as string | undefined;
if (!proxyUrl) throw new Error("VITE_OAUTH_PROXY_URL environment variable is not set");
configure({ proxyUrl });
setupTokenRefresh();
const queryClient = createAuthQueryClient();

// createAuthQueryClient() configures only auth-aware retry defaults, leaving
// staleTime at TanStack's default of 0 — every mount and window focus refetches.
// Apply a shared freshness window so navigation reuses cached data while external
// changes are still picked up on the next mount/focus. It also spans GitHub's
// brief issue-list propagation delay, keeping optimistic writes from being
// refetched away. Per-query overrides (identity: Infinity, labels: 5min) still
// take precedence, and the SDK's retry/retryDelay are preserved via the merge.
const DEFAULT_STALE_TIME = 60_000;
const defaultOptions = queryClient.getDefaultOptions();
queryClient.setDefaultOptions({
  ...defaultOptions,
  queries: { ...defaultOptions.queries, staleTime: DEFAULT_STALE_TIME },
});

window.addEventListener(TOKEN_CLEARED_EVENT, () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REPO_INITIALIZED_KEY);
});

export function AppProviders({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
