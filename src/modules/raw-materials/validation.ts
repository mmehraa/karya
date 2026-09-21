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

const nonNegativeNumber = (message: string) =>
  z.coerce
    .number()
    .finite(message)
    .min(0, message);

export const RawMaterialBaseUnitSchema = z.enum([
  "GRAM",
  "MILLILITER",
  "PIECE",
]);

export const RawMaterialPurchaseUnitSchema = z.enum([
  "GRAM",
  "KILOGRAM",
  "MILLILITER",
  "LITER",
  "PIECE",
]);

export const CreateRawMaterialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Raw material name must be at least 2 characters.")
    .max(120, "Raw material name cannot exceed 120 characters."),

  category: nullableString(80).optional(),

  baseUnit: RawMaterialBaseUnitSchema,

  supplier: nullableString(150).optional(),

  notes: nullableString(500).optional(),
});

export const RecordRawMaterialPurchaseSchema = z.object({
  rawMaterialId: z.string().uuid("Invalid raw material ID."),

  purchaseDate: z.coerce.date(),

  quantity: positiveNumber(
    "Purchase quantity must be greater than zero.",
  ),

  purchaseUnit: RawMaterialPurchaseUnitSchema,

  totalAmount: positiveNumber(
    "Purchase amount must be greater than zero.",
  ),

  supplier: nullableString(150).optional(),

  invoiceReference: nullableString(100).optional(),

  notes: nullableString(500).optional(),
});

export const RecordRawMaterialConsumptionSchema = z.object({
  rawMaterialId: z.string().uuid("Invalid raw material ID."),

  quantity: positiveNumber(
    "Consumption quantity must be greater than zero.",
  ),

  referenceId: nullableString(100).optional(),

  notes: nullableString(500).optional(),
});

export const RawMaterialIdSchema = z.object({
  id: z.string().uuid("Invalid raw material ID."),
});

export const RawMaterialPurchaseIdSchema = z.object({
  id: z.string().uuid("Invalid raw material purchase ID."),
});

export const RawMaterialInventoryTransactionIdSchema = z.object({
  id: z.string().uuid("Invalid raw material inventory transaction ID."),
});

export type CreateRawMaterialInput = z.infer<
  typeof CreateRawMaterialSchema
>;

export type RecordRawMaterialPurchaseInput = z.infer<
  typeof RecordRawMaterialPurchaseSchema
>;

export type RecordRawMaterialConsumptionInput = z.infer<
  typeof RecordRawMaterialConsumptionSchema
>;

export type RawMaterialIdInput = z.infer<typeof RawMaterialIdSchema>;

export type RawMaterialPurchaseIdInput = z.infer<
  typeof RawMaterialPurchaseIdSchema
>;

export type RawMaterialInventoryTransactionIdInput = z.infer<
  typeof RawMaterialInventoryTransactionIdSchema
>;
