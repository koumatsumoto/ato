import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";

describe("useRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when date is null", () => {
    const { result } = renderHook(() => useRelativeTime(null));
    expect(result.current).toBeNull();
  });

  it("formats seconds ago", () => {
    vi.useFakeTimers();
    const now = new Date();
    vi.setSystemTime(now);

    const tenSecondsAgo = new Date(now.getTime() - 10_000);
    const { result } = renderHook(() => useRelativeTime(tenSecondsAgo));

    expect(result.current).toBe("10秒前");
  });

  it("formats minutes ago", () => {
    vi.useFakeTimers();
    const now = new Date();
    vi.setSystemTime(now);

    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60_000);
    const { result } = renderHook(() => useRelativeTime(fiveMinutesAgo));

    expect(result.current).toBe("5分前");
  });

  it("formats hours ago", () => {
    vi.useFakeTimers();
    const now = new Date();
    vi.setSystemTime(now);

    const twoHoursAgo = new Date(now.getTime() - 2 * 3_600_000);
    const { result } = renderHook(() => useRelativeTime(twoHoursAgo));

    expect(result.current).toBe("2時間前");
  });

  it("shows 0秒前 for future dates", () => {
    vi.useFakeTimers();
    const now = new Date();
    vi.setSystemTime(now);

    const futureDate = new Date(now.getTime() + 10_000);
    const { result } = renderHook(() => useRelativeTime(futureDate));

    expect(result.current).toBe("0秒前");
  });

  it("updates text on interval tick", () => {
    vi.useFakeTimers();
    const now = new Date();
    vi.setSystemTime(now);

    const thirtySecondsAgo = new Date(now.getTime() - 30_000);
    const { result } = renderHook(() => useRelativeTime(thirtySecondsAgo));

    expect(result.current).toBe("30秒前");

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current).toBe("35秒前");
  });
});
