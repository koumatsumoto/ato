import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchLabels } from "@/features/actions/lib/labels-api";

export function useLabels() {
  const { state } = useAuth();
  return useQuery({
    queryKey: ["labels"],
    queryFn: () => fetchLabels(state.user!.login),
    enabled: !!state.user,
    staleTime: 5 * 60_000,
  });
}
