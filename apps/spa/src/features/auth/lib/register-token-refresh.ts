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
    throw new AuthError("No refresh token available");
  }

  refreshPromise = (async () => {
    try {
      const proxyUrl = getOAuthProxyUrl();
      const tokenSet = await refreshAccessToken(proxyUrl, refreshToken);
      setTokenSet(tokenSet);
      authLog("token-refresh:success");
      return tokenSet.accessToken;
    } catch (err) {
      authLog("token-refresh:failed", String(err));
      if (err instanceof TokenRefreshError) throw err;
      if (err instanceof AuthError) throw err;
      throw new TokenRefreshError("transient", "Token refresh failed", { cause: err });
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

registerTokenRefresh(tryRefresh);
