import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodoEmptyState } from "../TodoEmptyState";

describe("TodoEmptyState", () => {
  it("renders empty state message", () => {
    render(<TodoEmptyState />);

    expect(screen.getByText("No todos yet. Add one above!")).toBeInTheDocument();
  });
});
