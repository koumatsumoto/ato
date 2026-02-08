import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useClickOutside } from "@/shared/hooks/use-click-outside";

export function Header() {
  const { state, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCloseMenu = useCallback(() => setIsMenuOpen(false), []);
  useClickOutside(menuRef, handleCloseMenu);

  return (
    <header className="border-b bg-white px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="h-6 w-6" />
          ATO
        </h1>
        {state.user && (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="メニュー"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <img src={state.user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
            </button>
            {isMenuOpen && (
              <div className="animate-fadeIn absolute right-0 top-full mt-2 w-48 rounded-lg border bg-white py-1 shadow-lg">
                <div className="border-b px-4 py-2">
                  <p className="text-xs text-gray-500">{state.user.login}</p>
                </div>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
