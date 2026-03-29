import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ActionItem } from "@/features/actions/components/ActionItem";
import { makeAction } from "../../factories";

const mockNavigate = vi.fn();
const mockCloseMutate = vi.fn();
const mockReopenMutate = vi.fn();
let mockCloseIsPending = false;
let mockReopenIsPending = false;

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
    get isPending() {
      return mockCloseIsPending;
    },
  }),
  useReopenAction: () => ({
    mutate: mockReopenMutate,
    get isPending() {
      return mockReopenIsPending;
    },
  }),
}));

describe("ActionItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCloseIsPending = false;
    mockReopenIsPending = false;
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

  it("renders CheckCircleIcon for open actions", () => {
    render(
      <MemoryRouter>
        <ActionItem action={makeAction({ state: "open" })} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
  });

  it("renders CheckCircleSolidIcon for closed actions", () => {
    render(
      <MemoryRouter>
        <ActionItem action={makeAction({ state: "closed" })} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("check-circle-solid-icon")).toBeInTheDocument();
  });

  describe("saving state (negative ID)", () => {
    it("renders with reduced opacity when action has negative ID", () => {
      const { container } = render(
        <MemoryRouter>
          <ActionItem action={makeAction({ id: -1 })} />
        </MemoryRouter>,
      );

      const row = container.querySelector("[role='button']");
      if (!row) throw new Error("Expected row element");
      expect(row.className).toContain("opacity-50");
    });

    it("does not navigate when clicking a saving action", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <ActionItem action={makeAction({ id: -2 })} />
        </MemoryRouter>,
      );

      await user.click(screen.getByText("Test action"));
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("does not call close when toggling a saving action", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <ActionItem action={makeAction({ id: -1, state: "open" })} />
        </MemoryRouter>,
      );

      await user.click(screen.getByLabelText("完了にする"));
      expect(mockCloseMutate).not.toHaveBeenCalled();
    });

    it("has disabled toggle button when saving", () => {
      render(
        <MemoryRouter>
          <ActionItem action={makeAction({ id: -3 })} />
        </MemoryRouter>,
      );

      expect(screen.getByLabelText("完了にする")).toBeDisabled();
    });

    it("has aria-disabled attribute when saving", () => {
      const { container } = render(
        <MemoryRouter>
          <ActionItem action={makeAction({ id: -1 })} />
        </MemoryRouter>,
      );

      const row = container.querySelector("[role='button']");
      if (!row) throw new Error("Expected row element");
      expect(row).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("double-click prevention", () => {
    it("disables toggle button while close mutation is pending", () => {
      mockCloseIsPending = true;
      render(
        <MemoryRouter>
          <ActionItem action={makeAction({ state: "open" })} />
        </MemoryRouter>,
      );

      expect(screen.getByLabelText("完了にする")).toBeDisabled();
    });

    it("disables toggle button while reopen mutation is pending", () => {
      mockReopenIsPending = true;
      render(
        <MemoryRouter>
          <ActionItem action={makeAction({ state: "closed" })} />
        </MemoryRouter>,
      );

      expect(screen.getByLabelText("未完了に戻す")).toBeDisabled();
    });

    it("does not call closeAction again during exit animation", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <ActionItem action={makeAction({ id: 5, state: "open" })} />
        </MemoryRouter>,
      );

      await user.click(screen.getByLabelText("完了にする"));
      // Button should be disabled after first click (isExiting = true)
      expect(screen.getByLabelText("完了にする")).toBeDisabled();
    });
  });
});
