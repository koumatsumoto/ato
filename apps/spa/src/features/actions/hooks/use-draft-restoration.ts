import { useEffect, useRef, useState } from "react";
import type { Action } from "@/features/actions/types";
import { getDraft, removeDraft } from "@/features/actions/lib/draft-store";

const RESTORE_BANNER_MS = 5_000;

interface UseDraftRestorationParams {
  readonly action: Action | undefined;
}

interface UseDraftRestorationResult {
  readonly title: string;
  readonly memo: string;
  readonly labels: readonly string[];
  readonly setTitle: (title: string) => void;
  readonly setMemo: (memo: string) => void;
  readonly setLabels: (labels: readonly string[]) => void;
  readonly restoredFromDraft: boolean;
}

export function useDraftRestoration({ action }: UseDraftRestorationParams): UseDraftRestorationResult {
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [labels, setLabels] = useState<readonly string[]>([]);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (action && !initializedRef.current) {
      const draft = getDraft(action.id);

      if (draft && new Date(draft.savedAt).getTime() > new Date(action.updatedAt).getTime()) {
        setTitle(draft.title);
        setMemo(draft.memo);
        setLabels(draft.labels ?? action.labels);
        setRestoredFromDraft(true);
      } else {
        setTitle(action.title);
        setMemo(action.memo);
        setLabels(action.labels);
        if (draft) removeDraft(action.id);
      }

      initializedRef.current = true;
    }
  }, [action]);

  useEffect(() => {
    if (!restoredFromDraft) return;
    const timer = setTimeout(() => setRestoredFromDraft(false), RESTORE_BANNER_MS);
    return () => clearTimeout(timer);
  }, [restoredFromDraft]);

  return { title, memo, labels, setTitle, setMemo, setLabels, restoredFromDraft };
}
