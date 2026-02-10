import { useState } from "react";
import { useNavigate } from "react-router";
import type { Action } from "@/features/actions/types";
import { useCloseAction, useReopenAction } from "@/features/actions/hooks/use-actions";

export function ActionItem({ action }: { readonly action: Action }) {
  const navigate = useNavigate();
  const closeAction = useCloseAction();
  const reopenAction = useReopenAction();
  const [isExiting, setIsExiting] = useState(false);

  const isSaving = action.id < 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    if (action.state === "open") {
      setIsExiting(true);
      setTimeout(() => closeAction.mutate(action.id), 300);
    } else {
      reopenAction.mutate(action.id);
    }
  };

  const handleNavigate = () => {
    if (isSaving) return;
    navigate(`/actions/${action.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={isSaving ? -1 : 0}
      onClick={handleNavigate}
      onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
      className={`flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 ${isSaving ? "cursor-default opacity-50" : `cursor-pointer hover:bg-gray-50 ${isExiting ? "animate-fadeOut" : "animate-fadeIn"}`}`}
      aria-disabled={isSaving}
    >
      <button
        onClick={handleToggle}
        disabled={isSaving}
        aria-label={action.state === "open" ? "完了にする" : "未完了に戻す"}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {action.state === "closed" && (
          <svg className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className={`min-w-0 flex-1 truncate text-sm ${action.state === "closed" ? "line-through text-gray-400" : "text-gray-800"}`}>
        {action.title}
      </span>
      {action.labels.length > 0 && (
        <div className="flex max-w-[40%] shrink-0 items-center gap-1">
          {action.labels.slice(0, 3).map((label) => (
            <span key={label} className="truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {label}
            </span>
          ))}
          {action.labels.length > 3 && <span className="text-xs text-gray-400">+{action.labels.length - 3}</span>}
        </div>
      )}
    </div>
  );
}
