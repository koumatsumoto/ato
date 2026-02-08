import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LabelBadge } from "@/features/actions/components/LabelBadge";

describe("LabelBadge", () => {
  it("renders label name", () => {
    render(<LabelBadge name="bug" />);
    expect(screen.getByText("bug")).toBeInTheDocument();
  });

  it("does not render remove button when onRemove is not provided", () => {
    render(<LabelBadge name="bug" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders remove button when onRemove is provided", () => {
    render(<LabelBadge name="bug" onRemove={vi.fn()} />);
    expect(screen.getByRole("button", { name: "bugを削除" })).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();
    render(<LabelBadge name="feature" onRemove={handleRemove} />);

    await user.click(screen.getByRole("button", { name: "featureを削除" }));

    expect(handleRemove).toHaveBeenCalledOnce();
  });

  it("stops event propagation on remove click", async () => {
    const user = userEvent.setup();
    const parentClick = vi.fn();
    const handleRemove = vi.fn();

    render(
      <div onClick={parentClick}>
        <LabelBadge name="bug" onRemove={handleRemove} />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "bugを削除" }));

    expect(handleRemove).toHaveBeenCalledOnce();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
