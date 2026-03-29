import { describe, it, expect, vi, afterEach } from "vitest";

describe("getOAuthProxyUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns the URL when VITE_OAUTH_PROXY_URL is set", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_OAUTH_PROXY_URL", "https://proxy.example.com");

    const { getOAuthProxyUrl } = await import("@/shared/lib/env");
    expect(getOAuthProxyUrl()).toBe("https://proxy.example.com");
  });

  it("throws when VITE_OAUTH_PROXY_URL is not set", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_OAUTH_PROXY_URL", "");

    const { getOAuthProxyUrl } = await import("@/shared/lib/env");
    expect(() => getOAuthProxyUrl()).toThrow("VITE_OAUTH_PROXY_URL environment variable is not set");
  });
});
