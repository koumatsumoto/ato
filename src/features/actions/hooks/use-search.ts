import { useQuery, skipToken } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { Action } from "@/features/actions/types";
import { useLogin } from "./use-login";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { searchActions } from "@/features/actions/lib/search-api";

const SEARCH_DEBOUNCE_MS = 300;

export function useSearchActions(query: string, includeCompleted: boolean, label?: string): UseQueryResult<readonly Action[]> {
  const login = useLogin();
  const debouncedQuery = useDebounce(query.trim(), SEARCH_DEBOUNCE_MS);
  const hasSearchCriteria = debouncedQuery.length > 0 || !!label || includeCompleted;

  return useQuery({
    queryKey: ["actions", "search", debouncedQuery, includeCompleted, label ?? ""],
    queryFn:
      login && hasSearchCriteria ? () => searchActions(login, { query: debouncedQuery, includeCompleted, ...(label ? { label } : {}) }) : skipToken,
  });
}
