import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { searchActions } from "@/features/actions/lib/search-api";

const SEARCH_DEBOUNCE_MS = 300;

export function useSearchActions(query: string, includeCompleted: boolean) {
  const { state } = useAuth();
  const debouncedQuery = useDebounce(query.trim(), SEARCH_DEBOUNCE_MS);

  return useQuery({
    queryKey: ["actions", "search", debouncedQuery, includeCompleted],
    queryFn: () => searchActions(state.user!.login, { query: debouncedQuery, includeCompleted }),
    enabled: !!state.user && debouncedQuery.length > 0,
    staleTime: 30_000,
  });
}
