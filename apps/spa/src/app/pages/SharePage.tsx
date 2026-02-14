import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useCreateAction } from "@/features/actions/hooks/use-actions";

const TITLE_MAX_LENGTH = 256;

function stripControlChars(s: string): string {
  return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
}

export function SharePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const createAction = useCreateAction();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");
  const processedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const url = stripControlChars(searchParams.get("url") ?? "");
    const pageTitle = stripControlChars(searchParams.get("title") ?? "");
    const text = stripControlChars(searchParams.get("text") ?? "");

    if (!url && !pageTitle && !text) {
      setStatus("error");
      setErrorMessage("共有データが見つかりませんでした");
      return;
    }

    const actionTitle = (pageTitle ? `読む：${pageTitle}` : url ? `読む：${url}` : `読む：${text}`).slice(0, TITLE_MAX_LENGTH);

    const memoParts = [url, text].filter(Boolean);
    const memo = memoParts.join("\n\n");

    createAction.mutate(
      { title: actionTitle, ...(memo ? { memo } : {}), labels: ["あとで読む"] },
      {
        onSuccess: () => {
          setStatus("success");
          timerRef.current = setTimeout(() => navigate("/", { replace: true }), 1500);
        },
        onError: (err) => {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "保存に失敗しました");
        },
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-center" style={{ minHeight: "calc(var(--app-height) - 60px)" }}>
      <div className="w-full max-w-sm space-y-4 text-center">
        {status === "processing" && (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            <p className="text-sm text-gray-600">保存しています...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">保存しました</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-red-600">{errorMessage}</p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              ホームに戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}
