import { z } from "zod";

const nullableString = (maxLength: number) =>
  z.preprocess(
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

const moneyValue = z.preprocess(
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
    .min(0, "Amount cannot be negative.")
    .refine(
      (value) => Number.isInteger(value * 100),
      "Amount can have at most two decimal places.",
    )
    .max(9999999999.99, "Amount is too large."),
);

const expenseCategorySchema = z.enum([
  "PRODUCT_FORMULATION",
  "PACKAGING",
  "PRINTING_LABELS",
  "SHIPPING",
  "MARKETING",
  "PROMOTIONAL",
  "EQUIPMENT",
  "WEBSITE_SOFTWARE",
  "LEGAL_COMPLIANCE",
  "OPERATIONS",
  "OTHER",
]);

export const CreateExpenseSchema = z.object({
  expenseDate: z.coerce.date(),

  category: expenseCategorySchema,

  description: z
    .string()
    .trim()
    .min(2, "Description must be at least 2 characters.")
    .max(200, "Description cannot exceed 200 characters."),

  amount: moneyValue.refine(
    (value) => value > 0,
    "Expense amount must be greater than zero.",
  ),

  vendor: nullableString(150).optional(),

  paymentMethod: nullableString(80).optional(),

  isRecurring: z.boolean().default(false),

  notes: nullableString(500).optional(),
});

export const UpdateExpenseSchema = z
  .object({
    id: z.string().uuid(),

    expenseDate: z.coerce.date().optional(),

    category: expenseCategorySchema.optional(),

    description: z
      .string()
      .trim()
      .min(2, "Description must be at least 2 characters.")
      .max(200, "Description cannot exceed 200 characters.")
      .optional(),

    amount: moneyValue.optional(),

    vendor: nullableString(150).optional(),

    paymentMethod: nullableString(80).optional(),

    isRecurring: z.boolean().optional(),

    notes: nullableString(500).optional(),
  })
  .refine(
    (data) =>
      data.expenseDate !== undefined ||
      data.category !== undefined ||
      data.description !== undefined ||
      data.amount !== undefined ||
      data.vendor !== undefined ||
      data.paymentMethod !== undefined ||
      data.isRecurring !== undefined ||
      data.notes !== undefined,
    {
      message: "At least one expense field must be provided for an update.",
    },
  );

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;

export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;