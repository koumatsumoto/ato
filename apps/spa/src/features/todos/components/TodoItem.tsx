import { useNavigate } from "react-router";
import type { Todo } from "@/types";
import { useCloseTodo, useReopenTodo } from "@/features/todos/hooks/use-todos";

export function TodoItem({ todo }: { todo: Todo }) {
  const navigate = useNavigate();
  const closeTodo = useCloseTodo();
  const reopenTodo = useReopenTodo();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (todo.state === "open") {
      closeTodo.mutate(todo.id);
    } else {
      reopenTodo.mutate(todo.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/todos/${todo.id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/todos/${todo.id}`)}
      className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 hover:bg-gray-50 cursor-pointer"
    >
      <button
        onClick={handleToggle}
        aria-label={todo.state === "open" ? "Mark as complete" : "Mark as incomplete"}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 hover:border-blue-500"
      >
        {todo.state === "closed" && (
          <svg className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className={todo.state === "closed" ? "line-through text-gray-400" : ""}>{todo.title}</span>
    </div>
  );
}
