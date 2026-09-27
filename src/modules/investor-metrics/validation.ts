
import { z } from "zod";

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date in YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid calendar date.");

const nonEmptyTextSchema = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .max(1000, "This field must be 1000 characters or fewer.");

const optionalTextSchema = z
  .string()
  .trim()
  .max(2000, "This field must be 2000 characters or fewer.")
  .optional()
  .or(z.literal(""));

const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Enter a valid three-letter currency code.");

export const investorMarketAssumptionSchema = z
  .object({
    market: z.enum(["TAM", "SAM", "SOM"]),
    value: z
      .number()
      .finite()
      .positive("Market size must be greater than zero."),
    currencyCode: currencyCodeSchema,
    marketDefinition: nonEmptyTextSchema,
    geography: nonEmptyTextSchema,
    methodology: nonEmptyTextSchema,
    sourceType: z.enum([
      "USER_PROVIDED",
      "EXTERNAL_RESEARCH",
    ]),
    sourceName: optionalTextSchema,
    sourceUrl: z
      .string()
      .trim()
      .url("Enter a valid source URL.")
      .max(2000)
      .optional()
      .or(z.literal("")),
    asOfDate: dateStringSchema,
    notes: optionalTextSchema,
  })
  .superRefine((value, ctx) => {
    if (
      value.sourceType === "EXTERNAL_RESEARCH" &&
      !value.sourceName?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceName"],
        message:
          "Provide the name of the external research source.",
      });
    }

    if (
      value.sourceType === "EXTERNAL_RESEARCH" &&
      !value.sourceUrl?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message:
          "Provide a URL for the external research source.",
      });
    }
  });

export type InvestorMarketAssumptionInput = z.infer<
  typeof investorMarketAssumptionSchema
>;

export const investorVerifiedCashBalanceSchema = z.object({
  amount: z
    .number()
    .finite()
    .nonnegative("Cash balance cannot be negative."),
  currencyCode: currencyCodeSchema,
  asOfDate: dateStringSchema,
  sourceDescription: nonEmptyTextSchema,
  notes: optionalTextSchema,
});

export type InvestorVerifiedCashBalanceInput = z.infer<
  typeof investorVerifiedCashBalanceSchema
>;

export const investorMetricsDateRangeSchema = z
  .object({
    from: dateStringSchema.optional().or(z.literal("")),
    to: dateStringSchema.optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message:
          "End date must be on or after the start date.",
      });
    }
  });

export type InvestorMetricsDateRangeInput = z.infer<
  typeof investorMetricsDateRangeSchema
>;