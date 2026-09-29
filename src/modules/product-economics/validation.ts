import { z } from "zod";
export const GetProductEconomicsSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
});

export type GetProductEconomicsInput = z.infer<
  typeof GetProductEconomicsSchema
>;