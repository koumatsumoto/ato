import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { CompletedPage } from "../CompletedPage";
import type { Todo } from "@/types";
import { makeTodo } from "@/shared/__tests__/factories";

const mockFetchNextPage = vi.fn();
const mockRefetch = vi.fn();
let mockClosedTodosReturn: {
  data: { pages: Array<{ todos: readonly Todo[] }> } | undefined;
  fetchNextPage: typeof mockFetchNextPage;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
};

vi.mock("@/features/todos/hooks/use-todos", () => ({
  useClosedTodos: () => mockClosedTodosReturn,
  useCloseTodo: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenTodo: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("CompletedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClosedTodosReturn = {
      data: undefined,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
  });

  it("shows loading skeleton while loading", () => {
    mockClosedTodosReturn = { ...mockClosedTodosReturn, isLoading: true };

    render(
      <MemoryRouter>
        <CompletedPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status", { name: "Loading todos" })).toBeInTheDocument();
  });

  it("shows empty state when no completed todos", () => {
    mockClosedTodosReturn = { ...mockClosedTodosReturn, data: { pages: [{ todos: [] }] } };

    render(
      <MemoryRouter>
        <CompletedPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("No completed todos")).toBeInTheDocument();
  });

  it("renders completed todos", () => {
    mockClosedTodosReturn = {
      ...mockClosedTodosReturn,
      data: {
        pages: [{ todos: [makeTodo({ id: 1, title: "Done 1" }), makeTodo({ id: 2, title: "Done 2" })] }],
      },
    };

    render(
      <MemoryRouter>
        <CompletedPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Done 1")).toBeInTheDocument();
    expect(screen.getByText("Done 2")).toBeInTheDocument();
  });

  it("shows load more button when hasNextPage is true", () => {
    mockClosedTodosReturn = { ...mockClosedTodosReturn, data: { pages: [{ todos: [makeTodo()] }] }, hasNextPage: true };

    render(
      <MemoryRouter>
        <CompletedPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument();
  });

  it("calls fetchNextPage when load more is clicked", async () => {
    mockClosedTodosReturn = { ...mockClosedTodosReturn, data: { pages: [{ todos: [makeTodo()] }] }, hasNextPage: true };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CompletedPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(mockFetchNextPage).toHaveBeenCalledOnce();
  });

  it("shows error banner when fetch fails", () => {
    mockClosedTodosReturn = { ...mockClosedTodosReturn, error: new Error("API error") };

    render(
      <MemoryRouter>
        <CompletedPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("API error");
  });

  it("shows back to todos link", () => {
    mockClosedTodosReturn = { ...mockClosedTodosReturn, data: { pages: [{ todos: [] }] } };

    render(
      <MemoryRouter>
        <CompletedPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Back to todos")).toBeInTheDocument();
  });
});
