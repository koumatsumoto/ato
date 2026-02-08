import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../layout/Header";

const mockLogout = vi.fn();
let mockAuthState: { token: string | null; user: { login: string; id: number; avatarUrl: string } | null; isLoading: boolean };

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    state: mockAuthState,
    login: vi.fn(),
    logout: mockLogout,
  }),
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { token: null, user: null, isLoading: false };
  });

  it("renders app name", () => {
    render(<Header />);

    expect(screen.getByText("ATO")).toBeInTheDocument();
  });

  it("shows user avatar and logout when user is present", () => {
    mockAuthState = {
      token: "t",
      user: { login: "testuser", id: 1, avatarUrl: "https://example.com/avatar.jpg" },
      isLoading: false,
    };

    render(<Header />);

    const avatar = document.querySelector("img.rounded-full");
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("does not show avatar or logout when user is null", () => {
    render(<Header />);

    expect(document.querySelector("img.rounded-full")).toBeNull();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  it("calls logout on button click", async () => {
    mockAuthState = {
      token: "t",
      user: { login: "testuser", id: 1, avatarUrl: "https://example.com/avatar.jpg" },
      isLoading: false,
    };
    const user = userEvent.setup();

    render(<Header />);

    await user.click(screen.getByText("Logout"));

    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
