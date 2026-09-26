import { Prisma } from "@prisma/client";
import type {
  CashTransactionCategory,
  CashTransactionType,
  ExpenseCategory,
} from "@prisma/client";

import { db } from "@/lib/db";
import { getProductEconomics } from "@/modules/product-economics/services";
import { getInventoryMovementIntelligence } from "./inventory-movement-services";

import type {
  AnalyticsDateRange,
  CashFlowByCategory,
  CashFlowByMonth,
  CashFlowIntelligence,
  InventoryConcentration,
  InventoryFinishedProduct,
  InventoryIntelligence,
  InventoryLowStockProduct,
  InventoryPackagingMaterial,
  InventoryRawMaterial,
  InventoryStockStatus,
  InventorySummary,
  InventoryMovementIntelligence,
  ExpenseByCategory,
  ExpenseByMonth,
  ExpenseConcentration,
  ExpenseIntelligence,
  ExpenseSummary,
  ExpenseTrend,
  ProductCurrentEconomics,
  ProductIntelligence,
  ProductIntelligenceRow,
  ProductProductionIntelligence,
  ProductSalesProfitability,
  ProductionByMonth,
  ProductionByProduct,
  ProductionIntelligence,
  ProductionSummary,
  RevenueByChannel,
  RevenueByMonth,
  RevenueByOrder,
  RevenueByProduct,
  RevenueGrowth,
  RevenueIntelligence,
  RevenueSummary,
} from "./types";

interface AnalyticsOptions {
  from?: Date | null;
  to?: Date;
}

function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function getPeriod(
  options: AnalyticsOptions,
): AnalyticsDateRange {
  return {
    from: options.from ?? null,
    to: options.to ?? new Date(),
  };
}

function getOrderDateFilter(
  period: AnalyticsDateRange,
) {
  return {
    ...(period.from
      ? {
          gte: period.from,
        }
      : {}),
    lte: period.to,
  };
}

function getProductionDateFilter(
  period: AnalyticsDateRange,
) {
  return {
    ...(period.from
      ? {
          gte: period.from,
        }
      : {}),
    lte: period.to,
  };
}

/* ============================================================
   REVENUE INTELLIGENCE
   ============================================================ */

async function getPaidOrders(
  businessId: string,
  period: AnalyticsDateRange,
) {
  return db.order.findMany({
    where: {
      businessId,
      paymentStatus: "PAID",
      orderDate: getOrderDateFilter(period),
    },
    select: {
      id: true,
      orderNumber: true,
      orderDate: true,
      customer: {
        select: {
          name: true,
        },
      },
      channel: true,
      totalAmount: true,
      items: {
        select: {
          productId: true,
          quantity: true,
          unitPrice: true,
          costPriceSnapshot: true,
          product: {
            select: {
              id: true,
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
        orderNumber: "desc",
      },
    ],
  });
}

function buildRevenueSummary(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueSummary {
  let totalRevenue = 0;
  let unitsSold = 0;

  for (const order of orders) {
    totalRevenue += decimalToNumber(order.totalAmount) ?? 0;

    for (const item of order.items) {
      unitsSold += item.quantity;
    }
  }

  return {
    totalRevenue,
    paidOrderCount: orders.length,
    unitsSold,
    averageOrderValue:
      orders.length > 0
        ? totalRevenue / orders.length
        : null,
  };
}

function buildRevenueByMonth(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueByMonth[] {
  const monthMap = new Map<
    string,
    {
      revenue: number;
      orderCount: number;
    }
  >();

  for (const order of orders) {
    const month = order.orderDate.toLocaleDateString(
      "en-US",
      {
        month: "short",
        year: "numeric",
      },
    );

    const current = monthMap.get(month) ?? {
      revenue: 0,
      orderCount: 0,
    };

    current.revenue +=
      decimalToNumber(order.totalAmount) ?? 0;

    current.orderCount += 1;

    monthMap.set(month, current);
  }

  return Array.from(monthMap.entries()).map(
    ([month, value]) => ({
      month,
      revenue: value.revenue,
      orderCount: value.orderCount,
    }),
  );
}

function buildRevenueByProduct(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueByProduct[] {
  const productMap = new Map<
    string,
    {
      productName: string;
      sku: string;
      revenue: number;
      unitsSold: number;
      orderIds: Set<string>;
    }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const existing = productMap.get(
        item.productId,
      );

      const revenue =
        Number(item.unitPrice) * item.quantity;

      if (existing) {
        existing.revenue += revenue;
        existing.unitsSold += item.quantity;
        existing.orderIds.add(order.id);
        continue;
      }

      productMap.set(item.productId, {
        productName: item.product.name,
        sku: item.product.sku,
        revenue,
        unitsSold: item.quantity,
        orderIds: new Set([order.id]),
      });
    }
  }

  return Array.from(productMap.entries())
    .map(([productId, value]) => ({
      productId,
      productName: value.productName,
      sku: value.sku,
      revenue: value.revenue,
      unitsSold: value.unitsSold,
      orderCount: value.orderIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildRevenueByOrder(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueByOrder[] {
  return orders.map((order) => ({
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    customerName: order.customer.name,
    revenue:
      decimalToNumber(order.totalAmount) ?? 0,
    channel: order.channel,
  }));
}

function buildRevenueByChannel(
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): RevenueByChannel[] {
  const channelMap = new Map<
    string,
    {
      revenue: number;
      orderCount: number;
      unitsSold: number;
    }
  >();

  for (const order of orders) {
    const current = channelMap.get(order.channel) ?? {
      revenue: 0,
      orderCount: 0,
      unitsSold: 0,
    };

    current.revenue +=
      decimalToNumber(order.totalAmount) ?? 0;

    current.orderCount += 1;

    for (const item of order.items) {
      current.unitsSold += item.quantity;
    }

    channelMap.set(order.channel, current);
  }

  return Array.from(channelMap.entries())
    .map(([channel, value]) => ({
      channel,
      revenue: value.revenue,
      orderCount: value.orderCount,
      unitsSold: value.unitsSold,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function getPreviousPeriod(
  period: AnalyticsDateRange,
): AnalyticsDateRange | null {
  if (!period.from) {
    return null;
  }

  const duration =
    period.to.getTime() -
    period.from.getTime();

  return {
    from: new Date(
      period.from.getTime() - duration - 1,
    ),
    to: new Date(
      period.from.getTime() - 1,
    ),
  };
}

async function getRevenueForPeriod(
  businessId: string,
  period: AnalyticsDateRange,
): Promise<number> {
  const orders = await db.order.findMany({
    where: {
      businessId,
      paymentStatus: "PAID",
      orderDate: getOrderDateFilter(period),
    },
    select: {
      totalAmount: true,
    },
  });

  return orders.reduce(
    (sum, order) =>
      sum +
      (decimalToNumber(order.totalAmount) ?? 0),
    0,
  );
}

async function buildRevenueGrowth(
  businessId: string,
  period: AnalyticsDateRange,
  currentRevenue: number,
): Promise<RevenueGrowth> {
  const previousPeriod = getPreviousPeriod(period);

  if (!previousPeriod) {
    return {
      currentPeriodRevenue: currentRevenue,
      previousPeriodRevenue: 0,
      changeAmount: currentRevenue,
      changePercentage: null,
    };
  }

  const previousPeriodRevenue =
    await getRevenueForPeriod(
      businessId,
      previousPeriod,
    );

  const changeAmount =
    currentRevenue - previousPeriodRevenue;

  const changePercentage =
    previousPeriodRevenue === 0
      ? null
      : (changeAmount /
          previousPeriodRevenue) *
        100;

  return {
    currentPeriodRevenue: currentRevenue,
    previousPeriodRevenue,
    changeAmount,
    changePercentage,
  };
}

export async function getRevenueIntelligence(
  businessId: string,
  options: AnalyticsOptions = {},
): Promise<RevenueIntelligence> {
  const period = getPeriod(options);

  const orders = await getPaidOrders(
    businessId,
    period,
  );

  const summary = buildRevenueSummary(orders);

  const [growth] = await Promise.all([
    buildRevenueGrowth(
      businessId,
      period,
      summary.totalRevenue,
    ),
  ]);

  return {
    period,
    summary,
    byMonth: buildRevenueByMonth(orders),
    byProduct: buildRevenueByProduct(orders),
    byOrder: buildRevenueByOrder(orders),
    byChannel: buildRevenueByChannel(orders),
    growth,
  };
}

/* ============================================================
   PRODUCT INTELLIGENCE
   ============================================================ */

async function getAnalyticsProducts(
  businessId: string,
) {
  return db.product.findMany({
    where: {
      businessId,
    },
    select: {
      id: true,
      name: true,
      sku: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

async function getCompletedProductionBatches(
  businessId: string,
  period: AnalyticsDateRange,
) {
  return db.productionBatch.findMany({
    where: {
      businessId,
      status: "COMPLETED",
      completedAt: getProductionDateFilter(
        period,
      ),
    },
    select: {
      id: true,
      productId: true,
      producedQuantity: true,
      totalCost: true,
      costPerUnit: true,
      completedAt: true,
    },
    orderBy: {
      completedAt: "asc",
    },
  });
}

function buildProductSalesProfitability(
  products: Array<{
    id: string;
    name: string;
    sku: string;
  }>,
  orders: Awaited<ReturnType<typeof getPaidOrders>>,
): ProductSalesProfitability[] {
  const productMap = new Map<
    string,
    {
      revenue: number;
      unitsSold: number;
      orderIds: Set<string>;
      historicalCost: number;
      hasMissingHistoricalCost: boolean;
    }
  >();

  for (const product of products) {
    productMap.set(product.id, {
      revenue: 0,
      unitsSold: 0,
      orderIds: new Set<string>(),
      historicalCost: 0,
      hasMissingHistoricalCost: false,
    });
  }

  for (const order of orders) {
    for (const item of order.items) {
      const current = productMap.get(
        item.productId,
      );

      if (!current) {
        continue;
      }

      current.revenue +=
        Number(item.unitPrice) * item.quantity;

      current.unitsSold += item.quantity;
      current.orderIds.add(order.id);

      if (item.costPriceSnapshot === null) {
        current.hasMissingHistoricalCost = true;
      } else {
        current.historicalCost +=
          Number(item.costPriceSnapshot) *
          item.quantity;
      }
    }
  }

  return products.map((product) => {
    const current = productMap.get(product.id);

    if (!current) {
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        revenue: 0,
        unitsSold: 0,
        orderCount: 0,
        historicalCost: null,
        contributionProfit: null,
        contributionMarginPct: null,
      };
    }

    const historicalCost =
      current.hasMissingHistoricalCost
        ? null
        : current.historicalCost;

    const contributionProfit =
      historicalCost === null
        ? null
        : current.revenue - historicalCost;

    const contributionMarginPct =
      contributionProfit === null ||
      current.revenue === 0
        ? null
        : (contributionProfit /
            current.revenue) *
          100;

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      revenue: current.revenue,
      unitsSold: current.unitsSold,
      orderCount: current.orderIds.size,
      historicalCost,
      contributionProfit,
      contributionMarginPct,
    };
  });
}

function buildProductProductionIntelligence(
  products: Array<{
    id: string;
    name: string;
    sku: string;
  }>,
  batches: Awaited<
    ReturnType<typeof getCompletedProductionBatches>
  >,
  previousBatches: Awaited<
    ReturnType<typeof getCompletedProductionBatches>
  >,
): ProductProductionIntelligence[] {
  const batchMap = new Map<
    string,
    typeof batches
  >();

  const previousBatchMap = new Map<
    string,
    typeof previousBatches
  >();

  for (const batch of previousBatches) {
    const current =
      previousBatchMap.get(batch.productId) ?? [];

    current.push(batch);
    previousBatchMap.set(batch.productId, current);
  }

  for (const batch of batches) {
    const current =
      batchMap.get(batch.productId) ?? [];

    current.push(batch);
    batchMap.set(batch.productId, current);
  }

  return products.map((product) => {
    const productBatches =
      batchMap.get(product.id) ?? [];

    let unitsProduced = 0;
    let productionCost = 0;
    let hasMissingProductionCost = false;

    let latestProductionCostPerUnit:
      | number
      | null = null;

    let latestCompletedAt:
      | Date
      | null = null;

    for (const batch of productBatches) {
      const producedQuantity =
        batch.producedQuantity ?? 0;

      unitsProduced += producedQuantity;

      const totalCost = decimalToNumber(
        batch.totalCost,
      );

      if (totalCost === null) {
        hasMissingProductionCost = true;
      } else {
        productionCost += totalCost;
      }

      const costPerUnit = decimalToNumber(
        batch.costPerUnit,
      );

      if (
        costPerUnit !== null &&
        batch.completedAt &&
        (!latestCompletedAt ||
          batch.completedAt >
            latestCompletedAt)
      ) {
        latestCompletedAt =
          batch.completedAt;

        latestProductionCostPerUnit =
          costPerUnit;
      }
    }

    const normalizedProductionCost =
      productBatches.length === 0 ||
      hasMissingProductionCost
        ? null
        : productionCost;

    const averageProductionCostPerUnit =
      normalizedProductionCost !== null &&
      unitsProduced > 0
        ? normalizedProductionCost /
          unitsProduced
        : null;

    const previousProductBatches =
      previousBatchMap.get(product.id) ?? [];

    let previousCost = 0;
    let previousUnits = 0;
    let previousHasMissingCost = false;

    for (const batch of previousProductBatches) {
      previousUnits += batch.producedQuantity ?? 0;

      const totalCost = decimalToNumber(batch.totalCost);
      if (totalCost === null) {
        previousHasMissingCost = true;
      } else {
        previousCost += totalCost;
      }
    }

    const previousAverageProductionCostPerUnit =
      previousProductBatches.length > 0 &&
      !previousHasMissingCost &&
      previousUnits > 0
        ? previousCost / previousUnits
        : null;

    const productionCostChangeAmount =
      averageProductionCostPerUnit !== null &&
      previousAverageProductionCostPerUnit !== null
        ? averageProductionCostPerUnit -
          previousAverageProductionCostPerUnit
        : null;

    const productionCostChangePercentage =
      productionCostChangeAmount !== null &&
      previousAverageProductionCostPerUnit !== null &&
      previousAverageProductionCostPerUnit !== 0
        ? (productionCostChangeAmount /
            previousAverageProductionCostPerUnit) *
          100
        : null;

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      batchesCompleted:
        productBatches.length,
      unitsProduced,
      productionCost:
        normalizedProductionCost,
      averageProductionCostPerUnit,
      latestProductionCostPerUnit,
      productionCostChangeAmount,
      productionCostChangePercentage,
    };
  });
}

async function buildProductCurrentEconomics(
  businessId: string,
  products: Array<{
    id: string;
    name: string;
    sku: string;
  }>,
): Promise<ProductCurrentEconomics[]> {
  return Promise.all(
    products.map(async (product) => {
      const economics =
        await getProductEconomics(
          businessId,
          product.id,
        );

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        sellingPrice:
          economics.sellingPrice,
        rawMaterialCostPerUnit:
          economics.rawMaterialCostPerUnit,
        packagingCostPerUnit:
          economics.packagingCostPerUnit,
        preShippingUnitCost:
          economics.preShippingUnitCost,
        contributionProfitPerUnit:
          economics.contributionProfitPerUnit,
        contributionMarginPct:
          economics.contributionMarginPct,
        isComplete:
          economics.isComplete,
        incompleteReason:
          economics.incompleteReason,
      };
    }),
  );
}

export async function getProductIntelligence(
  businessId: string,
  options: AnalyticsOptions = {},
): Promise<ProductIntelligence> {
  const period = getPeriod(options);

  const products =
    await getAnalyticsProducts(
      businessId,
    );

  const previousPeriod = getPreviousPeriod(period);

  const [
    orders,
    productionBatches,
    previousProductionBatches,
    currentEconomics,
  ] = await Promise.all([
    getPaidOrders(
      businessId,
      period,
    ),

    getCompletedProductionBatches(
      businessId,
      period,
    ),

    previousPeriod
      ? getCompletedProductionBatches(
          businessId,
          previousPeriod,
        )
      : Promise.resolve([]),

    buildProductCurrentEconomics(
      businessId,
      products,
    ),
  ]);

  const sales =
    buildProductSalesProfitability(
      products,
      orders,
    );

  const production =
    buildProductProductionIntelligence(
      products,
      productionBatches,
      previousProductionBatches,
    );

  const currentEconomicsMap =
    new Map(
      currentEconomics.map((item) => [
        item.productId,
        item,
      ]),
    );

  const salesMap = new Map(
    sales.map((item) => [
      item.productId,
      item,
    ]),
  );

  const productionMap = new Map(
    production.map((item) => [
      item.productId,
      item,
    ]),
  );

  const rows: ProductIntelligenceRow[] =
    products.map((product) => ({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      currentEconomics:
        currentEconomicsMap.get(
          product.id,
        )!,
      sales:
        salesMap.get(product.id)!,
      production:
        productionMap.get(
          product.id,
        )!,
    }));

  return {
    period,
    products: rows,
  };
}

/* ============================================================
   PRODUCTION INTELLIGENCE
   ============================================================ */

async function getProductionBatchesForPeriod(
  businessId: string,
  period: AnalyticsDateRange,
) {
  return db.productionBatch.findMany({
    where: {
      businessId,
      createdAt: getProductionDateFilter(
        period,
      ),
    },
    select: {
      id: true,
      productId: true,
      status: true,
      producedQuantity: true,
      totalCost: true,
      costPerUnit: true,
      completedAt: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

function buildProductionSummary(
  batches: Awaited<
    ReturnType<typeof getProductionBatchesForPeriod>
  >,
): ProductionSummary {
  let completedBatches = 0;
  let cancelledBatches = 0;
  let unitsProduced = 0;

  let productionCost = 0;
  let hasMissingProductionCost = false;

  for (const batch of batches) {
    if (batch.status === "COMPLETED") {
      completedBatches += 1;

      unitsProduced +=
        batch.producedQuantity ?? 0;

      const totalCost = decimalToNumber(
        batch.totalCost,
      );

      if (totalCost === null) {
        hasMissingProductionCost = true;
      } else {
        productionCost += totalCost;
      }
    }

    if (batch.status === "CANCELLED") {
      cancelledBatches += 1;
    }
  }

  const normalizedProductionCost =
    completedBatches === 0 ||
    hasMissingProductionCost
      ? completedBatches === 0
        ? null
        : null
      : productionCost;

  const averageProductionCostPerUnit =
    normalizedProductionCost !== null &&
    unitsProduced > 0
      ? normalizedProductionCost /
        unitsProduced
      : null;

  return {
    totalBatches: batches.length,
    completedBatches,
    cancelledBatches,
    unitsProduced,
    productionCost:
      normalizedProductionCost,
    averageProductionCostPerUnit,
  };
}

function buildProductionByProduct(
  batches: Awaited<
    ReturnType<typeof getProductionBatchesForPeriod>
  >,
): ProductionByProduct[] {
  const productMap = new Map<
    string,
    {
      productName: string;
      sku: string;
      totalBatches: number;
      completedBatches: number;
      cancelledBatches: number;
      unitsProduced: number;
      productionCost: number;
      hasMissingProductionCost: boolean;
    }
  >();

  for (const batch of batches) {
    const existing =
      productMap.get(batch.productId) ?? {
        productName: batch.product.name,
        sku: batch.product.sku,
        totalBatches: 0,
        completedBatches: 0,
        cancelledBatches: 0,
        unitsProduced: 0,
        productionCost: 0,
        hasMissingProductionCost: false,
      };

    existing.totalBatches += 1;

    if (batch.status === "COMPLETED") {
      existing.completedBatches += 1;

      existing.unitsProduced +=
        batch.producedQuantity ?? 0;

      const totalCost = decimalToNumber(
        batch.totalCost,
      );

      if (totalCost === null) {
        existing.hasMissingProductionCost =
          true;
      } else {
        existing.productionCost += totalCost;
      }
    }

    if (batch.status === "CANCELLED") {
      existing.cancelledBatches += 1;
    }

    productMap.set(
      batch.productId,
      existing,
    );
  }

  return Array.from(productMap.entries())
    .map(([productId, value]) => {
      const productionCost =
        value.completedBatches === 0 ||
        value.hasMissingProductionCost
          ? null
          : value.productionCost;

      const averageProductionCostPerUnit =
        productionCost !== null &&
        value.unitsProduced > 0
          ? productionCost /
            value.unitsProduced
          : null;

      return {
        productId,
        productName: value.productName,
        sku: value.sku,
        totalBatches: value.totalBatches,
        completedBatches:
          value.completedBatches,
        cancelledBatches:
          value.cancelledBatches,
        unitsProduced:
          value.unitsProduced,
        productionCost,
        averageProductionCostPerUnit,
      };
    })
    .sort(
      (a, b) =>
        b.unitsProduced -
        a.unitsProduced,
    );
}

function buildProductionByMonth(
  batches: Awaited<
    ReturnType<typeof getProductionBatchesForPeriod>
  >,
): ProductionByMonth[] {
  const monthMap = new Map<
    string,
    {
      totalBatches: number;
      completedBatches: number;
      cancelledBatches: number;
      unitsProduced: number;
      productionCost: number;
      hasMissingProductionCost: boolean;
    }
  >();

  for (const batch of batches) {
    const monthDate =
      batch.status === "COMPLETED" &&
      batch.completedAt
        ? batch.completedAt
        : batch.createdAt;

    const month =
      monthDate.toLocaleDateString(
        "en-US",
        {
          month: "short",
          year: "numeric",
        },
      );

    const existing =
      monthMap.get(month) ?? {
        totalBatches: 0,
        completedBatches: 0,
        cancelledBatches: 0,
        unitsProduced: 0,
        productionCost: 0,
        hasMissingProductionCost: false,
      };

    existing.totalBatches += 1;

    if (batch.status === "COMPLETED") {
      existing.completedBatches += 1;

      existing.unitsProduced +=
        batch.producedQuantity ?? 0;

      const totalCost = decimalToNumber(
        batch.totalCost,
      );

      if (totalCost === null) {
        existing.hasMissingProductionCost =
          true;
      } else {
        existing.productionCost += totalCost;
      }
    }

    if (batch.status === "CANCELLED") {
      existing.cancelledBatches += 1;
    }

    monthMap.set(month, existing);
  }

  return Array.from(monthMap.entries()).map(
    ([month, value]) => ({
      month,
      totalBatches: value.totalBatches,
      completedBatches:
        value.completedBatches,
      cancelledBatches:
        value.cancelledBatches,
      unitsProduced:
        value.unitsProduced,
      productionCost:
        value.completedBatches === 0 ||
        value.hasMissingProductionCost
          ? null
          : value.productionCost,
    }),
  );
}

export async function getProductionIntelligence(
  businessId: string,
  options: AnalyticsOptions = {},
): Promise<ProductionIntelligence> {
  const period = getPeriod(options);

  const batches =
    await getProductionBatchesForPeriod(
      businessId,
      period,
    );

  return {
    period,
    summary:
      buildProductionSummary(batches),
    byProduct:
      buildProductionByProduct(batches),
    byMonth:
      buildProductionByMonth(batches),
  };
}

/* ============================================================
   INVENTORY INTELLIGENCE
   ============================================================ */

async function getInventoryProducts(
  businessId: string,
) {
  return db.product.findMany({
    where: {
      businessId,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      currentStock: true,
      promotionalStock: true,
      reorderLevel: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

async function getInventoryRawMaterials(
  businessId: string,
) {
  return db.rawMaterial.findMany({
    where: {
      businessId,
    },
    select: {
      id: true,
      name: true,
      baseUnit: true,
      currentQuantity: true,
      currentValue: true,
      weightedAverageCost: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

async function getInventoryPackagingMaterials(
  businessId: string,
) {
  return db.packagingMaterial.findMany({
    where: {
      businessId,
    },
    select: {
      id: true,
      name: true,
      baseUnit: true,
      currentQuantity: true,
      currentValue: true,
      weightedAverageCost: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

async function getCurrentProductEconomicsForInventory(
  businessId: string,
  products: Array<{
    id: string;
    name: string;
    sku: string;
  }>,
): Promise<
  Map<
    string,
    {
      preShippingUnitCost: number | null;
      isComplete: boolean;
      incompleteReason: string | null;
    }
  >
> {
  const economics = await Promise.all(
    products.map(async (product) => {
      const result = await getProductEconomics(
        businessId,
        product.id,
      );

      return {
        productId: product.id,
        preShippingUnitCost:
          result.preShippingUnitCost,
        isComplete: result.isComplete,
        incompleteReason:
          result.incompleteReason,
      };
    }),
  );

  return new Map(
    economics.map((item) => [
      item.productId,
      {
        preShippingUnitCost:
          item.preShippingUnitCost,
        isComplete: item.isComplete,
        incompleteReason:
          item.incompleteReason,
      },
    ]),
  );
}

function getFinishedProductStockStatus(
  availableStock: number,
  reorderLevel: number,
): InventoryStockStatus {
  if (availableStock <= 0) {
    return "OUT_OF_STOCK";
  }

  if (availableStock <= reorderLevel) {
    return "LOW_STOCK";
  }

  return "HEALTHY";
}

function buildInventoryFinishedProducts(
  products: Awaited<
    ReturnType<typeof getInventoryProducts>
  >,
  currentEconomics: Map<
    string,
    {
      preShippingUnitCost: number | null;
      isComplete: boolean;
      incompleteReason: string | null;
    }
  >,
  unitsSoldByProduct: Map<string, number>,
  coverageDays: number | null,
): InventoryFinishedProduct[] {
  return products.map((product) => {
    const physicalStock =
      Math.max(0, product.currentStock);

    const promotionalStock = Math.max(
      0,
      Math.min(
        product.promotionalStock,
        physicalStock,
      ),
    );

    const availableStock = Math.max(
      0,
      physicalStock - promotionalStock,
    );

    const stockStatus =
      getFinishedProductStockStatus(
        availableStock,
        product.reorderLevel,
      );

    const economics =
      currentEconomics.get(product.id);

    const valuationUnitCost =
      economics?.preShippingUnitCost ?? null;

    const valuation =
      valuationUnitCost !== null
        ? physicalStock *
          valuationUnitCost
        : null;

    const valuationComplete =
      valuationUnitCost !== null &&
      economics?.isComplete === true;

    const unitsSold = unitsSoldByProduct.get(product.id) ?? 0;
    const stockCoverageDays =
      coverageDays !== null &&
      unitsSold > 0
        ? availableStock / (unitsSold / coverageDays)
        : null;

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      physicalStock,
      promotionalStock,
      availableStock,
      reorderLevel:
        product.reorderLevel,
      stockStatus,
      valuationUnitCost,
      valuation,
      valuationComplete,
      valuationIncompleteReason:
        valuationComplete
          ? null
          : economics?.incompleteReason ??
            "Current product economics are incomplete.",
      stockCoverageDays,
    };
  });
}

function buildInventoryRawMaterials(
  materials: Awaited<
    ReturnType<typeof getInventoryRawMaterials>
  >,
): InventoryRawMaterial[] {
  return materials.map((material) => ({
    rawMaterialId: material.id,
    name: material.name,
    baseUnit: material.baseUnit,
    currentQuantity:
      decimalToNumber(
        material.currentQuantity,
      ) ?? 0,
    currentValue:
      decimalToNumber(
        material.currentValue,
      ) ?? 0,
    weightedAverageCost:
      decimalToNumber(
        material.weightedAverageCost,
      ) ?? 0,
  }));
}

function buildInventoryPackagingMaterials(
  materials: Awaited<
    ReturnType<typeof getInventoryPackagingMaterials>
  >,
): InventoryPackagingMaterial[] {
  return materials.map((material) => ({
    packagingMaterialId: material.id,
    name: material.name,
    baseUnit: material.baseUnit,
    currentQuantity:
      decimalToNumber(
        material.currentQuantity,
      ) ?? 0,
    currentValue:
      decimalToNumber(
        material.currentValue,
      ) ?? 0,
    weightedAverageCost:
      decimalToNumber(
        material.weightedAverageCost,
      ) ?? 0,
  }));
}

function buildInventoryConcentration(
  finishedProducts: InventoryFinishedProduct[],
  rawMaterials: InventoryRawMaterial[],
  packagingMaterials: InventoryPackagingMaterial[],
): InventoryConcentration {
  const items = [
    ...finishedProducts.map((item) => ({
      name: item.productName,
      value: item.valuation,
    })),
    ...rawMaterials.map((item) => ({
      name: item.name,
      value: item.currentValue,
    })),
    ...packagingMaterials.map((item) => ({
      name: item.name,
      value: item.currentValue,
    })),
  ].filter(
    (item): item is { name: string; value: number } =>
      item.value !== null && Number.isFinite(item.value) && item.value > 0,
  );

  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0 || items.length === 0) {
    return {
      topItemName: null,
      topItemValue: null,
      topItemSharePct: null,
      topThreeItemSharePct: null,
    };
  }

  items.sort((a, b) => b.value - a.value);

  return {
    topItemName: items[0].name,
    topItemValue: items[0].value,
    topItemSharePct: (items[0].value / total) * 100,
    topThreeItemSharePct:
      (items.slice(0, 3).reduce((sum, item) => sum + item.value, 0) / total) * 100,
  };
}

function buildInventoryLowStockProducts(
  products: InventoryFinishedProduct[],
): InventoryLowStockProduct[] {
  return products
    .filter(
      (product) =>
        product.stockStatus !== "HEALTHY",
    )
    .map((product) => ({
      productId: product.productId,
      productName: product.productName,
      sku: product.sku,
      availableStock:
        product.availableStock,
      reorderLevel:
        product.reorderLevel,
      stockStatus:
        product.stockStatus,
    }))
    .sort((a, b) => {
      if (
        a.stockStatus ===
          "OUT_OF_STOCK" &&
        b.stockStatus !==
          "OUT_OF_STOCK"
      ) {
        return -1;
      }

      if (
        a.stockStatus !==
          "OUT_OF_STOCK" &&
        b.stockStatus ===
          "OUT_OF_STOCK"
      ) {
        return 1;
      }

      return (
        a.availableStock -
        b.availableStock
      );
    });
}

function buildInventorySummary(
  finishedProducts: InventoryFinishedProduct[],
  rawMaterials: InventoryRawMaterial[],
  packagingMaterials: InventoryPackagingMaterial[],
): InventorySummary {
  const finishedProductValue =
    finishedProducts.every(
      (product) =>
        product.valuationComplete,
    )
      ? finishedProducts.reduce(
          (sum, product) =>
            sum +
            (product.valuation ?? 0),
          0,
        )
      : null;

  const rawMaterialValue =
    rawMaterials.reduce(
      (sum, material) =>
        sum + material.currentValue,
      0,
    );

  const packagingMaterialValue =
    packagingMaterials.reduce(
      (sum, material) =>
        sum + material.currentValue,
      0,
    );

  const valuationComplete =
    finishedProductValue !== null;

  const totalInventoryValue =
    valuationComplete
      ? finishedProductValue +
        rawMaterialValue +
        packagingMaterialValue
      : null;

  const lowStockProductCount =
    finishedProducts.filter(
      (product) =>
        product.stockStatus ===
        "LOW_STOCK",
    ).length;

  const outOfStockProductCount =
    finishedProducts.filter(
      (product) =>
        product.stockStatus ===
        "OUT_OF_STOCK",
    ).length;

  return {
    finishedProductValue,
    rawMaterialValue,
    packagingMaterialValue,
    totalInventoryValue,
    finishedProductCount:
      finishedProducts.length,
    rawMaterialCount:
      rawMaterials.length,
    packagingMaterialCount:
      packagingMaterials.length,
    lowStockProductCount,
    outOfStockProductCount,
    valuationComplete,
    valuationIncompleteReason:
      valuationComplete
        ? null
        : "Finished-product inventory valuation is incomplete because one or more products do not have complete current product economics.",
    concentration: buildInventoryConcentration(
      finishedProducts,
      rawMaterials,
      packagingMaterials,
    ),
  };
}

export async function getInventoryIntelligence(
  businessId: string,
  options: AnalyticsOptions = {},
): Promise<InventoryIntelligence> {
  const period = getPeriod(options);

  const [
    products,
    rawMaterials,
    packagingMaterials,
    movement,
    orders,
  ] = await Promise.all([
    getInventoryProducts(businessId),
    getInventoryRawMaterials(businessId),
    getInventoryPackagingMaterials(
      businessId,
    ),
    getInventoryMovementIntelligence(
      businessId,
      period,
    ),
    getPaidOrders(
      businessId,
      period,
    ),
  ]);

  const currentEconomics =
    await getCurrentProductEconomicsForInventory(
      businessId,
      products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
      })),
    );

  const unitsSoldByProduct = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.items) {
      unitsSoldByProduct.set(
        item.productId,
        (unitsSoldByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }
  }

  const coverageDays =
    period.from !== null
      ? Math.max(
          1,
          (period.to.getTime() - period.from.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  const finishedProducts =
    buildInventoryFinishedProducts(
      products,
      currentEconomics,
      unitsSoldByProduct,
      coverageDays,
    );

  const serializedRawMaterials =
    buildInventoryRawMaterials(
      rawMaterials,
    );

  const serializedPackagingMaterials =
    buildInventoryPackagingMaterials(
      packagingMaterials,
    );

  const lowStockProducts =
    buildInventoryLowStockProducts(
      finishedProducts,
    );

  const summary =
    buildInventorySummary(
      finishedProducts,
      serializedRawMaterials,
      serializedPackagingMaterials,
    );

  return {
    summary,
    finishedProducts,
    rawMaterials:
      serializedRawMaterials,
    packagingMaterials:
      serializedPackagingMaterials,
    lowStockProducts,
    movement,
  };
}
/* ============================================================
   EXPENSE INTELLIGENCE
   ============================================================ */

async function getExpensesForPeriod(
  businessId: string,
  period: AnalyticsDateRange,
) {
  return db.expense.findMany({
    where: {
      businessId,
      expenseDate: getExpenseDateFilter(period),
    },
    select: {
      id: true,
      expenseDate: true,
      category: true,
      amount: true,
      isRecurring: true,
    },
    orderBy: [
      {
        expenseDate: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });
}

function getExpenseDateFilter(
  period: AnalyticsDateRange,
) {
  return {
    ...(period.from
      ? {
          gte: period.from,
        }
      : {}),
    lte: period.to,
  };
}

async function getExpenseTotalForPeriod(
  businessId: string,
  period: AnalyticsDateRange,
): Promise<number> {
  const aggregate =
    await db.expense.aggregate({
      where: {
        businessId,
        expenseDate:
          getExpenseDateFilter(period),
      },
      _sum: {
        amount: true,
      },
    });

  return decimalToNumber(
    aggregate._sum.amount,
  ) ?? 0;
}

function buildExpenseSummary(
  expenses: Awaited<
    ReturnType<typeof getExpensesForPeriod>
  >,
): ExpenseSummary {
  let totalExpenses = 0;
  let recurringExpenseTotal = 0;
  let recurringExpenseCount = 0;

  for (const expense of expenses) {
    const amount =
      decimalToNumber(expense.amount) ?? 0;

    totalExpenses += amount;

    if (expense.isRecurring) {
      recurringExpenseTotal += amount;
      recurringExpenseCount += 1;
    }
  }

  return {
    totalExpenses,
    expenseCount: expenses.length,
    averageExpense:
      expenses.length > 0
        ? totalExpenses / expenses.length
        : null,
    recurringExpenseTotal,
    recurringExpenseCount,
  };
}

function buildExpenseByCategory(
  expenses: Awaited<
    ReturnType<typeof getExpensesForPeriod>
  >,
  totalExpenses: number,
): ExpenseByCategory[] {
  const categoryMap = new Map<
    ExpenseCategory,
    {
      totalAmount: number;
      expenseCount: number;
    }
  >();

  for (const expense of expenses) {
    const current =
      categoryMap.get(expense.category) ?? {
        totalAmount: 0,
        expenseCount: 0,
      };

    current.totalAmount +=
      decimalToNumber(expense.amount) ?? 0;

    current.expenseCount += 1;

    categoryMap.set(
      expense.category,
      current,
    );
  }

  return Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      totalAmount: value.totalAmount,
      expenseCount: value.expenseCount,
      percentageOfTotal:
        totalExpenses > 0
          ? (value.totalAmount /
              totalExpenses) *
            100
          : null,
    }))
    .sort(
      (a, b) =>
        b.totalAmount - a.totalAmount,
    );
}

function buildExpenseByMonth(
  expenses: Awaited<
    ReturnType<typeof getExpensesForPeriod>
  >,
): ExpenseByMonth[] {
  const monthMap = new Map<
    string,
    {
      totalAmount: number;
      expenseCount: number;
    }
  >();

  for (const expense of expenses) {
    const month =
      expense.expenseDate.toLocaleDateString(
        "en-US",
        {
          month: "short",
          year: "numeric",
        },
      );

    const current =
      monthMap.get(month) ?? {
        totalAmount: 0,
        expenseCount: 0,
      };

    current.totalAmount +=
      decimalToNumber(expense.amount) ?? 0;

    current.expenseCount += 1;

    monthMap.set(month, current);
  }

  return Array.from(monthMap.entries()).map(
    ([month, value]) => ({
      month,
      totalAmount: value.totalAmount,
      expenseCount: value.expenseCount,
    }),
  );
}

function getPreviousExpensePeriod(
  period: AnalyticsDateRange,
): AnalyticsDateRange | null {
  if (!period.from) {
    return null;
  }

  const duration =
    period.to.getTime() -
    period.from.getTime();

  return {
    from: new Date(
      period.from.getTime() -
        duration -
        1,
    ),
    to: new Date(
      period.from.getTime() - 1,
    ),
  };
}

function buildExpenseTrend(
  currentPeriodExpenses: number,
  previousPeriodExpenses: number,
): ExpenseTrend {
  const changeAmount =
    currentPeriodExpenses -
    previousPeriodExpenses;

  return {
    currentPeriodExpenses,
    previousPeriodExpenses,
    changeAmount,
    changePercentage:
      previousPeriodExpenses === 0
        ? null
        : (changeAmount /
            previousPeriodExpenses) *
          100,
  };
}

function buildExpenseConcentration(
  byCategory: ExpenseByCategory[],
): ExpenseConcentration {
  const topCategorySharePct =
    byCategory[0]?.percentageOfTotal ??
    null;

  const topThreeAmount =
    byCategory
      .slice(0, 3)
      .reduce(
        (sum, category) =>
          sum + category.totalAmount,
        0,
      );

  const totalExpenses =
    byCategory.reduce(
      (sum, category) =>
        sum + category.totalAmount,
      0,
    );

  return {
    topCategorySharePct,
    topThreeCategorySharePct:
      totalExpenses > 0
        ? (topThreeAmount /
            totalExpenses) *
          100
        : null,
  };
}

export async function getExpenseIntelligence(
  businessId: string,
  options: AnalyticsOptions = {},
): Promise<ExpenseIntelligence> {
  const period = getPeriod(options);

  const expenses =
    await getExpensesForPeriod(
      businessId,
      period,
    );

  const summary =
    buildExpenseSummary(expenses);

  const byCategory =
    buildExpenseByCategory(
      expenses,
      summary.totalExpenses,
    );

  const previousPeriod =
    getPreviousExpensePeriod(period);

  const previousPeriodExpenses =
    previousPeriod
      ? await getExpenseTotalForPeriod(
          businessId,
          previousPeriod,
        )
      : 0;

  const trend = buildExpenseTrend(
    summary.totalExpenses,
    previousPeriodExpenses,
  );

  return {
    period,
    summary,
    byCategory,
    majorCategories:
      byCategory.slice(0, 5),
    byMonth:
      buildExpenseByMonth(expenses),
    trend,
    concentration:
      buildExpenseConcentration(
        byCategory,
      ),
  };
}

/* ============================================================
   CASH FLOW INTELLIGENCE
   ============================================================ */

function getCashFlowCategoryShare(
  amount: number,
  totalCashMovement: number,
): number | null {
  if (totalCashMovement <= 0) {
    return null;
  }

  return (amount / totalCashMovement) * 100;
}

function getCashFlowCategoryAmount(
  transactions: Array<{
    type: CashTransactionType;
    category: CashTransactionCategory;
    amount: Prisma.Decimal;
  }>,
  type: CashTransactionType,
  category: CashTransactionCategory,
): number {
  return transactions.reduce((total, transaction) => {
    if (
      transaction.type === type &&
      transaction.category === category
    ) {
      return total + (decimalToNumber(transaction.amount) ?? 0);
    }

    return total;
  }, 0);
}

async function getCashFlowTransactionsForPeriod(
  businessId: string,
  period: AnalyticsDateRange,
) {
  return db.cashTransaction.findMany({
    where: {
      businessId,
      transactionDate: {
        ...(period.from
          ? {
              gte: period.from,
            }
          : {}),
        lte: period.to,
      },
    },
    select: {
      transactionDate: true,
      type: true,
      category: true,
      amount: true,
    },
    orderBy: {
      transactionDate: "asc",
    },
  });
}

function getCashFlowMonthKey(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function buildCashFlowByMonth(
  transactions: Awaited<
    ReturnType<typeof getCashFlowTransactionsForPeriod>
  >,
): CashFlowByMonth[] {
  const monthMap = new Map<
    string,
    {
      inflows: number;
      outflows: number;
    }
  >();

  for (const transaction of transactions) {
    const month = getCashFlowMonthKey(
      transaction.transactionDate,
    );

    const current = monthMap.get(month) ?? {
      inflows: 0,
      outflows: 0,
    };

    const amount = decimalToNumber(transaction.amount) ?? 0;

    if (transaction.type === "INFLOW") {
      current.inflows += amount;
    } else {
      current.outflows += amount;
    }

    monthMap.set(month, current);
  }

  return Array.from(monthMap.entries()).map(
    ([month, value]) => ({
      month,
      inflows: value.inflows,
      outflows: value.outflows,
      netCashFlow:
        value.inflows - value.outflows,
    }),
  );
}

function buildCashFlowByCategory(
  transactions: Awaited<
    ReturnType<typeof getCashFlowTransactionsForPeriod>
  >,
  totalCashMovement: number,
): CashFlowByCategory[] {
  const categoryMap = new Map<
    string,
    {
      category: CashTransactionCategory;
      type: CashTransactionType;
      amount: number;
      count: number;
    }
  >();

  for (const transaction of transactions) {
    const key = `${transaction.type}:${transaction.category}`;
    const current = categoryMap.get(key);
    const amount = decimalToNumber(transaction.amount) ?? 0;

    if (current) {
      current.amount += amount;
      current.count += 1;
      continue;
    }

    categoryMap.set(key, {
      category: transaction.category,
      type: transaction.type,
      amount,
      count: 1,
    });
  }

  return Array.from(categoryMap.values())
    .map((item) => ({
      category: item.category,
      type: item.type,
      amount: item.amount,
      percentageOfTotal: getCashFlowCategoryShare(
        item.amount,
        totalCashMovement,
      ),
      count: item.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

async function getCashFlowNetForPeriod(
  businessId: string,
  period: AnalyticsDateRange,
): Promise<number> {
  const aggregate = await db.cashTransaction.groupBy({
    by: ["type"],
    where: {
      businessId,
      transactionDate: {
        ...(period.from
          ? {
              gte: period.from,
            }
          : {}),
        lte: period.to,
      },
    },
    _sum: {
      amount: true,
    },
  });

  let inflows = 0;
  let outflows = 0;

  for (const row of aggregate) {
    const amount = decimalToNumber(row._sum.amount) ?? 0;

    if (row.type === "INFLOW") {
      inflows = amount;
    } else {
      outflows = amount;
    }
  }

  return inflows - outflows;
}

export async function getCashFlowIntelligence(
  businessId: string,
  options: AnalyticsOptions = {},
): Promise<CashFlowIntelligence> {
  const period = getPeriod(options);

  const transactions =
    await getCashFlowTransactionsForPeriod(
      businessId,
      period,
    );

  let totalInflows = 0;
  let totalOutflows = 0;

  for (const transaction of transactions) {
    const amount = decimalToNumber(transaction.amount) ?? 0;

    if (transaction.type === "INFLOW") {
      totalInflows += amount;
    } else {
      totalOutflows += amount;
    }
  }

  const customerCollections =
    getCashFlowCategoryAmount(
      transactions,
      "INFLOW",
      "CUSTOMER_PAYMENT",
    );

  const otherIncome = getCashFlowCategoryAmount(
    transactions,
    "INFLOW",
    "OTHER_INCOME",
  );

  const rawMaterialCashOutflow =
    getCashFlowCategoryAmount(
      transactions,
      "OUTFLOW",
      "RAW_MATERIAL_PURCHASE",
    );

  const packagingCashOutflow =
    getCashFlowCategoryAmount(
      transactions,
      "OUTFLOW",
      "PACKAGING_MATERIAL_PURCHASE",
    );

  const inventoryCashOutflow =
    rawMaterialCashOutflow + packagingCashOutflow;

  const operatingCashOutflow =
    getCashFlowCategoryAmount(
      transactions,
      "OUTFLOW",
      "OPERATING_EXPENSE",
    );

  const shippingPayments =
    getCashFlowCategoryAmount(
      transactions,
      "OUTFLOW",
      "SHIPPING",
    );

  const paymentProcessingFees =
    getCashFlowCategoryAmount(
      transactions,
      "OUTFLOW",
      "PAYMENT_PROCESSING_FEE",
    );

  const refunds = getCashFlowCategoryAmount(
    transactions,
    "OUTFLOW",
    "CUSTOMER_REFUND",
  );

  const otherCashOutflow =
    getCashFlowCategoryAmount(
      transactions,
      "OUTFLOW",
      "OTHER",
    );

  const previousPeriod = getPreviousPeriod(period);

  const previousPeriodNetCashFlow =
    previousPeriod
      ? await getCashFlowNetForPeriod(
          businessId,
          previousPeriod,
        )
      : 0;

  const netCashFlow = totalInflows - totalOutflows;
  const changeAmount =
    netCashFlow - previousPeriodNetCashFlow;

  const totalCashMovement =
    totalInflows + totalOutflows;

  return {
    period,
    summary: {
      totalInflows,
      totalOutflows,
      netCashFlow,
      customerCollections,
      otherIncome,
      inventoryCashOutflow,
      operatingCashOutflow,
      shippingPayments,
      paymentProcessingFees,
      refunds,
      otherCashOutflow,
    },
    byMonth: buildCashFlowByMonth(transactions),
    byCategory: buildCashFlowByCategory(
      transactions,
      totalCashMovement,
    ),
    trend: {
      currentPeriodNetCashFlow: netCashFlow,
      previousPeriodNetCashFlow,
      changeAmount,
      changePercentage:
        previousPeriodNetCashFlow === 0
          ? null
          : (changeAmount /
              Math.abs(previousPeriodNetCashFlow)) *
            100,
    },
  };
}

