import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockMutate = vi.fn();

vi.mock("@/features/actions/hooks/use-actions", () => ({
  useUpdateAction: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

import { useAutoSave } from "@/features/actions/hooks/use-auto-save";

function defaultParams(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Test title",
    memo: "Test memo",
    originalTitle: "Test title",
    originalMemo: "Test memo",
    updatedAt: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("lastSavedAt initialization", () => {
    it("initializes lastSavedAt from updatedAt", () => {
      const { result } = renderHook(() => useAutoSave(defaultParams()));

      expect(result.current.lastSavedAt).toEqual(new Date("2026-01-15T10:00:00Z"));
    });

    it("initializes lastSavedAt as null when updatedAt is empty", () => {
      const { result } = renderHook(() => useAutoSave(defaultParams({ updatedAt: "" })));

      expect(result.current.lastSavedAt).toBeNull();
    });

    it("initializes lastSavedAt as null when updatedAt is invalid", () => {
      const { result } = renderHook(() => useAutoSave(defaultParams({ updatedAt: "invalid-date" })));

      expect(result.current.lastSavedAt).toBeNull();
    });
  });

  describe("isDirty", () => {
    it("returns false when title and memo match originals", () => {
      const { result } = renderHook(() => useAutoSave(defaultParams()));

      expect(result.current.isDirty).toBe(false);
    });

    it("returns true when title differs from original", () => {
      const { result } = renderHook(() => useAutoSave(defaultParams({ title: "Changed title" })));

      expect(result.current.isDirty).toBe(true);
    });

    it("returns true when memo differs from original", () => {
      const { result } = renderHook(() => useAutoSave(defaultParams({ memo: "Changed memo" })));

      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("debounced save", () => {
    it("triggers save after 3 seconds when content changes", () => {
      const { rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams(),
      });

      rerender(defaultParams({ title: "Updated title" }));

      expect(mockMutate).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(3_000);
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        { id: 1, title: "Updated title", memo: "Test memo" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it("does not trigger save before 3 seconds", () => {
      const { rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams(),
      });

      rerender(defaultParams({ title: "Updated title" }));

      act(() => {
        vi.advanceTimersByTime(2_999);
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("does not save when content has not changed", () => {
      renderHook(() => useAutoSave(defaultParams()));

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe("saveNow", () => {
    it("saves immediately without waiting for debounce", () => {
      const { result, rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams(),
      });

      rerender(defaultParams({ memo: "Changed memo" }));

      act(() => {
        result.current.saveNow();
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        { id: 1, title: "Test title", memo: "Changed memo" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it("does not save when content matches original", () => {
      const { result } = renderHook(() => useAutoSave(defaultParams()));

      act(() => {
        result.current.saveNow();
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("does not save when title is empty", () => {
      const { result, rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams(),
      });

      rerender(defaultParams({ title: "", originalTitle: "original" }));

      act(() => {
        result.current.saveNow();
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe("onSuccess callback", () => {
    it("updates lastSavedAt on successful save", () => {
      const beforeSave = Date.now();

      const { result, rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams(),
      });

      rerender(defaultParams({ title: "New title" }));

      act(() => {
        result.current.saveNow();
      });

      const onSuccess = mockMutate.mock.calls[0]![1].onSuccess;

      act(() => {
        onSuccess();
      });

      expect(result.current.lastSavedAt).not.toBeNull();
      expect(result.current.lastSavedAt!.getTime()).toBeGreaterThanOrEqual(beforeSave);
    });
  });
});
