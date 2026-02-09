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
  readonly originalTitle: string;
  readonly originalMemo: string;
  readonly updatedAt: string;
}

interface UseAutoSaveResult {
  readonly lastSavedAt: Date | null;
  readonly isSaving: boolean;
  readonly isDirty: boolean;
  readonly saveNow: () => void;
}

const DEBOUNCE_MS = 3_000;

export function useAutoSave({ id, title, memo, originalTitle, originalMemo, updatedAt }: UseAutoSaveParams): UseAutoSaveResult {
  const updateAction = useUpdateAction();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    if (!updatedAt) return null;
    const parsed = new Date(updatedAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });
  const saveVersionRef = useRef(0);
  const lastSavedTitleRef = useRef(originalTitle);
  const lastSavedMemoRef = useRef(originalMemo);
  const mutateRef = useRef(updateAction.mutate);
  mutateRef.current = updateAction.mutate;

  const currentTitleRef = useRef(title);
  const currentMemoRef = useRef(memo);
  const updatedAtRef = useRef(updatedAt);
  currentTitleRef.current = title;
  currentMemoRef.current = memo;
  updatedAtRef.current = updatedAt;

  useEffect(() => {
    lastSavedTitleRef.current = originalTitle;
    lastSavedMemoRef.current = originalMemo;
  }, [originalTitle, originalMemo]);

  useEffect(() => {
    if (lastSavedAt || !updatedAt) return;
    const parsed = new Date(updatedAt);
    if (!Number.isNaN(parsed.getTime())) {
      setLastSavedAt(parsed);
    }
  }, [updatedAt, lastSavedAt]);

  const isDirty = title !== lastSavedTitleRef.current || memo !== lastSavedMemoRef.current;

  const debouncedTitle = useDebounce(title, DEBOUNCE_MS);
  const debouncedMemo = useDebounce(memo, DEBOUNCE_MS);

  const performSave = useCallback(
    (saveTitle: string, saveMemo: string) => {
      if (saveTitle === lastSavedTitleRef.current && saveMemo === lastSavedMemoRef.current) return;

      const result = updateActionSchema.safeParse({ title: saveTitle, memo: saveMemo });
      if (!result.success) return;

      const version = ++saveVersionRef.current;
      mutateRef.current(
        { id, title: result.data.title, memo: result.data.memo },
        {
          onSuccess: () => {
            if (saveVersionRef.current === version) {
              lastSavedTitleRef.current = saveTitle;
              lastSavedMemoRef.current = saveMemo;
              setLastSavedAt(new Date());
              removeDraft(id);
            }
          },
          onError: (error: Error) => {
            if (error instanceof NetworkError) {
              saveDraft(id, {
                title: saveTitle,
                memo: saveMemo,
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
    performSave(debouncedTitle, debouncedMemo);
  }, [debouncedTitle, debouncedMemo, performSave]);

  const saveNow = useCallback(() => {
    performSave(title, memo);
  }, [title, memo, performSave]);

  useEffect(() => {
    return () => {
      const unmountTitle = currentTitleRef.current;
      const unmountMemo = currentMemoRef.current;
      const dirty = unmountTitle !== lastSavedTitleRef.current || unmountMemo !== lastSavedMemoRef.current;
      if (!dirty) return;

      const validated = updateActionSchema.safeParse({ title: unmountTitle, memo: unmountMemo });
      if (!validated.success) return;

      mutateRef.current({ id, title: validated.data.title, memo: validated.data.memo });

      saveDraft(id, {
        title: unmountTitle,
        memo: unmountMemo,
        savedAt: new Date().toISOString(),
        serverUpdatedAt: updatedAtRef.current,
      });
    };
  }, [id]);

  return { lastSavedAt, isSaving: updateAction.isPending, isDirty, saveNow };
}
