import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { MainPage } from "../MainPage";
import type { Todo } from "@/types";
import { makeTodo } from "@/shared/__tests__/factories";

const mockRefetch = vi.fn();

let mockOpenTodosReturn: {
  data: { todos: readonly Todo[] } | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
};

vi.mock("@/features/todos/hooks/use-todos", () => ({
  useOpenTodos: () => mockOpenTodosReturn,
  useCreateTodo: () => ({ mutate: vi.fn(), isPending: false }),
  useCloseTodo: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenTodo: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("MainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenTodosReturn = { data: undefined, isLoading: false, error: null, refetch: mockRefetch };
  });

  it("shows loading skeleton when loading", () => {
    mockOpenTodosReturn = { data: undefined, isLoading: true, error: null };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status", { name: "Loading todos" })).toBeInTheDocument();
  });

  it("shows empty state when no todos", () => {
    mockOpenTodosReturn = { data: { todos: [] }, isLoading: false, error: null };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("No todos yet. Add one above!")).toBeInTheDocument();
  });

  it("renders todo items when data is available", () => {
    mockOpenTodosReturn = {
      data: {
        todos: [makeTodo({ id: 1, title: "First" }), makeTodo({ id: 2, title: "Second" })],
      },
      isLoading: false,
      error: null,
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("shows error message when fetch fails", () => {
    mockOpenTodosReturn = {
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
  });

  it("shows completed link", () => {
    mockOpenTodosReturn = { data: { todos: [] }, isLoading: false, error: null };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("View completed todos")).toBeInTheDocument();
  });
});
