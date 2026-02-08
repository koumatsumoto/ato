import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompletionToggle } from "../CompletionToggle";
import { makeAction } from "@/shared/__tests__/factories";

const mockCloseMutate = vi.fn();
const mockReopenMutate = vi.fn();

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

describe("CompletionToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows '完了' button for open actions", () => {
    render(<CompletionToggle action={makeAction({ state: "open" })} />);

    expect(screen.getByRole("button", { name: "完了" })).toBeInTheDocument();
  });

  it("shows '再開' button for closed actions", () => {
    render(<CompletionToggle action={makeAction({ state: "closed" })} />);

    expect(screen.getByRole("button", { name: "再開" })).toBeInTheDocument();
  });

  it("calls closeAction when completing an open action", async () => {
    const user = userEvent.setup();
    render(<CompletionToggle action={makeAction({ id: 5, state: "open" })} />);

    await user.click(screen.getByRole("button", { name: "完了" }));

    expect(mockCloseMutate).toHaveBeenCalledWith(5);
  });

  it("calls reopenAction when reopening a closed action", async () => {
    const user = userEvent.setup();
    render(<CompletionToggle action={makeAction({ id: 8, state: "closed" })} />);

    await user.click(screen.getByRole("button", { name: "再開" }));

    expect(mockReopenMutate).toHaveBeenCalledWith(8);
  });
});
