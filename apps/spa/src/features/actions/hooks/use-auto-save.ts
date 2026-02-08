import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useUpdateAction } from "./use-actions";
import { updateActionSchema } from "@/features/actions/lib/validation";

interface UseAutoSaveParams {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly originalTitle: string;
  readonly originalBody: string;
}

interface UseAutoSaveResult {
  readonly lastSavedAt: Date | null;
  readonly isSaving: boolean;
  readonly isDirty: boolean;
  readonly saveNow: () => void;
}

const DEBOUNCE_MS = 10_000;

export function useAutoSave({ id, title, body, originalTitle, originalBody }: UseAutoSaveParams): UseAutoSaveResult {
  const updateAction = useUpdateAction();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveVersionRef = useRef(0);
  const lastSavedTitleRef = useRef(originalTitle);
  const lastSavedBodyRef = useRef(originalBody);
  const mutateRef = useRef(updateAction.mutate);
  mutateRef.current = updateAction.mutate;

  useEffect(() => {
    lastSavedTitleRef.current = originalTitle;
    lastSavedBodyRef.current = originalBody;
  }, [originalTitle, originalBody]);

  const isDirty = title !== lastSavedTitleRef.current || body !== lastSavedBodyRef.current;

  const debouncedTitle = useDebounce(title, DEBOUNCE_MS);
  const debouncedBody = useDebounce(body, DEBOUNCE_MS);

  const performSave = useCallback(
    (saveTitle: string, saveBody: string) => {
      if (saveTitle === lastSavedTitleRef.current && saveBody === lastSavedBodyRef.current) return;

      const result = updateActionSchema.safeParse({ title: saveTitle, body: saveBody });
      if (!result.success) return;

      const version = ++saveVersionRef.current;
      mutateRef.current(
        { id, title: result.data.title, body: result.data.body },
        {
          onSuccess: () => {
            if (saveVersionRef.current === version) {
              lastSavedTitleRef.current = saveTitle;
              lastSavedBodyRef.current = saveBody;
              setLastSavedAt(new Date());
            }
          },
        },
      );
    },
    [id],
  );

  useEffect(() => {
    performSave(debouncedTitle, debouncedBody);
  }, [debouncedTitle, debouncedBody, performSave]);

  const saveNow = useCallback(() => {
    performSave(title, body);
  }, [title, body, performSave]);

  return { lastSavedAt, isSaving: updateAction.isPending, isDirty, saveNow };
}
