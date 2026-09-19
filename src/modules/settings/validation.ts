import { z } from "zod";

function nullableString(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (
        value === undefined ||
        value === null
      ) {
        return null;
      }

      if (
        typeof value === "string" &&
        value.trim() === ""
      ) {
        return null;
      }

      return value;
    },
    z
      .string()
      .trim()
      .max(maxLength)
      .nullable(),
  );
}

export const UpdateBusinessProfileSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2, "Business name must be at least 2 characters.")
      .max(150),

    tagline: nullableString(250),

    description: nullableString(1000),

    industry: z
      .string()
      .trim()
      .min(2)
      .max(100),

    constitution: nullableString(100),

    countryCode: nullableString(10),
  });

export const UpdateBusinessSettingsSchema =
  z.object({
    currencyCode: z
      .string()
      .trim()
      .min(3)
      .max(10)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Currency code contains invalid characters.",
      ),

    currencySymbol: z
      .string()
      .trim()
      .min(1)
      .max(10),

    fiscalYearStart: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(12),

    orderPrefix: z
      .string()
      .trim()
      .min(1)
      .max(20),

    nextOrderNumber: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(999999999),

    supportEmail: nullableString(254),

    supportPhone: nullableString(30),

    lowStockThreshold: z
      .coerce
      .number()
      .int()
      .min(0)
      .max(999999999),
  });

export type UpdateBusinessProfileInput =
  z.infer<typeof UpdateBusinessProfileSchema>;

export type UpdateBusinessSettingsInput =
  z.infer<typeof UpdateBusinessSettingsSchema>;