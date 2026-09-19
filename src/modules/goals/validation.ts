import { z } from "zod";

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
    z.string().max(maxLength).nullable()
  );
}

const decimalValue = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return 0;
    }

    if (typeof value === "string") {
      return Number(value);
    }

    return value;
  },
  z
    .number()
    .finite()
    .min(0)
    .max(9999999999.99)
    .refine(
      (value) => Number.isInteger(value * 100),
      "Value can have at most 2 decimal places."
    )
);

export const CreateGoalSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Goal name must be at least 2 characters.")
      .max(200),

    category: z
      .string()
      .trim()
      .min(1, "Category is required.")
      .max(100),

    targetValue: decimalValue.refine(
      (value) => value > 0,
      "Target value must be greater than 0."
    ),

    currentValue: decimalValue.default(0),

    unit: z
      .string()
      .trim()
      .min(1, "Unit is required.")
      .max(50)
      .default("Units"),

    startDate: z.coerce.date(),

    endDate: z.coerce.date(),

    isCompleted: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be before the start date.",
      });
    }

    if (data.currentValue > data.targetValue) {
      ctx.addIssue({
        code: "custom",
        path: ["currentValue"],
        message: "Current value cannot exceed the target value.",
      });
    }
  });

export const UpdateGoalSchema = z
  .object({
    id: z.string().uuid(),

    name: z
      .string()
      .trim()
      .min(2, "Goal name must be at least 2 characters.")
      .max(200)
      .optional(),

    category: z
      .string()
      .trim()
      .min(1, "Category is required.")
      .max(100)
      .optional(),

    targetValue: decimalValue.optional(),

    currentValue: decimalValue.optional(),

    unit: z
      .string()
      .trim()
      .min(1, "Unit is required.")
      .max(50)
      .optional(),

    startDate: z.coerce.date().optional(),

    endDate: z.coerce.date().optional(),

    isCompleted: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.category !== undefined ||
      data.targetValue !== undefined ||
      data.currentValue !== undefined ||
      data.unit !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.isCompleted !== undefined,
    {
      message: "At least one field must be provided.",
    }
  );

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;