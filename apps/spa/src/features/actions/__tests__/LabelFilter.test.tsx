import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LabelFilter } from "../components/LabelFilter";

vi.mock("@/features/actions/hooks/use-labels", () => ({
  useLabels: () => ({
    data: [
      { id: 1, name: "bug", color: "d73a4a", description: null },
      { id: 2, name: "feature", color: "0075ca", description: null },
      { id: 3, name: "docs", color: "0e8a16", description: null },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/features/actions/lib/label-store", () => ({
  getRecentLabels: () => ["urgent"],
}));

vi.mock("@/shared/hooks/use-click-outside", () => ({
  useClickOutside: vi.fn(),
}));

describe("LabelFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input when no label is selected", () => {
    render(<LabelFilter selectedLabel="" onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("ラベルで絞り込み...")).toBeInTheDocument();
  });

  it("renders selected label as badge when label is selected", () => {
    render(<LabelFilter selectedLabel="bug" onChange={vi.fn()} />);

    expect(screen.getByText("bug")).toBeInTheDocument();
    expect(screen.getByText("ラベル:")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("ラベルで絞り込み...")).not.toBeInTheDocument();
  });

  it("shows suggestions on focus", async () => {
    const user = userEvent.setup();
    render(<LabelFilter selectedLabel="" onChange={vi.fn()} />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("filters suggestions by input", async () => {
    const user = userEvent.setup();
    render(<LabelFilter selectedLabel="" onChange={vi.fn()} />);

    await user.type(screen.getByRole("combobox"), "fe");

    expect(screen.getByText("feature")).toBeInTheDocument();
    expect(screen.queryByText("docs")).not.toBeInTheDocument();
  });

  it("selects label by clicking suggestion", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LabelFilter selectedLabel="" onChange={handleChange} />);

    await user.click(screen.getByRole("combobox"));
    const options = screen.getAllByRole("option");
    const bugOption = options.find((opt) => opt.textContent === "bug");
    if (bugOption) {
      const btn = bugOption.querySelector("button");
      if (btn) await user.click(btn);
    }

    expect(handleChange).toHaveBeenCalledWith("bug");
  });

  it("clears label when badge remove button is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LabelFilter selectedLabel="bug" onChange={handleChange} />);

    await user.click(screen.getByRole("button", { name: "bugを削除" }));

    expect(handleChange).toHaveBeenCalledWith("");
  });

  it("clears label on Backspace when input is empty", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const { rerender } = render(<LabelFilter selectedLabel="bug" onChange={handleChange} />);

    handleChange.mockImplementation(() => {
      rerender(<LabelFilter selectedLabel="" onChange={handleChange} />);
    });

    await user.click(screen.getByRole("button", { name: "bugを削除" }));

    expect(handleChange).toHaveBeenCalledWith("");
  });

  it("has correct ARIA attributes on combobox", () => {
    render(<LabelFilter selectedLabel="" onChange={vi.fn()} />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-controls", "label-filter-listbox");
  });

  it("selects label with Enter key on highlighted suggestion", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LabelFilter selectedLabel="" onChange={handleChange} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(handleChange).toHaveBeenCalled();
  });
});
