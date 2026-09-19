"use server";

import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  updateBusinessProfile,
  updateBusinessSettings,
} from "./services";

import {
  UpdateBusinessProfileSchema,
  UpdateBusinessSettingsSchema,
} from "./validation";

import type {
  SerializedBusinessProfile,
  SerializedBusinessSettings,
} from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function updateBusinessProfileAction(
  input: unknown,
): Promise<
  ActionResponse<SerializedBusinessProfile>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      UpdateBusinessProfileSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid business profile.",
      };
    }

    const profile =
      await updateBusinessProfile(
        businessId,
        parsed.data,
      );

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update business profile.",
    };
  }
}

export async function updateBusinessSettingsAction(
  input: unknown,
): Promise<
  ActionResponse<SerializedBusinessSettings>
> {
  try {
    const { businessId } =
      await getDashboardContext();

    const parsed =
      UpdateBusinessSettingsSchema.safeParse(
        input,
      );

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid business settings.",
      };
    }

    const settings =
      await updateBusinessSettings(
        businessId,
        parsed.data,
      );

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");
    revalidatePath("/orders");
    revalidatePath("/products");

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update business settings.",
    };
  }
}