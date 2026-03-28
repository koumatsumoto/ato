import { useSortable } from "@dnd-kit/sortable";
import type { Action } from "@/features/actions/types";
import { ActionItem } from "./ActionItem";
import { GripIcon } from "./GripIcon";

function toTransformString(transform: { x: number; y: number; scaleX: number; scaleY: number } | null): string | undefined {
  if (!transform) return undefined;
  return `translate3d(${String(Math.round(transform.x))}px, ${String(Math.round(transform.y))}px, 0) scaleX(${String(transform.scaleX)}) scaleY(${String(transform.scaleY)})`;
}

export function SortableActionItem({ action }: { readonly action: Action }): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: action.id });

  const style = {
    transform: toTransformString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center bg-white transition-colors ${isDragging ? "z-10 opacity-50" : "hover:bg-gray-50"}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="並び替え"
        className="flex shrink-0 cursor-grab touch-none items-center justify-center px-3 py-3 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      <div className="min-w-0 flex-1">
        <ActionItem action={action} />
      </div>
    </div>
  );
}
