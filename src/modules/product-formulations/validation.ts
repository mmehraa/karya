import { z } from "zod";

/**
 * Preprocesses nullable string inputs:
 *
 * - undefined remains undefined
 * - null remains null
 * - empty/whitespace strings become null
 * - non-empty strings are trimmed
 */
const nullableString = (maxLen: number) =>
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

      return typeof value === "string" ? value.trim() : value;
    },
    z.string().max(maxLen).nullable()
  );

/**
 * Decimal quantity validation.
 *
 * Product formulation quantities are stored as Decimal(16,6),
 * so we allow up to 6 decimal places.
 */
const formulationQuantity = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();

      if (trimmed === "") {
        return value;
      }

      const parsed = Number(trimmed);

      return Number.isNaN(parsed) ? value : parsed;
    }

    return value;
  },
  z
    .number({
      error: "Quantity must be a valid number",
    })
    .finite("Quantity must be a finite number")
    .gt(0, "Quantity must be greater than 0")
    .max(
      9999999999.999999,
      "Quantity exceeds the maximum supported value"
    )
    .refine(
      (value) =>
        Math.abs(
          Math.round(value * 1_000_000) -
            value * 1_000_000
        ) < 1e-5,
      "Quantity can have at most 6 decimal places"
    )
);

/**
 * One raw-material line in a formulation.
 */
const formulationItemSchema = z.object({
  rawMaterialId: z.string().uuid("Invalid raw material ID format"),

  /**
   * Quantity required to make ONE finished product unit.
   */
  quantity: formulationQuantity,

  notes: nullableString(300).optional(),
});

/**
 * Create a new formulation/version.
 */
export const CreateProductFormulationSchema = z
  .object({
    productId: z.string().uuid("Invalid product ID format"),

    name: z
      .string({
        error: "Formulation name is required",
      })
      .trim()
      .min(
        2,
        "Formulation name must be at least 2 characters"
      )
      .max(
        120,
        "Formulation name cannot exceed 120 characters"
      ),

    notes: nullableString(500).optional(),

    items: z
      .array(formulationItemSchema)
      .min(
        1,
        "A formulation must contain at least one raw material"
      )
      .max(
        100,
        "A formulation cannot contain more than 100 raw materials"
      ),
  })
  .superRefine((data, ctx) => {
    const rawMaterialIds = data.items.map(
      (item) => item.rawMaterialId
    );

    const uniqueIds = new Set(rawMaterialIds);

    if (uniqueIds.size !== rawMaterialIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message:
          "A raw material can only appear once in a formulation.",
      });
    }
  });

/**
 * Fetch all formulations for one product.
 */
export const GetProductFormulationsSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
});

/**
 * Fetch the active formulation for one product.
 */
export const GetActiveProductFormulationSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
});

/**
 * Delete one formulation version.
 */
export const DeleteProductFormulationSchema = z.object({
  id: z.string().uuid("Invalid formulation ID format"),
});

export type CreateProductFormulationInput = z.infer<
  typeof CreateProductFormulationSchema
>;

export type GetProductFormulationsInput = z.infer<
  typeof GetProductFormulationsSchema
>;

export type GetActiveProductFormulationInput = z.infer<
  typeof GetActiveProductFormulationSchema
>;

export type DeleteProductFormulationInput = z.infer<
  typeof DeleteProductFormulationSchema
>;