import { describe, it, expect, beforeEach } from "vitest";
import { getRecentLabels, addRecentLabels, clearRecentLabels } from "../lib/label-store";

describe("label-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getRecentLabels", () => {
    it("returns empty array when no data", () => {
      expect(getRecentLabels()).toEqual([]);
    });

    it("returns stored labels", () => {
      localStorage.setItem("ato:recent-labels", JSON.stringify(["bug", "feature"]));
      expect(getRecentLabels()).toEqual(["bug", "feature"]);
    });

    it("handles corrupted JSON gracefully", () => {
      localStorage.setItem("ato:recent-labels", "not-valid-json");
      expect(getRecentLabels()).toEqual([]);
    });

    it("handles non-array JSON gracefully", () => {
      localStorage.setItem("ato:recent-labels", JSON.stringify({ key: "value" }));
      expect(getRecentLabels()).toEqual([]);
    });

    it("filters out non-string items", () => {
      localStorage.setItem("ato:recent-labels", JSON.stringify(["bug", 42, null, "feature"]));
      expect(getRecentLabels()).toEqual(["bug", "feature"]);
    });

    it("limits to 8 labels", () => {
      const labels = Array.from({ length: 12 }, (_, i) => `label${i}`);
      localStorage.setItem("ato:recent-labels", JSON.stringify(labels));
      expect(getRecentLabels()).toHaveLength(8);
    });
  });

  describe("addRecentLabels", () => {
    it("adds new labels", () => {
      addRecentLabels(["bug", "feature"]);
      expect(getRecentLabels()).toEqual(["bug", "feature"]);
    });

    it("prepends new labels before existing ones", () => {
      addRecentLabels(["old"]);
      addRecentLabels(["new"]);
      expect(getRecentLabels()).toEqual(["new", "old"]);
    });

    it("deduplicates labels", () => {
      addRecentLabels(["bug", "feature"]);
      addRecentLabels(["bug", "urgent"]);
      expect(getRecentLabels()).toEqual(["bug", "urgent", "feature"]);
    });

    it("caps at 8 labels", () => {
      const labels = Array.from({ length: 10 }, (_, i) => `label${i}`);
      addRecentLabels(labels);
      expect(getRecentLabels()).toHaveLength(8);
    });

    it("does nothing when given empty array", () => {
      addRecentLabels(["existing"]);
      addRecentLabels([]);
      expect(getRecentLabels()).toEqual(["existing"]);
    });
  });

  describe("clearRecentLabels", () => {
    it("removes all stored labels", () => {
      addRecentLabels(["bug", "feature"]);
      clearRecentLabels();
      expect(getRecentLabels()).toEqual([]);
    });
  });
});
