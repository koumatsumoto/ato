import { describe, it, expect } from "vitest";
import { makeAction } from "../../factories";
import { calculateNewSortKey, getSortKey, sortByKey, needsRebalance, rebalance } from "@/features/actions/hooks/use-sorted-actions";

describe("getSortKey", () => {
  it("returns override from orderMap when present", () => {
    const action = makeAction({ id: 1, createdAt: "2026-01-01T00:00:00Z" });
    const map = new Map([[1, 5000]]);
    expect(getSortKey(action, map)).toBe(5000);
  });

  it("falls back to createdAt timestamp when no override", () => {
    const action = makeAction({ id: 1, createdAt: "2026-01-01T00:00:00Z" });
    const map = new Map<number, number>();
    expect(getSortKey(action, map)).toBe(new Date("2026-01-01T00:00:00Z").getTime());
  });
});

describe("sortByKey", () => {
  it("sorts descending by sort key (newest first)", () => {
    const a = makeAction({ id: 1, createdAt: "2026-01-01T00:00:00Z" });
    const b = makeAction({ id: 2, createdAt: "2026-01-02T00:00:00Z" });
    const c = makeAction({ id: 3, createdAt: "2026-01-03T00:00:00Z" });
    const sorted = sortByKey([a, b, c], new Map());
    expect(sorted.map((x) => x.id)).toEqual([3, 2, 1]);
  });

  it("respects overrides over createdAt", () => {
    const a = makeAction({ id: 1, createdAt: "2026-01-01T00:00:00Z" });
    const b = makeAction({ id: 2, createdAt: "2026-01-02T00:00:00Z" });
    const map = new Map([[1, Number.MAX_SAFE_INTEGER]]);
    const sorted = sortByKey([a, b], map);
    expect(sorted.map((x) => x.id)).toEqual([1, 2]);
  });

  it("does not mutate original array", () => {
    const actions = [makeAction({ id: 1 }), makeAction({ id: 2 })];
    const original = [...actions];
    sortByKey(actions, new Map());
    expect(actions).toEqual(original);
  });
});

describe("calculateNewSortKey", () => {
  const ts = (offset: number) => 1700000000000 + offset;

  it("returns midpoint when moved between two items", () => {
    const actions = [
      makeAction({ id: 1, createdAt: new Date(ts(3000)).toISOString() }),
      makeAction({ id: 3, createdAt: new Date(ts(0)).toISOString() }),
      makeAction({ id: 2, createdAt: new Date(ts(1000)).toISOString() }),
    ];
    const result = calculateNewSortKey(actions, 1, new Map());
    expect(result).toBe((ts(3000) + ts(1000)) / 2);
  });

  it("returns nextKey + 1 when moved to top", () => {
    const actions = [
      makeAction({ id: 3, createdAt: new Date(ts(0)).toISOString() }),
      makeAction({ id: 1, createdAt: new Date(ts(3000)).toISOString() }),
    ];
    const result = calculateNewSortKey(actions, 0, new Map());
    expect(result).toBe(ts(3000) + 1);
  });

  it("returns prevKey - 1 when moved to bottom", () => {
    const actions = [
      makeAction({ id: 1, createdAt: new Date(ts(3000)).toISOString() }),
      makeAction({ id: 3, createdAt: new Date(ts(0)).toISOString() }),
    ];
    const result = calculateNewSortKey(actions, 1, new Map());
    expect(result).toBe(ts(3000) - 1);
  });

  it("returns Date.now() for single-item list", () => {
    const before = Date.now();
    const actions = [makeAction({ id: 1 })];
    const result = calculateNewSortKey(actions, 0, new Map());
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(Date.now());
  });

  it("uses orderMap overrides for neighbor sort keys", () => {
    const actions = [
      makeAction({ id: 1, createdAt: new Date(ts(0)).toISOString() }),
      makeAction({ id: 3, createdAt: new Date(ts(0)).toISOString() }),
      makeAction({ id: 2, createdAt: new Date(ts(0)).toISOString() }),
    ];
    const map = new Map([
      [1, 5000],
      [2, 1000],
    ]);
    const result = calculateNewSortKey(actions, 1, map);
    expect(result).toBe((5000 + 1000) / 2);
  });

  it("handles identical neighbor sort keys (same createdAt)", () => {
    const sameTime = new Date(ts(0)).toISOString();
    const actions = [
      makeAction({ id: 1, createdAt: sameTime }),
      makeAction({ id: 3, createdAt: sameTime }),
      makeAction({ id: 2, createdAt: sameTime }),
    ];
    const result = calculateNewSortKey(actions, 1, new Map());
    expect(result).toBe(ts(0));
  });
});

describe("needsRebalance", () => {
  const ts = (offset: number) => 1700000000000 + offset;

  it("returns false when gap is large enough", () => {
    const actions = [
      makeAction({ id: 1, createdAt: new Date(ts(3000)).toISOString() }),
      makeAction({ id: 3, createdAt: new Date(ts(2000)).toISOString() }),
      makeAction({ id: 2, createdAt: new Date(ts(1000)).toISOString() }),
    ];
    const result = needsRebalance(actions, 1, ts(2000), new Map());
    expect(result).toBe(false);
  });

  it("returns true when midpoint equals prev neighbor", () => {
    const map = new Map([
      [1, 1000],
      [2, 1000],
      [3, 0],
    ]);
    const actions = [makeAction({ id: 1 }), makeAction({ id: 3 }), makeAction({ id: 2 })];
    const midpoint = (1000 + 1000) / 2;
    const result = needsRebalance(actions, 1, midpoint, map);
    expect(result).toBe(true);
  });

  it("returns true when gap is below MIN_GAP threshold", () => {
    const map = new Map([
      [1, 1000.001],
      [2, 1000],
    ]);
    const actions = [makeAction({ id: 1 }), makeAction({ id: 3 }), makeAction({ id: 2 })];
    const midpoint = (1000.001 + 1000) / 2;
    const result = needsRebalance(actions, 1, midpoint, map);
    expect(result).toBe(true);
  });

  it("returns false for top insertion with sufficient gap", () => {
    const actions = [makeAction({ id: 3 }), makeAction({ id: 1 })];
    const map = new Map([[1, 5000]]);
    const result = needsRebalance(actions, 0, 5001, map);
    expect(result).toBe(false);
  });
});

describe("rebalance", () => {
  it("assigns evenly spaced sort keys descending from Date.now()", () => {
    const actions = [makeAction({ id: 1 }), makeAction({ id: 2 }), makeAction({ id: 3 })];
    const before = Date.now();
    const result = rebalance(actions);
    const after = Date.now();

    expect(result.size).toBe(3);

    const key1 = result.get(1);
    const key2 = result.get(2);
    const key3 = result.get(3);
    if (key1 === undefined || key2 === undefined || key3 === undefined) {
      throw new Error("Expected all keys to be defined");
    }

    // First item gets baseKey, second baseKey-1000, third baseKey-2000
    expect(key1 - key2).toBe(1000);
    expect(key2 - key3).toBe(1000);
    expect(key1).toBeGreaterThanOrEqual(before);
    expect(key1).toBeLessThanOrEqual(after);
  });

  it("handles empty actions array", () => {
    const result = rebalance([]);
    expect(result.size).toBe(0);
  });

  it("handles single action", () => {
    const actions = [makeAction({ id: 1 })];
    const result = rebalance(actions);
    expect(result.size).toBe(1);
    expect(result.has(1)).toBe(true);
  });
});
