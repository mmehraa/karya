import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export interface InventoryMovementDateRange {
  from: Date | null;
  to: Date;
}

export interface InventoryMovementSummary {
  rawMaterialPurchases: number;
  rawMaterialConsumption: number;
  rawMaterialAdjustmentsIn: number;
  rawMaterialAdjustmentsOut: number;

  packagingPurchases: number;
  packagingConsumption: number;
  packagingAdjustmentsIn: number;
  packagingAdjustmentsOut: number;

  finishedProductProduction: number;
  finishedProductSales: number;
  finishedProductReturns: number;
  finishedProductWriteOffs: number;
  finishedProductAdjustmentsIn: number;
  finishedProductAdjustmentsOut: number;
  finishedProductPromotionalDispatches: number;
}

export interface InventoryMovementByMonth {
  month: string;

  rawMaterialPurchases: number;
  rawMaterialConsumption: number;

  packagingPurchases: number;
  packagingConsumption: number;

  finishedProductProduction: number;
  finishedProductSales: number;
  finishedProductReturns: number;
  finishedProductWriteOffs: number;
  finishedProductPromotionalDispatches: number;
}

export interface InventoryMovementIntelligence {
  period: InventoryMovementDateRange;
  summary: InventoryMovementSummary;
  byMonth: InventoryMovementByMonth[];
}

function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateFilter(
  period: InventoryMovementDateRange,
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

function getPeriod(
  options: {
    from?: Date | null;
    to?: Date;
  },
): InventoryMovementDateRange {
  return {
    from: options.from ?? null,
    to: options.to ?? new Date(),
  };
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(year, month - 1, 1),
  ).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface MovementAccumulator {
  rawMaterialPurchases: number;
  rawMaterialConsumption: number;
  rawMaterialAdjustmentsIn: number;
  rawMaterialAdjustmentsOut: number;

  packagingPurchases: number;
  packagingConsumption: number;
  packagingAdjustmentsIn: number;
  packagingAdjustmentsOut: number;

  finishedProductProduction: number;
  finishedProductSales: number;
  finishedProductReturns: number;
  finishedProductWriteOffs: number;
  finishedProductAdjustmentsIn: number;
  finishedProductAdjustmentsOut: number;
  finishedProductPromotionalDispatches: number;
}

function emptyAccumulator(): MovementAccumulator {
  return {
    rawMaterialPurchases: 0,
    rawMaterialConsumption: 0,
    rawMaterialAdjustmentsIn: 0,
    rawMaterialAdjustmentsOut: 0,

    packagingPurchases: 0,
    packagingConsumption: 0,
    packagingAdjustmentsIn: 0,
    packagingAdjustmentsOut: 0,

    finishedProductProduction: 0,
    finishedProductSales: 0,
    finishedProductReturns: 0,
    finishedProductWriteOffs: 0,
    finishedProductAdjustmentsIn: 0,
    finishedProductAdjustmentsOut: 0,
    finishedProductPromotionalDispatches: 0,
  };
}

function addAccumulator(
  target: MovementAccumulator,
  source: MovementAccumulator,
) {
  target.rawMaterialPurchases +=
    source.rawMaterialPurchases;

  target.rawMaterialConsumption +=
    source.rawMaterialConsumption;

  target.rawMaterialAdjustmentsIn +=
    source.rawMaterialAdjustmentsIn;

  target.rawMaterialAdjustmentsOut +=
    source.rawMaterialAdjustmentsOut;

  target.packagingPurchases +=
    source.packagingPurchases;

  target.packagingConsumption +=
    source.packagingConsumption;

  target.packagingAdjustmentsIn +=
    source.packagingAdjustmentsIn;

  target.packagingAdjustmentsOut +=
    source.packagingAdjustmentsOut;

  target.finishedProductProduction +=
    source.finishedProductProduction;

  target.finishedProductSales +=
    source.finishedProductSales;

  target.finishedProductReturns +=
    source.finishedProductReturns;

  target.finishedProductWriteOffs +=
    source.finishedProductWriteOffs;

  target.finishedProductAdjustmentsIn +=
    source.finishedProductAdjustmentsIn;

  target.finishedProductAdjustmentsOut +=
    source.finishedProductAdjustmentsOut;

  target.finishedProductPromotionalDispatches +=
    source.finishedProductPromotionalDispatches;
}

async function getRawMaterialTransactions(
  businessId: string,
  period: InventoryMovementDateRange,
) {
  return db.rawMaterialInventoryTransaction.findMany(
    {
      where: {
        businessId,
        createdAt: getDateFilter(period),
      },
      select: {
        type: true,
        quantity: true,
        totalValue: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    },
  );
}

async function getPackagingMaterialTransactions(
  businessId: string,
  period: InventoryMovementDateRange,
) {
  return db.packagingMaterialInventoryTransaction.findMany(
    {
      where: {
        businessId,
        createdAt: getDateFilter(period),
      },
      select: {
        type: true,
        quantity: true,
        totalValue: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    },
  );
}

async function getFinishedProductTransactions(
  businessId: string,
  period: InventoryMovementDateRange,
) {
  return db.inventoryTransaction.findMany({
    where: {
      businessId,
      createdAt: getDateFilter(period),
    },
    select: {
      type: true,
      quantity: true,
      unitCost: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function getRawMaterialPurchases(
  businessId: string,
  period: InventoryMovementDateRange,
) {
  return db.rawMaterialPurchase.findMany({
    where: {
      businessId,
      purchaseDate: getDateFilter(period),
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
    orderBy: {
      purchaseDate: "asc",
    },
  });
}

async function getPackagingMaterialPurchases(
  businessId: string,
  period: InventoryMovementDateRange,
) {
  return db.packagingMaterialPurchase.findMany({
    where: {
      businessId,
      purchaseDate: getDateFilter(period),
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
    orderBy: {
      purchaseDate: "asc",
    },
  });
}

function classifyRawMaterialTransaction(
  type: string,
  totalValue: number,
): MovementAccumulator {
  const result = emptyAccumulator();

  switch (type) {
    case "PURCHASE":
      result.rawMaterialPurchases +=
        totalValue;
      break;

    case "CONSUMPTION":
      result.rawMaterialConsumption +=
        totalValue;
      break;

    case "ADJUSTMENT_IN":
      result.rawMaterialAdjustmentsIn +=
        totalValue;
      break;

    case "ADJUSTMENT_OUT":
      result.rawMaterialAdjustmentsOut +=
        totalValue;
      break;
  }

  return result;
}

function classifyPackagingTransaction(
  type: string,
  totalValue: number,
): MovementAccumulator {
  const result = emptyAccumulator();

  switch (type) {
    case "PURCHASE":
      result.packagingPurchases +=
        totalValue;
      break;

    case "CONSUMPTION":
      result.packagingConsumption +=
        totalValue;
      break;

    case "ADJUSTMENT_IN":
      result.packagingAdjustmentsIn +=
        totalValue;
      break;

    case "ADJUSTMENT_OUT":
      result.packagingAdjustmentsOut +=
        totalValue;
      break;
  }

  return result;
}

function classifyFinishedProductTransaction(
  type: string,
  quantity: number,
  unitCost: number,
): MovementAccumulator {
  const result = emptyAccumulator();

  const movementValue =
    Math.abs(quantity) * Math.abs(unitCost);

  switch (type) {
    case "PRODUCTION_RUN":
      result.finishedProductProduction +=
        movementValue;
      break;

    case "SALE":
      result.finishedProductSales +=
        movementValue;
      break;

    case "RETURN_RESTOCK":
      result.finishedProductReturns +=
        movementValue;
      break;

    case "DAMAGED_WRITE_OFF":
      result.finishedProductWriteOffs +=
        movementValue;
      break;

    case "MANUAL_AUDIT":
      /*
       * Manual audit direction is stored in notes.
       *
       * The analytics layer deliberately does not
       * infer direction from quantity because the
       * ledger stores quantity as a positive value.
       */
      break;

    case "PROMOTIONAL_DISPATCH":
      result.finishedProductPromotionalDispatches +=
        movementValue;
      break;

    case "INITIAL_STOCK":
    case "PURCHASE_RESTOCK":
      /*
       * These are inventory additions but are not
       * included in the core production/sales movement
       * metrics above.
       */
      break;
  }

  return result;
}

function buildMonthlyMovementMap(
  rawMaterialTransactions: Awaited<
    ReturnType<typeof getRawMaterialTransactions>
  >,
  packagingTransactions: Awaited<
    ReturnType<
      typeof getPackagingMaterialTransactions
    >
  >,
  finishedProductTransactions: Awaited<
    ReturnType<
      typeof getFinishedProductTransactions
    >
  >,
  rawMaterialPurchases: Awaited<
    ReturnType<typeof getRawMaterialPurchases>
  >,
  packagingMaterialPurchases: Awaited<
    ReturnType<
      typeof getPackagingMaterialPurchases
    >
  >,
) {
  const monthMap = new Map<
    string,
    MovementAccumulator
  >();

  function getMonth(
    date: Date,
  ): MovementAccumulator {
    const key = monthKey(date);

    const existing =
      monthMap.get(key);

    if (existing) {
      return existing;
    }

    const created =
      emptyAccumulator();

    monthMap.set(key, created);

    return created;
  }

  for (const transaction of rawMaterialTransactions) {
    const month =
      getMonth(transaction.createdAt);

    addAccumulator(
      month,
      classifyRawMaterialTransaction(
        transaction.type,
        decimalToNumber(
          transaction.totalValue,
        ),
      ),
    );
  }

  for (const transaction of packagingTransactions) {
    const month =
      getMonth(transaction.createdAt);

    addAccumulator(
      month,
      classifyPackagingTransaction(
        transaction.type,
        decimalToNumber(
          transaction.totalValue,
        ),
      ),
    );
  }

  for (const transaction of finishedProductTransactions) {
    const month =
      getMonth(transaction.createdAt);

    addAccumulator(
      month,
      classifyFinishedProductTransaction(
        transaction.type,
        transaction.quantity,
        decimalToNumber(
          transaction.unitCost,
        ),
      ),
    );
  }

  /*
   * Purchase records are the authoritative source for
   * purchase-date cash/value reporting.
   *
   * We intentionally do NOT add these amounts to the
   * transaction-derived purchase values here because
   * that would double-count the same inventory purchase.
   *
   * The purchase arrays are fetched above because Phase
   * 4.4B will expose purchase activity from the purchase
   * records while inventory movement values come from
   * the inventory ledgers.
   */
  void rawMaterialPurchases;
  void packagingMaterialPurchases;

  return monthMap;
}

function buildSummary(
  monthlyMap: Map<
    string,
    MovementAccumulator
  >,
): InventoryMovementSummary {
  const summary =
    emptyAccumulator();

  for (const month of monthlyMap.values()) {
    addAccumulator(summary, month);
  }

  return summary;
}

function buildByMonth(
  monthlyMap: Map<
    string,
    MovementAccumulator
  >,
): InventoryMovementByMonth[] {
  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) =>
      a.localeCompare(b),
    )
    .map(([key, value]) => ({
      month: monthLabel(key),

      rawMaterialPurchases:
        value.rawMaterialPurchases,

      rawMaterialConsumption:
        value.rawMaterialConsumption,

      packagingPurchases:
        value.packagingPurchases,

      packagingConsumption:
        value.packagingConsumption,

      finishedProductProduction:
        value.finishedProductProduction,

      finishedProductSales:
        value.finishedProductSales,

      finishedProductReturns:
        value.finishedProductReturns,

      finishedProductWriteOffs:
        value.finishedProductWriteOffs,

      finishedProductPromotionalDispatches:
        value.finishedProductPromotionalDispatches,
    }));
}

export async function getInventoryMovementIntelligence(
  businessId: string,
  options: {
    from?: Date | null;
    to?: Date;
  } = {},
): Promise<InventoryMovementIntelligence> {
  const period = getPeriod(options);

  const [
    rawMaterialTransactions,
    packagingTransactions,
    finishedProductTransactions,
    rawMaterialPurchases,
    packagingMaterialPurchases,
  ] = await Promise.all([
    getRawMaterialTransactions(
      businessId,
      period,
    ),

    getPackagingMaterialTransactions(
      businessId,
      period,
    ),

    getFinishedProductTransactions(
      businessId,
      period,
    ),

    getRawMaterialPurchases(
      businessId,
      period,
    ),

    getPackagingMaterialPurchases(
      businessId,
      period,
    ),
  ]);

  const monthlyMap =
    buildMonthlyMovementMap(
      rawMaterialTransactions,
      packagingTransactions,
      finishedProductTransactions,
      rawMaterialPurchases,
      packagingMaterialPurchases,
    );

  return {
    period,
    summary:
      buildSummary(monthlyMap),
    byMonth:
      buildByMonth(monthlyMap),
  };
}