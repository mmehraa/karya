import { z } from "zod";
export const GetProductEconomicsSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
});

export type GetProductEconomicsInput = z.infer<
  typeof GetProductEconomicsSchema
>;