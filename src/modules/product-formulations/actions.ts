"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  createProductFormulation,
  deleteProductFormulation,
  getActiveProductFormulation,
  getProductFormulations,
} from "./services";

import {
  CreateProductFormulationSchema,
  DeleteProductFormulationSchema,
  GetActiveProductFormulationSchema,
  GetProductFormulationsSchema,
  type CreateProductFormulationInput,
  type DeleteProductFormulationInput,
  type GetActiveProductFormulationInput,
  type GetProductFormulationsInput,
} from "./validation";

import type {
  SerializedProductFormulation,
} from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function createProductFormulationAction(
  input: CreateProductFormulationInput
): Promise<
  ActionResponse<SerializedProductFormulation>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      CreateProductFormulationSchema.safeParse(
        input
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid formulation input.",
      };
    }

    const formulation =
      await createProductFormulation(
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
    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
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
          error:
            "The product or selected material could not be found.",
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

export async function getProductFormulationsAction(
  input: GetProductFormulationsInput
): Promise<
  ActionResponse<
    SerializedProductFormulation[]
  >
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      GetProductFormulationsSchema.safeParse(
        input
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid product ID.",
      };
    }

    const formulations =
      await getProductFormulations(
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

export async function getActiveProductFormulationAction(
  input: GetActiveProductFormulationInput
): Promise<
  ActionResponse<
    SerializedProductFormulation | null
  >
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      GetActiveProductFormulationSchema.safeParse(
        input
      );

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

/**
 * Deletes one formulation version.
 *
 * The service layer prevents deletion when the version is
 * referenced by production history.
 */
export async function deleteProductFormulationAction(
  input: DeleteProductFormulationInput
): Promise<ActionResponse> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      DeleteProductFormulationSchema.safeParse(
        input
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid formulation ID.",
      };
    }

    await deleteProductFormulation(
      businessId,
      parsed.data.id
    );

    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    console.error(
      "Failed to delete product formulation:",
      error
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while deleting the formulation.",
    };
  }
}