import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ActionItem } from "../ActionItem";
import { makeAction } from "@/shared/__tests__/factories";

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

vi.mock("@/features/actions/hooks/use-actions", () => ({
  useCloseAction: () => ({
    mutate: mockCloseMutate,
    isPending: false,
  }),
  useReopenAction: () => ({
    mutate: mockReopenMutate,
    isPending: false,
  }),
}));

describe("ActionItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the action title", () => {
    render(
      <MemoryRouter>
        <ActionItem action={makeAction({ title: "My task" })} />
      </MemoryRouter>,
    );

    expect(screen.getByText("My task")).toBeInTheDocument();
  });

  it("navigates to detail page on click", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ActionItem action={makeAction({ id: 42 })} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /test action/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/actions/42");
  });

  it("calls closeAction when toggling an open action (after animation delay)", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ActionItem action={makeAction({ id: 3, state: "open" })} />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText("完了にする"));

    await waitFor(
      () => {
        expect(mockCloseMutate).toHaveBeenCalledWith(3);
      },
      { timeout: 500 },
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("calls reopenAction when toggling a closed action", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ActionItem action={makeAction({ id: 7, state: "closed" })} />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText("未完了に戻す"));

    expect(mockReopenMutate).toHaveBeenCalledWith(7);
  });

  it("shows check icon for closed actions", () => {
    render(
      <MemoryRouter>
        <ActionItem action={makeAction({ state: "closed" })} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Test action")).toHaveClass("line-through");
  });
});
