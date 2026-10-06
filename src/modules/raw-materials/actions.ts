"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  createRawMaterial,
  deleteRawMaterial,
  deleteRawMaterialPurchase,
  deleteRawMaterialConsumption,
  deleteRawMaterialWastage,
  getRawMaterials,
  getRawMaterialPurchases,
  getRawMaterialInventoryHistory,
  recordRawMaterialPurchase,
  recordRawMaterialConsumption,
  recordRawMaterialWastage,
} from "./services";

import {
  CreateRawMaterialSchema,
  RawMaterialIdSchema,
  RawMaterialPurchaseIdSchema,
  RawMaterialInventoryTransactionIdSchema,
  RecordRawMaterialPurchaseSchema,
  RecordRawMaterialConsumptionSchema,
  RecordRawMaterialWastageSchema,
  type CreateRawMaterialInput,
  type RawMaterialIdInput,
  type RawMaterialPurchaseIdInput,
  type RawMaterialInventoryTransactionIdInput,
  type RecordRawMaterialPurchaseInput,
  type RecordRawMaterialConsumptionInput,
  type RecordRawMaterialWastageInput,
} from "./validation";

import type {
  SerializedRawMaterial,
  SerializedRawMaterialPurchase,
} from "./types";

import type {
  RawMaterialInventoryHistoryItem,
} from "./services";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Creates a new raw material for the active business.
 */
export async function createRawMaterialAction(
  input: CreateRawMaterialInput,
): Promise<ActionResponse<SerializedRawMaterial>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CreateRawMaterialSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid raw material input.",
      };
    }

    const material = await createRawMaterial(
      businessId,
      parsed.data,
    );

    revalidatePath("/raw-materials");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: material,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error:
          "A raw material with this name already exists in your business.",
      };
    }

    console.error("Failed to create raw material:", error);

    return {
      success: false,
      error:
        "An unexpected error occurred while creating the raw material.",
    };
  }
}

/**
 * Retrieves all raw materials for the active business.
 */
export async function getRawMaterialsAction(): Promise<
  ActionResponse<SerializedRawMaterial[]>
> {
  try {
    const { businessId } = await getDashboardContext();

    const materials = await getRawMaterials(businessId);

    return {
      success: true,
      data: materials,
    };
  } catch (error) {
    console.error("Failed to load raw materials:", error);

    return {
      success: false,
      error:
        "An unexpected error occurred while loading raw materials.",
    };
  }
}

/**
 * Retrieves purchase history for a raw material.
 */
export async function getRawMaterialPurchasesAction(
  input: RawMaterialIdInput,
): Promise<ActionResponse<SerializedRawMaterialPurchase[]>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = RawMaterialIdSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid raw material ID.",
      };
    }

    const purchases = await getRawMaterialPurchases(
      businessId,
      parsed.data.id,
    );

    return {
      success: true,
      data: purchases,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Raw material not found."
    ) {
      return {
        success: false,
        error: "Raw material not found or access denied.",
      };
    }

    console.error(
      "Failed to load raw material purchases:",
      error,
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while loading purchase history.",
    };
  }
}

/**
 * Retrieves the complete inventory movement history for a raw material.
 */
export async function getRawMaterialInventoryHistoryAction(
  input: RawMaterialIdInput,
): Promise<ActionResponse<RawMaterialInventoryHistoryItem[]>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = RawMaterialIdSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid raw material ID.",
      };
    }

    const history = await getRawMaterialInventoryHistory(
      businessId,
      parsed.data.id,
    );

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Raw material not found."
    ) {
      return {
        success: false,
        error: "Raw material not found or access denied.",
      };
    }

    console.error(
      "Failed to load raw material inventory history:",
      error,
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while loading inventory history.",
    };
  }
}

/**
 * Records a raw material purchase.
 *
 * This is the operation that actually increases raw-material inventory.
 */
export async function recordRawMaterialPurchaseAction(
  input: RecordRawMaterialPurchaseInput,
): Promise<
  ActionResponse<{
    material: SerializedRawMaterial;
    purchase: SerializedRawMaterialPurchase;
  }>
> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      RecordRawMaterialPurchaseSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid raw material purchase input.",
      };
    }

    const result = await recordRawMaterialPurchase(
      businessId,
      parsed.data,
    );

    revalidatePath("/raw-materials");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Raw material not found.") {
        return {
          success: false,
          error: "Raw material not found or access denied.",
        };
      }

      if (
        error.message.startsWith("Purchase unit") &&
        error.message.includes("not compatible")
      ) {
        return {
          success: false,
          error: error.message,
        };
      }
    }

    console.error(
      "Failed to record raw material purchase:",
      error,
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while recording the raw material purchase.",
    };
  }
}

/**
 * Records raw-material consumption at the material's current
 * weighted-average cost.
 */
export async function recordRawMaterialConsumptionAction(
  input: RecordRawMaterialConsumptionInput,
): Promise<ActionResponse<SerializedRawMaterial>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      RecordRawMaterialConsumptionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid raw material consumption input.",
      };
    }

    const material = await recordRawMaterialConsumption(
      businessId,
      parsed.data,
    );

    revalidatePath("/raw-materials");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: material,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Raw material not found.") {
        return {
          success: false,
          error: "Raw material not found or access denied.",
        };
      }

      if (
        error.message.startsWith("Insufficient stock.")
      ) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (
        error.message ===
        "Raw material has no available inventory."
      ) {
        return {
          success: false,
          error: error.message,
        };
      }
    }

    console.error(
      "Failed to record raw material consumption:",
      error,
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while recording raw material consumption.",
    };
  }
}

/**
 * Records raw-material wastage.
 *
 * Wastage reduces inventory and creates a non-cash
 * MATERIAL_WASTAGE expense.
 */
export async function recordRawMaterialWastageAction(
  input: RecordRawMaterialWastageInput,
): Promise<ActionResponse<SerializedRawMaterial>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      RecordRawMaterialWastageSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid raw material wastage input.",
      };
    }

    const material = await recordRawMaterialWastage(
      businessId,
      parsed.data,
    );

    revalidatePath("/raw-materials");
    revalidatePath("/dashboard");
    revalidatePath("/finance");

    return {
      success: true,
      data: material,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Raw material not found.") {
        return {
          success: false,
          error: "Raw material not found or access denied.",
        };
      }

      if (
        error.message.startsWith("Insufficient stock.")
      ) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (
        error.message ===
        "Raw material has no available inventory."
      ) {
        return {
          success: false,
          error: error.message,
        };
      }
    }

    console.error(
      "Failed to record raw material wastage:",
      error,
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while recording raw material wastage.",
    };
  }
}

/**
 * Deletes a raw-material purchase and recalculates the material's
 * inventory quantity, value and weighted-average cost.
 */
export async function deleteRawMaterialPurchaseAction(
  input: RawMaterialPurchaseIdInput,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = RawMaterialPurchaseIdSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid raw material purchase ID.",
      };
    }

    await deleteRawMaterialPurchase(
      businessId,
      parsed.data.id,
    );

    revalidatePath("/raw-materials");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "Raw material purchase not found."
      ) {
        return {
          success: false,
          error: "Purchase not found or access denied.",
        };
      }

      if (
        error.message ===
        "This purchase cannot be deleted after inventory has been consumed or adjusted."
      ) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (
        error.message ===
        "Purchase inventory transaction not found."
      ) {
        return {
          success: false,
          error:
            "This purchase is missing its inventory transaction and cannot be deleted safely.",
        };
      }
    }

    console.error(
      "Failed to delete raw material purchase:",
      error,
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while deleting the raw material purchase.",
    };
  }
}

/**
 * Deletes a raw-material consumption transaction and recalculates the
 * material's inventory state from the remaining ledger.
 */
export async function deleteRawMaterialConsumptionAction(
  input: RawMaterialInventoryTransactionIdInput,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      RawMaterialInventoryTransactionIdSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid raw material consumption ID.",
      };
    }

    await deleteRawMaterialConsumption(
      businessId,
      parsed.data.id,
    );

    revalidatePath("/raw-materials");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "Raw material consumption not found."
      ) {
        return {
          success: false,
          error: "Consumption not found or access denied.",
        };
      }

      if (error.message === "Raw material not found.") {
        return {
          success: false,
          error: "Raw material not found or access denied.",
        };
      }

      if (
        error.message ===
        "Deleting this consumption would leave the material inventory in an invalid state."
      ) {
        return {
          success: false,
          error: error.message,
        };
      }
    }

    console.error(
      "Failed to delete raw material consumption:",
      error,
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while deleting the raw material consumption.",
    };
  }
}

/**
 * Deletes a raw-material wastage transaction and its linked
 * non-cash material-wastage expense.
 */
export async function deleteRawMaterialWastageAction(
  input: RawMaterialInventoryTransactionIdInput,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      RawMaterialInventoryTransactionIdSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid raw material wastage ID.",
      };
    }

    await deleteRawMaterialWastage(
      businessId,
      parsed.data.id,
    );

    revalidatePath("/raw-materials");
    revalidatePath("/dashboard");
    revalidatePath("/finance");

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "Raw material wastage not found."
      ) {
        return {
          success: false,
          error: "Wastage not found or access denied.",
        };
      }

      if (error.message === "Raw material not found.") {
        return {
          success: false,
          error: "Raw material not found or access denied.",
        };
      }

      if (
        error.message ===
        "Deleting this wastage would leave the material inventory in an invalid state."
      ) {
        return {
          success: false,
          error: error.message,
        };
      }
    }

    console.error(
      "Failed to delete raw material wastage:",
      error,
    );

    return {
      success: false,
      error:
        "An unexpected error occurred while deleting raw material wastage.",
    };
  }
}

export async function deleteRawMaterialAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      RawMaterialIdSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid raw material ID.",
      };
    }

    await deleteRawMaterial(
      businessId,
      parsed.data.id,
    );

    revalidatePath("/raw-materials");
    revalidatePath("/materials");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete raw material.",
    };
  }
}