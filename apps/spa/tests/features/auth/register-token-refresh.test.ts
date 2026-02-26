import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/shared/lib/storage-keys";

vi.mock("@/shared/lib/env", () => ({
  getOAuthProxyUrl: () => "https://proxy.example.com",
}));

describe("register-token-refresh", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  async function loadAndGetRefreshFn() {
    vi.resetModules();
    const tokenRefresh = await import("@/shared/lib/token-refresh");
    tokenRefresh._resetTokenRefresh();
    await import("@/features/auth/lib/register-token-refresh");
    return tokenRefresh.getTokenRefreshFn()!;
  }

  it("registers a refresh function on import", async () => {
    const refreshFn = await loadAndGetRefreshFn();
    expect(refreshFn).toBeTypeOf("function");
  });

  it("refreshes token successfully", async () => {
    localStorage.setItem(TOKEN_KEY, "old-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "valid-refresh");

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
          expiresIn: 28800,
          refreshTokenExpiresIn: 15811200,
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = mockFetch;

    const refreshFn = await loadAndGetRefreshFn();
    const newToken = await refreshFn();

    expect(newToken).toBe("new-access-token");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("new-access-token");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("new-refresh-token");
  });

  it("throws AuthError when no refresh token available", async () => {
    localStorage.setItem(TOKEN_KEY, "old-token");

    const refreshFn = await loadAndGetRefreshFn();

    await expect(refreshFn()).rejects.toThrow("No refresh token available");
  });

  it("throws AuthError when refresh endpoint fails", async () => {
    localStorage.setItem(TOKEN_KEY, "old-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "bad-refresh");

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid" }), { status: 401 }));

    const refreshFn = await loadAndGetRefreshFn();

    await expect(refreshFn()).rejects.toThrow("Token refresh failed");
  });

  it("deduplicates concurrent refresh attempts (mutex)", async () => {
    localStorage.setItem(TOKEN_KEY, "old-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "valid-refresh");

    let refreshCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      refreshCallCount++;
      return Promise.resolve(new Response(JSON.stringify({ accessToken: "new-token", refreshToken: "new-refresh" }), { status: 200 }));
    });

    const refreshFn = await loadAndGetRefreshFn();

    const [t1, t2] = await Promise.all([refreshFn(), refreshFn()]);

    expect(t1).toBe("new-token");
    expect(t2).toBe("new-token");
    expect(refreshCallCount).toBe(1);
  });
});
