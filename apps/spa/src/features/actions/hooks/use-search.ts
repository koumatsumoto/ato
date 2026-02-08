import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { searchActions } from "@/features/actions/lib/search-api";

const SEARCH_DEBOUNCE_MS = 300;

export function useSearchActions(query: string, includeCompleted: boolean, label?: string) {
  const { state } = useAuth();
  const debouncedQuery = useDebounce(query.trim(), SEARCH_DEBOUNCE_MS);

  return useQuery({
    queryKey: ["actions", "search", debouncedQuery, includeCompleted, label ?? ""],
    queryFn: () => searchActions(state.user!.login, { query: debouncedQuery, includeCompleted, ...(label ? { label } : {}) }),
    enabled: !!state.user && (debouncedQuery.length > 0 || !!label),
    staleTime: 30_000,
  });
}
