import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDraftRestoration } from "@/features/actions/hooks/use-draft-restoration";
import { makeAction } from "../../factories";
import * as draftStore from "@/features/actions/lib/draft-store";

describe("useDraftRestoration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with empty state when action is undefined", () => {
    const { result } = renderHook(() => useDraftRestoration({ action: undefined }));

    expect(result.current.title).toBe("");
    expect(result.current.memo).toBe("");
    expect(result.current.labels).toEqual([]);
    expect(result.current.restoredFromDraft).toBe(false);
  });

  it("initializes from action when no draft exists", () => {
    vi.spyOn(draftStore, "getDraft").mockReturnValue(null);
    const action = makeAction({ title: "My Title", memo: "My Memo", labels: ["bug"] });

    const { result } = renderHook(() => useDraftRestoration({ action }));

    expect(result.current.title).toBe("My Title");
    expect(result.current.memo).toBe("My Memo");
    expect(result.current.labels).toEqual(["bug"]);
    expect(result.current.restoredFromDraft).toBe(false);
  });

  it("restores from draft when draft is newer than action", () => {
    vi.spyOn(draftStore, "getDraft").mockReturnValue({
      title: "Draft Title",
      memo: "Draft Memo",
      labels: ["feature"],
      savedAt: "2026-01-02T00:00:00Z",
      serverUpdatedAt: "2026-01-01T00:00:00Z",
    });
    const action = makeAction({ updatedAt: "2026-01-01T00:00:00Z" });

    const { result } = renderHook(() => useDraftRestoration({ action }));

    expect(result.current.title).toBe("Draft Title");
    expect(result.current.memo).toBe("Draft Memo");
    expect(result.current.labels).toEqual(["feature"]);
    expect(result.current.restoredFromDraft).toBe(true);
  });

  it("uses action data when draft is older", () => {
    const removeDraftSpy = vi.spyOn(draftStore, "removeDraft").mockReturnValue(undefined);
    vi.spyOn(draftStore, "getDraft").mockReturnValue({
      title: "Old Draft",
      memo: "Old Memo",
      labels: [],
      savedAt: "2025-12-31T00:00:00Z",
      serverUpdatedAt: "2025-12-30T00:00:00Z",
    });
    const action = makeAction({ id: 42, title: "Server Title", updatedAt: "2026-01-01T00:00:00Z" });

    const { result } = renderHook(() => useDraftRestoration({ action }));

    expect(result.current.title).toBe("Server Title");
    expect(result.current.restoredFromDraft).toBe(false);
    expect(removeDraftSpy).toHaveBeenCalledWith(42);
  });

  it("allows updating title, memo, and labels", () => {
    vi.spyOn(draftStore, "getDraft").mockReturnValue(null);
    const action = makeAction();

    const { result } = renderHook(() => useDraftRestoration({ action }));

    act(() => {
      result.current.setTitle("New Title");
    });
    expect(result.current.title).toBe("New Title");

    act(() => {
      result.current.setMemo("New Memo");
    });
    expect(result.current.memo).toBe("New Memo");

    act(() => {
      result.current.setLabels(["label1"]);
    });
    expect(result.current.labels).toEqual(["label1"]);
  });

  it("auto-dismisses restoredFromDraft after timeout", () => {
    vi.useFakeTimers();

    vi.spyOn(draftStore, "getDraft").mockReturnValue({
      title: "Draft",
      memo: "",
      labels: [],
      savedAt: "2026-01-02T00:00:00Z",
      serverUpdatedAt: "2026-01-01T00:00:00Z",
    });
    const action = makeAction({ updatedAt: "2026-01-01T00:00:00Z" });

    const { result } = renderHook(() => useDraftRestoration({ action }));

    expect(result.current.restoredFromDraft).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.restoredFromDraft).toBe(false);

    vi.useRealTimers();
  });

  it("initializes only once even if action reference changes", () => {
    const getDraftSpy = vi.spyOn(draftStore, "getDraft").mockReturnValue(null);
    const action1 = makeAction({ title: "First" });
    const action2 = makeAction({ title: "Updated" });

    const { result, rerender } = renderHook(({ action }) => useDraftRestoration({ action }), {
      initialProps: { action: action1 },
    });

    expect(result.current.title).toBe("First");

    rerender({ action: action2 });

    expect(result.current.title).toBe("First");
    expect(getDraftSpy).toHaveBeenCalledTimes(1);
  });
});
