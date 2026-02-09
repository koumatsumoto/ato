import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h2 className="text-2xl font-bold text-gray-900">見つかりません</h2>
      <p className="mt-2 text-gray-500">該当データがありませんでした。</p>
      <Link to="/" className="mt-4 text-blue-500 hover:text-blue-600">
        一覧に戻る
      </Link>
    </div>
  );
}
