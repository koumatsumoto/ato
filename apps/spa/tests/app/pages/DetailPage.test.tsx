import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { DetailPage } from "@/app/pages/DetailPage";
import type { Action } from "@/features/actions/types";
import { makeAction } from "../../factories";

let mockActionReturn: { data: Action | undefined; isLoading: boolean; error: Error | null; refetch: ReturnType<typeof vi.fn> };
const mockCloseMutate = vi.fn();
const mockReopenMutate = vi.fn();
const mockSaveNow = vi.fn();
let mockAutoSaveReturn = { lastSavedAt: null as Date | null, isSaving: false, isDirty: false, saveNow: mockSaveNow };
let mockRelativeTimeReturn: string | null = null;

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
  useAutoSave: () => mockAutoSaveReturn,
}));

vi.mock("@/shared/hooks/use-relative-time", () => ({
  useRelativeTime: () => mockRelativeTimeReturn,
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
    mockAutoSaveReturn = { lastSavedAt: null, isSaving: false, isDirty: false, saveNow: mockSaveNow };
    mockRelativeTimeReturn = null;
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

  describe("save status display", () => {
    it("shows last updated time with correct label", () => {
      mockActionReturn = { data: makeAction(), isLoading: false, error: null, refetch: vi.fn() };
      mockAutoSaveReturn = { lastSavedAt: new Date(), isSaving: false, isDirty: false, saveNow: mockSaveNow };
      mockRelativeTimeReturn = "5秒前";

      render(
        <MemoryRouter>
          <DetailPage />
        </MemoryRouter>,
      );

      expect(screen.getByText("最終更新 5秒前")).toBeInTheDocument();
    });

    it("shows saving indicator while saving", () => {
      mockActionReturn = { data: makeAction(), isLoading: false, error: null, refetch: vi.fn() };
      mockAutoSaveReturn = { lastSavedAt: null, isSaving: true, isDirty: true, saveNow: mockSaveNow };

      render(
        <MemoryRouter>
          <DetailPage />
        </MemoryRouter>,
      );

      expect(screen.getByText("保存中...")).toBeInTheDocument();
    });
  });

  describe("Ctrl+S save shortcut", () => {
    it("triggers saveNow on Ctrl+S in textarea", async () => {
      const user = userEvent.setup();
      mockActionReturn = { data: makeAction({ memo: "Test memo" }), isLoading: false, error: null, refetch: vi.fn() };

      render(
        <MemoryRouter>
          <DetailPage />
        </MemoryRouter>,
      );

      const textarea = screen.getByPlaceholderText("メモを追加...");
      await user.click(textarea);
      await user.keyboard("{Control>}s{/Control}");

      expect(mockSaveNow).toHaveBeenCalled();
    });

    it("triggers saveNow on Meta+S (Cmd+S) in textarea", async () => {
      const user = userEvent.setup();
      mockActionReturn = { data: makeAction({ memo: "Test memo" }), isLoading: false, error: null, refetch: vi.fn() };

      render(
        <MemoryRouter>
          <DetailPage />
        </MemoryRouter>,
      );

      const textarea = screen.getByPlaceholderText("メモを追加...");
      await user.click(textarea);
      await user.keyboard("{Meta>}s{/Meta}");

      expect(mockSaveNow).toHaveBeenCalled();
    });

    it("triggers saveNow on Ctrl+S in title input", async () => {
      const user = userEvent.setup();
      mockActionReturn = { data: makeAction({ title: "My title" }), isLoading: false, error: null, refetch: vi.fn() };

      render(
        <MemoryRouter>
          <DetailPage />
        </MemoryRouter>,
      );

      const titleButton = screen.getByText("My title");
      await user.click(titleButton);

      screen.getByDisplayValue("My title");
      await user.keyboard("{Control>}s{/Control}");

      expect(mockSaveNow).toHaveBeenCalled();
    });
  });
});
