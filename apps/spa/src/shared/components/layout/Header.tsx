import { useAuth } from "@/features/auth/hooks/use-auth";

export function Header() {
  const { state, logout } = useAuth();
  return (
    <header className="border-b bg-white px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <h1 className="text-lg font-semibold">ATO</h1>
        {state.user && (
          <div className="flex items-center gap-3">
            <img src={state.user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
