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

vi.mock("@/features/actions/hooks/use-sorted-actions", () => ({
  useSortedActions: () => mockSortedActionsReturn,
}));

vi.mock("@/features/actions/hooks/use-search", () => ({
  useSearchActions: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock("@/features/actions/hooks/use-actions", () => ({
  useCloseAction: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenAction: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("MainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSortedActionsReturn = {
      actions: [],
      reorder: mockReorder,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
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

  it("shows empty state when no actions", () => {
    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("やることはまだありません。下のフォームから追加しましょう。")).toBeInTheDocument();
  });

  it("renders action items when data is available", () => {
    mockSortedActionsReturn = {
      ...mockSortedActionsReturn,
      actions: [makeAction({ id: 1, title: "First" }), makeAction({ id: 2, title: "Second" })],
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("shows error message when fetch fails", () => {
    mockSortedActionsReturn = {
      ...mockSortedActionsReturn,
      error: new Error("Network error"),
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
  });

  it("shows SetupGuide when RepoNotConfiguredError occurs", () => {
    mockSortedActionsReturn = {
      ...mockSortedActionsReturn,
      error: new RepoNotConfiguredError(),
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("初回セットアップ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /リポジトリを作成/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("hides ActionAddForm when RepoNotConfiguredError occurs", () => {
    mockSortedActionsReturn = {
      ...mockSortedActionsReturn,
      error: new RepoNotConfiguredError(),
    };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
