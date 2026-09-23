"use server";

import { Prisma } from "@prisma/client";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  GetProductEconomicsSchema,
  type GetProductEconomicsInput,
} from "./validation";

import { getProductEconomics } from "./services";

import type { ProductEconomics } from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}
export async function getProductEconomicsAction(
  input: GetProductEconomicsInput
): Promise<ActionResponse<ProductEconomics>> {
  try {
    /**
     * Resolve the active business from the server-side
     * dashboard context.
     */
    const { businessId } =
      await getDashboardContext();

    /**
     * Validate the client-provided product ID.
     */
    const parsed =
      GetProductEconomicsSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid product ID.",
      };
    }

    const economics =
      await getProductEconomics(
        businessId,
        parsed.data.productId
      );

    return {
      success: true,
      data: economics,
    };
  } catch (error) {

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      console.error(
        "getProductEconomicsAction Prisma error:",
        error
      );

      return {
        success: false,
        error:
          "Unable to calculate product economics.",
      };
    }

    if (
      error instanceof Error &&
      error.message === "Product not found."
    ) {
      return {
        success: false,
        error:
          "Product not found or access denied.",
      };
    }

    console.error(
      "getProductEconomicsAction error:",
      error
    );

    return {
      success: false,
      error:
        "Unable to calculate product economics.",
    };
  }
}