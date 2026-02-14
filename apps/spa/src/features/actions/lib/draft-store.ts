import { z } from "zod";

const DRAFT_KEY_PREFIX = "ato:draft:";

const draftSchema = z.object({
  title: z.string(),
  memo: z.string(),
  labels: z.array(z.string()).optional(),
  savedAt: z.string(),
  serverUpdatedAt: z.string(),
});

export type Draft = z.infer<typeof draftSchema>;

function draftKey(actionId: number): string {
  return `${DRAFT_KEY_PREFIX}${actionId}`;
}

export function saveDraft(actionId: number, draft: Draft): void {
  try {
    localStorage.setItem(draftKey(actionId), JSON.stringify(draft));
  } catch {
    // localStorage full or unavailable - silently ignore
  }
}

export function getDraft(actionId: number): Draft | null {
  const key = draftKey(actionId);
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    return draftSchema.parse(parsed);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function removeDraft(actionId: number): void {
  localStorage.removeItem(draftKey(actionId));
}
