"use server";

import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  cancelProductionBatch,
  completeProductionBatch,
  createProductionBatch,
  getProductionBatch,
  getProductionBatches,
} from "./services";

import {
  CompleteProductionBatchSchema,
  CreateProductionBatchSchema,
  GetProductionBatchSchema,
  GetProductionBatchesSchema,
  ProductionBatchIdSchema,
  type CompleteProductionBatchInput,
  type CreateProductionBatchInput,
  type GetProductionBatchInput,
  type GetProductionBatchesInput,
  type ProductionBatchIdInput,
} from "./validation";

import type {
  SerializedProductionBatch,
} from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function createProductionBatchAction(
  input: CreateProductionBatchInput,
): Promise<
  ActionResponse<SerializedProductionBatch>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      CreateProductionBatchSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid production batch input.",
      };
    }

    const result =
      await createProductionBatch(
        businessId,
        parsed.data,
      );

    revalidatePath(
      "/production-batches",
    );

    revalidatePath(
      "/products",
    );

    revalidatePath(
      "/dashboard",
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Failed to create production batch:",
      error,
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
        "An unexpected error occurred while creating the production batch.",
    };
  }
}

export async function getProductionBatchesAction(
  input?: GetProductionBatchesInput,
): Promise<
  ActionResponse<SerializedProductionBatch[]>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      GetProductionBatchesSchema.safeParse(
        input ?? {},
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid production batch filter.",
      };
    }

    const result =
      await getProductionBatches(
        businessId,
        parsed.data.productId,
      );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Failed to load production batches:",
      error,
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
        "An unexpected error occurred while loading production batches.",
    };
  }
}

export async function getProductionBatchAction(
  input: GetProductionBatchInput,
): Promise<
  ActionResponse<SerializedProductionBatch>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      GetProductionBatchSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid production batch ID.",
      };
    }

    const result =
      await getProductionBatch(
        businessId,
        parsed.data.batchId,
      );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Failed to load production batch:",
      error,
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
        "An unexpected error occurred while loading the production batch.",
    };
  }
}

export async function completeProductionBatchAction(
  input: CompleteProductionBatchInput,
): Promise<
  ActionResponse<SerializedProductionBatch>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      CompleteProductionBatchSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid production completion input.",
      };
    }

    const result =
      await completeProductionBatch(
        businessId,
        parsed.data,
      );

    revalidatePath(
      "/production-batches",
    );

    revalidatePath(
      "/inventory",
    );

    revalidatePath(
      "/products",
    );

    revalidatePath(
      "/materials",
    );

    revalidatePath(
      "/dashboard",
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Failed to complete production batch:",
      error,
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
        "An unexpected error occurred while completing the production batch.",
    };
  }
}

export async function cancelProductionBatchAction(
  input: ProductionBatchIdInput,
): Promise<
  ActionResponse<SerializedProductionBatch>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      ProductionBatchIdSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid production batch ID.",
      };
    }

    const result =
      await cancelProductionBatch(
        businessId,
        parsed.data.batchId,
      );

    revalidatePath(
      "/production-batches",
    );

    revalidatePath(
      "/dashboard",
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Failed to cancel production batch:",
      error,
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
        "An unexpected error occurred while cancelling the production batch.",
    };
  }
}