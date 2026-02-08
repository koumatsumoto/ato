import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthContextValue, AuthState, AuthUser } from "@/features/auth/types";
import { AuthError } from "@/shared/lib/errors";
import { getToken, setToken, clearToken } from "@/features/auth/lib/token-store";
import { openLoginPopup } from "@/features/auth/lib/auth-client";
import { githubFetch } from "@/shared/lib/github-client";
import { getOAuthProxyUrl } from "@/shared/lib/env";

const AuthContext = createContext<AuthContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async (): Promise<AuthUser> => {
      const response = await githubFetch("/user");
      if (!response.ok) throw new AuthError("Failed to fetch user");
      const data = await response.json();
      return {
        login: data.login,
        id: data.id,
        avatarUrl: data.avatar_url,
      };
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (error instanceof AuthError && token !== null) {
    setTokenState(null);
  }

  const login = useCallback(async () => {
    const proxyUrl = getOAuthProxyUrl();
    const accessToken = await openLoginPopup(proxyUrl);
    setToken(accessToken);
    setTokenState(accessToken);
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  }, [queryClient]);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    queryClient.clear();
  }, [queryClient]);

  const state: AuthState = useMemo(
    () => ({
      token,
      user: user ?? null,
      isLoading: !!token && isLoading,
    }),
    [token, user, isLoading],
  );

  const value: AuthContextValue = useMemo(() => ({ state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
