import { useState } from "react";
import { useOpenActions } from "@/features/actions/hooks/use-actions";
import { useSearchActions } from "@/features/actions/hooks/use-search";
import { ActionAddForm } from "@/features/actions/components/ActionAddForm";
import { ActionItem } from "@/features/actions/components/ActionItem";
import { ActionEmptyState } from "@/features/actions/components/ActionEmptyState";
import { SearchPanel } from "@/features/actions/components/SearchPanel";
import { ListSkeleton } from "@/features/actions/components/ListSkeleton";
import { SetupGuide } from "@/features/actions/components/SetupGuide";
import { ErrorBanner } from "@/shared/components/ui/ErrorBanner";
import { RepoNotConfiguredError } from "@/shared/lib/errors";

export function MainPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [searchLabel, setSearchLabel] = useState("");

  const openActions = useOpenActions();
  const searchResult = useSearchActions(searchQuery, includeCompleted, searchLabel);

  const isSearching = searchQuery.trim().length > 0 || searchLabel.length > 0;
  const activeQuery = isSearching ? searchResult : openActions;
  const actions = isSearching ? (searchResult.data ?? []) : (openActions.data?.actions ?? []);
  const isRepoNotConfigured = activeQuery.error instanceof RepoNotConfiguredError;

  const handleSearchChange = (query: string, completed: boolean, label: string) => {
    setSearchQuery(query);
    setIncludeCompleted(completed);
    setSearchLabel(label);
  };

  return (
    <div className="pb-24">
      <div className="space-y-2">
        <SearchPanel onSearchChange={handleSearchChange} />
        {activeQuery.isLoading ? (
          <ListSkeleton />
        ) : isRepoNotConfigured ? (
          <SetupGuide />
        ) : activeQuery.error ? (
          <ErrorBanner error={activeQuery.error} onRetry={() => void activeQuery.refetch()} />
        ) : actions.length === 0 ? (
          isSearching ? (
            <p className="py-8 text-center text-sm text-gray-400">該当する行動が見つかりませんでした。</p>
          ) : (
            <ActionEmptyState />
          )
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white">
            {actions.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </div>
        )}
      </div>
      {!isRepoNotConfigured && <ActionAddForm />}
    </div>
  );
}
