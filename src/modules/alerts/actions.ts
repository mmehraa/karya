"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  resolveAlert,
  syncOperationalAlerts,
} from "./services";

import { AlertIdSchema } from "./validation";

import type {
  AlertSyncResult,
  SerializedAlert,
} from "./types";

export interface ActionResponse<
  T = undefined,
> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function syncOperationalAlertsAction(): Promise<
  ActionResponse<AlertSyncResult>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const result =
      await syncOperationalAlerts(
        businessId,
      );

    revalidatePath("/alerts");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      return {
        success: false,
        error:
          "Unable to check operational alerts.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}

export async function resolveAlertAction(
  input: unknown,
): Promise<
  ActionResponse<SerializedAlert>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      AlertIdSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid alert.",
      };
    }

    const alert =
      await resolveAlert(
        businessId,
        parsed.data.id,
      );

    revalidatePath("/alerts");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: alert,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error:
        "An unexpected error occurred.",
    };
  }
}