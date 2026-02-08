import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DetailPage } from "@/app/pages/DetailPage";
import type { Action } from "@/features/actions/types";
import { makeAction } from "../../factories";

let mockActionReturn: { data: Action | undefined; isLoading: boolean; error: Error | null; refetch: ReturnType<typeof vi.fn> };
const mockCloseMutate = vi.fn();
const mockReopenMutate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: () => ({ id: "5" }),
  };
});

vi.mock("@/features/actions/hooks/use-actions", () => ({
  useAction: () => mockActionReturn,
  useUpdateAction: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCloseAction: () => ({ mutate: mockCloseMutate, isPending: false }),
  useReopenAction: () => ({ mutate: mockReopenMutate, isPending: false }),
}));

vi.mock("@/features/actions/hooks/use-auto-save", () => ({
  useAutoSave: () => ({
    lastSavedAt: null,
    isSaving: false,
    isDirty: false,
    saveNow: vi.fn(),
  }),
}));

vi.mock("@/shared/hooks/use-relative-time", () => ({
  useRelativeTime: () => null,
}));

vi.mock("@/features/actions/hooks/use-labels", () => ({
  useLabels: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock("@/features/actions/lib/label-store", () => ({
  getRecentLabels: () => [],
  addRecentLabels: vi.fn(),
  clearRecentLabels: vi.fn(),
}));

vi.mock("@uiball/loaders", () => ({
  Waveform: () => <div data-testid="waveform" />,
}));

describe("DetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActionReturn = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
  });

  it("shows loading skeleton while loading", () => {
    mockActionReturn = { data: undefined, isLoading: true, error: null, refetch: vi.fn() };

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status", { name: "行動を読み込み中" })).toBeInTheDocument();
  });

  it("shows not found when action does not exist", () => {
    mockActionReturn = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("見つかりません")).toBeInTheDocument();
  });

  it("renders action title and memo when loaded", () => {
    mockActionReturn = { data: makeAction({ title: "My task", memo: "Some notes" }), isLoading: false, error: null, refetch: vi.fn() };

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("My task")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Some notes")).toBeInTheDocument();
  });

  it("renders completion toggle checkbox for open action", () => {
    mockActionReturn = { data: makeAction({ state: "open" }), isLoading: false, error: null, refetch: vi.fn() };

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("完了にする")).toBeInTheDocument();
  });

  it("renders completion toggle checkbox for closed action", () => {
    mockActionReturn = { data: makeAction({ state: "closed" }), isLoading: false, error: null, refetch: vi.fn() };

    render(
      <MemoryRouter>
        <DetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("未完了に戻す")).toBeInTheDocument();
  });
});
