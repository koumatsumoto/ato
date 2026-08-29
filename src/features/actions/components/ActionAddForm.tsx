import { useCallback, useRef, useState } from "react";
import { useAuth } from "@koumatsumoto/gh-auth-bridge-client/react";
import { useCreateAction } from "@/features/actions/hooks/use-create-action";
import { useLogin } from "@/features/actions/hooks/use-login";
import { useSpeechRecognition } from "@/features/actions/hooks/use-speech-recognition";
import { appendSpeechToDraft } from "@/features/actions/lib/speech-recognition";
import { createActionSchema } from "@/features/actions/lib/validation";
import { RepoNotConfiguredError } from "@/shared/lib/errors";

export function ActionAddForm(): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createAction = useCreateAction();
  const login = useLogin();
  const { state: authState } = useAuth();

  const handleSpeechFinal = useCallback((transcript: string) => {
    setTitle((current) => appendSpeechToDraft(current, transcript));
    setVoiceFeedback("音声を入力欄に追加しました。内容を確認してから追加してください。");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const speech = useSpeechRecognition({ onFinal: handleSpeechFinal });
  const isRecognizing = speech.state === "requesting" || speech.state === "listening" || speech.state === "finalizing";
  const isRepoNotConfigured = createAction.error instanceof RepoNotConfiguredError;

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createActionSchema.safeParse({ title: title.trim() });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? "入力内容を確認してください");
      return;
    }
    if (!login) return;

    setValidationError(null);
    try {
      await createAction.mutateAsync({ title: result.data.title });
      setTitle("");
      setVoiceFeedback(null);
      speech.reset();
      inputRef.current?.focus();
    } catch {
      // Mutation state renders the actionable error. Keep the draft for retry.
    }
  };

  const voiceStatus =
    speech.state === "requesting"
      ? "マイクの許可を確認しています…"
      : speech.state === "listening"
        ? speech.interimTranscript
          ? `聞き取り中：${speech.interimTranscript}`
          : "聞いています… 話し終えたらそのままお待ちください"
        : speech.state === "finalizing"
          ? "文字にしています…"
          : speech.state === "error"
            ? speech.errorMessage
            : voiceFeedback;

  const identityMessage = !login
    ? authState.isLoading
      ? "入力できます。GitHubへの接続確認後に追加できるようになります。"
      : "GitHubへの接続を確認できません。入力内容はこの画面に保持されます。"
    : null;

  return (
    <section
      aria-labelledby="quick-add-heading"
      className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_18px_45px_rgba(6,78,59,0.12)]"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="p-5 sm:p-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">すぐに残す</p>
        <h2 id="quick-add-heading" className="text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">
          何をあとでやる？
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-emerald-950/70">思いついた言葉のままで大丈夫です。あとから編集できます。</p>

        <label htmlFor="action-title" className="sr-only">
          やること
        </label>
        <input
          ref={inputRef}
          id="action-title"
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (validationError) setValidationError(null);
            if (voiceFeedback) setVoiceFeedback(null);
            if (createAction.isError) createAction.reset();
          }}
          autoFocus
          autoComplete="off"
          enterKeyHint="done"
          placeholder="例：電球を買う"
          className="mt-5 w-full rounded-2xl border border-emerald-900/15 bg-emerald-50/65 px-4 py-3.5 text-base text-emerald-950 shadow-inner outline-none transition placeholder:text-emerald-950/30 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          maxLength={256}
          aria-describedby={speech.isSupported ? "composer-status voice-privacy" : "composer-status"}
          aria-invalid={validationError ? true : undefined}
        />

        <div className="mt-3 flex min-h-11 items-center gap-3">
          {speech.isSupported ? (
            <button
              type="button"
              onClick={isRecognizing ? speech.cancel : speech.start}
              aria-label={isRecognizing ? "音声入力をキャンセル" : "音声で入力"}
              aria-pressed={isRecognizing}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 ${
                isRecognizing
                  ? "border-red-200 bg-red-50 text-red-700 shadow-sm"
                  : "border-emerald-900/15 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              {isRecognizing ? (
                <span className="h-3.5 w-3.5 rounded-sm bg-current" aria-hidden="true" />
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path strokeLinecap="round" d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6" />
                </svg>
              )}
            </button>
          ) : (
            <span className="text-xs leading-snug text-emerald-950/45">音声入力はこのブラウザでは利用できません</span>
          )}

          <div id="composer-status" aria-live="polite" className="min-w-0 flex-1 text-xs leading-snug text-emerald-950/60">
            {voiceStatus}
          </div>

          <button
            type="submit"
            disabled={!title.trim() || !login || createAction.isPending || isRecognizing}
            className="min-h-11 shrink-0 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,120,87,0.24)] transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-900/20 disabled:text-emerald-950/40 disabled:shadow-none"
          >
            {createAction.isPending ? "追加中…" : !login ? "準備中…" : "追加"}
          </button>
        </div>

        {validationError && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-700">
            {validationError}
          </p>
        )}
        {identityMessage && <p className="mt-2 text-xs leading-relaxed text-amber-800">{identityMessage}</p>}
        {createAction.isSuccess && !title && (
          <p role="status" className="mt-2 text-sm font-medium text-emerald-700">
            追加しました。
          </p>
        )}
        {createAction.isError && (
          <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
            <p>{isRepoNotConfigured ? "保存先の準備が必要です。入力内容は保持しています。" : "追加できませんでした。入力内容は保持しています。"}</p>
            {isRepoNotConfigured && (
              <a href="#repository-setup" className="mt-1 inline-block font-semibold underline underline-offset-2">
                セットアップ手順を確認
              </a>
            )}
          </div>
        )}

        {speech.isSupported && (
          <p id="voice-privacy" className="mt-3 border-t border-emerald-950/8 pt-3 text-xs leading-relaxed text-emerald-950/70">
            音声はブラウザが処理し、外部の認識サービスへ送られる場合があります。ATO は音声を保存しません。
          </p>
        )}
      </form>
    </section>
  );
}
