import { useOpenTodos } from "@/features/todos/hooks/use-todos";
import { TodoAddForm } from "@/features/todos/components/TodoAddForm";
import { TodoItem } from "@/features/todos/components/TodoItem";
import { TodoEmptyState } from "@/features/todos/components/TodoEmptyState";
import { CompletedLink } from "@/features/todos/components/CompletedLink";
import { ListSkeleton } from "@/features/todos/components/ListSkeleton";
import { ErrorBanner } from "@/shared/components/ui/ErrorBanner";

export function MainPage() {
  const { data, isLoading, error, refetch } = useOpenTodos();
  const todos = data?.todos ?? [];

  return (
    <div className="space-y-4">
      <TodoAddForm />
      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorBanner error={error} onRetry={() => void refetch()} />
      ) : todos.length === 0 ? (
        <TodoEmptyState />
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </div>
      )}
      <CompletedLink />
    </div>
  );
}
