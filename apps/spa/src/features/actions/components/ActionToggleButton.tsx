import { CheckCircleIcon } from "./CheckCircleIcon";
import { CheckCircleSolidIcon } from "./CheckCircleSolidIcon";

interface ActionToggleButtonProps {
  readonly state: "open" | "closed";
  readonly disabled: boolean;
  readonly onClick: (e: React.MouseEvent) => void;
}

export function ActionToggleButton({ state, disabled, onClick }: ActionToggleButtonProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={state === "open" ? "完了にする" : "未完了に戻す"}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${
        state === "open" ? "text-gray-300 hover:bg-emerald-50 hover:text-emerald-500" : "hover:bg-emerald-50"
      }`}
    >
      {state === "open" ? <CheckCircleIcon /> : <CheckCircleSolidIcon />}
    </button>
  );
}
