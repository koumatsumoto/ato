import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useAction, useCloseAction, useReopenAction, useUpdateAction } from "@/features/actions/hooks/use-actions";
import { useAutoSave } from "@/features/actions/hooks/use-auto-save";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { addRecentLabels } from "@/features/actions/lib/label-store";
import { DetailSkeleton } from "@/features/actions/components/DetailSkeleton";
import { LabelEditor } from "@/features/actions/components/LabelEditor";
import { NotFound } from "@/shared/components/ui/NotFound";
import { ErrorBanner } from "@/shared/components/ui/ErrorBanner";

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: action, isLoading, error, refetch } = useAction(Number(id));
  const closeAction = useCloseAction();
  const reopenAction = useReopenAction();
  const updateAction = useUpdateAction();
  const updateMutateRef = useRef(updateAction.mutate);
  updateMutateRef.current = updateAction.mutate;

  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [labels, setLabels] = useState<readonly string[]>([]);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef(title);
  titleRef.current = title;
  const memoRef = useRef(memo);
  memoRef.current = memo;
  const initializedRef = useRef(false);

  useEffect(() => {
    if (action && !initializedRef.current) {
      setTitle(action.title);
      setMemo(action.memo);
      setLabels(action.labels);
      initializedRef.current = true;
    }
  }, [action]);

  const { lastSavedAt, isSaving, saveNow } = useAutoSave({
    id: Number(id),
    title,
    memo,
    originalTitle: action?.title ?? "",
    originalMemo: action?.memo ?? "",
  });

  const savedTimeText = useRelativeTime(lastSavedAt);

  const handleTitleClick = () => {
    setIsTitleEditing(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleTitleBlur = () => {
    setIsTitleEditing(false);
    saveNow();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsTitleEditing(false);
      saveNow();
    }
  };

  const handleMemoBlur = () => {
    saveNow();
  };

  const handleLabelsChange = useCallback(
    (newLabels: readonly string[]) => {
      setLabels(newLabels);
      addRecentLabels(newLabels);
      updateMutateRef.current({ id: Number(id), title: titleRef.current, memo: memoRef.current, labels: [...newLabels] });
    },
    [id],
  );

  const handleToggle = useCallback(() => {
    if (!action) return;
    if (action.state === "open") {
      closeAction.mutate(action.id);
    } else {
      reopenAction.mutate(action.id);
    }
  }, [action, closeAction, reopenAction]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveNow();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveNow]);

  if (isLoading) return <DetailSkeleton />;
  if (error) return <ErrorBanner error={error} onRetry={() => void refetch()} />;
  if (!action) return <NotFound />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          aria-label={action.state === "open" ? "完了にする" : "未完了に戻す"}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 hover:border-blue-500"
        >
          {action.state === "closed" && (
            <svg className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        {isTitleEditing ? (
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 bg-transparent text-lg font-semibold focus:outline-none"
            maxLength={256}
          />
        ) : (
          <button onClick={handleTitleClick} className="flex-1 text-left text-lg font-semibold text-gray-800 hover:text-gray-600">
            {title || "タイトルなし"}
          </button>
        )}
      </div>
      <LabelEditor labels={labels} onChange={handleLabelsChange} />
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={handleMemoBlur}
        placeholder="メモを追加..."
        className="w-full resize-y border-transparent bg-transparent px-0 py-2 text-sm leading-relaxed text-gray-700 focus:border-transparent focus:outline-none"
        style={{ minHeight: "calc(100vh - 250px)" }}
        maxLength={65536}
      />
      <div className="mt-1 text-right">
        {isSaving && <span className="text-xs text-gray-400">保存中...</span>}
        {!isSaving && savedTimeText && <span className="text-xs text-gray-400">保存済み {savedTimeText}</span>}
      </div>
    </div>
  );
}
