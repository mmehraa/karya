import { NextResponse } from "next/server";

import { getDashboardContext } from "@/modules/business/dashboard-context";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { businessId } =
      await getDashboardContext();

    const [
      business,
      settings,
      products,
      customers,
      orders,
      orderItems,
      expenses,
      contentItems,
      contentPublications,
      goals,
      tasks,
      alerts,
      inventoryTransactions,
      stageProgress,
      stageTransitions,
    ] = await Promise.all([
      db.business.findUnique({
        where: {
          id: businessId,
        },
      }),

      db.businessSettings.findUnique({
        where: {
          businessId,
        },
      }),

      db.product.findMany({
        where: {
          businessId,
        },
      }),

      db.customer.findMany({
        where: {
          businessId,
        },
      }),

      db.order.findMany({
        where: {
          businessId,
        },
      }),

      db.orderItem.findMany({
        where: {
          businessId,
        },
      }),

      db.expense.findMany({
        where: {
          businessId,
        },
      }),

      db.contentItem.findMany({
        where: {
          businessId,
        },
      }),

      db.contentPublication.findMany({
        where: {
          businessId,
        },
      }),

      db.goal.findMany({
        where: {
          businessId,
        },
      }),

      db.task.findMany({
        where: {
          businessId,
        },
      }),

      db.alert.findMany({
        where: {
          businessId,
        },
      }),

      db.inventoryTransaction.findMany({
        where: {
          businessId,
        },
      }),

      db.businessStageProgress.findMany({
        where: {
          businessId,
        },
      }),

      db.stageTransition.findMany({
        where: {
          businessId,
        },
      }),
    ]);

    if (!business) {
      return NextResponse.json(
        {
          error: "Business not found.",
        },
        {
          status: 404,
        },
      );
    }

    const backup = {
      metadata: {
        application:
          "Business Operating System",
        version: "1.0",
        exportedAt:
          new Date().toISOString(),
        businessId,
      },

      business,
      settings,

      products,
      customers,

      orders,
      orderItems,

      expenses,

      contentItems,
      contentPublications,

      goals,
      tasks,

      alerts,

      inventoryTransactions,

      stageProgress,
      stageTransitions,
    };

    return new NextResponse(
      JSON.stringify(
        backup,
        null,
        2,
      ),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json; charset=utf-8",

          "Content-Disposition":
            `attachment; filename="bos-backup-${business.slug}-${new Date()
              .toISOString()
              .slice(0, 10)}.json"`,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create backup.",
      },
      {
        status: 500,
      },
    );
  }
}