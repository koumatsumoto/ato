import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Layout } from "../layout/Layout";

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    state: { token: null, user: null, isLoading: false },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("Layout", () => {
  it("renders Header and children", () => {
    render(
      <MemoryRouter>
        <Layout>Test content</Layout>
      </MemoryRouter>,
    );

    expect(screen.getByText("ATO")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders children inside main element", () => {
    render(
      <MemoryRouter>
        <Layout>Child element</Layout>
      </MemoryRouter>,
    );

    const main = document.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main?.textContent).toContain("Child element");
  });
});
