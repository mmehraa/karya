import { z } from "zod";

export const AlertIdSchema = z.object({
  id: z.string().uuid(),
});

export type AlertIdInput = z.infer<
  typeof AlertIdSchema
>;