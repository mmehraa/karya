import {
  AlertSeverity,
  ProductStatus,
  RequirementStatus,
  RequirementType,
  TaskStatus,
} from "@prisma/client";

import { db } from "@/lib/db";

import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getStageWithRequirements } from "@/modules/stages/services";

import type {
  AlertSyncResult,
  AlertsSummary,
  SerializedAlert,
} from "./types";

interface AlertCandidate {
  title: string;
  message: string;
  severity: AlertSeverity;
  linkUrl: string;
}

function serializeAlert(alert: {
  id: string;
  businessId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  isResolved: boolean;
  linkUrl: string | null;
  createdAt: Date;
}): SerializedAlert {
  return {
    id: alert.id,
    businessId: alert.businessId,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    isResolved: alert.isResolved,
    linkUrl: alert.linkUrl,
    createdAt: alert.createdAt,
  };
}

export async function getAlerts(
  businessId: string,
): Promise<SerializedAlert[]> {
  const alerts = await db.alert.findMany({
    where: {
      businessId,
    },
    orderBy: [
      {
        isResolved: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return alerts.map(serializeAlert);
}

export async function getAlertsSummary(
  businessId: string,
): Promise<AlertsSummary> {
  const [
    totalAlerts,
    activeAlerts,
    resolvedAlerts,
    infoAlerts,
    warningAlerts,
    criticalAlerts,
  ] = await Promise.all([
    db.alert.count({
      where: {
        businessId,
      },
    }),

    db.alert.count({
      where: {
        businessId,
        isResolved: false,
      },
    }),

    db.alert.count({
      where: {
        businessId,
        isResolved: true,
      },
    }),

    db.alert.count({
      where: {
        businessId,
        isResolved: false,
        severity: AlertSeverity.INFO,
      },
    }),

    db.alert.count({
      where: {
        businessId,
        isResolved: false,
        severity: AlertSeverity.WARNING,
      },
    }),

    db.alert.count({
      where: {
        businessId,
        isResolved: false,
        severity: AlertSeverity.CRITICAL,
      },
    }),
  ]);

  return {
    totalAlerts,
    activeAlerts,
    resolvedAlerts,
    infoAlerts,
    warningAlerts,
    criticalAlerts,
  };
}

async function buildAlertCandidates(
  businessId: string,
): Promise<AlertCandidate[]> {
  const candidates: AlertCandidate[] = [];

  /*
   * 1. LOW / OUT-OF-STOCK ACTIVE PRODUCTS
   */
  const activeProducts =
    await db.product.findMany({
      where: {
        businessId,
        status: ProductStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        reorderLevel: true,
      },
      orderBy: {
        name: "asc",
      },
    });

  for (const product of activeProducts) {
    if (product.currentStock <= 0) {
      candidates.push({
        title: `Out of Stock: ${product.name}`,
        message: `${product.name} (${product.sku}) currently has no stock available.`,
        severity: AlertSeverity.CRITICAL,
        linkUrl: `/inventory?productId=${encodeURIComponent(
          product.id,
        )}`,
      });

      continue;
    }

    if (
      product.currentStock <=
      product.reorderLevel
    ) {
      candidates.push({
        title: `Low Stock: ${product.name}`,
        message: `${product.name} (${product.sku}) has ${product.currentStock} unit${
          product.currentStock === 1 ? "" : "s"
        } remaining, at or below the reorder level of ${product.reorderLevel}.`,
        severity: AlertSeverity.WARNING,
        linkUrl: `/inventory?productId=${encodeURIComponent(
          product.id,
        )}`,
      });
    }
  }

  /*
   * 2. OVERDUE TASKS
   */
  const now = new Date();

  const overdueTasks =
    await db.task.findMany({
      where: {
        businessId,
        status: {
          not: TaskStatus.DONE,
        },
        dueDate: {
          lt: now,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

  for (const task of overdueTasks) {
    candidates.push({
      title: `Overdue Task: ${task.title}`,
      message: `This task was due on ${task.dueDate?.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      )} and is still not completed.`,
      severity: AlertSeverity.WARNING,
      linkUrl: `/tasks?taskId=${encodeURIComponent(
        task.id,
      )}`,
    });
  }

  /*
   * 3. INCOMPLETE MANDATORY STAGE REQUIREMENTS
   */
  const { business } =
    await getDashboardContext();

  const stageData =
    await getStageWithRequirements(
      business.currentStageId,
      businessId,
    );

  const mandatoryBlockers =
    stageData?.requirements.filter(
      (requirement) =>
        requirement.type ===
          RequirementType.MANDATORY &&
        requirement.status !==
          RequirementStatus.COMPLETED,
    ) ?? [];

  for (const requirement of mandatoryBlockers) {
    candidates.push({
      title: `Stage Gate Blocked: ${requirement.title}`,
      message:
        requirement.blockerReason ??
        `${requirement.title} is still incomplete and is blocking stage readiness.`,
      severity: AlertSeverity.WARNING,
      linkUrl: `/dashboard?alert=stage-gate-${encodeURIComponent(
        requirement.code,
      )}`,
    });
  }

  return candidates;
}

export async function syncOperationalAlerts(
  businessId: string,
): Promise<AlertSyncResult> {
  const candidates =
    await buildAlertCandidates(
      businessId,
    );

  const existingAlerts =
    await db.alert.findMany({
      where: {
        businessId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const unresolvedByLink =
    new Map<string, (typeof existingAlerts)[number]>();

  for (const alert of existingAlerts) {
    if (
      alert.isResolved ||
      !alert.linkUrl
    ) {
      continue;
    }

    if (
      !unresolvedByLink.has(
        alert.linkUrl,
      )
    ) {
      unresolvedByLink.set(
        alert.linkUrl,
        alert,
      );
    }
  }

  const candidateLinks =
    new Set(
      candidates.map(
        (candidate) =>
          candidate.linkUrl,
      ),
    );

  let created = 0;
  let updated = 0;
  let resolved = 0;

  /*
   * Create or update currently active conditions.
   */
  for (const candidate of candidates) {
    const existing =
      unresolvedByLink.get(
        candidate.linkUrl,
      );

    if (existing) {
      await db.alert.updateMany({
        where: {
          id: existing.id,
          businessId,
          isResolved: false,
        },
        data: {
          title: candidate.title,
          message: candidate.message,
          severity: candidate.severity,
        },
      });

      updated++;
      continue;
    }

    /*
     * A previously resolved alert is intentionally not reused.
     * If the same condition becomes active again, a new alert
     * is created so the history remains intact.
     */
    await db.alert.create({
      data: {
        businessId,
        title: candidate.title,
        message: candidate.message,
        severity: candidate.severity,
        isResolved: false,
        linkUrl: candidate.linkUrl,
      },
    });

    created++;
  }

  /*
   * Resolve previously active conditions that no longer exist.
   */
  for (const alert of existingAlerts) {
    if (
      alert.isResolved ||
      !alert.linkUrl
    ) {
      continue;
    }

    if (
      !candidateLinks.has(
        alert.linkUrl,
      )
    ) {
      await db.alert.updateMany({
        where: {
          id: alert.id,
          businessId,
          isResolved: false,
        },
        data: {
          isResolved: true,
        },
      });

      resolved++;
    }
  }

  return {
    created,
    updated,
    resolved,
    active: candidates.length,
  };
}

export async function resolveAlert(
  businessId: string,
  alertId: string,
): Promise<SerializedAlert> {
  const result =
    await db.alert.updateMany({
      where: {
        id: alertId,
        businessId,
        isResolved: false,
      },
      data: {
        isResolved: true,
      },
    });

  if (result.count === 0) {
    throw new Error(
      "Alert not found or already resolved.",
    );
  }

  const alert =
    await db.alert.findFirst({
      where: {
        id: alertId,
        businessId,
      },
    });

  if (!alert) {
    throw new Error("Alert not found.");
  }

  return serializeAlert(alert);
}