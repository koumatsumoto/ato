import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { MainPage } from "@/app/pages/MainPage";
import type { Action } from "@/features/actions/types";
import { RepoNotConfiguredError } from "@/shared/lib/errors";
import { makeAction } from "../../factories";

const mockRefetch = vi.fn();

let mockOpenActionsReturn: {
  data: { actions: readonly Action[] } | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
};

vi.mock("@/features/actions/hooks/use-actions", () => ({
  useOpenActions: () => mockOpenActionsReturn,
  useCreateAction: () => ({ mutate: vi.fn(), isPending: false }),
  useCloseAction: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/features/actions/hooks/use-search", () => ({
  useSearchActions: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
}));

describe("MainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenActionsReturn = { data: undefined, isLoading: false, error: null, refetch: mockRefetch };
  });

  it("shows loading skeleton when loading", () => {
    mockOpenActionsReturn = { ...mockOpenActionsReturn, data: undefined, isLoading: true, error: null };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status", { name: "行動を読み込み中" })).toBeInTheDocument();
  });

  it("shows empty state when no actions", () => {
    mockOpenActionsReturn = { ...mockOpenActionsReturn, data: { actions: [] }, isLoading: false, error: null };

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("行動はまだありません。下のフォームから追加しましょう。")).toBeInTheDocument();
  });

  it("renders action items when data is available", () => {
    mockOpenActionsReturn = {
      ...mockOpenActionsReturn,
      data: {
        actions: [makeAction({ id: 1, title: "First" }), makeAction({ id: 2, title: "Second" })],
      },
      isLoading: false,
      error: null,
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
    mockOpenActionsReturn = {
      ...mockOpenActionsReturn,
      data: undefined,
      isLoading: false,
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
    mockOpenActionsReturn = {
      ...mockOpenActionsReturn,
      data: undefined,
      isLoading: false,
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
    mockOpenActionsReturn = {
      ...mockOpenActionsReturn,
      data: undefined,
      isLoading: false,
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
