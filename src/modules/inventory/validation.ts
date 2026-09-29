import { z } from "zod";
import { InventoryTransactionType } from "@prisma/client";

/**
 * Checks whether a number has at most two decimal places.
 */
function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.abs(Math.round(value * 100) - value * 100) < 1e-5;
}

/**
 * Normalizes nullable/optional strings.
 */
const nullableString = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined) {
        return undefined;
      }

      if (
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        return null;
      }

      return typeof value === "string"
        ? value.trim()
        : value;
    },
    z.string().max(maxLength).nullable(),
  );

/**
 * Unit cost validation for Decimal(12,2).
 */
const unitCostValue = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }

    if (
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return null;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }

    return value;
  },
  z
    .number()
    .min(0, "Unit cost cannot be negative")
    .max(
      9999999999.99,
      "Unit cost exceeds Decimal(12,2) maximum capacity",
    )
    .refine(
      hasAtMostTwoDecimalPlaces,
      "Unit cost can have at most 2 decimal places",
    )
    .nullable(),
);

/**
 * Existing normal inventory movement validation.
 */
export const RecordStockMovementSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),

  type: z.nativeEnum(InventoryTransactionType, {
    message: "Invalid inventory transaction type",
  }),

  quantity: z.coerce
    .number({
      message: "Quantity is required and must be a number",
    })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),

  auditDirection: z
    .enum(["INCREASE", "DECREASE"])
    .optional(),

  unitCost: unitCostValue.optional(),

  referenceId: nullableString(255).optional(),

  notes: nullableString(500).optional(),
});

export type RecordStockMovementInput =
  z.infer<typeof RecordStockMovementSchema>;

/**
 * Allocate physical stock to promotional stock.
 *
 * This does NOT reduce physical stock.
 * It simply reserves part of the physical stock for promotion.
 */
export const AllocatePromotionalStockSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),

  quantity: z.coerce
    .number({
      message: "Quantity is required and must be a number",
    })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
});

export type AllocatePromotionalStockInput =
  z.infer<typeof AllocatePromotionalStockSchema>;

/**
 * Release stock from promotional allocation back into
 * normally available stock.
 */
export const ReleasePromotionalStockSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),

  quantity: z.coerce
    .number({
      message: "Quantity is required and must be a number",
    })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
});

export type ReleasePromotionalStockInput =
  z.infer<typeof ReleasePromotionalStockSchema>;

/**
 * Complete promotional dispatch validation.
 *
 * A dispatch:
 * - consumes promotional stock
 * - creates an inventory transaction
 * - creates a PROMOTIONAL expense
 * - creates a PromotionalDispatch record
 */
export const PromotionalDispatchSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),

  quantity: z.coerce
    .number({
      message: "Quantity is required and must be a number",
    })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),

  recipient: z
    .string()
    .trim()
    .min(2, "Recipient is required")
    .max(120, "Recipient is too long"),

  purpose: z
    .string()
    .trim()
    .min(2, "Purpose is required")
    .max(255, "Purpose is too long"),

  referenceId: nullableString(255).optional(),

  expenseDate: z.coerce.date().optional(),
});

export type PromotionalDispatchInput =
  z.infer<typeof PromotionalDispatchSchema>;