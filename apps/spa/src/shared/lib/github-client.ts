import { AuthError, NetworkError, RateLimitError } from "@/shared/lib/errors";
import { extractRateLimit, isRateLimited } from "@/shared/lib/rate-limit";
import { authLog } from "@/shared/lib/auth-log";

const GITHUB_API = "https://api.github.com";

export async function githubFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("ato:token");
  if (!token) {
    authLog("githubFetch:no-token", path);
    throw new AuthError("Not authenticated");
  }

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
  } catch {
    authLog("githubFetch:network-error", path);
    throw new NetworkError("Unable to connect. Please check your internet connection.");
  }

  if (response.status === 401) {
    authLog("githubFetch:401", path);
    throw new AuthError("Token expired or revoked");
  }

  if (isRateLimited(response)) {
    const { resetAt } = extractRateLimit(response.headers);
    authLog("githubFetch:rate-limit", path);
    throw new RateLimitError(resetAt);
  }

  return response;
}
