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
    z.string().max(maxLength).nullable()
  );

const nonNegativeInteger = z
  .coerce
  .number()
  .int()
  .min(0);

const optionalNonNegativeInteger = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return value;
  },
  nonNegativeInteger.optional()
);

export const CreateContentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Content title must be at least 2 characters.")
    .max(200, "Content title must be 200 characters or less."),

  contentType: z.enum([
    "REEL",
    "POST",
    "CAROUSEL",
    "STORY",
    "LONG_VIDEO",
  ]),

  status: z.enum([
    "IDEA",
    "SCRIPT",
    "SHOT",
    "EDITING",
    "READY",
    "SCHEDULED",
    "PUBLISHED",
  ]).default("IDEA"),

  notes: nullableString(1000).optional(),
});

export const UpdateContentSchema = z
  .object({
    id: z.string().uuid(),

    title: z
      .string()
      .trim()
      .min(2, "Content title must be at least 2 characters.")
      .max(200, "Content title must be 200 characters or less.")
      .optional(),

    contentType: z
      .enum([
        "REEL",
        "POST",
        "CAROUSEL",
        "STORY",
        "LONG_VIDEO",
      ])
      .optional(),

    status: z
      .enum([
        "IDEA",
        "SCRIPT",
        "SHOT",
        "EDITING",
        "READY",
        "SCHEDULED",
        "PUBLISHED",
      ])
      .optional(),

    notes: nullableString(1000).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.contentType !== undefined ||
      data.status !== undefined ||
      data.notes !== undefined,
    {
      message: "At least one content field must be provided.",
    }
  );

export const CreatePublicationSchema = z.object({
  contentItemId: z.string().uuid(),

  platform: z.enum([
    "INSTAGRAM",
    "FACEBOOK",
    "YOUTUBE",
    "WHATSAPP",
  ]),

  plannedDate: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null || value === "") {
          return null;
        }

        return value;
      },
      z.coerce.date().nullable()
    )
    .optional(),

  publishedDate: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null || value === "") {
          return null;
        }

        return value;
      },
      z.coerce.date().nullable()
    )
    .optional(),

  url: nullableString(1000).optional(),

  views: optionalNonNegativeInteger,
  reach: optionalNonNegativeInteger,
  likes: optionalNonNegativeInteger,
  comments: optionalNonNegativeInteger,
  shares: optionalNonNegativeInteger,
  saves: optionalNonNegativeInteger,
  websiteClicks: optionalNonNegativeInteger,
});

export const UpdatePublicationSchema = z
  .object({
    id: z.string().uuid(),

    platform: z
      .enum([
        "INSTAGRAM",
        "FACEBOOK",
        "YOUTUBE",
        "WHATSAPP",
      ])
      .optional(),

    plannedDate: z
      .preprocess(
        (value) => {
          if (value === undefined || value === null || value === "") {
            return null;
          }

          return value;
        },
        z.coerce.date().nullable()
      )
      .optional(),

    publishedDate: z
      .preprocess(
        (value) => {
          if (value === undefined || value === null || value === "") {
            return null;
          }

          return value;
        },
        z.coerce.date().nullable()
      )
      .optional(),

    url: nullableString(1000).optional(),

    views: optionalNonNegativeInteger,
    reach: optionalNonNegativeInteger,
    likes: optionalNonNegativeInteger,
    comments: optionalNonNegativeInteger,
    shares: optionalNonNegativeInteger,
    saves: optionalNonNegativeInteger,
    websiteClicks: optionalNonNegativeInteger,
  })
  .refine(
    (data) =>
      data.platform !== undefined ||
      data.plannedDate !== undefined ||
      data.publishedDate !== undefined ||
      data.url !== undefined ||
      data.views !== undefined ||
      data.reach !== undefined ||
      data.likes !== undefined ||
      data.comments !== undefined ||
      data.shares !== undefined ||
      data.saves !== undefined ||
      data.websiteClicks !== undefined,
    {
      message: "At least one publication field must be provided.",
    }
  );

export type CreateContentInput = z.infer<
  typeof CreateContentSchema
>;

export type UpdateContentInput = z.infer<
  typeof UpdateContentSchema
>;

export type CreatePublicationInput = z.infer<
  typeof CreatePublicationSchema
>;

export type UpdatePublicationInput = z.infer<
  typeof UpdatePublicationSchema
>;