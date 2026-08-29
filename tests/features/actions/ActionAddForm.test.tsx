import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionAddForm } from "@/features/actions/components/ActionAddForm";

const mockMutateAsync = vi.fn();
const mockMutationReset = vi.fn();
const mockSpeechStart = vi.fn();
const mockSpeechCancel = vi.fn();
const mockSpeechReset = vi.fn();
let mockLogin: string | null;
let mockAuthLoading: boolean;
let speechOnFinal: (transcript: string) => void;
let mockMutationError: Error | null;
let mockSpeechSupported: boolean;

vi.mock("@/features/actions/hooks/use-create-action", () => ({
  useCreateAction: () => ({
    mutateAsync: mockMutateAsync,
    reset: mockMutationReset,
    isPending: false,
    isError: mockMutationError !== null,
    isSuccess: false,
    error: mockMutationError,
  }),
}));

vi.mock("@/features/actions/hooks/use-login", () => ({
  useLogin: () => mockLogin,
}));

vi.mock("@koumatsumoto/gh-auth-bridge-client/react", () => ({
  useAuth: () => ({
    state: { token: "token", user: mockLogin ? { login: mockLogin, id: 1, avatarUrl: "" } : null, isLoading: mockAuthLoading },
  }),
}));

vi.mock("@/features/actions/hooks/use-speech-recognition", () => ({
  useSpeechRecognition: ({ onFinal }: { onFinal: (transcript: string) => void }) => {
    speechOnFinal = onFinal;
    return {
      isSupported: mockSpeechSupported,
      state: "idle",
      interimTranscript: "",
      errorMessage: null,
      start: mockSpeechStart,
      cancel: mockSpeechCancel,
      reset: mockSpeechReset,
    };
  },
}));

describe("ActionAddForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin = "testuser";
    mockAuthLoading = false;
    mockMutationError = null;
    mockSpeechSupported = true;
    mockMutateAsync.mockResolvedValue({});
  });

  it("allows drafting while identity is still loading", async () => {
    mockLogin = null;
    mockAuthLoading = true;
    const user = userEvent.setup();
    render(<ActionAddForm />);

    const input = screen.getByRole("textbox", { name: "やること" });
    await user.type(input, "あとで読む");

    expect(input).toHaveValue("あとで読む");
    expect(screen.getByRole("button", { name: "準備中…" })).toBeDisabled();
    expect(screen.getByText(/GitHubへの接続確認後/)).toBeInTheDocument();
  });

  it("appends final speech to the latest draft without saving automatically", async () => {
    const user = userEvent.setup();
    render(<ActionAddForm />);
    const input = screen.getByRole("textbox", { name: "やること" });
    await user.type(input, "帰りに");

    act(() => {
      speechOnFinal("牛乳を買う");
    });

    expect(input).toHaveValue("帰りに 牛乳を買う");
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/内容を確認してから追加/)).toBeInTheDocument();
  });

  it("submits explicitly and clears the draft only after success", async () => {
    const user = userEvent.setup();
    render(<ActionAddForm />);
    const input = screen.getByRole("textbox", { name: "やること" });
    await user.type(input, "電球を買う");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ title: "電球を買う" });
    });
    expect(input).toHaveValue("");
  });

  it("keeps the draft when saving fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(<ActionAddForm />);
    const input = screen.getByRole("textbox", { name: "やること" });
    await user.type(input, "消えない下書き");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
    expect(input).toHaveValue("消えない下書き");
  });

  it("keeps normal text input available when speech recognition is unsupported", async () => {
    mockSpeechSupported = false;
    const user = userEvent.setup();
    render(<ActionAddForm />);

    const input = screen.getByRole("textbox", { name: "やること" });
    await user.type(input, "キーボードで入力");

    expect(input).toHaveValue("キーボードで入力");
    expect(screen.queryByRole("button", { name: "音声で入力" })).not.toBeInTheDocument();
    expect(screen.getByText("音声入力はこのブラウザでは利用できません")).toBeInTheDocument();
  });
});
