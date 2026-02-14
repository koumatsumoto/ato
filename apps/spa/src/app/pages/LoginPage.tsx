import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { consumeRedirectPath } from "@/features/auth/components/AuthGuard";

export function LoginPage() {
  const { state, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (state.token) {
    const redirectPath = consumeRedirectPath();
    return <Navigate to={redirectPath ?? "/"} replace />;
  }

  const handleLogin = async () => {
    setError(null);
    setIsLoggingIn(true);
    try {
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-gray-50" style={{ minHeight: "var(--app-height)" }}>
      <div className="w-full max-w-sm space-y-6 text-center">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="ATO" className="mx-auto h-24 w-24" />
        <h1 className="text-3xl font-bold">ATO</h1>
        <p className="text-gray-500">日々の跡を残すメモアプリ</p>
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isLoggingIn ? "ログイン中..." : "GitHub でログイン"}
        </button>
      </div>
    </div>
  );
}
