import { z } from "zod";
import { ProductStatus } from "@prisma/client";

/**
 * Preprocesses nullable string inputs:
 * - undefined remains undefined (omitted in partial updates)
 * - null or empty/whitespace string transforms to null
 * - non-empty strings are trimmed
 */
const nullableString = (maxLen: number) =>
  z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === null || (typeof val === "string" && val.trim() === "")) return null;
    return typeof val === "string" ? val.trim() : val;
  }, z.string().max(maxLen).nullable());

/**
 * Checks if a number has at most 2 decimal places without suffering
 * from floating-point representation artifacts (e.g. 0.29, 10.55).
 */
function hasAtMostTwoDecimalPlaces(val: number): boolean {
  return Math.abs(Math.round(val * 100) - val * 100) < 1e-5;
}

/**
 * Preprocesses financial money inputs (Decimal 12,2):
 * - undefined remains undefined (omitted in partial updates)
 * - null, empty string, or whitespace transforms to null
 * - numerical values or numeric strings are parsed to number
 * - explicit 0 remains 0
 * - negative values are rejected
 * - values with > 2 decimal places are rejected (no silent rounding)
 * - upper bound capped at mathematical Decimal(12,2) limit: 9,999,999,999.99
 */
const financialValue = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null || (typeof val === "string" && val.trim() === "")) return null;
  if (typeof val === "string") {
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  }
  return val;
}, z
  .number()
  .min(0, "Financial value cannot be negative")
  .max(9999999999.99, "Value exceeds Decimal(12,2) maximum capacity")
  .refine(
    (val) => hasAtMostTwoDecimalPlaces(val),
    "Financial value can have at most 2 decimal places"
  )
  .nullable());

export const CreateProductSchema = z.object({
  name: z
    .string({ error: "Product name is required" })
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(120, "Product name cannot exceed 120 characters"),

  sku: z
    .string({ error: "SKU is required" })
    .trim()
    .toUpperCase()
    .min(2, "SKU must be at least 2 characters")
    .max(40, "SKU cannot exceed 40 characters")
    .regex(/^[A-Z0-9_-]+$/, "SKU can only contain alphanumeric characters, dashes, and underscores"),

  category: z
    .string()
    .trim()
    .max(50, "Category cannot exceed 50 characters")
    .optional()
    .default("Skincare"),

  description: nullableString(500).optional(),
  supplier: nullableString(100).optional(),

  status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.DRAFT),

  reorderLevel: z.coerce
    .number()
    .int("Reorder level must be an integer")
    .min(0, "Reorder level cannot be negative")
    .optional()
    .default(20),

  sellingPrice: financialValue.optional(),
  cogs: financialValue.optional(),
  packagingCost: financialValue.optional(),
  variableCost: financialValue.optional(),
});

export const UpdateProductSchema = z.object({
  id: z.string().trim().min(1, "Product ID is required"),

  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(120, "Product name cannot exceed 120 characters")
    .optional(),

  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "SKU must be at least 2 characters")
    .max(40, "SKU cannot exceed 40 characters")
    .regex(/^[A-Z0-9_-]+$/, "SKU can only contain alphanumeric characters, dashes, and underscores")
    .optional(),

  category: z
    .string()
    .trim()
    .min(1, "Category cannot be empty")
    .max(50, "Category cannot exceed 50 characters")
    .optional(),

  description: nullableString(500).optional(),
  supplier: nullableString(100).optional(),

  status: z.nativeEnum(ProductStatus).optional(),

  reorderLevel: z.coerce
    .number()
    .int("Reorder level must be an integer")
    .min(0, "Reorder level cannot be negative")
    .optional(),

  sellingPrice: financialValue.optional(),
  cogs: financialValue.optional(),
  packagingCost: financialValue.optional(),
  variableCost: financialValue.optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;