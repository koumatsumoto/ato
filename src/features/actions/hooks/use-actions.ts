import { useQuery, useInfiniteQuery, useMutation, useQueryClient, skipToken } from "@tanstack/react-query";
import type { UseQueryResult, UseInfiniteQueryResult, UseMutationResult, InfiniteData } from "@tanstack/react-query";
import type { Action, CreateActionInput, UpdateActionInput } from "@/features/actions/types";
import { useLogin } from "./use-login";
import { ensureRepository } from "@/features/actions/lib/repo-init";
import { fetchActions, createAction, fetchAction, updateAction, closeAction, reopenAction } from "@/features/actions/lib/github-api";
import type { FetchActionsResult } from "@/features/actions/lib/github-api";

export function useOpenActions(): UseQueryResult<FetchActionsResult> {
  const login = useLogin();
  return useQuery({
    queryKey: ["actions", "open"],
    queryFn: login
      ? async () => {
          await ensureRepository(login);
          return fetchActions(login, {
            state: "open",
            perPage: 30,
            sort: "created",
            direction: "desc",
          });
        }
      : skipToken,
  });
}

export function useClosedActions(): UseInfiniteQueryResult<InfiniteData<FetchActionsResult>> {
  const login = useLogin();
  return useInfiniteQuery({
    queryKey: ["actions", "closed"],
    queryFn: login
      ? ({ pageParam }: { pageParam: number }) =>
          fetchActions(login, {
            state: "closed",
            perPage: 30,
            page: pageParam,
          })
      : skipToken,
    initialPageParam: 1,
    getNextPageParam: (lastPage: FetchActionsResult) => (lastPage.hasNextPage ? lastPage.nextPage : undefined),
  });
}

export function useAction(id: number): UseQueryResult<Action> {
  const login = useLogin();
  return useQuery({
    queryKey: ["actions", id],
    queryFn: login ? () => fetchAction(login, id) : skipToken,
  });
}

let nextTempId = -1;

export function useCreateAction(): UseMutationResult<Action, Error, CreateActionInput, { previous: FetchActionsResult | undefined; tempId: number }> {
  const queryClient = useQueryClient();
  const login = useLogin();
  return useMutation({
    mutationFn: (input: CreateActionInput) => {
      if (!login) throw new Error("Not authenticated");
      return createAction(login, input);
    },
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
    onSuccess: (created, _input, context) => {
      // Replace the optimistic placeholder with the authoritative item from the
      // POST response, which is the source of truth for the new action. The open
      // list is not refetched here: GitHub's issue-list endpoint is eventually
      // consistent, so a refetch right after the write can omit the new issue and
      // drop it from the list. The next mount/focus refetch reconciles with the
      // server once it has caught up.
      queryClient.setQueryData<FetchActionsResult>(["actions", "open"], (old) => {
        if (!old) return { actions: [created], hasNextPage: false, nextPage: null };
        return {
          ...old,
          actions: old.actions.some((a) => a.id === context.tempId)
            ? old.actions.map((a) => (a.id === context.tempId ? created : a))
            : [created, ...old.actions],
        };
      });
    },
  });
}

export function useCloseAction(): UseMutationResult<Action, Error, number, { previous: FetchActionsResult | undefined }> {
  const queryClient = useQueryClient();
  const login = useLogin();
  return useMutation({
    mutationFn: (id: number) => {
      if (!login) throw new Error("Not authenticated");
      return closeAction(login, id);
    },
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
    onSettled: (data, _err, id) => {
      // Reflect the change in the detail cache from the authoritative response and
      // refresh the sibling views (closed list, any active search). The open list
      // is deliberately not refetched: its optimistic removal is authoritative and
      // GitHub's issue-list endpoint lags writes, so an immediate refetch could
      // momentarily resurrect the just-closed item.
      if (data) queryClient.setQueryData(["actions", id], data);
      void queryClient.invalidateQueries({ queryKey: ["actions", "closed"] });
      void queryClient.invalidateQueries({ queryKey: ["actions", "search"] });
    },
  });
}

export function useReopenAction(): UseMutationResult<Action, Error, number> {
  const queryClient = useQueryClient();
  const login = useLogin();
  return useMutation({
    mutationFn: (id: number) => {
      if (!login) throw new Error("Not authenticated");
      return reopenAction(login, id);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}

export function useUpdateAction(): UseMutationResult<Action, Error, { id: number } & UpdateActionInput> {
  const queryClient = useQueryClient();
  const login = useLogin();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateActionInput) => {
      if (!login) throw new Error("Not authenticated");
      return updateAction(login, id, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
  });
}
