import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAuthLog, clearAuthLog } from "@/shared/lib/auth-log";

declare const __APP_VERSION__: string;

export function DiagnosticsPage(): React.JSX.Element {
  const { state } = useAuth();
  const [, setRefreshKey] = useState(0);

  const logs = getAuthLog();
  const hasTokenInStorage = localStorage.getItem("gh-auth-bridge:token") !== null;
  const hasTokenInState = state.token !== null;

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };
  const handleClear = () => {
    clearAuthLog();
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">診断</h2>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">認証状態</h3>
        <dl className="rounded-lg border border-gray-200 bg-white text-sm">
          <div className="flex justify-between border-b border-gray-100 px-4 py-2">
            <dt className="text-gray-500">React state</dt>
            <dd className={hasTokenInState ? "text-green-700" : "text-red-700"}>{hasTokenInState ? "あり" : "なし"}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 px-4 py-2">
            <dt className="text-gray-500">localStorage</dt>
            <dd className={hasTokenInStorage ? "text-green-700" : "text-red-700"}>{hasTokenInStorage ? "あり" : "なし"}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 px-4 py-2">
            <dt className="text-gray-500">ユーザー</dt>
            <dd className="text-gray-900">{state.user?.login ?? "-"}</dd>
          </div>
          <div className="flex justify-between px-4 py-2">
            <dt className="text-gray-500">バージョン</dt>
            <dd className="font-mono text-xs text-gray-900">{__APP_VERSION__}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">認証ログ ({logs.length})</h3>
          <div className="flex gap-2">
            <button onClick={handleRefresh} className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200">
              更新
            </button>
            <button onClick={handleClear} className="rounded bg-gray-100 px-3 py-1 text-xs text-red-600 hover:bg-gray-200">
              クリア
            </button>
          </div>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">ログなし</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">時刻</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">イベント</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">詳細</th>
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().map((entry, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-gray-400">{formatTime(entry.timestamp)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-900">{entry.event}</td>
                    <td className="break-all px-3 py-1.5 text-gray-500">{entry.detail ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}
