import { useRef, useState } from "react";
import { useCreateTodo } from "@/features/todos/hooks/use-todos";
import { createTodoSchema } from "@/features/todos/lib/validation";

export function TodoAddForm() {
  const [title, setTitle] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTodo = useCreateTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createTodoSchema.safeParse({ title: title.trim() });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setValidationError(null);
    createTodo.mutate({ title: result.data.title });
    setTitle("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder="Add a todo..."
          className="flex-1 rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none"
          maxLength={256}
          autoFocus
        />
        <button
          type="submit"
          disabled={!title.trim() || createTodo.isPending}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {validationError && <p className="text-sm text-red-600">{validationError}</p>}
    </form>
  );
}
