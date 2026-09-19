"use server";

import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  allocatePromotionalStock,
  recordPromotionalDispatch,
  recordStockMovement,
  releasePromotionalStock,
} from "./services";

import {
  AllocatePromotionalStockSchema,
  PromotionalDispatchSchema,
  RecordStockMovementSchema,
  ReleasePromotionalStockSchema,
  type AllocatePromotionalStockInput,
  type PromotionalDispatchInput,
  type RecordStockMovementInput,
  type ReleasePromotionalStockInput,
} from "./validation";

import type {
  InventoryMovementResult,
  PromotionalDispatchResult,
  PromotionalStockAllocationResult,
  PromotionalStockReleaseResult,
} from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * ---------------------------------------------------------------------------
 * NORMAL INVENTORY MOVEMENT
 * ---------------------------------------------------------------------------
 */

export async function recordStockMovementAction(
  input: RecordStockMovementInput,
): Promise<ActionResponse<InventoryMovementResult>> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      RecordStockMovementSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid inventory movement input",
      };
    }

    const result =
      await recordStockMovement(
        businessId,
        parsed.data,
      );

    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Failed to record stock movement:",
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
        "An unexpected error occurred while recording the stock movement.",
    };
  }
}

/**
 * ---------------------------------------------------------------------------
 * ALLOCATE PROMOTIONAL STOCK
 * ---------------------------------------------------------------------------
 */

export async function allocatePromotionalStockAction(
  input: AllocatePromotionalStockInput,
): Promise<
  ActionResponse<PromotionalStockAllocationResult>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      AllocatePromotionalStockSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid promotional stock allocation input",
      };
    }

    const result =
      await allocatePromotionalStock(
        businessId,
        parsed.data.productId,
        parsed.data.quantity,
      );

    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Failed to allocate promotional stock:",
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
        "An unexpected error occurred while allocating promotional stock.",
    };
  }
}

/**
 * ---------------------------------------------------------------------------
 * RELEASE PROMOTIONAL STOCK
 * ---------------------------------------------------------------------------
 */

export async function releasePromotionalStockAction(
  input: ReleasePromotionalStockInput,
): Promise<
  ActionResponse<PromotionalStockReleaseResult>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      ReleasePromotionalStockSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid promotional stock release input",
      };
    }

    const result =
      await releasePromotionalStock(
        businessId,
        parsed.data.productId,
        parsed.data.quantity,
      );

    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Failed to release promotional stock:",
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
        "An unexpected error occurred while releasing promotional stock.",
    };
  }
}

/**
 * ---------------------------------------------------------------------------
 * PROMOTIONAL DISPATCH
 * ---------------------------------------------------------------------------
 */

export async function recordPromotionalDispatchAction(
  input: PromotionalDispatchInput,
): Promise<
  ActionResponse<PromotionalDispatchResult>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      PromotionalDispatchSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid promotional dispatch input",
      };
    }

    const result =
      await recordPromotionalDispatch(
        businessId,
        parsed.data,
      );

    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/finance");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Failed to record promotional dispatch:",
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
        "An unexpected error occurred while recording the promotional dispatch.",
    };
  }
}