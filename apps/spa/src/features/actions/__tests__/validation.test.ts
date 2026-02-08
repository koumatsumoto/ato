import { describe, it, expect } from "vitest";
import { createActionSchema, updateActionSchema } from "../lib/validation";

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
});
