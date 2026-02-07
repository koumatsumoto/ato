import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubApiError, RepoCreationError } from "@/types";

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
    const mod = await import("@/features/todos/lib/repo-init");
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

  it("creates repo on 404 and sets flag", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      .mockResolvedValueOnce(new Response("{}", { status: 201 }));
    globalThis.fetch = mockFetch;

    const ensureRepository = await loadEnsureRepository();
    await ensureRepository("testuser");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("ato:repo-initialized")).toBe("true");

    // Verify creation request body
    const [, createOptions] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(createOptions.body as string);
    expect(body.name).toBe("ato-datastore");
    expect(body.private).toBe(true);
    expect(body.has_issues).toBe(true);
    expect(body.auto_init).toBe(true);
  });

  it("handles 422 (already exists) as success", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      .mockResolvedValueOnce(new Response('{"message":"already exists"}', { status: 422 }));
    globalThis.fetch = mockFetch;

    const ensureRepository = await loadEnsureRepository();
    await ensureRepository("testuser");

    expect(localStorage.getItem("ato:repo-initialized")).toBe("true");
  });

  it("throws GitHubApiError on non-404 check failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{"message":"forbidden"}', { status: 403 }));

    const ensureRepository = await loadEnsureRepository();
    await expect(ensureRepository("testuser")).rejects.toThrow(GitHubApiError);
  });

  it("throws RepoCreationError on creation failure", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      .mockResolvedValueOnce(new Response('{"message":"error"}', { status: 500 }));
    globalThis.fetch = mockFetch;

    const ensureRepository = await loadEnsureRepository();
    await expect(ensureRepository("testuser")).rejects.toThrow(RepoCreationError);
  });
});
