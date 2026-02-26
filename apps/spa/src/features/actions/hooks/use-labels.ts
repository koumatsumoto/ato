import { useQuery, skipToken } from "@tanstack/react-query";
import { useLogin } from "./use-login";
import { fetchLabels } from "@/features/actions/lib/labels-api";

export function useLabels() {
  const login = useLogin();
  return useQuery({
    queryKey: ["labels"],
    queryFn: login ? () => fetchLabels(login) : skipToken,
    staleTime: 5 * 60_000,
  });
}
