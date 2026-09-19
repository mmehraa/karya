"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  createExpense,
  updateExpense,
} from "./services";
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
} from "./validation";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from "./validation";
import type { SerializedExpense } from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function createExpenseAction(
  input: CreateExpenseInput
): Promise<ActionResponse<SerializedExpense>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CreateExpenseSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid expense data.",
      };
    }

    const expense = await createExpense(
      businessId,
      parsed.data
    );

    revalidatePath("/finance");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: expense,
    };
  } catch (error) {
    console.error("createExpenseAction error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to record expense.",
    };
  }
}

export async function updateExpenseAction(
  input: UpdateExpenseInput
): Promise<ActionResponse<SerializedExpense>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = UpdateExpenseSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid expense data.",
      };
    }

    const expense = await updateExpense(
      businessId,
      parsed.data
    );

    revalidatePath("/finance");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: expense,
    };
  } catch (error) {
    console.error("updateExpenseAction error:", error);

    if (
      error instanceof Error &&
      error.message === "Expense not found."
    ) {
      return {
        success: false,
        error: "Expense not found or access denied.",
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        success: false,
        error: "Unable to update the expense.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update expense.",
    };
  }
}