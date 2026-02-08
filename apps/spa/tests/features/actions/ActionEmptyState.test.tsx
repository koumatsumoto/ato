import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionEmptyState } from "@/features/actions/components/ActionEmptyState";

describe("ActionEmptyState", () => {
  it("renders empty state message", () => {
    render(<ActionEmptyState />);

    expect(screen.getByText("行動はまだありません。下のフォームから追加しましょう。")).toBeInTheDocument();
  });
});
