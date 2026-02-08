import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LabelEditor } from "../components/LabelEditor";

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
  addRecentLabels: vi.fn(),
}));

vi.mock("@/shared/hooks/use-click-outside", () => ({
  useClickOutside: vi.fn(),
}));

describe("LabelEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders existing labels as badges", () => {
    render(<LabelEditor labels={["bug", "feature"]} onChange={vi.fn()} />);

    expect(screen.getByText("bug")).toBeInTheDocument();
    expect(screen.getByText("feature")).toBeInTheDocument();
  });

  it("renders placeholder when no labels", () => {
    render(<LabelEditor labels={[]} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("ラベルを追加...")).toBeInTheDocument();
  });

  it("hides placeholder when labels exist", () => {
    render(<LabelEditor labels={["bug"]} onChange={vi.fn()} />);

    expect(screen.queryByPlaceholderText("ラベルを追加...")).not.toBeInTheDocument();
  });

  it("shows suggestions on focus", async () => {
    const user = userEvent.setup();
    render(<LabelEditor labels={[]} onChange={vi.fn()} />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("filters suggestions by input", async () => {
    const user = userEvent.setup();
    render(<LabelEditor labels={[]} onChange={vi.fn()} />);

    await user.type(screen.getByRole("combobox"), "bu");

    expect(screen.getByText("bug")).toBeInTheDocument();
    expect(screen.queryByText("docs")).not.toBeInTheDocument();
  });

  it("adds label on Enter key", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LabelEditor labels={[]} onChange={handleChange} />);

    await user.type(screen.getByRole("combobox"), "bug{Enter}");

    expect(handleChange).toHaveBeenCalledWith(["bug"]);
  });

  it("adds label by clicking suggestion", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LabelEditor labels={[]} onChange={handleChange} />);

    await user.click(screen.getByRole("combobox"));
    const options = screen.getAllByRole("option");
    const bugButton = options.find((opt) => opt.textContent?.includes("bug"));
    if (bugButton) {
      const btn = bugButton.querySelector("button");
      if (btn) await user.click(btn);
    }

    expect(handleChange).toHaveBeenCalled();
  });

  it("removes label on badge remove click", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LabelEditor labels={["bug", "feature"]} onChange={handleChange} />);

    await user.click(screen.getByRole("button", { name: "bugを削除" }));

    expect(handleChange).toHaveBeenCalledWith(["feature"]);
  });

  it("removes last label on Backspace when input is empty", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LabelEditor labels={["bug", "feature"]} onChange={handleChange} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{Backspace}");

    expect(handleChange).toHaveBeenCalledWith(["bug"]);
  });

  it("shows create option for new label names", async () => {
    const user = userEvent.setup();
    render(<LabelEditor labels={[]} onChange={vi.fn()} />);

    await user.type(screen.getByRole("combobox"), "newlabel");

    expect(screen.getByText(/newlabel/)).toBeInTheDocument();
  });

  it("does not add duplicate labels", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LabelEditor labels={["bug"]} onChange={handleChange} />);

    await user.type(screen.getByRole("combobox"), "bug{Enter}");

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("has correct ARIA attributes on combobox", () => {
    render(<LabelEditor labels={[]} onChange={vi.fn()} />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-controls", "label-editor-listbox");
  });
});
