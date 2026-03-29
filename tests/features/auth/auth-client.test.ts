import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openLoginPopup, refreshAccessToken, LOGIN_TIMEOUT_MS } from "@/features/auth/lib/auth-client";
import { AuthError, TokenRefreshError } from "@/shared/lib/errors";

describe("openLoginPopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createMockPopup(overrides?: Partial<{ closed: boolean }>) {
    return { close: vi.fn(), closed: overrides?.closed ?? false };
  }

  it("opens a popup window with the correct URL", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "gh-auth-bridge:auth:success", accessToken: "token-123" },
      }),
    );

    await promise;

    expect(window.open).toHaveBeenCalledWith("https://proxy.example.com/auth/login", "gh-auth-bridge-login", "width=600,height=700");
  });

  it("resolves with TokenSet on success message", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "gh-auth-bridge:auth:success", accessToken: "my-token" },
      }),
    );

    const tokenSet = await promise;
    expect(tokenSet.accessToken).toBe("my-token");
    expect(tokenSet.refreshToken).toBeUndefined();
    expect(tokenSet.expiresAt).toBeUndefined();
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it("resolves with full TokenSet when refresh token data is present", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: {
          type: "gh-auth-bridge:auth:success",
          accessToken: "access-123",
          refreshToken: "refresh-456",
          expiresIn: 28800,
          refreshTokenExpiresIn: 15811200,
        },
      }),
    );

    const tokenSet = await promise;
    expect(tokenSet.accessToken).toBe("access-123");
    expect(tokenSet.refreshToken).toBe("refresh-456");
    expect(tokenSet.expiresAt).toBe(Date.now() + 28800 * 1000);
    expect(tokenSet.refreshExpiresAt).toBe(Date.now() + 15811200 * 1000);
  });

  it("rejects on error message", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "gh-auth-bridge:auth:error", error: "invalid_state" },
      }),
    );

    await expect(promise).rejects.toThrow("invalid_state");
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it("ignores messages from wrong origin", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://evil.example.com",
        data: { type: "gh-auth-bridge:auth:success", accessToken: "stolen" },
      }),
    );

    // Send correct message after to resolve the promise
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "gh-auth-bridge:auth:success", accessToken: "real-token" },
      }),
    );

    const tokenSet = await promise;
    expect(tokenSet.accessToken).toBe("real-token");
  });

  it("rejects when popup fails to open", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    await expect(openLoginPopup("https://proxy.example.com")).rejects.toThrow("Popup blocked");
  });

  it("rejects when popup is closed before authentication", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    mockPopup.closed = true;
    vi.advanceTimersByTime(500);

    await expect(promise).rejects.toThrow("Login popup was closed before authentication completed.");
  });

  it("rejects on timeout when no message is received", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    vi.advanceTimersByTime(LOGIN_TIMEOUT_MS);

    await expect(promise).rejects.toThrow("Login timed out. Please try again.");
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it("cleans up event listener on success", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);
    const removeListenerSpy = vi.spyOn(window, "removeEventListener");

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "gh-auth-bridge:auth:success", accessToken: "token" },
      }),
    );

    await promise;

    expect(removeListenerSpy).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("cleans up event listener on popup close", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);
    const removeListenerSpy = vi.spyOn(window, "removeEventListener");

    const promise = openLoginPopup("https://proxy.example.com");

    mockPopup.closed = true;
    vi.advanceTimersByTime(500);

    await expect(promise).rejects.toThrow();

    expect(removeListenerSpy).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("normalizes origin with trailing slash for comparison", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com/");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "gh-auth-bridge:auth:success", accessToken: "token-normalized" },
      }),
    );

    const tokenSet = await promise;
    expect(tokenSet.accessToken).toBe("token-normalized");
  });

  it("does not resolve after timeout even if message arrives later", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    vi.advanceTimersByTime(LOGIN_TIMEOUT_MS);

    await expect(promise).rejects.toThrow("Login timed out");

    // Late message arrives -- should be ignored
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "gh-auth-bridge:auth:success", accessToken: "late-token" },
      }),
    );
  });
});

describe("refreshAccessToken", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns TokenSet on successful refresh", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "new-access",
          refreshToken: "new-refresh",
          expiresIn: 28800,
          refreshTokenExpiresIn: 15811200,
        }),
        { status: 200 },
      ),
    );

    const tokenSet = await refreshAccessToken("https://proxy.example.com", "old-refresh");

    expect(tokenSet.accessToken).toBe("new-access");
    expect(tokenSet.refreshToken).toBe("new-refresh");
    expect(tokenSet.expiresAt).toBe(Date.now() + 28800 * 1000);
    expect(tokenSet.refreshExpiresAt).toBe(Date.now() + 15811200 * 1000);

    vi.useRealTimers();
  });

  it("sends POST request to proxy /auth/refresh", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: "new" }), { status: 200 }));
    globalThis.fetch = mockFetch;

    await refreshAccessToken("https://proxy.example.com", "my-refresh-token");

    expect(mockFetch).toHaveBeenCalledWith("https://proxy.example.com/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "my-refresh-token" }),
    });
  });

  it("throws TokenRefreshError with invalid_grant on 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "refresh_failed" }), { status: 401 }));

    const error = await refreshAccessToken("https://proxy.example.com", "bad-token").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TokenRefreshError);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as TokenRefreshError).reason).toBe("invalid_grant");
  });

  it("throws TokenRefreshError with invalid_grant on 400", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "bad_request" }), { status: 400 }));

    const error = await refreshAccessToken("https://proxy.example.com", "bad-token").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TokenRefreshError);
    expect((error as TokenRefreshError).reason).toBe("invalid_grant");
  });

  it("throws TokenRefreshError with transient on 500", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

    const error = await refreshAccessToken("https://proxy.example.com", "token").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TokenRefreshError);
    expect((error as TokenRefreshError).reason).toBe("transient");
  });

  it("throws TokenRefreshError when refresh response is missing accessToken", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ refreshToken: "new-refresh" }), { status: 200 }));

    const error = await refreshAccessToken("https://proxy.example.com", "token").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TokenRefreshError);
    expect((error as TokenRefreshError).reason).toBe("transient");
    expect((error as Error).message).toContain("missing accessToken");
  });

  it("throws TokenRefreshError with transient on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await refreshAccessToken("https://proxy.example.com", "token").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TokenRefreshError);
    expect((error as TokenRefreshError).reason).toBe("transient");
  });
});
