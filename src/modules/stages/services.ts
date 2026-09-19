import { db } from "@/lib/db";
import { RequirementStatus, RequirementType } from "@prisma/client";
import type { StageRequirementItem } from "@/modules/stages/types";
import { resolveRequirementStatus } from "@/modules/stages/evaluators";

export async function getStageWithRequirements(
  stageId: number,
  businessId: string
) {
  const stage = await db.stageDefinition.findUnique({
    where: {
      id: stageId,
    },
    include: {
      requirements: {
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  });

  if (!stage) {
    return null;
  }

  // Retrieve existing progress records for this business
  // and the current stage.
  const progressRecords =
    await db.businessStageProgress.findMany({
      where: {
        businessId,
        requirement: {
          stageId,
        },
      },
    });

  const progressMap = new Map(
    progressRecords.map((p) => [
      p.requirementId,
      p,
    ])
  );

  // Resolve every requirement through the shared evaluator.
  //
  // Manual requirements use persisted progress.
  // Automated requirements are evaluated dynamically
  // against actual business data.
  const requirementsWithStatus: StageRequirementItem[] =
    await Promise.all(
      stage.requirements.map(async (req) => {
        const progress =
          progressMap.get(req.id);

        const evaluated =
          await resolveRequirementStatus(
            db,
            businessId,
            req,
            progress
          );

        return {
          id: req.id,
          stageId: req.stageId,
          code: req.code,
          title: req.title,
          description: req.description,
          type: req.type,
          evalMode: req.evalMode,
          evalRuleKey: req.evalRuleKey,
          evalConfig: req.evalConfig,
          orderIndex: req.orderIndex,

          status: evaluated.status,
          blockerReason:
            evaluated.blockerReason,
          notes: evaluated.notes,
          completedAt:
            evaluated.completedAt,
        };
      })
    );

  // Separate requirements by tier.
  const mandatory =
    requirementsWithStatus.filter(
      (r) =>
        r.type === RequirementType.MANDATORY
    );

  const recommended =
    requirementsWithStatus.filter(
      (r) =>
        r.type === RequirementType.RECOMMENDED
    );

  const optional =
    requirementsWithStatus.filter(
      (r) =>
        r.type === RequirementType.OPTIONAL
    );

  // Overall completion.
  const completedTotal =
    requirementsWithStatus.filter(
      (r) =>
        r.status ===
        RequirementStatus.COMPLETED
    ).length;

  const completedMandatory =
    mandatory.filter(
      (r) =>
        r.status ===
        RequirementStatus.COMPLETED
    ).length;

  const completedRecommended =
    recommended.filter(
      (r) =>
        r.status ===
        RequirementStatus.COMPLETED
    ).length;

  const completedOptional =
    optional.filter(
      (r) =>
        r.status ===
        RequirementStatus.COMPLETED
    ).length;

  const totalRequirementsCount =
    requirementsWithStatus.length;

  const overallProgressPct =
    totalRequirementsCount > 0
      ? Math.round(
          (completedTotal /
            totalRequirementsCount) *
            100
        )
      : 0;

  const mandatoryProgressPct =
    mandatory.length > 0
      ? Math.round(
          (completedMandatory /
            mandatory.length) *
            100
        )
      : 0;

  // A stage is ready only when every mandatory
  // requirement has been evaluated as COMPLETED.
  const mandatoryBlockers =
    mandatory.filter(
      (r) =>
        r.status !==
        RequirementStatus.COMPLETED
    );

  const isReadyToAdvance =
    mandatory.length > 0 &&
    mandatoryBlockers.length === 0;

  return {
    stage,
    requirements:
      requirementsWithStatus,

    metrics: {
      totalRequirementsCount,
      completedTotal,
      overallProgressPct,

      mandatoryCount:
        mandatory.length,
      completedMandatory,
      mandatoryProgressPct,

      recommendedCount:
        recommended.length,
      completedRecommended,

      optionalCount:
        optional.length,
      completedOptional,

      isReadyToAdvance,

      blockerCount:
        mandatoryBlockers.length,

      blockers:
        mandatoryBlockers.map((b) => ({
          code: b.code,
          title: b.title,
          status: b.status,
          blockerReason:
            b.blockerReason,
        })),
    },
  };
}