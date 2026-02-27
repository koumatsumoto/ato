import type { OAuthMessage, TokenSet } from "@/features/auth/types";
import { TokenRefreshError } from "@/shared/lib/errors";

export const LOGIN_TIMEOUT_MS = 120_000;
const POPUP_POLL_INTERVAL_MS = 500;

type SettleAction = () => void;

function createSettleGuard(cleanup: () => void): (action: SettleAction) => void {
  let settled = false;
  return (action) => {
    if (settled) return;
    settled = true;
    cleanup();
    action();
  };
}

function toTokenSet(data: OAuthMessage & { type: "ato:auth:success" }): TokenSet {
  const now = Date.now();
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresIn !== undefined ? now + data.expiresIn * 1000 : undefined,
    refreshExpiresAt: data.refreshTokenExpiresIn !== undefined ? now + data.refreshTokenExpiresIn * 1000 : undefined,
  };
}

export function openLoginPopup(proxyUrl: string): Promise<TokenSet> {
  return new Promise((resolve, reject) => {
    const popup = window.open(`${proxyUrl}/auth/login`, "ato-login", "width=600,height=700");
    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    const expectedOrigin = new URL(proxyUrl).origin;

    const cleanup = () => {
      window.removeEventListener("message", handler);
      clearInterval(pollId);
      clearTimeout(timeoutId);
    };

    const settle = createSettleGuard(cleanup);

    const handler = (event: MessageEvent<OAuthMessage>) => {
      if (event.origin !== expectedOrigin) return;
      const { data } = event;
      if (data?.type === "ato:auth:success") {
        settle(() => {
          popup.close();
          resolve(toTokenSet(data));
        });
      }
      if (data?.type === "ato:auth:error") {
        settle(() => {
          popup.close();
          reject(new Error(data.error));
        });
      }
    };

    const pollId = setInterval(() => {
      if (popup.closed) {
        settle(() => reject(new Error("Login popup was closed before authentication completed.")));
      }
    }, POPUP_POLL_INTERVAL_MS);

    const timeoutId = setTimeout(() => {
      settle(() => {
        popup.close();
        reject(new Error("Login timed out. Please try again."));
      });
    }, LOGIN_TIMEOUT_MS);

    window.addEventListener("message", handler);
  });
}

interface RefreshResponse {
  readonly accessToken: string;
  readonly refreshToken?: string | undefined;
  readonly expiresIn?: number | undefined;
  readonly refreshTokenExpiresIn?: number | undefined;
}

export async function refreshAccessToken(proxyUrl: string, refreshToken: string): Promise<TokenSet> {
  let response: Response;
  try {
    response = await fetch(`${proxyUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (err) {
    throw new TokenRefreshError("transient", "Token refresh failed: network error", { cause: err });
  }

  if (!response.ok) {
    const reason = response.status === 400 || response.status === 401 ? "invalid_grant" : "transient";
    throw new TokenRefreshError(reason, `Token refresh failed: ${response.status}`);
  }

  const data: RefreshResponse = await response.json();
  const now = Date.now();
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresIn !== undefined ? now + data.expiresIn * 1000 : undefined,
    refreshExpiresAt: data.refreshTokenExpiresIn !== undefined ? now + data.refreshTokenExpiresIn * 1000 : undefined,
  };
}
