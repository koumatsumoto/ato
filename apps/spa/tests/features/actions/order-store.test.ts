import { describe, it, expect, beforeEach, vi } from "vitest";
import { getOrderMap, setOrderEntry, saveRebalancedMap, pruneOrderMap } from "@/features/actions/lib/order-store";

describe("order-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getOrderMap", () => {
    it("returns empty map when no data stored", () => {
      expect(getOrderMap()).toEqual(new Map());
    });

    it("returns stored order map", () => {
      localStorage.setItem("ato:action-order", JSON.stringify({ "5": 1500, "3": 2500 }));
      expect(getOrderMap()).toEqual(
        new Map([
          [5, 1500],
          [3, 2500],
        ]),
      );
    });

    it("handles corrupted JSON gracefully", () => {
      localStorage.setItem("ato:action-order", "not-valid-json");
      expect(getOrderMap()).toEqual(new Map());
    });

    it("handles array JSON gracefully (old format migration)", () => {
      localStorage.setItem("ato:action-order", JSON.stringify([5, 3, 1]));
      expect(getOrderMap()).toEqual(new Map());
    });

    it("handles null JSON gracefully", () => {
      localStorage.setItem("ato:action-order", "null");
      expect(getOrderMap()).toEqual(new Map());
    });

    it("filters out non-integer keys", () => {
      localStorage.setItem("ato:action-order", JSON.stringify({ "5": 1500, abc: 2000, "3.5": 2500 }));
      expect(getOrderMap()).toEqual(new Map([[5, 1500]]));
    });

    it("filters out non-finite values", () => {
      localStorage.setItem("ato:action-order", JSON.stringify({ "5": 1500, "3": "abc", "1": null }));
      expect(getOrderMap()).toEqual(new Map([[5, 1500]]));
    });
  });

  describe("setOrderEntry", () => {
    it("adds a new entry to empty map", () => {
      const result = setOrderEntry(5, 1500);
      expect(result).toEqual(new Map([[5, 1500]]));
      expect(getOrderMap()).toEqual(new Map([[5, 1500]]));
    });

    it("adds a new entry to existing map", () => {
      setOrderEntry(5, 1500);
      const result = setOrderEntry(3, 2500);
      expect(result).toEqual(
        new Map([
          [5, 1500],
          [3, 2500],
        ]),
      );
    });

    it("overwrites an existing entry", () => {
      setOrderEntry(5, 1500);
      const result = setOrderEntry(5, 2000);
      expect(result).toEqual(new Map([[5, 2000]]));
    });

    it("handles fractional sort keys", () => {
      const result = setOrderEntry(5, 1500.5);
      expect(result).toEqual(new Map([[5, 1500.5]]));
      expect(getOrderMap()).toEqual(new Map([[5, 1500.5]]));
    });

    it("handles negative sort keys", () => {
      const result = setOrderEntry(5, -1);
      expect(result).toEqual(new Map([[5, -1]]));
      expect(getOrderMap()).toEqual(new Map([[5, -1]]));
    });

    it("degrades gracefully when localStorage is full", () => {
      const original = localStorage.setItem.bind(localStorage);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

      const result = setOrderEntry(5, 1500);
      expect(result).toEqual(new Map([[5, 1500]]));

      vi.spyOn(Storage.prototype, "setItem").mockImplementation(original);
    });
  });

  describe("saveRebalancedMap", () => {
    it("persists full map to localStorage", () => {
      const map = new Map([
        [1, 5000],
        [2, 4000],
        [3, 3000],
      ]);
      saveRebalancedMap(map);
      expect(getOrderMap()).toEqual(map);
    });

    it("overwrites existing data", () => {
      setOrderEntry(99, 999);
      const map = new Map([[1, 5000]]);
      saveRebalancedMap(map);
      expect(getOrderMap()).toEqual(new Map([[1, 5000]]));
    });
  });

  describe("pruneOrderMap", () => {
    it("removes entries not in active IDs", () => {
      const currentMap = new Map([
        [1, 1000],
        [2, 2000],
        [3, 3000],
      ]);
      const result = pruneOrderMap(currentMap, new Set([1, 3]));
      expect(result).toEqual(
        new Map([
          [1, 1000],
          [3, 3000],
        ]),
      );
      expect(getOrderMap()).toEqual(
        new Map([
          [1, 1000],
          [3, 3000],
        ]),
      );
    });

    it("returns null when no pruning needed", () => {
      const currentMap = new Map([
        [1, 1000],
        [2, 2000],
      ]);
      const result = pruneOrderMap(currentMap, new Set([1, 2, 3]));
      expect(result).toBeNull();
    });

    it("returns empty map when all entries are stale", () => {
      const currentMap = new Map([
        [1, 1000],
        [2, 2000],
      ]);
      const result = pruneOrderMap(currentMap, new Set([99]));
      expect(result).toEqual(new Map());
    });

    it("returns null for empty order map", () => {
      const result = pruneOrderMap(new Map(), new Set([1, 2]));
      expect(result).toBeNull();
    });
  });
});
