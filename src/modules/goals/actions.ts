"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  createGoal,
  deleteGoal,
  updateGoal,
} from "./services";

import {
  CreateGoalSchema,
  UpdateGoalSchema,
} from "./validation";

import type {
  CreateGoalInput,
  UpdateGoalInput,
} from "./validation";

import type { SerializedGoal } from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function createGoalAction(
  input: CreateGoalInput
): Promise<ActionResponse<SerializedGoal>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CreateGoalSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid goal data.",
      };
    }

    const goal = await createGoal(
      businessId,
      parsed.data
    );

    revalidatePath("/goals");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: goal,
    };
  } catch (error) {
    console.error("createGoalAction error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create goal.",
    };
  }
}

export async function updateGoalAction(
  input: UpdateGoalInput
): Promise<ActionResponse<SerializedGoal>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = UpdateGoalSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid goal data.",
      };
    }

    const goal = await updateGoal(
      businessId,
      parsed.data
    );

    revalidatePath("/goals");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: goal,
    };
  } catch (error) {
    console.error("updateGoalAction error:", error);

    if (
      error instanceof Error &&
      error.message === "Goal not found."
    ) {
      return {
        success: false,
        error: "Goal not found or access denied.",
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        success: false,
        error: "Unable to update the goal.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update goal.",
    };
  }
}

export async function deleteGoalAction(
  goalId: string
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    await deleteGoal(businessId, goalId);

    revalidatePath("/goals");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteGoalAction error:", error);

    if (
      error instanceof Error &&
      error.message === "Goal not found."
    ) {
      return {
        success: false,
        error: "Goal not found or access denied.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete goal.",
    };
  }
}