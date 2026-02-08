import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GitHubApiError } from "@/shared/lib/errors";

describe("fetchLabels", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("ato:token", "test-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  async function loadFetchLabels() {
    const mod = await import("@/features/actions/lib/labels-api");
    return mod.fetchLabels;
  }

  it("returns labels on success", async () => {
    const labels = [
      { id: 1, name: "bug", color: "d73a4a", description: null },
      { id: 2, name: "feature", color: "a2eeef", description: "New feature" },
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(labels), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const fetchLabels = await loadFetchLabels();
    const result = await fetchLabels("testuser");

    expect(result).toEqual(labels);
  });

  it("sends correct request path", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = mockFetch;

    const fetchLabels = await loadFetchLabels();
    await fetchLabels("testuser");

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/repos/testuser/ato-datastore/labels");
    expect(calledUrl).toContain("per_page=100");
  });

  it("throws GitHubApiError on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const fetchLabels = await loadFetchLabels();
    await expect(fetchLabels("testuser")).rejects.toThrow(GitHubApiError);
  });
});
