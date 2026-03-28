import { useState } from "react";
import { useNavigate } from "react-router";
import type { Action } from "@/features/actions/types";
import { useCloseAction, useReopenAction } from "@/features/actions/hooks/use-actions";
import { ActionToggleButton } from "./ActionToggleButton";

export function ActionItem({ action }: { readonly action: Action }) {
  const navigate = useNavigate();
  const closeAction = useCloseAction();
  const reopenAction = useReopenAction();
  const [isExiting, setIsExiting] = useState(false);

  const isSaving = action.id < 0;
  const isBusy = isSaving || isExiting || closeAction.isPending || reopenAction.isPending;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBusy) return;
    if (action.state === "open") {
      setIsExiting(true);
      setTimeout(() => closeAction.mutate(action.id), 300);
    } else {
      reopenAction.mutate(action.id);
    }
  };

  const handleNavigate = () => {
    if (isBusy) return;
    navigate(`/actions/${action.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={isSaving ? -1 : 0}
      onClick={handleNavigate}
      onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSaving ? "cursor-default opacity-50" : `cursor-pointer hover:bg-gray-50 ${isExiting ? "animate-fadeOut" : "animate-fadeIn"}`}`}
      aria-disabled={isSaving}
    >
      <span className={`min-w-0 flex-1 truncate text-sm ${action.state === "closed" ? "line-through text-gray-400" : "text-gray-800"}`}>
        {action.title}
      </span>
      {action.labels.length > 0 && (
        <div className="flex max-w-[40%] shrink-0 items-center gap-1.5">
          {action.labels.slice(0, 3).map((label) => (
            <span key={label} className="truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {label}
            </span>
          ))}
          {action.labels.length > 3 && <span className="text-xs text-gray-400">+{action.labels.length - 3}</span>}
        </div>
      )}
      <ActionToggleButton state={action.state} disabled={isBusy} onClick={handleToggle} />
    </div>
  );
}
