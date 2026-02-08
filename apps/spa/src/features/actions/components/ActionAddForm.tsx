import { useRef, useState } from "react";
import { useCreateAction } from "@/features/actions/hooks/use-actions";
import { createActionSchema } from "@/features/actions/lib/validation";

export function ActionAddForm() {
  const [title, setTitle] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createAction = useCreateAction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createActionSchema.safeParse({ title: title.trim() });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setValidationError(null);
    createAction.mutate({ title: result.data.title });
    setTitle("");
  };

  const handleBlur = () => {
    if (!title.trim()) {
      setIsFocused(false);
    }
  };

  const placeholder = isFocused ? "新しい行動のタイトルを入力してください" : "行動を追加";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 py-3">
        {validationError && <p className="mb-1 text-sm text-red-600">{validationError}</p>}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (validationError) setValidationError(null);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
            maxLength={256}
          />
          {isFocused && (
            <button
              type="submit"
              disabled={!title.trim() || createAction.isPending}
              className="shrink-0 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
            >
              追加
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
