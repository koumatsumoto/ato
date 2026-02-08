import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Todo, CreateTodoInput, UpdateTodoInput } from "@/types";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ensureRepository } from "@/features/todos/lib/repo-init";
import { fetchTodos, createTodo, fetchTodo, updateTodo, closeTodo, reopenTodo } from "@/features/todos/lib/github-api";
import type { FetchTodosResult } from "@/features/todos/lib/github-api";

export function useOpenTodos() {
  const { state } = useAuth();
  return useQuery({
    queryKey: ["todos", "open"],
    queryFn: async () => {
      await ensureRepository(state.user!.login);
      return fetchTodos(state.user!.login, {
        state: "open",
        perPage: 30,
        sort: "updated",
        direction: "desc",
      });
    },
    enabled: !!state.user,
    staleTime: 30_000,
  });
}

export function useClosedTodos() {
  const { state } = useAuth();
  return useInfiniteQuery({
    queryKey: ["todos", "closed"],
    queryFn: ({ pageParam }) =>
      fetchTodos(state.user!.login, {
        state: "closed",
        perPage: 30,
        page: pageParam,
      }),
    enabled: !!state.user,
    initialPageParam: 1,
    getNextPageParam: (lastPage: FetchTodosResult) => (lastPage.hasNextPage ? lastPage.nextPage : undefined),
    staleTime: 60_000,
  });
}

export function useTodo(id: number) {
  const { state } = useAuth();
  return useQuery({
    queryKey: ["todos", id],
    queryFn: () => fetchTodo(state.user!.login, id),
    enabled: !!state.user,
  });
}

let nextTempId = -1;

export function useCreateTodo() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: (input: CreateTodoInput) => createTodo(state.user!.login, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["todos", "open"] });
      const previous = queryClient.getQueryData<FetchTodosResult>(["todos", "open"]);
      const tempId = nextTempId--;

      queryClient.setQueryData<FetchTodosResult>(["todos", "open"], (old) => ({
        hasNextPage: old?.hasNextPage ?? false,
        nextPage: old?.nextPage ?? null,
        todos: [
          {
            id: tempId,
            title: input.title,
            body: input.body ?? "",
            state: "open" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            closedAt: null,
            url: "",
          },
          ...(old?.todos ?? []),
        ],
      }));

      return { previous, tempId };
    },
    onSuccess: (createdTodo, _input, context) => {
      queryClient.setQueryData<FetchTodosResult>(["todos", "open"], (old) => {
        if (!old) return old;
        return {
          ...old,
          todos: old.todos.map((t) => (t.id === context?.tempId ? createdTodo : t)),
        };
      });
      queryClient.setQueryData(["todos", createdTodo.id], createdTodo);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["todos", "open"] });
      }, 3000);
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["todos", "open"], context.previous);
      }
    },
  });
}

export function useCloseTodo() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: (id: number) => closeTodo(state.user!.login, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["todos", "open"] });
      const previous = queryClient.getQueryData<FetchTodosResult>(["todos", "open"]);

      queryClient.setQueryData<FetchTodosResult>(["todos", "open"], (old) => ({
        hasNextPage: old?.hasNextPage ?? false,
        nextPage: old?.nextPage ?? null,
        todos: (old?.todos ?? []).filter((t) => t.id !== id),
      }));

      return { previous };
    },
    onSuccess: (closedTodo) => {
      queryClient.setQueryData(["todos", closedTodo.id], closedTodo);
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["todos", "open"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", "closed"] });
    },
  });
}

export function useReopenTodo() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: (id: number) => reopenTodo(state.user!.login, id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateTodoInput) => updateTodo(state.user!.login, id, data),
    onSuccess: (updatedTodo: Todo) => {
      queryClient.setQueryData(["todos", updatedTodo.id], updatedTodo);
      queryClient.invalidateQueries({ queryKey: ["todos", "open"] });
    },
  });
}
