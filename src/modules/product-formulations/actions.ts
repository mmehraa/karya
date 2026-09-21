"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  createProductFormulation,
  getActiveProductFormulation,
  getProductFormulations,
} from "./services";

import {
  CreateProductFormulationSchema,
  GetActiveProductFormulationSchema,
  GetProductFormulationsSchema,
  type CreateProductFormulationInput,
  type GetActiveProductFormulationInput,
  type GetProductFormulationsInput,
} from "./validation";

import type { SerializedProductFormulation } from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Creates a new product formulation version.
 *
 * The active business is always resolved server-side.
 * businessId is never accepted from the browser.
 */
export async function createProductFormulationAction(
  input: CreateProductFormulationInput
): Promise<ActionResponse<SerializedProductFormulation>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      CreateProductFormulationSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid formulation input.",
      };
    }

    const formulation = await createProductFormulation(
      businessId,
      parsed.data
    );

    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: formulation,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error:
            "A formulation with this version already exists. Please try again.",
        };
      }

      if (error.code === "P2025") {
        return {
          success: false,
          error: "The product or selected material could not be found.",
        };
      }
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    console.error(
      "Failed to create product formulation:",
      error
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while creating the formulation.",
    };
  }
}

/**
 * Retrieves all formulation versions for a product.
 */
export async function getProductFormulationsAction(
  input: GetProductFormulationsInput
): Promise<ActionResponse<SerializedProductFormulation[]>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      GetProductFormulationsSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid product ID.",
      };
    }

    const formulations = await getProductFormulations(
      businessId,
      parsed.data.productId
    );

    return {
      success: true,
      data: formulations,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    console.error(
      "Failed to retrieve product formulations:",
      error
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while retrieving formulations.",
    };
  }
}

/**
 * Retrieves the currently active formulation for a product.
 */
export async function getActiveProductFormulationAction(
  input: GetActiveProductFormulationInput
): Promise<ActionResponse<SerializedProductFormulation | null>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      GetActiveProductFormulationSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid product ID.",
      };
    }

    const formulation =
      await getActiveProductFormulation(
        businessId,
        parsed.data.productId
      );

    return {
      success: true,
      data: formulation,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    console.error(
      "Failed to retrieve active product formulation:",
      error
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while retrieving the active formulation.",
    };
  }
}