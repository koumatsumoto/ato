import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { DetailPage } from "../DetailPage";
import type { Todo } from "@/types";
import { makeTodo } from "@/shared/__tests__/factories";

const mockNavigate = vi.fn();
const mockUpdateMutate = vi.fn();
let mockTodoReturn: { data: Todo | undefined; isLoading: boolean };

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: () => ({ id: "5" }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/features/todos/hooks/use-todos", () => ({
  useTodo: () => mockTodoReturn,
  useUpdateTodo: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useCloseTodo: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenTodo: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("DetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTodoReturn = { data: undefined, isLoading: false };
  });

  it("shows loading skeleton while loading", () => {
    mockTodoReturn = { data: undefined, isLoading: true };

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status", { name: "Loading todo" })).toBeInTheDocument();
  });

  it("shows not found when todo does not exist", () => {
    mockTodoReturn = { data: undefined, isLoading: false };

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Not Found")).toBeInTheDocument();
  });

  it("renders todo title and body when loaded", () => {
    mockTodoReturn = { data: makeTodo({ title: "My task", body: "Some notes" }), isLoading: false };

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByDisplayValue("My task")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Some notes")).toBeInTheDocument();
  });

  it("navigates back on back button click", async () => {
    mockTodoReturn = { data: makeTodo(), isLoading: false };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("Back"));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("enables save button when content is edited", async () => {
    mockTodoReturn = { data: makeTodo(), isLoading: false };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeDisabled();

    await user.type(screen.getByDisplayValue("Test todo"), " updated");

    expect(saveButton).toBeEnabled();
  });

  it("calls updateTodo on save", async () => {
    mockTodoReturn = { data: makeTodo({ id: 5, title: "Original", body: "Test body" }), isLoading: false };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    const titleInput = screen.getByDisplayValue("Original");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated title");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }), expect.any(Object));
  });
});
