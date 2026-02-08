import { z } from "zod";

export const labelSchema = z
  .string()
  .min(1, "ラベル名は必須です")
  .max(50, "ラベル名は50文字以内にしてください")
  .regex(/^[^\s,"]+$/, "ラベルにスペース、カンマ、引用符は使えません");

export const labelsSchema = z
  .array(labelSchema)
  .max(10, "ラベルは最大10個です")
  .refine((labels) => new Set(labels).size === labels.length, "重複するラベルがあります");

export const createActionSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(256, "タイトルは256文字以内にしてください"),
  body: z.string().max(65536, "本文は65536文字以内にしてください").optional(),
  labels: labelsSchema.optional(),
});

export const updateActionSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(256, "タイトルは256文字以内にしてください"),
  body: z.string().max(65536, "本文は65536文字以内にしてください"),
  labels: labelsSchema.optional(),
});
