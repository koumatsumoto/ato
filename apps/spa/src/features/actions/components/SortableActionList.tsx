import { useCallback, useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, Announcements } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Action } from "@/features/actions/types";
import { SortableActionItem } from "./SortableActionItem";
import { ActionItem } from "./ActionItem";
import { GripIcon } from "./GripIcon";

interface SortableActionListProps {
  readonly actions: readonly Action[];
  readonly onReorder: (activeId: number, overId: number) => void;
}

export function SortableActionList({ actions, onReorder }: SortableActionListProps) {
  const [activeAction, setActiveAction] = useState<Action | null>(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const keyboardSensor = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates });
  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const findTitle = useCallback((id: string | number) => actions.find((a) => a.id === id)?.title ?? String(id), [actions]);

  const announcements = useMemo(
    (): Announcements => ({
      onDragStart: ({ active }) => `「${findTitle(active.id)}」を持ち上げました`,
      onDragOver: ({ active, over }) => (over ? `「${findTitle(active.id)}」を「${findTitle(over.id)}」の上に移動しました` : ""),
      onDragEnd: ({ active, over }) =>
        over ? `「${findTitle(active.id)}」を「${findTitle(over.id)}」の位置に移動しました` : `「${findTitle(active.id)}」の移動をキャンセルしました`,
      onDragCancel: ({ active }) => `「${findTitle(active.id)}」の移動をキャンセルしました`,
    }),
    [findTitle],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const found = actions.find((a) => a.id === event.active.id);
      setActiveAction(found ?? null);
    },
    [actions],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveAction(null);
      const { active, over } = event;
      if (over && active.id !== over.id && typeof active.id === "number" && typeof over.id === "number") {
        onReorder(active.id, over.id);
      }
    },
    [onReorder],
  );

  const handleDragCancel = useCallback(() => {
    setActiveAction(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={actions.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {actions.map((action) => (
            <SortableActionItem key={action.id} action={action} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeAction ? (
          <div className="flex items-center rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="flex shrink-0 items-center justify-center px-3 py-3 text-gray-400">
              <GripIcon />
            </div>
            <div className="min-w-0 flex-1">
              <ActionItem action={activeAction} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
