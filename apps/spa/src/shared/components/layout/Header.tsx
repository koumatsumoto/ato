import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useClickOutside } from "@/shared/hooks/use-click-outside";

export function Header() {
  const { state, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCloseMenu = useCallback(() => setIsMenuOpen(false), []);
  useClickOutside(menuRef, handleCloseMenu);

  return (
    <header className="bg-white px-4 py-3 shadow">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <h1 className="text-lg font-semibold">
          <Link to="/" className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="h-6 w-6" />
            ATO
          </Link>
        </h1>
        {state.user && (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="メニュー"
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
            >
              <img src={state.user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
            </button>
            {isMenuOpen && (
              <div className="animate-fadeIn absolute right-0 top-full mt-2 w-48 rounded-lg bg-white py-1 shadow-xl">
                <div className="border-b border-gray-200 px-4 py-2">
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
                <div className="border-t border-gray-200 px-4 py-1.5">
                  <p className="text-[10px] text-gray-400">version: {__APP_VERSION__}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
