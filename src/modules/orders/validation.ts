import { z } from "zod";

const nullableString = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return null;
      }

      if (typeof value === "string" && value.trim() === "") {
        return null;
      }

      return typeof value === "string" ? value.trim() : value;
    },
    z.string().max(maxLength).nullable()
  );

const moneyValue = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return 0;
    }

    if (typeof value === "string") {
      return Number(value);
    }

    return value;
  },
  z
    .number()
    .finite()
    .min(0)
    .refine(
      (value) => Number.isInteger(value * 100),
      "Amount can have at most two decimal places."
    )
);

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  unitPrice: moneyValue,
});

export const CreateOrderSchema = z
  .object({
    customerId: z.string().uuid(),

    orderDate: z.coerce.date(),

    paymentStatus: z
      .enum(["PENDING", "PAID", "REFUNDED"])
      .default("PENDING"),

    fulfillmentStatus: z
      .enum([
        "PENDING",
        "PROCESSING",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ])
      .default("PENDING"),

    discountAmount: moneyValue.default(0),

    shippingCharged: moneyValue.default(0),

    channel: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .default("Direct"),

    paymentMethod: nullableString(80).optional(),

    notes: nullableString(500).optional(),

    items: z
      .array(orderItemSchema)
      .min(1, "An order must contain at least one product."),
  })
  .superRefine((data, ctx) => {
    const productIds = new Set<string>();

    for (const item of data.items) {
      if (productIds.has(item.productId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message:
            "Each product can appear only once in an order.",
        });
      }

      productIds.add(item.productId);
    }

    if (data.fulfillmentStatus === "CANCELLED") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillmentStatus"],
        message:
          "New orders cannot be created with CANCELLED fulfillment status.",
      });
    }
  });

export const UpdateOrderSchema = z
  .object({
    id: z.string().uuid(),

    paymentStatus: z
      .enum(["PENDING", "PAID", "REFUNDED"])
      .optional(),

    fulfillmentStatus: z
      .enum([
        "PENDING",
        "PROCESSING",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ])
      .optional(),

    paymentMethod: nullableString(80).optional(),

    notes: nullableString(500).optional(),
  })
  .refine(
    (data) =>
      data.paymentStatus !== undefined ||
      data.fulfillmentStatus !== undefined ||
      data.paymentMethod !== undefined ||
      data.notes !== undefined,
    {
      message: "At least one order field must be provided.",
    }
  );

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;