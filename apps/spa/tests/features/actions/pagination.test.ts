import { describe, it, expect } from "vitest";
import { parseLinkHeader } from "@/features/actions/lib/pagination";

describe("parseLinkHeader", () => {
  it("returns no next page when header is null", () => {
    const result = parseLinkHeader(null);

    expect(result).toEqual({ hasNextPage: false, nextPage: null });
  });

  it("returns no next page when header has no next rel", () => {
    const header = '<https://api.github.com/repos/user/repo/issues?page=1>; rel="prev"';
    const result = parseLinkHeader(header);

    expect(result).toEqual({ hasNextPage: false, nextPage: null });
  });

  it("extracts next page from link header", () => {
    const header =
      '<https://api.github.com/repos/user/repo/issues?state=closed&page=3>; rel="next", <https://api.github.com/repos/user/repo/issues?state=closed&page=5>; rel="last"';
    const result = parseLinkHeader(header);

    expect(result).toEqual({ hasNextPage: true, nextPage: 3 });
  });

  it("handles page as first query param", () => {
    const header = '<https://api.github.com/repos/user/repo/issues?page=2&state=open>; rel="next"';
    const result = parseLinkHeader(header);

    expect(result).toEqual({ hasNextPage: true, nextPage: 2 });
  });
});
