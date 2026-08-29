import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthGuard } from "@/features/auth/components/AuthGuard";

let mockState: { token: string | null; user: { login: string; id: number; avatarUrl: string } | null; isLoading: boolean };

vi.mock("@koumatsumoto/gh-auth-bridge-client/react", () => ({
  useAuth: () => ({
    state: mockState,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockState = { token: null, user: null, isLoading: false };
  });

  it("renders child routes while identity is loading when a token exists", () => {
    mockState = { token: "t", user: null, isLoading: true };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route index element={<div>Composer route</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Composer route")).toBeInTheDocument();
    expect(screen.getByText("ATO")).toBeInTheDocument();
  });

  it("waits for identity before mounting a non-TOP route", () => {
    mockState = { token: "t", user: null, isLoading: true };

    const view = render(
      <MemoryRouter initialEntries={["/share"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/share" element={<div>Share side effect</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status", { name: "認証情報を確認中" })).toBeInTheDocument();
    expect(screen.queryByText("Share side effect")).not.toBeInTheDocument();

    mockState = { token: "t", user: { login: "user", id: 1, avatarUrl: "https://example.com/avatar" }, isLoading: false };
    view.rerender(
      <MemoryRouter initialEntries={["/share"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/share" element={<div>Share side effect</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Share side effect")).toBeInTheDocument();
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

  it("saves redirect path to sessionStorage when redirecting to login", () => {
    mockState = { token: null, user: null, isLoading: false };

    render(
      <MemoryRouter initialEntries={["/share?url=https://example.com&title=Test"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/share" element={<div>Share Page</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(sessionStorage.getItem("ato:redirect-after-login")).toBe("/share?url=https://example.com&title=Test");
  });

  it("does not save redirect path for root path", () => {
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

    expect(sessionStorage.getItem("ato:redirect-after-login")).toBeNull();
  });
});
