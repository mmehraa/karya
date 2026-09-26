import { OrderPaymentStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import type {
  AnalyticsDateRange,
  RevenueByChannel,
  RevenueByMonth,
  RevenueByOrder,
  RevenueByProduct,
  RevenueGrowth,
  RevenueIntelligence,
  RevenueSummary,
} from "./types";

interface GetRevenueIntelligenceOptions {
  from?: Date | null;
  to?: Date;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);

  result.setHours(23, 59, 59, 999);

  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

function differenceInDays(from: Date, to: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.max(
    1,
    Math.ceil(
      (startOfDay(to).getTime() - startOfDay(from).getTime()) /
        millisecondsPerDay,
    ) + 1,
  );
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function getPreviousPeriod(
  from: Date | null,
  to: Date,
): AnalyticsDateRange {
  const currentTo = endOfDay(to);

  /*
   * An "All time" period has no natural previous period because
   * it has no defined starting boundary.
   *
   * The caller handles this case separately using the first
   * recorded paid order date.
   */
  if (!from) {
    return {
      from: null,
      to: currentTo,
    };
  }

  const currentFrom = startOfDay(from);
  const periodLength = differenceInDays(currentFrom, currentTo);

  const previousTo = addDays(currentFrom, -1);
  const previousFrom = addDays(
    previousTo,
    -(periodLength - 1),
  );

  return {
    from: startOfDay(previousFrom),
    to: endOfDay(previousTo),
  };
}

function decimalToNumber(
  value: Prisma.Decimal | null,
): number {
  return value ? Number(value) : 0;
}

async function getPaidOrders(
  businessId: string,
  period: AnalyticsDateRange,
) {
  return db.order.findMany({
    where: {
      businessId,
      paymentStatus: OrderPaymentStatus.PAID,
      orderDate: {
        gte: period.from ?? undefined,
        lte: period.to,
      },
    },
    select: {
      id: true,
      orderNumber: true,
      orderDate: true,
      totalAmount: true,
      channel: true,
      customer: {
        select: {
          name: true,
        },
      },
      items: {
        select: {
          productId: true,
          quantity: true,
          unitPrice: true,
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        orderDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

async function getFirstPaidOrderDate(
  businessId: string,
): Promise<Date | null> {
  const firstPaidOrder = await db.order.findFirst({
    where: {
      businessId,
      paymentStatus: OrderPaymentStatus.PAID,
    },
    select: {
      orderDate: true,
    },
    orderBy: {
      orderDate: "asc",
    },
  });

  return firstPaidOrder?.orderDate ?? null;
}

function buildRevenueSummary(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueSummary {
  const totalRevenue = orders.reduce(
    (total, order) =>
      total + decimalToNumber(order.totalAmount),
    0,
  );

  const unitsSold = orders.reduce(
    (total, order) =>
      total +
      order.items.reduce(
        (itemTotal, item) =>
          itemTotal + item.quantity,
        0,
      ),
    0,
  );

  const paidOrderCount = orders.length;

  return {
    totalRevenue,
    paidOrderCount,
    unitsSold,
    averageOrderValue:
      paidOrderCount > 0
        ? totalRevenue / paidOrderCount
        : null,
  };
}

function buildRevenueByMonth(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueByMonth[] {
  const grouped = new Map<
    string,
    {
      date: Date;
      revenue: number;
      orderCount: number;
    }
  >();

  for (const order of orders) {
    const date = new Date(
      order.orderDate.getFullYear(),
      order.orderDate.getMonth(),
      1,
    );

    const key = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}`;

    const existing = grouped.get(key);

    if (existing) {
      existing.revenue += decimalToNumber(
        order.totalAmount,
      );
      existing.orderCount += 1;
    } else {
      grouped.set(key, {
        date,
        revenue: decimalToNumber(
          order.totalAmount,
        ),
        orderCount: 1,
      });
    }
  }

  return Array.from(grouped.values())
    .sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime(),
    )
    .map((item) => ({
      month: formatMonth(item.date),
      revenue: item.revenue,
      orderCount: item.orderCount,
    }));
}

function buildRevenueByProduct(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueByProduct[] {
  const grouped = new Map<
    string,
    {
      productId: string;
      productName: string;
      sku: string;
      revenue: number;
      unitsSold: number;
      orderIds: Set<string>;
    }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      /*
       * Product revenue uses the historical selling price
       * recorded on the order item rather than the product's
       * current selling price.
       */
      const revenue =
        decimalToNumber(item.unitPrice) *
        item.quantity;

      const existing = grouped.get(
        item.productId,
      );

      if (existing) {
        existing.revenue += revenue;
        existing.unitsSold += item.quantity;
        existing.orderIds.add(order.id);
      } else {
        grouped.set(item.productId, {
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          revenue,
          unitsSold: item.quantity,
          orderIds: new Set([order.id]),
        });
      }
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      revenue: item.revenue,
      unitsSold: item.unitsSold,
      orderCount: item.orderIds.size,
    }));
}

function buildRevenueByOrder(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueByOrder[] {
  return orders.map((order) => ({
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    customerName: order.customer.name,
    revenue: decimalToNumber(order.totalAmount),
    channel: order.channel,
  }));
}

function buildRevenueByChannel(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueByChannel[] {
  const grouped = new Map<
    string,
    {
      channel: string;
      revenue: number;
      orderCount: number;
      unitsSold: number;
    }
  >();

  for (const order of orders) {
    const channel =
      order.channel.trim() || "Unspecified";

    const unitsSold = order.items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );

    const existing = grouped.get(channel);

    if (existing) {
      existing.revenue += decimalToNumber(
        order.totalAmount,
      );
      existing.orderCount += 1;
      existing.unitsSold += unitsSold;
    } else {
      grouped.set(channel, {
        channel,
        revenue: decimalToNumber(
          order.totalAmount,
        ),
        orderCount: 1,
        unitsSold,
      });
    }
  }

  return Array.from(grouped.values()).sort(
    (a, b) => b.revenue - a.revenue,
  );
}

function buildRevenueGrowth(
  currentRevenue: number,
  previousRevenue: number,
): RevenueGrowth {
  const changeAmount =
    currentRevenue - previousRevenue;

  return {
    currentPeriodRevenue: currentRevenue,
    previousPeriodRevenue: previousRevenue,
    changeAmount,
    changePercentage:
      previousRevenue === 0
        ? null
        : (changeAmount / previousRevenue) * 100,
  };
}

export async function getRevenueIntelligence(
  businessId: string,
  options: GetRevenueIntelligenceOptions = {},
): Promise<RevenueIntelligence> {
  const now = new Date();

  const period: AnalyticsDateRange = {
    from: options.from
      ? startOfDay(options.from)
      : null,
    to: options.to
      ? endOfDay(options.to)
      : endOfDay(now),
  };

  /*
   * Explicit/custom periods have a normal previous period.
   *
   * All-time has no explicit start date, so we derive the
   * business's first paid-order date and use an equally long
   * period immediately before it as the comparison period.
   */
  let previousPeriod: AnalyticsDateRange;

  if (period.from) {
    previousPeriod = getPreviousPeriod(
      period.from,
      period.to,
    );
  } else {
    const firstPaidOrderDate =
      await getFirstPaidOrderDate(
        businessId,
      );

    if (!firstPaidOrderDate) {
      previousPeriod = {
        from: null,
        to: addDays(
          startOfDay(period.to),
          -1,
        ),
      };
    } else {
      const currentFrom =
        startOfDay(firstPaidOrderDate);

      const currentPeriodLength =
        differenceInDays(
          currentFrom,
          period.to,
        );

      const previousTo =
        addDays(currentFrom, -1);

      const previousFrom = addDays(
        previousTo,
        -(currentPeriodLength - 1),
      );

      previousPeriod = {
        from: startOfDay(previousFrom),
        to: endOfDay(previousTo),
      };
    }
  }

  const [orders, previousOrders] =
    await Promise.all([
      getPaidOrders(
        businessId,
        period,
      ),
      getPaidOrders(
        businessId,
        previousPeriod,
      ),
    ]);

  const summary =
    buildRevenueSummary(orders);

  const previousSummary =
    buildRevenueSummary(previousOrders);

  return {
    period,
    summary,
    byMonth:
      buildRevenueByMonth(orders),
    byProduct:
      buildRevenueByProduct(orders),
    byOrder:
      buildRevenueByOrder(orders),
    byChannel:
      buildRevenueByChannel(orders),
    growth:
      buildRevenueGrowth(
        summary.totalRevenue,
        previousSummary.totalRevenue,
      ),
  };
}