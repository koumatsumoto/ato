import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { LoginPage } from "../LoginPage";

const mockLogin = vi.fn();
let mockAuthState = { token: null as string | null, user: null, isLoading: false };

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    state: mockAuthState,
    login: mockLogin,
    logout: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { token: null, user: null, isLoading: false };
  });

  it("renders login button and app name", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("ATO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login with GitHub" })).toBeInTheDocument();
  });

  it("calls login on button click", async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Login with GitHub" }));

    expect(mockLogin).toHaveBeenCalledOnce();
  });

  it("shows error message when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("Popup blocked"));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Login with GitHub" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Popup blocked");
    });
  });

  it("shows loading state during login", async () => {
    let resolveLogin: () => void;
    mockLogin.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Login with GitHub" }));

    expect(screen.getByRole("button", { name: "Logging in..." })).toBeDisabled();

    resolveLogin!();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Login with GitHub" })).toBeEnabled();
    });
  });

  it("redirects to / when already authenticated", () => {
    mockAuthState = { token: "token", user: null, isLoading: false };
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "Login with GitHub" })).not.toBeInTheDocument();
  });
});
