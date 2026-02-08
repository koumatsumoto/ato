import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthError, NetworkError, RateLimitError } from "@/types";

describe("githubFetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  async function loadGithubFetch() {
    const mod = await import("@/shared/lib/github-client");
    return mod.githubFetch;
  }

  it("throws AuthError when no token in localStorage", async () => {
    const githubFetch = await loadGithubFetch();
    await expect(githubFetch("/user")).rejects.toThrow(AuthError);
  });

  it("adds Authorization header with Bearer token", async () => {
    localStorage.setItem("ato:token", "test-token-123");
    const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = mockFetch;

    const githubFetch = await loadGithubFetch();
    await githubFetch("/user");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-123",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        }),
      }),
    );
  });

  it("merges custom headers with default headers", async () => {
    localStorage.setItem("ato:token", "test-token");
    const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = mockFetch;

    const githubFetch = await loadGithubFetch();
    await githubFetch("/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });
  });

  it("throws AuthError and clears token on 401 response", async () => {
    localStorage.setItem("ato:token", "expired-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const githubFetch = await loadGithubFetch();
    await expect(githubFetch("/user")).rejects.toThrow(AuthError);
    expect(localStorage.getItem("ato:token")).toBeNull();
  });

  it("throws NetworkError when fetch rejects", async () => {
    localStorage.setItem("ato:token", "valid-token");
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const githubFetch = await loadGithubFetch();
    await expect(githubFetch("/user")).rejects.toThrow(NetworkError);
  });

  it("returns Response on success", async () => {
    localStorage.setItem("ato:token", "valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{"login":"user"}', { status: 200 }));

    const githubFetch = await loadGithubFetch();
    const response = await githubFetch("/user");

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.login).toBe("user");
  });

  it("throws RateLimitError when rate limited", async () => {
    localStorage.setItem("ato:token", "valid-token");
    const resetTimestamp = Math.floor(Date.now() / 1000) + 3600;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("Rate limit exceeded", {
        status: 403,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetTimestamp),
        },
      }),
    );

    const githubFetch = await loadGithubFetch();
    await expect(githubFetch("/user")).rejects.toThrow(RateLimitError);
  });

  it("does not throw on non-401 error responses", async () => {
    localStorage.setItem("ato:token", "valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 }));

    const githubFetch = await loadGithubFetch();
    const response = await githubFetch("/repos/user/missing");

    expect(response.status).toBe(404);
  });
});
