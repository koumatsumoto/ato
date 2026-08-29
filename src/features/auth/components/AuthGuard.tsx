import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@koumatsumoto/gh-auth-bridge-client/react";
import { saveRedirectPath } from "@/features/auth/lib/redirect-path";
import { Layout } from "@/shared/components/layout/Layout";

export function AuthGuard(): React.JSX.Element {
  const { state } = useAuth();
  const location = useLocation();

  if (!state.token) {
    saveRedirectPath(`${location.pathname}${location.search}`);
    return <Navigate to="/login" replace />;
  }

  // Only TOP can safely render before identity is ready. Share and detail
  // routes perform one-shot or identity-dependent work on mount, so mounting
  // them early would turn a normal cold start into a permanent error state.
  if (state.isLoading && location.pathname !== "/") {
    return (
      <Layout>
        <div role="status" aria-label="認証情報を確認中" className="flex min-h-40 items-center justify-center text-sm text-emerald-950/75">
          認証情報を確認しています…
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
