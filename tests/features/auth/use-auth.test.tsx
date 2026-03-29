import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { clearToken, TOKEN_REFRESHED_EVENT } from "@/features/auth/lib/token-store";
import { createWrapper } from "../../test-utils";
import "@/features/auth/lib/register-token-refresh";

describe("useAuth", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns unauthenticated state when no token exists", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.state.token).toBeNull();
    expect(result.current.state.user).toBeNull();
    expect(result.current.state.isLoading).toBe(false);
  });

  it("fetches user info when token exists", async () => {
    localStorage.setItem("gh-auth-bridge:token", "valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          login: "testuser",
          id: 123,
          avatar_url: "https://avatars.githubusercontent.com/u/123",
        }),
        { status: 200 },
      ),
    );

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.state.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(result.current.state.token).toBe("valid-token");
    expect(result.current.state.user).toEqual({
      login: "testuser",
      id: 123,
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
    });
  });

  it("clears token after retries exhausted on persistent 401", async () => {
    vi.useFakeTimers();
    localStorage.setItem("gh-auth-bridge:token", "expired-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.state.token).toBeNull();
    expect(result.current.state.user).toBeNull();
    expect(localStorage.getItem("gh-auth-bridge:token")).toBeNull();
  });

  it("recovers from 401 when refresh token is available", async () => {
    // getOAuthProxyUrl requires VITE_OAUTH_PROXY_URL which is not set in CI
    const envModule = await import("@/shared/lib/env");
    vi.spyOn(envModule, "getOAuthProxyUrl").mockReturnValue("http://localhost:8787");

    localStorage.setItem("gh-auth-bridge:token", "expired-token");
    localStorage.setItem("gh-auth-bridge:refresh-token", "valid-refresh");

    const mockFetch = vi.fn();
    // First call: githubFetch gets 401
    mockFetch.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));
    // Second call: refresh endpoint returns new tokens
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "new-token", refreshToken: "new-refresh" }), { status: 200 }));
    // Third call: retry with new token succeeds
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ login: "testuser", id: 123, avatar_url: "https://example.com/avatar" }), { status: 200 }),
    );
    globalThis.fetch = mockFetch;

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.state.user?.login).toBe("testuser");
    });
    expect(localStorage.getItem("gh-auth-bridge:token")).toBe("new-token");
  });

  it("does not clear token on 500 server error", async () => {
    vi.useFakeTimers();
    localStorage.setItem("gh-auth-bridge:token", "valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 }));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.state.token).toBe("valid-token");
    expect(localStorage.getItem("gh-auth-bridge:token")).toBe("valid-token");
  });

  it("does not clear token on 503 service unavailable", async () => {
    vi.useFakeTimers();
    localStorage.setItem("gh-auth-bridge:token", "valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Service Unavailable" }), { status: 503 }));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.state.token).toBe("valid-token");
    expect(localStorage.getItem("gh-auth-bridge:token")).toBe("valid-token");
  });

  it("logout clears all auth state", async () => {
    localStorage.setItem("gh-auth-bridge:token", "valid-token");
    localStorage.setItem("ato:user", '{"login":"user"}');
    localStorage.setItem("ato:repo-initialized", "true");

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ login: "user", id: 1, avatar_url: "https://example.com/avatar" }), { status: 200 }));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.state.user).not.toBeNull();
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.state.token).toBeNull();
    expect(localStorage.getItem("gh-auth-bridge:token")).toBeNull();
    expect(localStorage.getItem("ato:user")).toBeNull();
    expect(localStorage.getItem("ato:repo-initialized")).toBeNull();
  });

  it("updates React state when TOKEN_REFRESHED_EVENT is dispatched", async () => {
    localStorage.setItem("gh-auth-bridge:token", "old-token");
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ login: "user", id: 1, avatar_url: "https://example.com/avatar" }), { status: 200 }));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.state.user).not.toBeNull();
    });

    expect(result.current.state.token).toBe("old-token");

    act(() => {
      localStorage.setItem("gh-auth-bridge:token", "refreshed-token");
      window.dispatchEvent(new Event(TOKEN_REFRESHED_EVENT));
    });

    expect(result.current.state.token).toBe("refreshed-token");
  });

  it("clears state when TOKEN_CLEARED_EVENT is dispatched externally", async () => {
    localStorage.setItem("gh-auth-bridge:token", "valid-token");
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ login: "user", id: 1, avatar_url: "https://example.com/avatar" }), { status: 200 }));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.state.user).not.toBeNull();
    });

    act(() => {
      clearToken();
    });

    expect(result.current.state.token).toBeNull();
    expect(localStorage.getItem("gh-auth-bridge:token")).toBeNull();
  });
});
