import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("searchActions", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("ato:token", "test-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetchResponse(items: unknown[] = []) {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ total_count: items.length, incomplete_results: false, items }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = mockFetch;
    return mockFetch;
  }

  async function loadSearchActions() {
    const mod = await import("../lib/search-api");
    return mod.searchActions;
  }

  it("includes label qualifier when label parameter is provided", async () => {
    const mockFetch = mockFetchResponse();
    const searchActions = await loadSearchActions();

    await searchActions("testuser", { query: "test", includeCompleted: false, label: "bug" });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("label%3A%22bug%22");
  });

  it("omits label qualifier when label is undefined", async () => {
    const mockFetch = mockFetchResponse();
    const searchActions = await loadSearchActions();

    await searchActions("testuser", { query: "test", includeCompleted: false });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain("label");
  });

  it("omits query when query is empty", async () => {
    const mockFetch = mockFetchResponse();
    const searchActions = await loadSearchActions();

    await searchActions("testuser", { query: "", includeCompleted: false, label: "bug" });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    const qParam = new URL(`https://api.github.com${calledUrl.replace(/.*\/search/, "/search")}`).searchParams.get("q") ?? "";
    expect(qParam).not.toMatch(/^\S+\s+is:issue\s+\s+/);
    expect(qParam).toContain('label:"bug"');
  });

  it("includes state:open when includeCompleted is false", async () => {
    const mockFetch = mockFetchResponse();
    const searchActions = await loadSearchActions();

    await searchActions("testuser", { query: "test", includeCompleted: false });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("state%3Aopen");
  });

  it("sanitizes double quotes from label parameter", async () => {
    const mockFetch = mockFetchResponse();
    const searchActions = await loadSearchActions();

    await searchActions("testuser", { query: "", includeCompleted: false, label: 'bug"injection' });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("label%3A%22buginjection%22");
    expect(calledUrl).not.toContain("label%3A%22bug%22injection");
  });

  it("omits state:open when includeCompleted is true", async () => {
    const mockFetch = mockFetchResponse();
    const searchActions = await loadSearchActions();

    await searchActions("testuser", { query: "test", includeCompleted: true });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain("state%3Aopen");
  });
});
