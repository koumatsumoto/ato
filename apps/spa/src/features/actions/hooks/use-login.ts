import { useAuth } from "@/features/auth/hooks/use-auth";

export function useLogin(): string | null {
  const { state } = useAuth();
  return state.user?.login ?? null;
}
