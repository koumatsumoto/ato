import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthError, NetworkError, RateLimitError } from "@/shared/lib/errors";
import { githubFetch, _resetRefreshState } from "@/shared/lib/github-client";

vi.mock("@/shared/lib/env", () => ({
  getOAuthProxyUrl: () => "https://proxy.example.com",
}));

describe("githubFetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    _resetRefreshState();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("throws AuthError when no token in localStorage", async () => {
    await expect(githubFetch("/user")).rejects.toThrow(AuthError);
  });

  it("adds Authorization header with Bearer token", async () => {
    localStorage.setItem("ato:token", "test-token-123");
    const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = mockFetch;

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
    expect(options.cache).toBe("no-store");
  });

  it("sets cache: 'no-store' to bypass browser HTTP cache", async () => {
    localStorage.setItem("ato:token", "test-token");
    const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = mockFetch;

    await githubFetch("/user");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.cache).toBe("no-store");
  });

  it("throws NetworkError when fetch rejects", async () => {
    localStorage.setItem("ato:token", "valid-token");
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(githubFetch("/user")).rejects.toThrow(NetworkError);
  });

  it("returns Response on success", async () => {
    localStorage.setItem("ato:token", "valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{"login":"user"}', { status: 200 }));

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

    await expect(githubFetch("/user")).rejects.toThrow(RateLimitError);
  });

  it("does not throw on non-401 error responses", async () => {
    localStorage.setItem("ato:token", "valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 }));

    const response = await githubFetch("/repos/user/missing");

    expect(response.status).toBe(404);
  });

  describe("401 with refresh token", () => {
    it("refreshes token and retries on 401", async () => {
      localStorage.setItem("ato:token", "expired-token");
      localStorage.setItem("ato:refresh-token", "valid-refresh");

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              accessToken: "new-access-token",
              refreshToken: "new-refresh-token",
              expiresIn: 28800,
              refreshTokenExpiresIn: 15811200,
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(new Response('{"login":"user"}', { status: 200 }));
      globalThis.fetch = mockFetch;

      const response = await githubFetch("/user");

      expect(response.status).toBe(200);
      expect(localStorage.getItem("ato:token")).toBe("new-access-token");
      expect(localStorage.getItem("ato:refresh-token")).toBe("new-refresh-token");
    });

    it("throws AuthError when no refresh token available", async () => {
      localStorage.setItem("ato:token", "expired-token");

      globalThis.fetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

      await expect(githubFetch("/user")).rejects.toThrow(AuthError);
      expect(localStorage.getItem("ato:token")).toBe("expired-token");
    });

    it("throws AuthError when refresh succeeds but retry is still 401", async () => {
      localStorage.setItem("ato:token", "expired-token");
      localStorage.setItem("ato:refresh-token", "valid-refresh");

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "new-token", refreshToken: "new-refresh" }), { status: 200 }))
        .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));
      globalThis.fetch = mockFetch;

      await expect(githubFetch("/user")).rejects.toThrow(AuthError);
    });

    it("throws AuthError when refresh endpoint returns error", async () => {
      localStorage.setItem("ato:token", "expired-token");
      localStorage.setItem("ato:refresh-token", "bad-refresh");

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: "refresh_failed" }), { status: 401 }));
      globalThis.fetch = mockFetch;

      await expect(githubFetch("/user")).rejects.toThrow(AuthError);
    });

    it("deduplicates concurrent refresh attempts (mutex)", async () => {
      localStorage.setItem("ato:token", "expired-token");
      localStorage.setItem("ato:refresh-token", "valid-refresh");

      let refreshCallCount = 0;
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("proxy.example.com")) {
          refreshCallCount++;
          return Promise.resolve(new Response(JSON.stringify({ accessToken: "new-token", refreshToken: "new-refresh" }), { status: 200 }));
        }
        if (url.includes("api.github.com")) {
          const token = localStorage.getItem("ato:token");
          if (token === "expired-token") {
            return Promise.resolve(new Response("Unauthorized", { status: 401 }));
          }
          return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
        }
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      });
      globalThis.fetch = mockFetch;

      const [r1, r2] = await Promise.all([githubFetch("/user"), githubFetch("/repos")]);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(refreshCallCount).toBe(1);
    });
  });
});
