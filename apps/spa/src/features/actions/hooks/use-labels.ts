import { useQuery, skipToken } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { GitHubLabel } from "@/features/actions/types";
import { useLogin } from "./use-login";
import { fetchLabels } from "@/features/actions/lib/labels-api";

export function useLabels(): UseQueryResult<readonly GitHubLabel[]> {
  const login = useLogin();
  return useQuery({
    queryKey: ["labels"],
    queryFn: login ? () => fetchLabels(login) : skipToken,
    staleTime: 5 * 60_000,
  });
}
