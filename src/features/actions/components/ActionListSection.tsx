import { useState } from "react";
import { useAuth } from "@koumatsumoto/gh-auth-bridge-client/react";
import { useSortedActions } from "@/features/actions/hooks/use-sorted-actions";
import { useSearchActions } from "@/features/actions/hooks/use-search";
import { ActionItem } from "@/features/actions/components/ActionItem";
import { ActionEmptyState } from "@/features/actions/components/ActionEmptyState";
import { SearchPanel } from "@/features/actions/components/SearchPanel";
import { SortableActionList } from "@/features/actions/components/SortableActionList";
import { ListSkeleton } from "@/features/actions/components/ListSkeleton";
import { SetupGuide } from "@/features/actions/components/SetupGuide";
import { ErrorBanner } from "@/shared/components/ui/ErrorBanner";
import { RepoNotConfiguredError } from "@/shared/lib/errors";

export function ActionListSection(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [searchLabel, setSearchLabel] = useState("");
  const { state: authState } = useAuth();

  const sorted = useSortedActions();
  const searchResult = useSearchActions(searchQuery, includeCompleted, searchLabel);

  const isSearching = searchQuery.trim().length > 0 || searchLabel.length > 0 || includeCompleted;
  const actions = isSearching ? (searchResult.data ?? []) : sorted.actions;
  const isLoading = (authState.isLoading && !authState.user) || (isSearching ? searchResult.isLoading : sorted.isLoading);
  const error = isSearching ? searchResult.error : sorted.error;
  const refetch = isSearching ? searchResult.refetch : sorted.refetch;
  const isRepoNotConfigured = error instanceof RepoNotConfiguredError;

  const handleSearchChange = (query: string, completed: boolean, label: string) => {
    setSearchQuery(query);
    setIncludeCompleted(completed);
    setSearchLabel(label);
  };

  return (
    <div className="space-y-2">
      <SearchPanel onSearchChange={handleSearchChange} />
      {isLoading ? (
        <ListSkeleton />
      ) : isRepoNotConfigured ? (
        <div id="repository-setup">
          <SetupGuide />
        </div>
      ) : error ? (
        <ErrorBanner error={error} onRetry={() => void refetch()} />
      ) : actions.length === 0 ? (
        isSearching ? (
          <p className="rounded-2xl bg-white/55 py-10 text-center text-sm text-emerald-950/75">やることが見つかりませんでした。</p>
        ) : (
          <ActionEmptyState />
        )
      ) : isSearching ? (
        <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
          {actions.map((action) => (
            <ActionItem key={action.id} action={action} />
          ))}
        </div>
      ) : (
        <SortableActionList actions={actions} onReorder={sorted.reorder} />
      )}
    </div>
  );
}
