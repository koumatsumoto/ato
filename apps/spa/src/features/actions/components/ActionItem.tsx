import { useState } from "react";
import { useNavigate } from "react-router";
import type { Action } from "@/types";
import { useCloseAction, useReopenAction } from "@/features/actions/hooks/use-actions";

export function ActionItem({ action }: { readonly action: Action }) {
  const navigate = useNavigate();
  const closeAction = useCloseAction();
  const reopenAction = useReopenAction();
  const [isExiting, setIsExiting] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (action.state === "open") {
      setIsExiting(true);
      setTimeout(() => closeAction.mutate(action.id), 300);
    } else {
      reopenAction.mutate(action.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/actions/${action.id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/actions/${action.id}`)}
      className={`flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 cursor-pointer ${isExiting ? "animate-fadeOut" : "animate-fadeIn"}`}
    >
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
      <span className={`flex-1 text-sm ${action.state === "closed" ? "line-through text-gray-400" : "text-gray-800"}`}>{action.title}</span>
    </div>
  );
}
