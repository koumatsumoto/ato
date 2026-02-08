import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Header } from "@/shared/components/layout/Header";

const mockLogout = vi.fn();
let mockAuthState: { token: string | null; user: { login: string; id: number; avatarUrl: string } | null; isLoading: boolean };

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    state: mockAuthState,
    login: vi.fn(),
    logout: mockLogout,
  }),
}));

vi.mock("@/shared/hooks/use-click-outside", () => ({
  useClickOutside: vi.fn(),
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { token: null, user: null, isLoading: false };
  });

  it("renders app name", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByText("ATO")).toBeInTheDocument();
  });

  it("shows user avatar button when user is present", () => {
    mockAuthState = {
      token: "t",
      user: { login: "testuser", id: 1, avatarUrl: "https://example.com/avatar.jpg" },
      isLoading: false,
    };

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const avatar = document.querySelector("img.rounded-full");
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("does not show avatar when user is null", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(document.querySelector("img.rounded-full")).toBeNull();
    expect(screen.queryByLabelText("メニュー")).not.toBeInTheDocument();
  });

  it("shows logout option in dropdown menu after clicking avatar", async () => {
    mockAuthState = {
      token: "t",
      user: { login: "testuser", id: 1, avatarUrl: "https://example.com/avatar.jpg" },
      isLoading: false,
    };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText("メニュー"));

    expect(screen.getByText("ログアウト")).toBeInTheDocument();
    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  it("shows version in dropdown menu", async () => {
    mockAuthState = {
      token: "t",
      user: { login: "testuser", id: 1, avatarUrl: "https://example.com/avatar.jpg" },
      isLoading: false,
    };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText("メニュー"));

    expect(screen.getByText("version: test000@0101T0000")).toBeInTheDocument();
  });

  it("calls logout on menu logout button click", async () => {
    mockAuthState = {
      token: "t",
      user: { login: "testuser", id: 1, avatarUrl: "https://example.com/avatar.jpg" },
      isLoading: false,
    };
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText("メニュー"));
    await user.click(screen.getByText("ログアウト"));

    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
