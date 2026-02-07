import { z } from "zod";

export const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(256, "Title must be 256 characters or less"),
  body: z.string().max(65536, "Body must be 65536 characters or less").optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(256, "Title must be 256 characters or less").optional(),
  body: z.string().max(65536, "Body must be 65536 characters or less").optional(),
});
