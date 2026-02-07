import type { Todo } from "@/types";

export function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    title: "Test todo",
    body: "",
    state: "open",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    closedAt: null,
    url: "https://github.com/user/ato-datastore/issues/1",
    ...overrides,
  };
}
