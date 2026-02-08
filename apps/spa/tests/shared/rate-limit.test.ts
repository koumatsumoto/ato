import { describe, it, expect } from "vitest";
import { extractRateLimit, isRateLimited } from "@/shared/lib/rate-limit";

describe("extractRateLimit", () => {
  it("extracts remaining and resetAt from headers", () => {
    const resetTimestamp = Math.floor(Date.now() / 1000) + 3600;
    const headers = new Headers({
      "X-RateLimit-Remaining": "4500",
      "X-RateLimit-Reset": String(resetTimestamp),
    });

    const info = extractRateLimit(headers);

    expect(info.remaining).toBe(4500);
    expect(info.resetAt.getTime()).toBe(resetTimestamp * 1000);
  });

  it("defaults to 0 remaining when headers are missing", () => {
    const headers = new Headers();

    const info = extractRateLimit(headers);

    expect(info.remaining).toBe(0);
    expect(info.resetAt.getTime()).toBe(0);
  });
});

describe("isRateLimited", () => {
  it("returns true when status is 403 and remaining is 0", () => {
    const response = new Response("Rate limit exceeded", {
      status: 403,
      headers: { "X-RateLimit-Remaining": "0" },
    });

    expect(isRateLimited(response)).toBe(true);
  });

  it("returns true when status is 429 (secondary rate limit)", () => {
    const response = new Response("Too Many Requests", { status: 429 });

    expect(isRateLimited(response)).toBe(true);
  });

  it("returns false when status is 403 but remaining > 0", () => {
    const response = new Response("Forbidden", {
      status: 403,
      headers: { "X-RateLimit-Remaining": "100" },
    });

    expect(isRateLimited(response)).toBe(false);
  });

  it("returns false when status is not 403", () => {
    const response = new Response("OK", {
      status: 200,
      headers: { "X-RateLimit-Remaining": "0" },
    });

    expect(isRateLimited(response)).toBe(false);
  });

  it("returns false when remaining header is absent on 403", () => {
    const response = new Response("Forbidden", { status: 403 });

    expect(isRateLimited(response)).toBe(false);
  });
});
