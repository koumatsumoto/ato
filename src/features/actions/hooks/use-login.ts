import { useAuth } from "@koumatsumoto/gh-auth-bridge-client/react";

export function useLogin(): string | null {
  const { state } = useAuth();
  return state.user?.login ?? null;
}
