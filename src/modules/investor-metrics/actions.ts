
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  investorMarketAssumptionSchema,
  investorVerifiedCashBalanceSchema,
  type InvestorMarketAssumptionInput,
  type InvestorVerifiedCashBalanceInput,
} from "./validation";

export interface InvestorMetricsActionResponse {
  success: boolean;
  error?: string;
}

function getSafeActionError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return fallback;
  }

  if (error instanceof Error) {
    // Return only expected validation-style messages, not database,
    // infrastructure, or internal implementation details.
    if (
      error.message === "A business ID is required." ||
      error.message === "Unauthorized"
    ) {
      return error.message;
    }
  }

  return fallback;
}

/**
 * Saves a documented TAM, SAM, or SOM market-size assumption
 * for the active business.
 */
export async function saveInvestorMarketAssumptionAction(
  input: InvestorMarketAssumptionInput,
): Promise<InvestorMetricsActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = investorMarketAssumptionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid market assumption data.",
      };
    }

    const data = parsed.data;

    await db.investorMarketAssumption.create({
      data: {
        businessId,
        market: data.market,
        value: new Prisma.Decimal(data.value),
        currencyCode: data.currencyCode.trim().toUpperCase(),
        marketDefinition: data.marketDefinition,
        geography: data.geography,
        methodology: data.methodology,
        sourceType: data.sourceType,
        sourceName: data.sourceName?.trim() || null,
        sourceUrl: data.sourceUrl?.trim() || null,
        asOfDate: new Date(`${data.asOfDate}T00:00:00.000Z`),
        notes: data.notes?.trim() || null,
      },
    });

    revalidatePath("/investor-metrics");
    revalidatePath("/analytics");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("saveInvestorMarketAssumptionAction error:", error);

    return {
      success: false,
      error: getSafeActionError(
        error,
        "Unable to save the market assumption. Please try again.",
      ),
    };
  }
}

/**
 * Saves a manually verified, dated cash balance
 * for the active business.
 */
export async function saveInvestorVerifiedCashBalanceAction(
  input: InvestorVerifiedCashBalanceInput,
): Promise<InvestorMetricsActionResponse> {
  try {
    const { businessId } = await getDashboardContext();

    const parsed = investorVerifiedCashBalanceSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid verified cash balance data.",
      };
    }

    const data = parsed.data;

    await db.investorVerifiedCashBalance.create({
      data: {
        businessId,
        amount: new Prisma.Decimal(data.amount),
        currencyCode: data.currencyCode.trim().toUpperCase(),
        asOfDate: new Date(`${data.asOfDate}T00:00:00.000Z`),
        sourceDescription: data.sourceDescription,
        notes: data.notes?.trim() || null,
      },
    });

    revalidatePath("/investor-metrics");
    revalidatePath("/cash-flow");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("saveInvestorVerifiedCashBalanceAction error:", error);

    return {
      success: false,
      error: getSafeActionError(
        error,
        "Unable to save the verified cash balance. Please try again.",
      ),
    };
  }
}