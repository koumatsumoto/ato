import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SharePage } from "@/app/pages/SharePage";

const mockMutate = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/features/actions/hooks/use-actions", () => ({
  useCreateAction: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    state: { token: "token", user: { login: "user", id: 1, avatarUrl: "" }, isLoading: false },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("SharePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates action with title and URL from share params", () => {
    render(
      <MemoryRouter initialEntries={["/share?url=https://example.com&title=Example%20Page"]}>
        <SharePage />
      </MemoryRouter>,
    );

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      {
        title: "読む：Example Page",
        memo: "https://example.com",
        labels: ["あとで読む"],
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("uses URL as title fallback when title is missing", () => {
    render(
      <MemoryRouter initialEntries={["/share?url=https://example.com/article"]}>
        <SharePage />
      </MemoryRouter>,
    );

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "読む：https://example.com/article",
      }),
      expect.any(Object),
    );
  });

  it("uses text as fallback when URL and title are missing", () => {
    render(
      <MemoryRouter initialEntries={["/share?text=Interesting%20article"]}>
        <SharePage />
      </MemoryRouter>,
    );

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "読む：Interesting article",
      }),
      expect.any(Object),
    );
  });

  it("includes both URL and text in memo", () => {
    render(
      <MemoryRouter initialEntries={["/share?url=https://example.com&text=Check%20this%20out&title=Page"]}>
        <SharePage />
      </MemoryRouter>,
    );

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        memo: "https://example.com\n\nCheck this out",
      }),
      expect.any(Object),
    );
  });

  it("shows error when no share data is provided", () => {
    render(
      <MemoryRouter initialEntries={["/share"]}>
        <SharePage />
      </MemoryRouter>,
    );

    expect(screen.getByText("共有データが見つかりませんでした")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows processing state initially", () => {
    render(
      <MemoryRouter initialEntries={["/share?url=https://example.com"]}>
        <SharePage />
      </MemoryRouter>,
    );

    expect(screen.getByText("保存しています...")).toBeInTheDocument();
  });

  it("shows success state after successful creation", async () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: () => void }) => {
      options.onSuccess();
    });

    render(
      <MemoryRouter initialEntries={["/share?url=https://example.com&title=Test"]}>
        <SharePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("保存しました")).toBeInTheDocument();
    });
  });

  it("shows error state after failed creation", async () => {
    mockMutate.mockImplementation((_input: unknown, options: { onError: (err: Error) => void }) => {
      options.onError(new Error("API error"));
    });

    render(
      <MemoryRouter initialEntries={["/share?url=https://example.com&title=Test"]}>
        <SharePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("API error")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "ホームに戻る" })).toBeInTheDocument();
  });

  it("truncates long titles to 256 characters", () => {
    const longTitle = "A".repeat(300);
    render(
      <MemoryRouter initialEntries={[`/share?url=https://example.com&title=${longTitle}`]}>
        <SharePage />
      </MemoryRouter>,
    );

    const calledTitle = (mockMutate.mock.calls[0]![0] as { title: string }).title;
    expect(calledTitle.length).toBeLessThanOrEqual(256);
    expect(calledTitle.startsWith("読む：")).toBe(true);
  });

  it("does not process share data twice in strict mode", () => {
    render(
      <MemoryRouter initialEntries={["/share?url=https://example.com&title=Test"]}>
        <SharePage />
      </MemoryRouter>,
    );

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});
