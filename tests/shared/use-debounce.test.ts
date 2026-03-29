import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/shared/hooks/use-debounce";

describe("useDebounce", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("does not update value before delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "a", delay: 500 },
    });

    rerender({ value: "b", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(result.current).toBe("a");
  });

  it("updates value after delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "a", delay: 500 },
    });

    rerender({ value: "b", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("b");
  });

  it("only emits the last value on rapid changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "a", delay: 300 },
    });

    rerender({ value: "b", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "c", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "d", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("d");
  });

  it("clears timeout on unmount", () => {
    vi.useFakeTimers();
    const { result, rerender, unmount } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "a", delay: 500 },
    });

    rerender({ value: "b", delay: 500 });
    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // After unmount, value should still be "a" (no update applied)
    expect(result.current).toBe("a");
  });
});
