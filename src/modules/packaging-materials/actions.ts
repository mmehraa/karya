"use server";

import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  createPackagingMaterial,
  deletePackagingMaterial,
  deletePackagingMaterialConsumption,
  deletePackagingMaterialPurchase,
  deletePackagingMaterialWastage,
  getPackagingMaterialInventoryHistory,
  getPackagingMaterialPurchases,
  getPackagingMaterials,
  recordPackagingMaterialConsumption,
  recordPackagingMaterialPurchase,
  recordPackagingMaterialWastage,
} from "./services";

import {
  CreatePackagingMaterialSchema,
  PackagingMaterialIdSchema,
  PackagingMaterialInventoryTransactionIdSchema,
  PackagingMaterialPurchaseIdSchema,
  RecordPackagingMaterialConsumptionSchema,
  RecordPackagingMaterialPurchaseSchema,
  RecordPackagingMaterialWastageSchema,
} from "./validation";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createPackagingMaterialAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      CreatePackagingMaterialSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid packaging material details.",
      };
    }

    const material = await createPackagingMaterial(
      businessId,
      parsed.data,
    );

    revalidatePath("/materials");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: material,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create packaging material.",
    };
  }
}

export async function getPackagingMaterialsAction(): Promise<
  ActionResponse
> {
  try {
    const { businessId } = await getDashboardContext();

    const materials =
      await getPackagingMaterials(businessId);

    return {
      success: true,
      data: materials,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load packaging materials.",
    };
  }
}

export async function getPackagingMaterialPurchasesAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      PackagingMaterialIdSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid packaging material ID.",
      };
    }

    const purchases =
      await getPackagingMaterialPurchases(
        businessId,
        parsed.data.id,
      );

    return {
      success: true,
      data: purchases,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load packaging material purchases.",
    };
  }
}

export async function recordPackagingMaterialPurchaseAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      RecordPackagingMaterialPurchaseSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid purchase details.",
      };
    }

    const purchase =
      await recordPackagingMaterialPurchase(
        businessId,
        parsed.data,
      );

    revalidatePath("/materials");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: purchase,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to record packaging material purchase.",
    };
  }
}

export async function recordPackagingMaterialConsumptionAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      RecordPackagingMaterialConsumptionSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid consumption details.",
      };
    }

    const material =
      await recordPackagingMaterialConsumption(
        businessId,
        parsed.data,
      );

    revalidatePath("/materials");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: material,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to record packaging material consumption.",
    };
  }
}

export async function recordPackagingMaterialWastageAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      RecordPackagingMaterialWastageSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid wastage details.",
      };
    }

    const material =
      await recordPackagingMaterialWastage(
        businessId,
        parsed.data,
      );

    revalidatePath("/materials");
    revalidatePath("/dashboard");
    revalidatePath("/finance");

    return {
      success: true,
      data: material,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to record packaging material wastage.",
    };
  }
}

export async function getPackagingMaterialInventoryHistoryAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      PackagingMaterialIdSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid packaging material ID.",
      };
    }

    const history =
      await getPackagingMaterialInventoryHistory(
        businessId,
        parsed.data.id,
      );

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load packaging material inventory history.",
    };
  }
}

export async function deletePackagingMaterialPurchaseAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      PackagingMaterialPurchaseIdSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid packaging material purchase ID.",
      };
    }

    await deletePackagingMaterialPurchase(
      businessId,
      parsed.data.id,
    );

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
          : "Unable to delete packaging material purchase.",
    };
  }
}

export async function deletePackagingMaterialConsumptionAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      PackagingMaterialInventoryTransactionIdSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid packaging material transaction ID.",
      };
    }

    await deletePackagingMaterialConsumption(
      businessId,
      parsed.data.id,
    );

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
          : "Unable to delete packaging material consumption.",
    };
  }
}

export async function deletePackagingMaterialWastageAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      PackagingMaterialInventoryTransactionIdSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid packaging material transaction ID.",
      };
    }

    await deletePackagingMaterialWastage(
      businessId,
      parsed.data.id,
    );

    revalidatePath("/materials");
    revalidatePath("/dashboard");
    revalidatePath("/finance");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete packaging material wastage.",
    };
  }
}

export async function deletePackagingMaterialAction(
  input: unknown,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      PackagingMaterialIdSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid packaging material ID.",
      };
    }

    await deletePackagingMaterial(
      businessId,
      parsed.data.id,
    );

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
          : "Unable to delete packaging material.",
    };
  }
}