import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Action, CreateActionInput } from "@/features/actions/types";
import type { FetchActionsResult } from "@/features/actions/lib/github-api";
import { createAction } from "@/features/actions/lib/github-api";
import { ensureRepository } from "@/features/actions/lib/repo-init";
import { useLogin } from "./use-login";

let nextTempId = -1;

export function useCreateAction(): UseMutationResult<Action, Error, CreateActionInput, { previous: FetchActionsResult | undefined; tempId: number }> {
  const queryClient = useQueryClient();
  const login = useLogin();

  return useMutation({
    mutationFn: async (input: CreateActionInput) => {
      if (!login) throw new Error("Not authenticated");
      await ensureRepository(login);
      return createAction(login, input);
    },
    onMutate: async (input) => {
      if (!login) throw new Error("Not authenticated");
      // Resolve the shared prerequisite before publishing an optimistic item.
      // A missing repository therefore never appears as a task, even briefly.
      await ensureRepository(login);
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
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["actions", "open"], context.previous);
      } else if (context) {
        queryClient.removeQueries({ queryKey: ["actions", "open"], exact: true });
      }
    },
    onSuccess: (created, _input, context) => {
      // Reconcile from the POST response. GitHub's list endpoint can lag a write,
      // so an immediate list refetch could otherwise hide the new action.
      queryClient.setQueryData<FetchActionsResult>(["actions", "open"], (old) => {
        if (!old) return { actions: [created], hasNextPage: false, nextPage: null };
        return {
          ...old,
          actions: old.actions.some((action) => action.id === context.tempId)
            ? old.actions.map((action) => (action.id === context.tempId ? created : action))
            : [created, ...old.actions],
        };
      });
    },
  });
}
