import { describe, it, expect } from "vitest";
import { createActionSchema, updateActionSchema, labelSchema, labelsSchema } from "../lib/validation";

describe("createActionSchema", () => {
  it("accepts valid input", () => {
    const result = createActionSchema.safeParse({ title: "My task" });
    expect(result.success).toBe(true);
  });

  it("accepts title with body", () => {
    const result = createActionSchema.safeParse({ title: "My task", body: "Details" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createActionSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title over 256 characters", () => {
    const result = createActionSchema.safeParse({ title: "a".repeat(257) });
    expect(result.success).toBe(false);
  });

  it("accepts title at exactly 256 characters", () => {
    const result = createActionSchema.safeParse({ title: "a".repeat(256) });
    expect(result.success).toBe(true);
  });
});

describe("updateActionSchema", () => {
  it("accepts valid title and body", () => {
    const result = updateActionSchema.safeParse({ title: "Updated", body: "New body" });
    expect(result.success).toBe(true);
  });

  it("accepts empty body", () => {
    const result = updateActionSchema.safeParse({ title: "Updated", body: "" });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = updateActionSchema.safeParse({ body: "New body" });
    expect(result.success).toBe(false);
  });

  it("rejects empty string title", () => {
    const result = updateActionSchema.safeParse({ title: "", body: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid labels", () => {
    const result = updateActionSchema.safeParse({ title: "Test", body: "", labels: ["bug", "feature"] });
    expect(result.success).toBe(true);
  });

  it("accepts without labels", () => {
    const result = updateActionSchema.safeParse({ title: "Test", body: "" });
    expect(result.success).toBe(true);
  });
});

describe("labelSchema", () => {
  it("accepts valid label names", () => {
    expect(labelSchema.safeParse("bug").success).toBe(true);
    expect(labelSchema.safeParse("feature").success).toBe(true);
    expect(labelSchema.safeParse("v1.0").success).toBe(true);
    expect(labelSchema.safeParse("high-priority").success).toBe(true);
    expect(labelSchema.safeParse("bug_fix").success).toBe(true);
  });

  it("accepts Japanese label names", () => {
    expect(labelSchema.safeParse("バグ").success).toBe(true);
    expect(labelSchema.safeParse("機能追加").success).toBe(true);
    expect(labelSchema.safeParse("緊急").success).toBe(true);
  });

  it("rejects empty string", () => {
    expect(labelSchema.safeParse("").success).toBe(false);
  });

  it("rejects string with spaces", () => {
    expect(labelSchema.safeParse("my label").success).toBe(false);
    expect(labelSchema.safeParse(" bug").success).toBe(false);
    expect(labelSchema.safeParse("bug ").success).toBe(false);
  });

  it("rejects string with comma", () => {
    expect(labelSchema.safeParse("a,b").success).toBe(false);
  });

  it("rejects string with double quote", () => {
    expect(labelSchema.safeParse('a"b').success).toBe(false);
    expect(labelSchema.safeParse('"bug"').success).toBe(false);
  });

  it("rejects label over 50 characters", () => {
    expect(labelSchema.safeParse("a".repeat(51)).success).toBe(false);
  });

  it("accepts label at exactly 50 characters", () => {
    expect(labelSchema.safeParse("a".repeat(50)).success).toBe(true);
  });
});

describe("labelsSchema", () => {
  it("accepts empty array", () => {
    expect(labelsSchema.safeParse([]).success).toBe(true);
  });

  it("accepts array of valid labels", () => {
    expect(labelsSchema.safeParse(["bug", "feature", "v1.0"]).success).toBe(true);
  });

  it("rejects array with more than 10 items", () => {
    const labels = Array.from({ length: 11 }, (_, i) => `label${i}`);
    expect(labelsSchema.safeParse(labels).success).toBe(false);
  });

  it("accepts array with exactly 10 items", () => {
    const labels = Array.from({ length: 10 }, (_, i) => `label${i}`);
    expect(labelsSchema.safeParse(labels).success).toBe(true);
  });

  it("rejects array with duplicates", () => {
    expect(labelsSchema.safeParse(["bug", "feature", "bug"]).success).toBe(false);
  });

  it("rejects array with invalid label", () => {
    expect(labelsSchema.safeParse(["bug", "my label"]).success).toBe(false);
  });
});

describe("createActionSchema with labels", () => {
  it("accepts input with valid labels", () => {
    const result = createActionSchema.safeParse({ title: "Task", labels: ["bug"] });
    expect(result.success).toBe(true);
  });

  it("accepts input without labels", () => {
    const result = createActionSchema.safeParse({ title: "Task" });
    expect(result.success).toBe(true);
  });

  it("rejects input with invalid labels", () => {
    const result = createActionSchema.safeParse({ title: "Task", labels: [""] });
    expect(result.success).toBe(false);
  });
});
