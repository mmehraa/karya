"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  Prisma,
  RequirementStatus,
  EvaluationMode,
  RequirementType,
} from "@prisma/client";
import { resolveRequirementStatus } from "@/modules/stages/evaluators";

const UpdateRequirementSchema = z.object({
  requirementId: z.string().uuid("Invalid requirement ID format"),
  status: z.nativeEnum(RequirementStatus),
  notes: z.string().max(1000).optional().nullable(),
  blockerReason: z.string().max(500).optional().nullable(),
});

export type UpdateRequirementInput = z.infer<
  typeof UpdateRequirementSchema
>;

export interface ActionResponse {
  success: boolean;
  error?: string;
}

export async function updateRequirementProgressAction(
  input: UpdateRequirementInput
): Promise<ActionResponse> {
  try {
    const { businessId, business } = await getDashboardContext();

    const parsed = UpdateRequirementSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid input data",
      };
    }

    const {
      requirementId,
      status,
      notes,
      blockerReason,
    } = parsed.data;

    const requirementDef =
      await db.stageRequirementDef.findUnique({
        where: { id: requirementId },
      });

    if (!requirementDef) {
      return {
        success: false,
        error: "Requirement definition not found",
      };
    }

    // Ensure the requirement belongs to the business's current stage.
    if (requirementDef.stageId !== business.currentStageId) {
      return {
        success: false,
        error:
          "Cannot update requirements from an inactive business stage.",
      };
    }

    // Only manual requirements can be updated by the founder.
    if (requirementDef.evalMode !== EvaluationMode.MANUAL) {
      return {
        success: false,
        error: `Cannot manually override a ${requirementDef.evalMode} requirement. Automated evaluator manages this directly.`,
      };
    }

    const existingProgress =
      await db.businessStageProgress.findUnique({
        where: {
          businessId_requirementId: {
            businessId,
            requirementId,
          },
        },
      });

    let completedAt: Date | null = null;

    if (status === RequirementStatus.COMPLETED) {
      completedAt =
        existingProgress?.completedAt ?? new Date();
    }

    const cleanBlockerReason =
      status === RequirementStatus.BLOCKED
        ? blockerReason?.trim() || null
        : null;

    const cleanNotes = notes?.trim() || null;

    await db.businessStageProgress.upsert({
      where: {
        businessId_requirementId: {
          businessId,
          requirementId,
        },
      },
      update: {
        status,
        notes: cleanNotes,
        blockerReason: cleanBlockerReason,
        completedAt,
      },
      create: {
        businessId,
        requirementId,
        status,
        notes: cleanNotes,
        blockerReason: cleanBlockerReason,
        completedAt,
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Failed to update stage requirement progress:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Database error occurred while updating requirement",
    };
  }
}

// ---------------------------------------------------------------------------
// Stage Advancement Governance with PostgreSQL Row-Level Locking
// ---------------------------------------------------------------------------

const AdvanceStageSchema = z.object({
  expectedCurrentStageId: z
    .number()
    .int()
    .min(0)
    .max(7),

  reason: z
    .string()
    .min(
      10,
      "Please provide an audit rationale of at least 10 characters."
    )
    .max(
      500,
      "Reason must not exceed 500 characters."
    ),

  triggeredBy: z
    .string()
    .max(100)
    .default("Founder"),
});

export type AdvanceStageInput = z.infer<
  typeof AdvanceStageSchema
>;

export async function advanceBusinessStageAction(
  input: AdvanceStageInput
): Promise<ActionResponse> {
  try {
    // 1. Resolve businessId outside the transaction.
    const { businessId } =
      await getDashboardContext();

    const parsed =
      AdvanceStageSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Invalid input parameters",
      };
    }

    const {
      expectedCurrentStageId,
      reason,
      triggeredBy,
    } = parsed.data;

    // 2. Begin transaction.
    await db.$transaction(async (tx) => {
      // 3. Explicitly lock the Business row.
      //
      // This ensures that two simultaneous stage-advancement
      // requests cannot both evaluate and advance the same
      // business at the same time.
      const lockedBusinesses =
        await tx.$queryRaw<
          Array<{
            id: string;
            currentStageId: number;
            name: string;
          }>
        >(
          Prisma.sql`
            SELECT
              "id",
              "currentStageId",
              "name"
            FROM "Business"
            WHERE "id" = ${businessId}
            FOR UPDATE
          `
        );

      const lockedBusiness =
        lockedBusinesses[0];

      if (!lockedBusiness) {
        throw new Error(
          "Active business record not found."
        );
      }

      // 4. Read the current stage from the locked row.
      const currentStageId =
        lockedBusiness.currentStageId;

      // 5. Verify the stage has not changed since
      // the dashboard loaded.
      if (
        currentStageId !==
        expectedCurrentStageId
      ) {
        throw new Error(
          `Stage Conflict: Business stage has already changed to Stage ${currentStageId}. Refresh and review your dashboard.`
        );
      }

      // 6. Stage 8 is the final stage.
      if (currentStageId >= 8) {
        throw new Error(
          "Business is already at the final stage (Stage 8: Mature/Enterprise)."
        );
      }

      // 7. The only valid next stage is current + 1.
      const nextStageId =
        currentStageId + 1;

      const nextStageDef =
        await tx.stageDefinition.findUnique({
          where: {
            id: nextStageId,
          },
        });

      if (!nextStageDef) {
        throw new Error(
          `Target Stage ${nextStageId} definition does not exist.`
        );
      }

      // 8. Retrieve every mandatory requirement
      // belonging to the current stage.
      const mandatoryRequirements =
        await tx.stageRequirementDef.findMany({
          where: {
            stageId: currentStageId,
            type: RequirementType.MANDATORY,
          },
          include: {
            businessProgress: {
              where: {
                businessId,
              },
            },
          },
        });

      // Evaluate every mandatory requirement using
      // the exact same evaluator used by the dashboard.
      for (const req of mandatoryRequirements) {
        const progress =
          req.businessProgress[0] ?? null;

        const evaluated =
          await resolveRequirementStatus(
            tx,
            businessId,
            req,
            progress
          );

        // 9. Any non-completed mandatory requirement
        // blocks stage advancement.
        if (
          evaluated.status !==
          RequirementStatus.COMPLETED
        ) {
          throw new Error(
            `Cannot advance: Mandatory requirement "${req.title}" is ${evaluated.status}.${
              evaluated.blockerReason
                ? ` Reason: ${evaluated.blockerReason}`
                : ""
            }`
          );
        }
      }

      // 10. Create the immutable audit record.
      await tx.stageTransition.create({
        data: {
          businessId,
          fromStageId: currentStageId,
          toStageId: nextStageId,
          reason: reason.trim(),
          triggeredBy:
            triggeredBy.trim() || "Founder",
        },
      });

      // 11. Update the Business stage.
      //
      // The currentStageId condition is an additional
      // defensive concurrency check.
      const updateResult =
        await tx.business.updateMany({
          where: {
            id: businessId,
            currentStageId: currentStageId,
          },
          data: {
            currentStageId: nextStageId,
          },
        });

      if (updateResult.count === 0) {
        throw new Error(
          "Concurrency conflict: The business stage could not be updated."
        );
      }

      // 12. Transaction commits automatically
      // when this callback completes successfully.
    });

    // 13. Only revalidate after a successful commit.
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Failed to advance stage:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while advancing the stage.",
    };
  }
}