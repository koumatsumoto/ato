import type { Action } from "@/features/actions/types";
import { useCloseAction, useReopenAction } from "@/features/actions/hooks/use-actions";

export function CompletionToggle({ action }: { action: Action }) {
  const closeAction = useCloseAction();
  const reopenAction = useReopenAction();
  const isPending = closeAction.isPending || reopenAction.isPending;

  const handleToggle = () => {
    if (action.state === "open") {
      closeAction.mutate(action.id);
    } else {
      reopenAction.mutate(action.id);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
        action.state === "open" ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
      }`}
    >
      {isPending ? "更新中..." : action.state === "open" ? "完了" : "再開"}
    </button>
  );
}
