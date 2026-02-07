import type { OAuthMessage } from "@/types";

export function openLoginPopup(proxyUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(`${proxyUrl}/auth/login`, "ato-login", "width=600,height=700");

    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    const handler = (event: MessageEvent<OAuthMessage>) => {
      if (event.origin !== proxyUrl) return;

      const { data } = event;
      if (data?.type === "ato:auth:success") {
        window.removeEventListener("message", handler);
        popup.close();
        resolve(data.accessToken);
      }
      if (data?.type === "ato:auth:error") {
        window.removeEventListener("message", handler);
        popup.close();
        reject(new Error(data.error));
      }
    };

    window.addEventListener("message", handler);
  });
}
