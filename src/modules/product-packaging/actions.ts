"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  createProductPackagingConfiguration,
  getActiveProductPackagingConfiguration,
  getProductPackagingConfiguration,
  getProductPackagingConfigurations,
} from "./services";

import {
  CreateProductPackagingConfigurationSchema,
  ProductPackagingConfigurationIdSchema,
  ProductPackagingConfigurationProductIdSchema,
  type CreateProductPackagingConfigurationInput,
  type ProductPackagingConfigurationIdInput,
  type ProductPackagingConfigurationProductIdInput,
} from "./validation";

import type {
  SerializedProductPackagingConfiguration,
} from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Creates a new packaging configuration version
 * for a product.
 */
export async function createProductPackagingConfigurationAction(
  input: CreateProductPackagingConfigurationInput
): Promise<
  ActionResponse<SerializedProductPackagingConfiguration>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      CreateProductPackagingConfigurationSchema.safeParse(
        input
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid packaging configuration data.",
      };
    }

    const configuration =
      await createProductPackagingConfiguration(
        businessId,
        parsed.data
      );

    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: configuration,
    };
  } catch (error) {
    console.error(
      "createProductPackagingConfigurationAction error:",
      error
    );

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error:
        "Unable to create packaging configuration.",
    };
  }
}

/**
 * Retrieves all packaging configuration versions
 * for a product.
 */
export async function getProductPackagingConfigurationsAction(
  input: ProductPackagingConfigurationProductIdInput
): Promise<
  ActionResponse<
    SerializedProductPackagingConfiguration[]
  >
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      ProductPackagingConfigurationProductIdSchema.safeParse(
        input
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid product ID.",
      };
    }

    const configurations =
      await getProductPackagingConfigurations(
        businessId,
        parsed.data.productId
      );

    return {
      success: true,
      data: configurations,
    };
  } catch (error) {
    console.error(
      "getProductPackagingConfigurationsAction error:",
      error
    );

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

    return {
      success: false,
      error:
        "Unable to load packaging configurations.",
    };
  }
}

/**
 * Retrieves one packaging configuration.
 */
export async function getProductPackagingConfigurationAction(
  input: ProductPackagingConfigurationIdInput
): Promise<
  ActionResponse<SerializedProductPackagingConfiguration>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      ProductPackagingConfigurationIdSchema.safeParse(
        input
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid configuration ID.",
      };
    }

    const configuration =
      await getProductPackagingConfiguration(
        businessId,
        parsed.data.id
      );

    return {
      success: true,
      data: configuration,
    };
  } catch (error) {
    console.error(
      "getProductPackagingConfigurationAction error:",
      error
    );

    if (
      error instanceof Error &&
      error.message ===
        "Packaging configuration not found."
    ) {
      return {
        success: false,
        error:
          "Packaging configuration not found or access denied.",
      };
    }

    return {
      success: false,
      error:
        "Unable to load packaging configuration.",
    };
  }
}

/**
 * Retrieves the active packaging configuration
 * for a product.
 */
export async function getActiveProductPackagingConfigurationAction(
  input: ProductPackagingConfigurationProductIdInput
): Promise<
  ActionResponse<
    SerializedProductPackagingConfiguration | null
  >
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      ProductPackagingConfigurationProductIdSchema.safeParse(
        input
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid product ID.",
      };
    }

    const configuration =
      await getActiveProductPackagingConfiguration(
        businessId,
        parsed.data.productId
      );

    return {
      success: true,
      data: configuration,
    };
  } catch (error) {
    console.error(
      "getActiveProductPackagingConfigurationAction error:",
      error
    );

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      return {
        success: false,
        error:
          "Unable to load the active packaging configuration.",
      };
    }

    return {
      success: false,
      error:
        "Unable to load the active packaging configuration.",
    };
  }
}