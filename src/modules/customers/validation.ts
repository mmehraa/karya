import { z } from "zod";

/**
 * Preprocesses optional nullable string inputs:
 * - undefined remains undefined
 * - null or blank strings become null
 * - non-empty strings are trimmed
 */
const nullableString = (maxLen: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined) return undefined;

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

export const CreateCustomerSchema = z.object({
  name: z
    .string({ error: "Customer name is required" })
    .trim()
    .min(2, "Customer name must be at least 2 characters")
    .max(120, "Customer name cannot exceed 120 characters"),

  email: nullableString(254).optional(),

  phone: nullableString(30).optional(),

  city: nullableString(100).optional(),

  state: nullableString(100).optional(),

  notes: nullableString(500).optional(),
});

export const UpdateCustomerSchema = z.object({
  id: z.string().uuid("Invalid customer ID format"),

  name: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters")
    .max(120, "Customer name cannot exceed 120 characters")
    .optional(),

  email: nullableString(254).optional(),

  phone: nullableString(30).optional(),

  city: nullableString(100).optional(),

  state: nullableString(100).optional(),

  notes: nullableString(500).optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;