import { z } from "zod";

export const labelSchema: z.ZodType<string> = z
  .string()
  .min(1, "ラベル名は必須です")
  .max(50, "ラベル名は50文字以内にしてください")
  .regex(/^[^\s,"]+$/, "ラベルにスペース、カンマ、引用符は使えません");

export const labelsSchema: z.ZodType<string[]> = z
  .array(labelSchema)
  .max(10, "ラベルは最大10個です")
  .refine((labels) => new Set(labels).size === labels.length, "重複するラベルがあります");

export const createActionSchema: z.ZodType<{ title: string; memo?: string | undefined; labels?: string[] | undefined }> = z.object({
  title: z.string().min(1, "タイトルは必須です").max(256, "タイトルは256文字以内にしてください"),
  memo: z.string().max(65536, "メモは65536文字以内にしてください").optional(),
  labels: labelsSchema.optional(),
});

export const updateActionSchema: z.ZodType<{ title: string; memo: string; labels?: string[] | undefined }> = z.object({
  title: z.string().min(1, "タイトルは必須です").max(256, "タイトルは256文字以内にしてください"),
  memo: z.string().max(65536, "メモは65536文字以内にしてください"),
  labels: labelsSchema.optional(),
});
