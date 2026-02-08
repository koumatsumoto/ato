import type { Action } from "@/types";

export function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: 1,
    title: "Test action",
    body: "",
    state: "open",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    closedAt: null,
    url: "https://github.com/user/ato-datastore/issues/1",
    ...overrides,
  };
}
