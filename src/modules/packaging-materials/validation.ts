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

const positiveNumber = (message: string) =>
  z.coerce
    .number()
    .finite(message)
    .positive(message);

export const PackagingMaterialBaseUnitSchema = z.enum([
  "PIECE",
]);

export const PackagingMaterialPurchaseUnitSchema = z.enum([
  "PIECE",
  "PACK",
  "BOX",
  "BUNDLE",
  "CARTON",
]);

export const CreatePackagingMaterialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Packaging material name must be at least 2 characters.")
    .max(120, "Packaging material name cannot exceed 120 characters."),

  category: nullableString(80).optional(),

  baseUnit: PackagingMaterialBaseUnitSchema,

  supplier: nullableString(150).optional(),

  notes: nullableString(500).optional(),
});

export const RecordPackagingMaterialPurchaseSchema = z.object({
  packagingMaterialId: z.string().uuid(
    "Invalid packaging material ID.",
  ),

  purchaseDate: z.coerce.date(),

  quantity: positiveNumber(
    "Purchase quantity must be greater than zero.",
  ),

  purchaseUnit: PackagingMaterialPurchaseUnitSchema,

  unitsPerPurchaseUnit: positiveNumber(
    "Units per purchase unit must be greater than zero.",
  ),

  totalAmount: positiveNumber(
    "Purchase amount must be greater than zero.",
  ),

  supplier: nullableString(150).optional(),

  invoiceReference: nullableString(100).optional(),

  notes: nullableString(500).optional(),
});

export const RecordPackagingMaterialConsumptionSchema = z.object({
  packagingMaterialId: z.string().uuid(
    "Invalid packaging material ID.",
  ),

  quantity: positiveNumber(
    "Consumption quantity must be greater than zero.",
  ),

  referenceId: nullableString(100).optional(),

  notes: nullableString(500).optional(),
});

export const PackagingMaterialIdSchema = z.object({
  id: z.string().uuid("Invalid packaging material ID."),
});

export const PackagingMaterialPurchaseIdSchema = z.object({
  id: z.string().uuid(
    "Invalid packaging material purchase ID.",
  ),
});

export const PackagingMaterialInventoryTransactionIdSchema = z.object({
  id: z.string().uuid(
    "Invalid packaging material inventory transaction ID.",
  ),
});

export type CreatePackagingMaterialInput = z.infer<
  typeof CreatePackagingMaterialSchema
>;

export type RecordPackagingMaterialPurchaseInput = z.infer<
  typeof RecordPackagingMaterialPurchaseSchema
>;

export type RecordPackagingMaterialConsumptionInput = z.infer<
  typeof RecordPackagingMaterialConsumptionSchema
>;

export type PackagingMaterialIdInput = z.infer<
  typeof PackagingMaterialIdSchema
>;

export type PackagingMaterialPurchaseIdInput = z.infer<
  typeof PackagingMaterialPurchaseIdSchema
>;

export type PackagingMaterialInventoryTransactionIdInput = z.infer<
  typeof PackagingMaterialInventoryTransactionIdSchema
>;