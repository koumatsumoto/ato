import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useUpdateAction } from "./use-actions";
import { updateActionSchema } from "@/features/actions/lib/validation";
import { saveDraft, removeDraft } from "@/features/actions/lib/draft-store";
import { NetworkError } from "@/shared/lib/errors";

interface UseAutoSaveParams {
  readonly id: number;
  readonly title: string;
  readonly memo: string;
  readonly labels: readonly string[];
  readonly originalTitle: string;
  readonly originalMemo: string;
  readonly originalLabels: readonly string[];
  readonly updatedAt: string;
}

interface UseAutoSaveResult {
  readonly lastSavedAt: Date | null;
  readonly isSaving: boolean;
  readonly isDirty: boolean;
  readonly saveNow: () => void;
  readonly saveLabels: (labels: readonly string[]) => void;
}

const DEBOUNCE_MS = 3_000;

function labelsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function useAutoSave({
  id,
  title,
  memo,
  labels,
  originalTitle,
  originalMemo,
  originalLabels,
  updatedAt,
}: UseAutoSaveParams): UseAutoSaveResult {
  const updateAction = useUpdateAction();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    if (!updatedAt) return null;
    const parsed = new Date(updatedAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });
  const saveVersionRef = useRef(0);
  const lastSavedTitleRef = useRef(originalTitle);
  const lastSavedMemoRef = useRef(originalMemo);
  const lastSavedLabelsRef = useRef(originalLabels);
  const mutateRef = useRef(updateAction.mutate);
  mutateRef.current = updateAction.mutate;

  const currentTitleRef = useRef(title);
  const currentMemoRef = useRef(memo);
  const currentLabelsRef = useRef(labels);
  const updatedAtRef = useRef(updatedAt);
  currentTitleRef.current = title;
  currentMemoRef.current = memo;
  currentLabelsRef.current = labels;
  updatedAtRef.current = updatedAt;

  useEffect(() => {
    lastSavedTitleRef.current = originalTitle;
    lastSavedMemoRef.current = originalMemo;
    lastSavedLabelsRef.current = originalLabels;
  }, [originalTitle, originalMemo, originalLabels]);

  useEffect(() => {
    if (lastSavedAt || !updatedAt) return;
    const parsed = new Date(updatedAt);
    if (!Number.isNaN(parsed.getTime())) {
      setLastSavedAt(parsed);
    }
  }, [updatedAt, lastSavedAt]);

  const isDirty = title !== lastSavedTitleRef.current || memo !== lastSavedMemoRef.current || !labelsEqual(labels, lastSavedLabelsRef.current);

  const debouncedTitle = useDebounce(title, DEBOUNCE_MS);
  const debouncedMemo = useDebounce(memo, DEBOUNCE_MS);

  const performSave = useCallback(
    (saveTitle: string, saveMemo: string, saveLabels: readonly string[]) => {
      const titleChanged = saveTitle !== lastSavedTitleRef.current;
      const memoChanged = saveMemo !== lastSavedMemoRef.current;
      const labelsChanged = !labelsEqual(saveLabels, lastSavedLabelsRef.current);
      if (!titleChanged && !memoChanged && !labelsChanged) return;

      const result = updateActionSchema.safeParse({ title: saveTitle, memo: saveMemo, labels: [...saveLabels] });
      if (!result.success) return;

      const version = ++saveVersionRef.current;
      mutateRef.current(
        { id, title: result.data.title, memo: result.data.memo, ...(result.data.labels ? { labels: [...result.data.labels] } : {}) },
        {
          onSuccess: () => {
            if (saveVersionRef.current === version) {
              lastSavedTitleRef.current = saveTitle;
              lastSavedMemoRef.current = saveMemo;
              lastSavedLabelsRef.current = saveLabels;
              setLastSavedAt(new Date());
              removeDraft(id);
            }
          },
          onError: (error: Error) => {
            if (error instanceof NetworkError) {
              saveDraft(id, {
                title: saveTitle,
                memo: saveMemo,
                labels: [...saveLabels],
                savedAt: new Date().toISOString(),
                serverUpdatedAt: updatedAtRef.current,
              });
            }
          },
        },
      );
    },
    [id],
  );

  useEffect(() => {
    performSave(debouncedTitle, debouncedMemo, currentLabelsRef.current);
  }, [debouncedTitle, debouncedMemo, performSave]);

  const saveNow = useCallback(() => {
    performSave(title, memo, currentLabelsRef.current);
  }, [title, memo, performSave]);

  const saveLabelsNow = useCallback(
    (newLabels: readonly string[]) => {
      performSave(currentTitleRef.current, currentMemoRef.current, newLabels);
    },
    [performSave],
  );

  useEffect(() => {
    return () => {
      const unmountTitle = currentTitleRef.current;
      const unmountMemo = currentMemoRef.current;
      const unmountLabels = currentLabelsRef.current;
      const dirty =
        unmountTitle !== lastSavedTitleRef.current ||
        unmountMemo !== lastSavedMemoRef.current ||
        !labelsEqual(unmountLabels, lastSavedLabelsRef.current);
      if (!dirty) return;

      const validated = updateActionSchema.safeParse({ title: unmountTitle, memo: unmountMemo, labels: [...unmountLabels] });
      if (!validated.success) return;

      mutateRef.current({
        id,
        title: validated.data.title,
        memo: validated.data.memo,
        ...(validated.data.labels ? { labels: [...validated.data.labels] } : {}),
      });

      saveDraft(id, {
        title: unmountTitle,
        memo: unmountMemo,
        labels: [...unmountLabels],
        savedAt: new Date().toISOString(),
        serverUpdatedAt: updatedAtRef.current,
      });
    };
  }, [id]);

  return { lastSavedAt, isSaving: updateAction.isPending, isDirty, saveNow, saveLabels: saveLabelsNow };
}
