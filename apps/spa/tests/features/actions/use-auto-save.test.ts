import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockMutate = vi.fn();

vi.mock("@/features/actions/hooks/use-actions", () => ({
  useUpdateAction: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

const mockSaveDraft = vi.fn();
const mockRemoveDraft = vi.fn();

vi.mock("@/features/actions/lib/draft-store", () => ({
  saveDraft: (...args: unknown[]) => mockSaveDraft(...args),
  removeDraft: (...args: unknown[]) => mockRemoveDraft(...args),
}));

import { useAutoSave } from "@/features/actions/hooks/use-auto-save";
import { NetworkError } from "@/shared/lib/errors";

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
    localStorage.clear();
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

    it("sets lastSavedAt when updatedAt becomes available after initial render", () => {
      const { result, rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams({ updatedAt: "" }),
      });

      expect(result.current.lastSavedAt).toBeNull();

      rerender(defaultParams({ updatedAt: "2026-01-15T10:00:00Z" }));

      expect(result.current.lastSavedAt).toEqual(new Date("2026-01-15T10:00:00Z"));
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

    it("removes draft on successful save", () => {
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

      expect(mockRemoveDraft).toHaveBeenCalledWith(1);
    });
  });

  describe("NetworkError draft fallback", () => {
    it("saves draft to localStorage when mutation fails with NetworkError", () => {
      const { result, rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams(),
      });

      rerender(defaultParams({ title: "Offline edit" }));

      act(() => {
        result.current.saveNow();
      });

      const onError = mockMutate.mock.calls[0]![1].onError;

      act(() => {
        onError(new NetworkError("offline"));
      });

      expect(mockSaveDraft).toHaveBeenCalledWith(1, {
        title: "Offline edit",
        memo: "Test memo",
        savedAt: expect.any(String),
        serverUpdatedAt: "2026-01-15T10:00:00Z",
      });
    });

    it("does not save draft for non-NetworkError", () => {
      const { result, rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams(),
      });

      rerender(defaultParams({ title: "Some edit" }));

      act(() => {
        result.current.saveNow();
      });

      const onError = mockMutate.mock.calls[0]![1].onError;

      act(() => {
        onError(new Error("other error"));
      });

      expect(mockSaveDraft).not.toHaveBeenCalled();
    });
  });

  describe("unmount save", () => {
    it("triggers mutation and saves draft on unmount when dirty", () => {
      const { unmount, rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams(),
      });

      rerender(defaultParams({ title: "Unsaved title" }));
      mockMutate.mockClear();

      unmount();

      expect(mockMutate).toHaveBeenCalledWith({ id: 1, title: "Unsaved title", memo: "Test memo" });
      expect(mockSaveDraft).toHaveBeenCalledWith(1, {
        title: "Unsaved title",
        memo: "Test memo",
        savedAt: expect.any(String),
        serverUpdatedAt: "2026-01-15T10:00:00Z",
      });
    });

    it("does not trigger mutation or save draft on unmount when not dirty", () => {
      const { unmount } = renderHook(() => useAutoSave(defaultParams()));

      unmount();

      expect(mockMutate).not.toHaveBeenCalled();
      expect(mockSaveDraft).not.toHaveBeenCalled();
    });

    it("does not save draft on unmount when title is invalid", () => {
      const { unmount, rerender } = renderHook((props) => useAutoSave(props), {
        initialProps: defaultParams(),
      });

      rerender(defaultParams({ title: "", originalTitle: "original" }));
      mockMutate.mockClear();

      unmount();

      expect(mockMutate).not.toHaveBeenCalled();
      expect(mockSaveDraft).not.toHaveBeenCalled();
    });
  });
});
