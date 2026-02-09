import { describe, it, expect, beforeEach } from "vitest";
import { saveDraft, getDraft, removeDraft } from "@/features/actions/lib/draft-store";

const DRAFT_KEY_PREFIX = "ato:draft:";

function makeDraft(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test title",
    memo: "Test memo",
    savedAt: "2026-01-15T10:00:00Z",
    serverUpdatedAt: "2026-01-15T09:00:00Z",
    ...overrides,
  };
}

describe("draft-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("saveDraft", () => {
    it("saves draft to localStorage", () => {
      const draft = makeDraft();
      saveDraft(42, draft);

      const stored = localStorage.getItem(`${DRAFT_KEY_PREFIX}42`);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(draft);
    });

    it("overwrites existing draft for same actionId", () => {
      saveDraft(42, makeDraft({ title: "First" }));
      saveDraft(42, makeDraft({ title: "Second" }));

      const draft = getDraft(42);
      expect(draft?.title).toBe("Second");
    });

    it("stores drafts for different actionIds independently", () => {
      saveDraft(1, makeDraft({ title: "Action 1" }));
      saveDraft(2, makeDraft({ title: "Action 2" }));

      expect(getDraft(1)?.title).toBe("Action 1");
      expect(getDraft(2)?.title).toBe("Action 2");
    });
  });

  describe("getDraft", () => {
    it("returns null when no draft exists", () => {
      expect(getDraft(999)).toBeNull();
    });

    it("returns stored draft", () => {
      const draft = makeDraft();
      saveDraft(42, draft);

      expect(getDraft(42)).toEqual(draft);
    });

    it("returns null and cleans up corrupted JSON", () => {
      localStorage.setItem(`${DRAFT_KEY_PREFIX}42`, "not-valid-json");

      expect(getDraft(42)).toBeNull();
      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}42`)).toBeNull();
    });

    it("returns null and cleans up invalid schema", () => {
      localStorage.setItem(`${DRAFT_KEY_PREFIX}42`, JSON.stringify({ wrong: "shape" }));

      expect(getDraft(42)).toBeNull();
      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}42`)).toBeNull();
    });

    it("returns null and cleans up when title is missing", () => {
      localStorage.setItem(
        `${DRAFT_KEY_PREFIX}42`,
        JSON.stringify({ memo: "memo", savedAt: "2026-01-15T10:00:00Z", serverUpdatedAt: "2026-01-15T09:00:00Z" }),
      );

      expect(getDraft(42)).toBeNull();
    });
  });

  describe("removeDraft", () => {
    it("removes stored draft", () => {
      saveDraft(42, makeDraft());
      removeDraft(42);

      expect(getDraft(42)).toBeNull();
      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}42`)).toBeNull();
    });

    it("does nothing when no draft exists", () => {
      removeDraft(999);
      expect(localStorage.getItem(`${DRAFT_KEY_PREFIX}999`)).toBeNull();
    });
  });
});
