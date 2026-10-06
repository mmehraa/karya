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

const moneyValue = z.coerce.number().finite();

const expenseCategorySchema = z.enum([
  "PRODUCT_FORMULATION",
  "PACKAGING",
  "PRINTING_LABELS",
  "SHIPPING",
  "MARKETING",
  "PROMOTIONAL",
  "FRIENDS_FAMILY",
  "EQUIPMENT",
  "WEBSITE_SOFTWARE",
  "LEGAL_COMPLIANCE",
  "OPERATIONS",
  "MATERIAL_WASTAGE",
  "OTHER",
]);

export const CreateExpenseSchema = z.object({
  expenseDate: z.coerce.date(),

  category: expenseCategorySchema,

  description: z
    .string()
    .trim()
    .min(1, "Expense description is required.")
    .max(200, "Expense description cannot exceed 200 characters."),

  amount: moneyValue.refine(
    (value) => value > 0,
    "Expense amount must be greater than zero.",
  ),

  vendor: nullableString(150).optional(),

  paymentMethod: nullableString(80).optional(),

  isRecurring: z.boolean().default(false),

  notes: nullableString(500).optional(),
});

export const UpdateExpenseSchema = CreateExpenseSchema.extend({
  id: z.string().uuid("Invalid expense ID."),
});

export const DeleteExpenseSchema = z.object({
  id: z.string().uuid("Invalid expense ID."),
});

export type CreateExpenseInput = z.infer<
  typeof CreateExpenseSchema
>;

export type UpdateExpenseInput = z.infer<
  typeof UpdateExpenseSchema
>;

export type DeleteExpenseInput = z.infer<
  typeof DeleteExpenseSchema
>;