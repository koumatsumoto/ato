import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useAction, useCloseAction, useReopenAction } from "@/features/actions/hooks/use-actions";
import { useAutoSave } from "@/features/actions/hooks/use-auto-save";
import { useDraftRestoration } from "@/features/actions/hooks/use-draft-restoration";
import { useRelativeTime } from "@/shared/hooks/use-relative-time";
import { addRecentLabels } from "@/features/actions/lib/label-store";
import { CheckCircleIcon } from "@/features/actions/components/CheckCircleIcon";
import { CheckCircleSolidIcon } from "@/features/actions/components/CheckCircleSolidIcon";
import { DetailSkeleton } from "@/features/actions/components/DetailSkeleton";
import { LabelEditor } from "@/features/actions/components/LabelEditor";
import { NotFound } from "@/shared/components/ui/NotFound";
import { ErrorBanner } from "@/shared/components/ui/ErrorBanner";

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: action, isLoading, error, refetch } = useAction(Number(id));
  const closeAction = useCloseAction();
  const reopenAction = useReopenAction();

  const { title, memo, labels, setTitle, setMemo, setLabels, restoredFromDraft } = useDraftRestoration({ action });
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { lastSavedAt, isSaving, saveNow, saveLabels } = useAutoSave({
    id: Number(id),
    title,
    memo,
    labels,
    originalTitle: action?.title ?? "",
    originalMemo: action?.memo ?? "",
    originalLabels: action?.labels ?? [],
    updatedAt: action?.updatedAt ?? "",
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

  const handleSaveKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveNow();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    handleSaveKeyDown(e);
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
      saveLabels(newLabels);
    },
    [setLabels, saveLabels],
  );

  const isToggleBusy = closeAction.isPending || reopenAction.isPending;

  const handleToggle = useCallback(() => {
    if (!action || isToggleBusy) return;
    if (action.state === "open") {
      closeAction.mutate(action.id);
    } else {
      reopenAction.mutate(action.id);
    }
  }, [action, isToggleBusy, closeAction, reopenAction]);

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
        <button
          onClick={handleToggle}
          disabled={isToggleBusy}
          aria-label={action.state === "open" ? "完了にする" : "未完了に戻す"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${
            action.state === "open" ? "text-gray-300 hover:bg-emerald-50 hover:text-emerald-500" : "hover:bg-emerald-50"
          }`}
        >
          {action.state === "open" ? <CheckCircleIcon /> : <CheckCircleSolidIcon />}
        </button>
      </div>
      <LabelEditor labels={labels} onChange={handleLabelsChange} />
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={handleMemoBlur}
        onKeyDown={handleSaveKeyDown}
        placeholder="メモを追加..."
        className="w-full resize-y border-transparent bg-transparent px-0 py-2 text-sm leading-relaxed text-gray-700 focus:border-transparent focus:outline-none"
        style={{ minHeight: "calc(var(--app-height) - 250px)" }}
        maxLength={65536}
      />
      <div className="mt-1 text-right">
        {restoredFromDraft && <span className="text-xs text-amber-600">下書きから復元しました</span>}
        {!restoredFromDraft && isSaving && <span className="text-xs text-gray-400">保存中...</span>}
        {!restoredFromDraft && !isSaving && savedTimeText && <span className="text-xs text-gray-400">最終更新 {savedTimeText}</span>}
      </div>
    </div>
  );
}
