import { registerTokenRefresh } from "@/shared/lib/token-refresh";
import { getRefreshToken, setTokenSet } from "@/features/auth/lib/token-store";
import { refreshAccessToken } from "@/features/auth/lib/auth-client";
import { getOAuthProxyUrl } from "@/shared/lib/env";
import { authLog } from "@/shared/lib/auth-log";
import { AuthError, TokenRefreshError } from "@/shared/lib/errors";

let refreshPromise: Promise<string> | null = null;

async function tryRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    authLog("token-refresh:missing-refresh-token");
    throw new AuthError("No refresh token available");
  }

  refreshPromise = (async () => {
    try {
      const proxyUrl = getOAuthProxyUrl();
      const tokenSet = await refreshAccessToken(proxyUrl, refreshToken);
      setTokenSet(tokenSet);
      authLog("token-refresh:success", tokenSet.refreshToken ? "with-refresh-token" : "access-only");
      return tokenSet.accessToken;
    } catch (err) {
      if (err instanceof TokenRefreshError) {
        authLog("token-refresh:failed", `reason=${err.reason} message=${err.message}`);
        throw err;
      }
      if (err instanceof AuthError) {
        authLog("token-refresh:failed", err.message);
        throw err;
      }
      authLog("token-refresh:failed", String(err));
      throw new TokenRefreshError("transient", "Token refresh failed", { cause: err });
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

registerTokenRefresh(tryRefresh);
