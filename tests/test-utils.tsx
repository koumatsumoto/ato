import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { AuthProvider, AuthError, clearToken, TOKEN_KEY } from "@koumatsumoto/gh-auth-bridge-client/react";
import { REPO_INITIALIZED_KEY } from "@/shared/lib/storage-keys";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof AuthError) {
          clearToken();
        }
      },
    }),
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function createWrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

export function setupAuthenticatedUser(): void {
  localStorage.setItem(TOKEN_KEY, "test-token");
  localStorage.setItem(REPO_INITIALIZED_KEY, "true");
}

export function mockFetchResponses(...responses: { body: unknown; status?: number; headers?: Record<string, string> }[]): typeof globalThis.fetch {
  const fn = vi.fn<typeof globalThis.fetch>();
  for (const { body, status = 200, headers = {} } of responses) {
    fn.mockResolvedValueOnce(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...headers },
      }),
    );
  }
  fn.mockResolvedValue(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }));
  return fn;
}

export function mockFetchResponse(body: unknown, status = 200): typeof globalThis.fetch {
  const fn = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  globalThis.fetch = fn;
  return fn;
}
