import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { TodoItem } from "../TodoItem";
import { makeTodo } from "@/shared/__tests__/factories";

const mockNavigate = vi.fn();
const mockCloseMutate = vi.fn();
const mockReopenMutate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/features/todos/hooks/use-todos", () => ({
  useCloseTodo: () => ({
    mutate: mockCloseMutate,
    isPending: false,
  }),
  useReopenTodo: () => ({
    mutate: mockReopenMutate,
    isPending: false,
  }),
}));

describe("TodoItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the todo title", () => {
    render(
      <MemoryRouter>
        <TodoItem todo={makeTodo({ title: "My task" })} />
      </MemoryRouter>,
    );

    expect(screen.getByText("My task")).toBeInTheDocument();
  });

  it("navigates to detail page on click", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TodoItem todo={makeTodo({ id: 42 })} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /test todo/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/todos/42");
  });

  it("calls closeTodo when toggling an open todo", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TodoItem todo={makeTodo({ id: 3, state: "open" })} />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText("Mark as complete"));

    expect(mockCloseMutate).toHaveBeenCalledWith(3);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("calls reopenTodo when toggling a closed todo", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TodoItem todo={makeTodo({ id: 7, state: "closed" })} />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText("Mark as incomplete"));

    expect(mockReopenMutate).toHaveBeenCalledWith(7);
  });

  it("shows check icon for closed todos", () => {
    render(
      <MemoryRouter>
        <TodoItem todo={makeTodo({ state: "closed" })} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Test todo")).toHaveClass("line-through");
  });
});
