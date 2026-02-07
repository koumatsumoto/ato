import type { Todo } from "@/types";
import { useCloseTodo, useReopenTodo } from "@/features/todos/hooks/use-todos";

export function CompletionToggle({ todo }: { todo: Todo }) {
  const closeTodo = useCloseTodo();
  const reopenTodo = useReopenTodo();
  const isPending = closeTodo.isPending || reopenTodo.isPending;

  const handleToggle = () => {
    if (todo.state === "open") {
      closeTodo.mutate(todo.id);
    } else {
      reopenTodo.mutate(todo.id);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
        todo.state === "open" ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
      }`}
    >
      {isPending ? "Updating..." : todo.state === "open" ? "Complete" : "Reopen"}
    </button>
  );
}
