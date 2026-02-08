import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListSkeleton } from "../ListSkeleton";
import { DetailSkeleton } from "../DetailSkeleton";

vi.mock("@uiball/loaders", () => ({
  Waveform: () => <div data-testid="waveform" />,
}));

describe("ListSkeleton", () => {
  it("renders with status role and accessible label", () => {
    render(<ListSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAccessibleName("行動を読み込み中");
  });
});

describe("DetailSkeleton", () => {
  it("renders with status role and accessible label", () => {
    render(<DetailSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAccessibleName("行動を読み込み中");
  });
});
