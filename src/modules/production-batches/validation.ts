import { z } from "zod";

const entityIdSchema = z.string().trim().min(1, "ID is required.");

export const CreateProductionBatchSchema = z.object({
  productId: entityIdSchema,

  formulationId: entityIdSchema,

  packagingConfigurationId: entityIdSchema,

  batchNumber: z
    .string()
    .trim()
    .min(1, "Batch number is required.")
    .max(100, "Batch number must be 100 characters or fewer."),

  plannedQuantity: z
    .number()
    .int("Planned quantity must be a whole number.")
    .positive("Planned quantity must be greater than zero.")
    .max(
      1_000_000,
      "Planned quantity is too large.",
    ),

  notes: z
    .string()
    .trim()
    .max(
      1000,
      "Notes must be 1000 characters or fewer.",
    )
    .optional(),
});

export const CompleteProductionBatchSchema = z.object({
  batchId: entityIdSchema,

  producedQuantity: z
    .number()
    .int("Produced quantity must be a whole number.")
    .positive("Produced quantity must be greater than zero.")
    .max(
      1_000_000,
      "Produced quantity is too large.",
    ),

  notes: z
    .string()
    .trim()
    .max(
      1000,
      "Notes must be 1000 characters or fewer.",
    )
    .optional(),
});

export const ProductionBatchIdSchema = z.object({
  batchId: entityIdSchema,
});

export const GetProductionBatchSchema = z.object({
  batchId: entityIdSchema,
});

export const GetProductionBatchesSchema = z.object({
  productId: entityIdSchema.optional(),
});

export const DeleteProductionBatchSchema = z.object({
  batchId: entityIdSchema,
});

export type CreateProductionBatchInput =
  z.infer<typeof CreateProductionBatchSchema>;

export type CompleteProductionBatchInput =
  z.infer<typeof CompleteProductionBatchSchema>;

export type ProductionBatchIdInput =
  z.infer<typeof ProductionBatchIdSchema>;

export type GetProductionBatchInput =
  z.infer<typeof GetProductionBatchSchema>;

export type GetProductionBatchesInput =
  z.infer<typeof GetProductionBatchesSchema>;

export type DeleteProductionBatchInput =
  z.infer<typeof DeleteProductionBatchSchema>;