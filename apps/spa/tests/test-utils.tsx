import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { AuthProvider } from "@/features/auth/hooks/use-auth";
import { AuthError } from "@/shared/lib/errors";
import { clearToken } from "@/features/auth/lib/token-store";
import { TOKEN_KEY, REPO_INITIALIZED_KEY } from "@/shared/lib/storage-keys";

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

export function createWrapper() {
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

export function mockFetchResponses(
  ...responses: Array<{ body: unknown; status?: number; headers?: Record<string, string> }>
): ReturnType<typeof vi.fn> {
  const fn = vi.fn();
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

export function mockFetchResponse(body: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  globalThis.fetch = fn;
  return fn;
}
