import { Link } from "react-router";
import { useClosedTodos } from "@/features/todos/hooks/use-todos";
import { TodoItem } from "@/features/todos/components/TodoItem";
import { ListSkeleton } from "@/features/todos/components/ListSkeleton";

export function CompletedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useClosedTodos();

  const todos = data?.pages.flatMap((page) => page.todos) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-600">Completed</h2>
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
          Back to todos
        </Link>
      </div>
      {isLoading ? (
        <ListSkeleton />
      ) : todos.length === 0 ? (
        <p className="py-8 text-center text-gray-400">No completed todos</p>
      ) : (
        <>
          <div className="space-y-2">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
          {hasNextPage && (
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
              {isFetchingNextPage ? "Loading..." : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
