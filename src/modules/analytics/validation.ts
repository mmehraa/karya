import { z } from "zod";

export const analyticsDateRangeSchema = z
  .object({
    from: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),
    to: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const from = value.from
      ? new Date(`${value.from}T00:00:00`)
      : null;

    const to = value.to
      ? new Date(`${value.to}T23:59:59.999`)
      : null;

    if (from && Number.isNaN(from.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from"],
        message: "Invalid start date.",
      });
    }

    if (to && Number.isNaN(to.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "Invalid end date.",
      });
    }

    if (
      from &&
      to &&
      !Number.isNaN(from.getTime()) &&
      !Number.isNaN(to.getTime()) &&
      from > to
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "End date must be on or after the start date.",
      });
    }
  });

export type AnalyticsDateRangeInput = z.infer<
  typeof analyticsDateRangeSchema
>;