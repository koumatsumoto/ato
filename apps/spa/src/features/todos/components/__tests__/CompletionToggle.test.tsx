import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompletionToggle } from "../CompletionToggle";
import { makeTodo } from "@/shared/__tests__/factories";

const mockCloseMutate = vi.fn();
const mockReopenMutate = vi.fn();

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

describe("CompletionToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Complete' button for open todos", () => {
    render(<CompletionToggle todo={makeTodo({ state: "open" })} />);

    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
  });

  it("shows 'Reopen' button for closed todos", () => {
    render(<CompletionToggle todo={makeTodo({ state: "closed" })} />);

    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
  });

  it("calls closeTodo when completing an open todo", async () => {
    const user = userEvent.setup();
    render(<CompletionToggle todo={makeTodo({ id: 5, state: "open" })} />);

    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(mockCloseMutate).toHaveBeenCalledWith(5);
  });

  it("calls reopenTodo when reopening a closed todo", async () => {
    const user = userEvent.setup();
    render(<CompletionToggle todo={makeTodo({ id: 8, state: "closed" })} />);

    await user.click(screen.getByRole("button", { name: "Reopen" }));

    expect(mockReopenMutate).toHaveBeenCalledWith(8);
  });
});
