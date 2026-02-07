import { AuthError, NetworkError } from "@/types";

const GITHUB_API = "https://api.github.com";

export async function githubFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("ato:token");
  if (!token) {
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
    });
  } catch {
    throw new NetworkError("Unable to connect. Please check your internet connection.");
  }

  if (response.status === 401) {
    localStorage.removeItem("ato:token");
    throw new AuthError("Token expired or revoked");
  }

  return response;
}
