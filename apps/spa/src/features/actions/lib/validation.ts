import { z } from "zod";

export const createActionSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(256, "タイトルは256文字以内にしてください"),
  body: z.string().max(65536, "本文は65536文字以内にしてください").optional(),
});

export const updateActionSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(256, "タイトルは256文字以内にしてください"),
  body: z.string().max(65536, "本文は65536文字以内にしてください"),
});
