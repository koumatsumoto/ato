import type { OAuthMessage } from "@/types";

export const LOGIN_TIMEOUT_MS = 120_000;
const POPUP_POLL_INTERVAL_MS = 500;

export function openLoginPopup(proxyUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(`${proxyUrl}/auth/login`, "ato-login", "width=600,height=700");

    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    const expectedOrigin = new URL(proxyUrl).origin;
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", handler);
      clearInterval(pollId);
      clearTimeout(timeoutId);
    };

    const handler = (event: MessageEvent<OAuthMessage>) => {
      if (event.origin !== expectedOrigin) return;

      const { data } = event;
      if (data?.type === "ato:auth:success" && !settled) {
        settled = true;
        cleanup();
        popup.close();
        resolve(data.accessToken);
      }
      if (data?.type === "ato:auth:error" && !settled) {
        settled = true;
        cleanup();
        popup.close();
        reject(new Error(data.error));
      }
    };

    const pollId = setInterval(() => {
      if (!settled && popup.closed) {
        settled = true;
        cleanup();
        reject(new Error("Login popup was closed before authentication completed."));
      }
    }, POPUP_POLL_INTERVAL_MS);

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        popup.close();
        reject(new Error("Login timed out. Please try again."));
      }
    }, LOGIN_TIMEOUT_MS);

    window.addEventListener("message", handler);
  });
}
