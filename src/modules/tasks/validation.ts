import { z } from "zod";
import {
  Priority,
  TaskStatus,
} from "@prisma/client";

function nullableString(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return null;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();

        return trimmed === "" ? null : trimmed;
      }

      return value;
    },
    z.string().max(maxLength).nullable(),
  );
}

export const CreateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Task title must be at least 2 characters.")
    .max(200),

  description: nullableString(1000).optional(),

  priority: z
    .nativeEnum(Priority)
    .default(Priority.MEDIUM),

  status: z
    .nativeEnum(TaskStatus)
    .default(TaskStatus.TODO),

  dueDate: z
    .union([
      z.coerce.date(),
      z.null(),
    ])
    .optional(),

  goalId: z
    .string()
    .uuid()
    .nullable()
    .optional(),

  notes: nullableString(1000).optional(),
});

export const UpdateTaskSchema = z
  .object({
    id: z.string().uuid(),

    title: z
      .string()
      .trim()
      .min(2, "Task title must be at least 2 characters.")
      .max(200)
      .optional(),

    description: nullableString(1000).optional(),

    priority: z
      .nativeEnum(Priority)
      .optional(),

    status: z
      .nativeEnum(TaskStatus)
      .optional(),

    dueDate: z
      .union([
        z.coerce.date(),
        z.null(),
      ])
      .optional(),

    goalId: z
      .string()
      .uuid()
      .nullable()
      .optional(),

    notes: nullableString(1000).optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).some(
        (key) => key !== "id",
      ),
    {
      message: "At least one field must be provided.",
    },
  );

export type CreateTaskInput = z.infer<
  typeof CreateTaskSchema
>;

export type UpdateTaskInput = z.infer<
  typeof UpdateTaskSchema
>;