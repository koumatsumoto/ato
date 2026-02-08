import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubApiError, RepoNotConfiguredError } from "@/shared/lib/errors";

describe("ensureRepository", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("ato:token", "test-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  async function loadEnsureRepository() {
    const mod = await import("@/features/actions/lib/repo-init");
    return mod.ensureRepository;
  }

  it("returns immediately if repo-initialized flag is set", async () => {
    localStorage.setItem("ato:repo-initialized", "true");
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const ensureRepository = await loadEnsureRepository();
    await ensureRepository("testuser");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("checks repo existence and sets flag on 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const ensureRepository = await loadEnsureRepository();
    await ensureRepository("testuser");

    expect(localStorage.getItem("ato:repo-initialized")).toBe("true");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws RepoNotConfiguredError on 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 }));

    const ensureRepository = await loadEnsureRepository();
    await expect(ensureRepository("testuser")).rejects.toThrow(RepoNotConfiguredError);

    expect(localStorage.getItem("ato:repo-initialized")).toBeNull();
  });

  it("throws GitHubApiError on non-404 check failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{"message":"forbidden"}', { status: 403 }));

    const ensureRepository = await loadEnsureRepository();
    await expect(ensureRepository("testuser")).rejects.toThrow(GitHubApiError);
  });
});
