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

const cashTransactionTypeSchema = z.enum([
  "INFLOW",
  "OUTFLOW",
]);

const cashTransactionCategorySchema = z.enum([
  "CUSTOMER_PAYMENT",
  "OTHER_INCOME",
  "RAW_MATERIAL_PURCHASE",
  "PACKAGING_MATERIAL_PURCHASE",
  "OPERATING_EXPENSE",
  "SHIPPING",
  "PAYMENT_PROCESSING_FEE",
  "CUSTOMER_REFUND",
  "OTHER",
]);

export const CreateCashTransactionSchema = z.object({
  transactionDate: z.coerce.date(),

  type: cashTransactionTypeSchema,

  category: cashTransactionCategorySchema,

  amount: moneyValue.refine(
    (value) => value > 0,
    "Cash transaction amount must be greater than zero.",
  ),

  paymentMethod: nullableString(80).optional(),

  description: z
    .string()
    .trim()
    .min(2, "Description must be at least 2 characters.")
    .max(200, "Description cannot exceed 200 characters."),

  referenceId: nullableString(150).optional(),

  notes: nullableString(500).optional(),
});

export const DeleteCashTransactionSchema = z.object({
  id: z.string().uuid(),
});

export const CashFlowPeriodSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type CreateCashTransactionInput = z.infer<
  typeof CreateCashTransactionSchema
>;

export type DeleteCashTransactionInput = z.infer<
  typeof DeleteCashTransactionSchema
>;

export type CashFlowPeriodInput = z.infer<
  typeof CashFlowPeriodSchema
>;