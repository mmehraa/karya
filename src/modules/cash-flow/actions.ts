"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  createCashTransaction,
  deleteManualCashTransaction,
  getCashFlowCategorySummary,
  getCashFlowSummary,
  getCashTransactions,
} from "./services";

import {
  CashFlowPeriodSchema,
  CreateCashTransactionSchema,
  DeleteCashTransactionSchema,
  type CashFlowPeriodInput,
  type CreateCashTransactionInput,
  type DeleteCashTransactionInput,
} from "./validation";

import type {
  CashFlowCategorySummary,
  CashFlowSummary,
  SerializedCashTransaction,
} from "./types";

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Creates a manual cash transaction.
 */
export async function createCashTransactionAction(
  input: CreateCashTransactionInput,
): Promise<ActionResponse<SerializedCashTransaction>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CreateCashTransactionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid cash transaction data.",
      };
    }

    const transaction = await createCashTransaction(
      businessId,
      parsed.data,
    );

    revalidatePath("/cash-flow");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: transaction,
    };
  } catch (error) {
    console.error(
      "createCashTransactionAction error:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to record cash transaction.",
    };
  }
}

/**
 * Retrieves cash transactions for the active business.
 */
export async function getCashTransactionsAction(
  input?: CashFlowPeriodInput,
): Promise<ActionResponse<SerializedCashTransaction[]>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CashFlowPeriodSchema.safeParse(input ?? {});

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid cash-flow period.",
      };
    }

    const transactions = await getCashTransactions(
      businessId,
      parsed.data,
    );

    return {
      success: true,
      data: transactions,
    };
  } catch (error) {
    console.error(
      "getCashTransactionsAction error:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load cash transactions.",
    };
  }
}

/**
 * Retrieves cash-flow totals for the active business.
 */
export async function getCashFlowSummaryAction(
  input?: CashFlowPeriodInput,
): Promise<ActionResponse<CashFlowSummary>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CashFlowPeriodSchema.safeParse(input ?? {});

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid cash-flow period.",
      };
    }

    const summary = await getCashFlowSummary(
      businessId,
      parsed.data,
    );

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    console.error(
      "getCashFlowSummaryAction error:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load cash-flow summary.",
    };
  }
}

/**
 * Retrieves cash movement grouped by category.
 */
export async function getCashFlowCategorySummaryAction(
  input?: CashFlowPeriodInput,
): Promise<ActionResponse<CashFlowCategorySummary[]>> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = CashFlowPeriodSchema.safeParse(input ?? {});

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid cash-flow period.",
      };
    }

    const summary = await getCashFlowCategorySummary(
      businessId,
      parsed.data,
    );

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    console.error(
      "getCashFlowCategorySummaryAction error:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load cash-flow categories.",
    };
  }
}

/**
 * Deletes a manually-created cash transaction.
 */
export async function deleteCashTransactionAction(
  input: DeleteCashTransactionInput,
): Promise<ActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed =
      DeleteCashTransactionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid cash transaction.",
      };
    }

    await deleteManualCashTransaction(
      businessId,
      parsed.data.id,
    );

    revalidatePath("/cash-flow");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "deleteCashTransactionAction error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "Cash transaction not found."
    ) {
      return {
        success: false,
        error: "Cash transaction not found or access denied.",
      };
    }

    if (
      error instanceof Error &&
      error.message ===
        "Automatically generated cash transactions must be managed from their source record."
    ) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      return {
        success: false,
        error: "Unable to delete the cash transaction.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete cash transaction.",
    };
  }
}