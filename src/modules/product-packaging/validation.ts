import { z } from "zod";

const ProductPackagingConfigurationItemSchema =
  z.object({
    packagingMaterialId: z
      .string()
      .min(1, "Packaging material ID is required."),

    quantity: z.coerce
      .number()
      .positive(
        "Packaging material quantity must be greater than 0."
      )
      .max(
        999999999,
        "Packaging material quantity is too large."
      )
      .refine(
        (value) =>
          Math.abs(
            Math.round(value * 1_000_000) -
              value * 1_000_000
          ) < 0.000001,
        "Packaging material quantity can have at most 6 decimal places."
      ),

    notes: z
      .string()
      .trim()
      .max(
        500,
        "Packaging material item notes cannot exceed 500 characters."
      )
      .nullable()
      .optional(),
  });

export const CreateProductPackagingConfigurationSchema =
  z.object({
    productId: z
      .string()
      .min(1, "Product ID is required."),

    name: z
      .string()
      .trim()
      .min(
        1,
        "Packaging configuration name is required."
      )
      .max(
        120,
        "Packaging configuration name cannot exceed 120 characters."
      )
      .optional()
      .default("Default Packaging"),

    notes: z
      .string()
      .trim()
      .max(
        1000,
        "Packaging configuration notes cannot exceed 1000 characters."
      )
      .nullable()
      .optional(),

    items: z
      .array(
        ProductPackagingConfigurationItemSchema
      )
      .min(
        1,
        "At least one packaging material is required."
      )
      .max(
        100,
        "A packaging configuration cannot contain more than 100 materials."
      )
      .superRefine((items, ctx) => {
        const materialIds = new Set<string>();

        items.forEach((item, index) => {
          if (
            materialIds.has(
              item.packagingMaterialId
            )
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [
                index,
                "packagingMaterialId",
              ],
              message:
                "The same packaging material cannot be added more than once to the same configuration.",
            });
          }

          materialIds.add(
            item.packagingMaterialId
          );
        });
      }),
  });

export const ProductPackagingConfigurationIdSchema =
  z.object({
    id: z
      .string()
      .min(1, "Configuration ID is required."),
  });

export const ProductPackagingConfigurationProductIdSchema =
  z.object({
    productId: z
      .string()
      .min(1, "Product ID is required."),
  });

export type CreateProductPackagingConfigurationInput =
  z.infer<
    typeof CreateProductPackagingConfigurationSchema
  >;

export type ProductPackagingConfigurationIdInput =
  z.infer<
    typeof ProductPackagingConfigurationIdSchema
  >;

export type ProductPackagingConfigurationProductIdInput =
  z.infer<
    typeof ProductPackagingConfigurationProductIdSchema
  >;