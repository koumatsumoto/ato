import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/features/auth/hooks/use-auth";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("useAuth", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns unauthenticated state when no token exists", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.state.token).toBeNull();
    expect(result.current.state.user).toBeNull();
    expect(result.current.state.isLoading).toBe(false);
  });

  it("fetches user info when token exists", async () => {
    localStorage.setItem("ato:token", "valid-token");
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

  it("clears token on 401 during user fetch", async () => {
    localStorage.setItem("ato:token", "expired-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(result.current.state.token).toBeNull();
    expect(result.current.state.user).toBeNull();
  });

  it("logout clears all auth state", async () => {
    localStorage.setItem("ato:token", "valid-token");
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
    expect(localStorage.getItem("ato:token")).toBeNull();
    expect(localStorage.getItem("ato:user")).toBeNull();
    expect(localStorage.getItem("ato:repo-initialized")).toBeNull();
  });
});
