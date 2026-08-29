import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { MainPage } from "@/app/pages/MainPage";
import type { Action } from "@/features/actions/types";
import { RepoNotConfiguredError } from "@/shared/lib/errors";
import { makeAction } from "../../factories";

const mockRefetch = vi.fn();
const mockReorder = vi.fn();

let mockSortedActionsReturn: {
  actions: readonly Action[];
  reorder: ReturnType<typeof vi.fn>;
  isLoading: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
};
let mockLogin: string | null;
let mockAuthState: { token: string; user: { login: string; id: number; avatarUrl: string } | null; isLoading: boolean };

vi.mock("@/features/actions/hooks/use-sorted-actions", () => ({
  useSortedActions: () => mockSortedActionsReturn,
}));

vi.mock("@/features/actions/hooks/use-search", () => ({
  useSearchActions: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock("@/features/actions/hooks/use-actions", () => ({
  useCloseAction: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/features/actions/hooks/use-create-action", () => ({
  useCreateAction: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, isError: false, isSuccess: false, error: null }),
}));

vi.mock("@/features/actions/hooks/use-login", () => ({
  useLogin: () => mockLogin,
}));

vi.mock("@koumatsumoto/gh-auth-bridge-client/react", () => ({
  useAuth: () => ({
    state: mockAuthState,
  }),
}));

describe("MainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLogin = "testuser";
    mockAuthState = { token: "token", user: { login: "testuser", id: 1, avatarUrl: "" }, isLoading: false };
    mockSortedActionsReturn = {
      actions: [],
      reorder: mockReorder,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
  });

  it("keeps the composer interactive while identity and list data are loading", async () => {
    mockLogin = null;
    mockAuthState = { token: "token", user: null, isLoading: true };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("textbox", { name: "やること" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "準備中…" })).toBeDisabled();
    expect(await screen.findByRole("status", { name: "やることを読み込み中" })).toBeInTheDocument();
  });

  it("shows loading skeleton when loading", () => {
    mockSortedActionsReturn = { ...mockSortedActionsReturn, isLoading: true };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status", { name: "やることを読み込み中" })).toBeInTheDocument();
  });

  it("shows empty state when no actions", async () => {
    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("やることはまだありません。上の入力欄から追加しましょう。")).toBeInTheDocument();
  });

  it("renders action items when data is available", async () => {
    mockSortedActionsReturn = {
      ...mockSortedActionsReturn,
      actions: [makeAction({ id: 1, title: "First" }), makeAction({ id: 2, title: "Second" })],
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("shows error message when fetch fails", async () => {
    mockSortedActionsReturn = {
      ...mockSortedActionsReturn,
      error: new Error("Network error"),
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Network error");
  });

  it("shows SetupGuide when RepoNotConfiguredError occurs", async () => {
    mockSortedActionsReturn = {
      ...mockSortedActionsReturn,
      error: new RepoNotConfiguredError(),
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("初回セットアップ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /リポジトリを作成/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the composer available when RepoNotConfiguredError occurs", () => {
    mockSortedActionsReturn = {
      ...mockSortedActionsReturn,
      error: new RepoNotConfiguredError(),
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("textbox", { name: "やること" })).toBeInTheDocument();
  });
});
