const REPO_INITIALIZED_KEY = "ato:repo-initialized";
const CREATE_REPO_URL = "https://github.com/new?name=ato-datastore&visibility=private&auto_init=true";
const INSTALL_APP_URL = "https://github.com/apps/ato-app/installations/new";

export function SetupGuide() {
  const handleReload = () => {
    localStorage.removeItem(REPO_INITIALIZED_KEY);
    window.location.reload();
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <h2 className="mb-4 text-lg font-semibold text-blue-900">初回セットアップ</h2>
      <p className="mb-4 text-sm text-blue-800">ATO を使用するには、以下の手順でリポジトリとアプリの設定を行ってください。</p>
      <ol className="mb-6 space-y-4 text-sm text-blue-900">
        <li className="flex gap-3">
          <span className="font-bold">1.</span>
          <div>
            <a href={CREATE_REPO_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline hover:text-blue-900">
              リポジトリを作成
            </a>
            <p className="mt-1 text-gray-600">プライベートリポジトリ「ato-datastore」を作成します。</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="font-bold">2.</span>
          <div>
            <a href={INSTALL_APP_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline hover:text-blue-900">
              ATO App をインストール
            </a>
            <p className="mt-1 text-gray-600">作成したリポジトリに GitHub App をインストールします。</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="font-bold">3.</span>
          <div>
            <button type="button" onClick={handleReload} className="font-medium text-blue-700 underline hover:text-blue-900">
              ページを再読み込み
            </button>
            <p className="mt-1 text-gray-600">セットアップ完了後、ページを再読み込みしてください。</p>
          </div>
        </li>
      </ol>
      <div className="rounded border border-blue-300 bg-blue-100 p-3 text-xs text-blue-800">
        <strong>注意:</strong> リポジトリ名は必ず「ato-datastore」にしてください。
      </div>
    </div>
  );
}
