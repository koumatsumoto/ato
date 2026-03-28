import { useCallback, useEffect, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import type { Action } from "@/features/actions/types";
import type { FetchActionsResult } from "@/features/actions/lib/github-api";
import { useOpenActions } from "./use-actions";
import { getOrderMap, setOrderEntry, saveRebalancedMap, pruneOrderMap } from "@/features/actions/lib/order-store";

const REBALANCE_GAP = 1000;
const MIN_GAP = 0.001;

export interface SortedActionsResult {
  readonly actions: readonly Action[];
  readonly reorder: (activeId: number, overId: number) => void;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<FetchActionsResult>>;
}

export function getSortKey(action: Action, orderMap: ReadonlyMap<number, number>): number {
  return orderMap.get(action.id) ?? new Date(action.createdAt).getTime();
}

export function sortByKey(actions: readonly Action[], orderMap: ReadonlyMap<number, number>): readonly Action[] {
  return [...actions].sort((a, b) => getSortKey(b, orderMap) - getSortKey(a, orderMap));
}

export function calculateNewSortKey(reordered: readonly Action[], newIndex: number, orderMap: ReadonlyMap<number, number>): number {
  const prev = newIndex > 0 ? reordered[newIndex - 1] : undefined;
  const next = newIndex < reordered.length - 1 ? reordered[newIndex + 1] : undefined;
  const prevKey = prev ? getSortKey(prev, orderMap) : null;
  const nextKey = next ? getSortKey(next, orderMap) : null;

  if (prevKey !== null && nextKey !== null) {
    return (prevKey + nextKey) / 2;
  }
  if (nextKey !== null) {
    return nextKey + 1;
  }
  if (prevKey !== null) {
    return prevKey - 1;
  }
  return Date.now();
}

export function needsRebalance(reordered: readonly Action[], newIndex: number, newSortKey: number, orderMap: ReadonlyMap<number, number>): boolean {
  const prev = newIndex > 0 ? reordered[newIndex - 1] : undefined;
  const next = newIndex < reordered.length - 1 ? reordered[newIndex + 1] : undefined;
  const prevKey = prev ? getSortKey(prev, orderMap) : null;
  const nextKey = next ? getSortKey(next, orderMap) : null;

  if (prevKey !== null && Math.abs(newSortKey - prevKey) < MIN_GAP) return true;
  if (nextKey !== null && Math.abs(newSortKey - nextKey) < MIN_GAP) return true;
  return false;
}

export function rebalance(actions: readonly Action[]): ReadonlyMap<number, number> {
  const baseKey = Date.now();
  const map = new Map<number, number>();
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action) map.set(action.id, baseKey - i * REBALANCE_GAP);
  }
  return map;
}

export function useSortedActions(): SortedActionsResult {
  const [orderMap, setOrderMapState] = useState<ReadonlyMap<number, number>>(getOrderMap);
  const query = useOpenActions();
  const rawActions = useMemo(() => query.data?.actions ?? [], [query.data?.actions]);

  useEffect(() => {
    if (rawActions.length === 0) return;
    const activeIds = new Set(rawActions.map((a) => a.id));
    const pruned = pruneOrderMap(orderMap, activeIds);
    if (pruned) setOrderMapState(pruned);
  }, [rawActions]); // eslint-disable-line react-hooks/exhaustive-deps -- orderMap intentionally excluded to avoid loop

  const actions = useMemo(() => sortByKey(rawActions, orderMap), [rawActions, orderMap]);

  const reorder = useCallback(
    (activeId: number, overId: number): void => {
      const oldIndex = actions.findIndex((a) => a.id === activeId);
      const newIndex = actions.findIndex((a) => a.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove([...actions], oldIndex, newIndex);
      const newSortKey = calculateNewSortKey(reordered, newIndex, orderMap);

      if (needsRebalance(reordered, newIndex, newSortKey, orderMap)) {
        const rebalancedMap = rebalance(reordered);
        saveRebalancedMap(rebalancedMap);
        setOrderMapState(rebalancedMap);
      } else {
        const updatedMap = setOrderEntry(activeId, newSortKey);
        setOrderMapState(updatedMap);
      }
    },
    [actions, orderMap],
  );

  return {
    actions: actions,
    reorder: reorder,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
