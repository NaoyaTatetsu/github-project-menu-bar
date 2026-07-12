import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addTask,
  fetchBoard,
  listProjects,
  updateCardStatus,
} from "../lib/github";
import type { BoardData } from "../types";

export function useProjects(token: string | null) {
  return useQuery({
    queryKey: ["projects"],
    enabled: !!token,
    queryFn: () => listProjects(token!),
  });
}

export function useBoard(token: string | null, projectId: string | null) {
  return useQuery({
    queryKey: ["board", projectId],
    enabled: !!token && !!projectId,
    queryFn: () => fetchBoard(token!, projectId!),
  });
}

export function useUpdateStatus(
  token: string | null,
  projectId: string | null
) {
  const qc = useQueryClient();
  const key = ["board", projectId];

  return useMutation({
    mutationFn: ({
      itemId,
      fieldId,
      optionId,
    }: {
      itemId: string;
      fieldId: string;
      optionId: string;
    }) => updateCardStatus(token!, projectId!, itemId, fieldId, optionId),

    // optimistic update so the card moves instantly
    onMutate: async ({ itemId, optionId }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BoardData>(key);
      if (prev) {
        qc.setQueryData<BoardData>(key, {
          ...prev,
          cards: prev.cards.map((c) =>
            c.itemId === itemId ? { ...c, statusOptionId: optionId } : c
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

export function useAddTask(token: string | null, projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      title,
      fieldId,
      optionId,
    }: {
      title: string;
      fieldId: string | null;
      optionId: string | null;
    }) => addTask(token!, projectId!, title, fieldId, optionId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["board", projectId] });
    },
  });
}
