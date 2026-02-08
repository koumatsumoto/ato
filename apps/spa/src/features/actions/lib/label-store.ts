const RECENT_LABELS_KEY = "ato:recent-labels";
const MAX_RECENT_LABELS = 8;

export function getRecentLabels(): readonly string[] {
  const stored = localStorage.getItem(RECENT_LABELS_KEY);
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT_LABELS);
  } catch {
    return [];
  }
}

export function addRecentLabels(labels: readonly string[]): void {
  if (labels.length === 0) return;
  const current = getRecentLabels();
  const merged = [...new Set([...labels, ...current])].slice(0, MAX_RECENT_LABELS);
  localStorage.setItem(RECENT_LABELS_KEY, JSON.stringify(merged));
}

export function clearRecentLabels(): void {
  localStorage.removeItem(RECENT_LABELS_KEY);
}
