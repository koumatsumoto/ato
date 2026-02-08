import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Layout } from "@/shared/components/layout/Layout";

function PageSkeleton() {
  return (
    <div className="min-h-dvh bg-gray-50" style={{ paddingTop: "var(--sat)" }}>
      <div className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="h-6 w-12 animate-pulse rounded bg-gray-200" />
          <div className="h-7 w-7 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthGuard() {
  const { state } = useAuth();

  if (state.isLoading) return <PageSkeleton />;
  if (!state.token) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
