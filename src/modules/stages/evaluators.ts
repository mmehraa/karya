import {
  PrismaClient,
  ProductStatus,
  RequirementStatus,
  StageRequirementDef,
  BusinessStageProgress,
} from "@prisma/client";

// Prisma transaction client type compatible with Prisma 7
type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

interface EvaluationResult {
  status: RequirementStatus;
  blockerReason: string | null;
}

/**
 * Registry of automated requirement evaluators.
 * Verifies real database facts rather than static claims.
 */
export async function evaluateSystemRequirement(
  tx: PrismaTx,
  businessId: string,
  ruleKey: string | null,
  evalConfig: unknown
): Promise<EvaluationResult> {
  switch (ruleKey) {
    case "CORE_OFFERINGS_REGISTERED_COUNT": {
      const config =
        (evalConfig as { minOfferingCount?: number }) ?? {};

      const threshold = config.minOfferingCount ?? 1;

      const products = await tx.product.findMany({
        where: {
          businessId,
          status: ProductStatus.ACTIVE,
        },
        select: {
          sellingPrice: true,
          cogs: true,
          packagingCost: true,
          variableCost: true,
        },
      });

      const completeOfferingCount = products.filter(
        (product) =>
          product.sellingPrice !== null &&
          product.cogs !== null &&
          product.packagingCost !== null &&
          product.variableCost !== null
      ).length;

      if (completeOfferingCount >= threshold) {
        return {
          status: RequirementStatus.COMPLETED,
          blockerReason: null,
        };
      }

      return {
        status: RequirementStatus.BLOCKED,
        blockerReason:
          `At least ${threshold} active offering must have complete unit economics ` +
          `(selling price, COGS, packaging cost, and variable cost). ` +
          `Current complete offerings: ${completeOfferingCount}.`,
      };
    }

    default:
      return {
        status: RequirementStatus.NOT_STARTED,
        blockerReason: ruleKey
          ? `Automated rule "${ruleKey}" is pending system integration.`
          : "Automated evaluator rule key is not defined.",
      };
  }
}

/**
 * Unifies manual progress records with dynamic automated system checks.
 * Used identically by dashboard queries and stage advancement actions.
 */
export async function resolveRequirementStatus(
  tx: PrismaTx,
  businessId: string,
  requirement: StageRequirementDef,
  progressRecord?: BusinessStageProgress | null
): Promise<
  EvaluationResult & {
    notes: string | null;
    completedAt: Date | null;
  }
> {
  // Automated requirements are evaluated against real business data.
  if (
    requirement.evalMode === "SYSTEM_CHECK" ||
    requirement.evalMode === "METRIC_THRESHOLD"
  ) {
    const result = await evaluateSystemRequirement(
      tx,
      businessId,
      requirement.evalRuleKey,
      requirement.evalConfig
    );

    return {
      status: result.status,
      blockerReason: result.blockerReason,
      notes: progressRecord?.notes ?? null,
      completedAt:
        result.status === RequirementStatus.COMPLETED
          ? (progressRecord?.completedAt ?? new Date())
          : null,
    };
  }

  // Manual requirements use the founder's persisted progress.
  return {
    status:
      progressRecord?.status ?? RequirementStatus.NOT_STARTED,
    blockerReason: progressRecord?.blockerReason ?? null,
    notes: progressRecord?.notes ?? null,
    completedAt: progressRecord?.completedAt ?? null,
  };
}