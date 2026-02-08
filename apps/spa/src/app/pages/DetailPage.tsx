import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTodo, useUpdateTodo } from "@/features/todos/hooks/use-todos";
import { updateTodoSchema } from "@/features/todos/lib/validation";
import { CompletionToggle } from "@/features/todos/components/CompletionToggle";
import { DetailSkeleton } from "@/features/todos/components/DetailSkeleton";
import { NotFound } from "@/shared/components/ui/NotFound";
import { ErrorBanner } from "@/shared/components/ui/ErrorBanner";

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: todo, isLoading, error, refetch } = useTodo(Number(id));
  const updateTodo = useUpdateTodo();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setBody(todo.body);
    }
  }, [todo]);

  const handleSave = () => {
    if (!todo) return;
    const result = updateTodoSchema.safeParse({ title, body });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setValidationError(null);
    updateTodo.mutate({ id: todo.id, title, body }, { onSuccess: () => setIsDirty(false) });
  };

  if (isLoading) return <DetailSkeleton />;
  if (error) return <ErrorBanner error={error} onRetry={() => void refetch()} />;
  if (!todo) return <NotFound />;

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">
        Back
      </button>
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setIsDirty(true);
          if (validationError) setValidationError(null);
        }}
        className="w-full rounded-lg border px-4 py-2 text-lg font-semibold focus:border-blue-500 focus:outline-none"
        maxLength={256}
      />
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setIsDirty(true);
          if (validationError) setValidationError(null);
        }}
        placeholder="Add a note..."
        className="w-full rounded-lg border px-4 py-3 min-h-[200px] resize-y focus:border-blue-500 focus:outline-none"
        maxLength={65536}
      />
      {validationError && <p className="text-sm text-red-600">{validationError}</p>}
      <div className="flex items-center justify-between">
        <CompletionToggle todo={todo} />
        <button
          onClick={handleSave}
          disabled={!isDirty || updateTodo.isPending}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {updateTodo.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
