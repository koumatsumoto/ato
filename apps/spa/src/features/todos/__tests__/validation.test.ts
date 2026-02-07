import { describe, it, expect } from "vitest";
import { createTodoSchema, updateTodoSchema } from "../lib/validation";

describe("createTodoSchema", () => {
  it("accepts valid input", () => {
    const result = createTodoSchema.safeParse({ title: "My task" });
    expect(result.success).toBe(true);
  });

  it("accepts title with body", () => {
    const result = createTodoSchema.safeParse({ title: "My task", body: "Details" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createTodoSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title over 256 characters", () => {
    const result = createTodoSchema.safeParse({ title: "a".repeat(257) });
    expect(result.success).toBe(false);
  });

  it("accepts title at exactly 256 characters", () => {
    const result = createTodoSchema.safeParse({ title: "a".repeat(256) });
    expect(result.success).toBe(true);
  });
});

describe("updateTodoSchema", () => {
  it("accepts partial update with title only", () => {
    const result = updateTodoSchema.safeParse({ title: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with body only", () => {
    const result = updateTodoSchema.safeParse({ body: "New body" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateTodoSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects empty string title", () => {
    const result = updateTodoSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});
