import type { GitHubLabel } from "@/features/actions/types";

const MAX_SUGGESTIONS = 8;

export function buildLabelSuggestions(
  input: string,
  repoLabels: readonly GitHubLabel[],
  recentLabels: readonly string[],
  currentLabels: readonly string[],
): readonly string[] {
  const currentSet = new Set(currentLabels);

  const allLabels = [...new Set([...recentLabels, ...repoLabels.map((l) => l.name)])];

  const available = allLabels.filter((name) => !currentSet.has(name));

  if (!input.trim()) {
    return available.slice(0, MAX_SUGGESTIONS);
  }

  const lower = input.toLowerCase();
  return available.filter((name) => name.toLowerCase().includes(lower)).slice(0, MAX_SUGGESTIONS);
}
