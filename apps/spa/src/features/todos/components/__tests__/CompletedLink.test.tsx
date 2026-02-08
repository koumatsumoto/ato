import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CompletedLink } from "../CompletedLink";

describe("CompletedLink", () => {
  it("renders link to completed page", () => {
    render(
      <MemoryRouter>
        <CompletedLink />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "View completed todos" });
    expect(link).toHaveAttribute("href", "/completed");
  });
});
