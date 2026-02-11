import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateActionInput, UpdateActionInput } from "@/features/actions/types";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ensureRepository } from "@/features/actions/lib/repo-init";
import { fetchActions, createAction, fetchAction, updateAction, closeAction, reopenAction } from "@/features/actions/lib/github-api";
import type { FetchActionsResult } from "@/features/actions/lib/github-api";

export function useOpenActions() {
  const { state } = useAuth();
  return useQuery({
    queryKey: ["actions", "open"],
    queryFn: async () => {
      await ensureRepository(state.user!.login);
      return fetchActions(state.user!.login, {
        state: "open",
        perPage: 30,
        sort: "updated",
        direction: "desc",
      });
    },
    enabled: !!state.user,
  });
}

export function useClosedActions() {
  const { state } = useAuth();
  return useInfiniteQuery({
    queryKey: ["actions", "closed"],
    queryFn: ({ pageParam }) =>
      fetchActions(state.user!.login, {
        state: "closed",
        perPage: 30,
        page: pageParam,
      }),
    enabled: !!state.user,
    initialPageParam: 1,
    getNextPageParam: (lastPage: FetchActionsResult) => (lastPage.hasNextPage ? lastPage.nextPage : undefined),
  });
}

export function useAction(id: number) {
  const { state } = useAuth();
  return useQuery({
    queryKey: ["actions", id],
    queryFn: () => fetchAction(state.user!.login, id),
    enabled: !!state.user,
  });
}

let nextTempId = -1;

export function useCreateAction() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: (input: CreateActionInput) => createAction(state.user!.login, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["actions", "open"] });
      const previous = queryClient.getQueryData<FetchActionsResult>(["actions", "open"]);
      const tempId = nextTempId--;

      queryClient.setQueryData<FetchActionsResult>(["actions", "open"], (old) => ({
        hasNextPage: old?.hasNextPage ?? false,
        nextPage: old?.nextPage ?? null,
        actions: [
          {
            id: tempId,
            title: input.title,
            memo: input.memo ?? "",
            state: "open" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            closedAt: null,
            url: "",
            labels: input.labels ?? [],
          },
          ...(old?.actions ?? []),
        ],
      }));

      return { previous, tempId };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["actions", "open"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}

export function useCloseAction() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: (id: number) => closeAction(state.user!.login, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["actions", "open"] });
      const previous = queryClient.getQueryData<FetchActionsResult>(["actions", "open"]);

      queryClient.setQueryData<FetchActionsResult>(["actions", "open"], (old) => ({
        hasNextPage: old?.hasNextPage ?? false,
        nextPage: old?.nextPage ?? null,
        actions: (old?.actions ?? []).filter((t) => t.id !== id),
      }));

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["actions", "open"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}

export function useReopenAction() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: (id: number) => reopenAction(state.user!.login, id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateActionInput) => updateAction(state.user!.login, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}
