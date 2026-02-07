import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoAddForm } from "../TodoAddForm";

const mockMutate = vi.fn();

vi.mock("@/features/todos/hooks/use-todos", () => ({
  useCreateTodo: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe("TodoAddForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input and add button", () => {
    render(<TodoAddForm />);

    expect(screen.getByPlaceholderText("Add a todo...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("submits a todo on form submit", async () => {
    const user = userEvent.setup();
    render(<TodoAddForm />);

    const input = screen.getByPlaceholderText("Add a todo...");
    await user.type(input, "New task");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mockMutate).toHaveBeenCalledWith({ title: "New task" });
  });

  it("clears input after submit", async () => {
    const user = userEvent.setup();
    render(<TodoAddForm />);

    const input = screen.getByPlaceholderText("Add a todo...");
    await user.type(input, "New task");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(input).toHaveValue("");
  });

  it("does not submit when input is empty or whitespace", async () => {
    const user = userEvent.setup();
    render(<TodoAddForm />);

    const input = screen.getByPlaceholderText("Add a todo...");
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("disables add button when input is empty", () => {
    render(<TodoAddForm />);

    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});
