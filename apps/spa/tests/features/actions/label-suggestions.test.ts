import { describe, it, expect } from "vitest";
import { buildLabelSuggestions } from "@/features/actions/lib/label-suggestions";
import { makeGitHubLabel } from "../../factories";

describe("buildLabelSuggestions", () => {
  const repoLabels = [
    makeGitHubLabel({ name: "bug" }),
    makeGitHubLabel({ name: "feature" }),
    makeGitHubLabel({ name: "docs" }),
    makeGitHubLabel({ name: "urgent" }),
  ];

  it("returns all available labels when input is empty", () => {
    const result = buildLabelSuggestions("", repoLabels, [], []);
    expect(result).toEqual(["bug", "feature", "docs", "urgent"]);
  });

  it("filters labels by input (case-insensitive)", () => {
    const result = buildLabelSuggestions("BUG", repoLabels, [], []);
    expect(result).toEqual(["bug"]);
  });

  it("matches partial input", () => {
    const result = buildLabelSuggestions("u", repoLabels, [], []);
    expect(result).toEqual(["bug", "feature", "urgent"]);
  });

  it("excludes labels already applied to the action", () => {
    const result = buildLabelSuggestions("", repoLabels, [], ["bug", "docs"]);
    expect(result).toEqual(["feature", "urgent"]);
  });

  it("combines repo labels and recent labels (deduplicated)", () => {
    const result = buildLabelSuggestions("", repoLabels, ["bug", "custom"], []);
    expect(result).toEqual(["bug", "custom", "feature", "docs", "urgent"]);
  });

  it("prioritizes recent labels over repo labels", () => {
    const result = buildLabelSuggestions("", repoLabels, ["urgent", "custom"], []);
    expect(result).toEqual(["urgent", "custom", "bug", "feature", "docs"]);
  });

  it("returns max 8 suggestions", () => {
    const manyLabels = Array.from({ length: 15 }, (_, i) => makeGitHubLabel({ name: `label${i}` }));
    const result = buildLabelSuggestions("", manyLabels, [], []);
    expect(result).toHaveLength(8);
  });

  it("returns empty array when no matches", () => {
    const result = buildLabelSuggestions("nonexistent", repoLabels, [], []);
    expect(result).toEqual([]);
  });

  it("handles empty repo labels and recent labels", () => {
    const result = buildLabelSuggestions("", [], [], []);
    expect(result).toEqual([]);
  });
});
