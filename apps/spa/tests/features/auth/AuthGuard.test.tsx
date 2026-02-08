import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthGuard } from "@/features/auth/components/AuthGuard";

let mockState: { token: string | null; user: { login: string; id: number; avatarUrl: string } | null; isLoading: boolean };

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    state: mockState,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { token: null, user: null, isLoading: false };
  });

  it("shows loading skeleton when loading", () => {
    mockState = { token: "t", user: null, isLoading: true };

    render(
      <MemoryRouter>
        <AuthGuard />
      </MemoryRouter>,
    );

    expect(document.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("redirects to /login when no token", () => {
    mockState = { token: null, user: null, isLoading: false };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route index element={<div>Protected</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("renders child routes when authenticated", () => {
    mockState = {
      token: "valid-token",
      user: { login: "user", id: 1, avatarUrl: "https://example.com/avatar" },
      isLoading: false,
    };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route index element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.getByText("ATO")).toBeInTheDocument();
  });
});
