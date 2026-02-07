import { useRef, useState } from "react";
import { useCreateTodo } from "@/features/todos/hooks/use-todos";

export function TodoAddForm() {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const createTodo = useCreateTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createTodo.mutate({ title: trimmed });
    setTitle("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
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
    </form>
  );
}
