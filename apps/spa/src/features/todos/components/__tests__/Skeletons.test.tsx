import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListSkeleton } from "../ListSkeleton";
import { DetailSkeleton } from "../DetailSkeleton";

describe("ListSkeleton", () => {
  it("renders with status role and accessible label", () => {
    render(<ListSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAccessibleName("Loading todos");
  });

  it("renders 5 placeholder items", () => {
    const { container } = render(<ListSkeleton />);

    const items = container.querySelectorAll("[role='status'] > div");
    expect(items).toHaveLength(5);
  });
});

describe("DetailSkeleton", () => {
  it("renders with status role and accessible label", () => {
    render(<DetailSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAccessibleName("Loading todo");
  });
});
