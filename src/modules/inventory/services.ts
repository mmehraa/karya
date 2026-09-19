import {
  InventoryTransactionType,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { db } from "@/lib/db";

import type {
  InventoryKPIs,
  InventoryMovementResult,
  ProductStockSummary,
  PromotionalDispatchResult,
  PromotionalStockAllocationResult,
  PromotionalStockReleaseResult,
  SerializedInventoryTransaction,
} from "./types";

import type { RecordStockMovementInput } from "./validation";

export type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Convert Prisma Decimal values into numbers for UI/client data.
 */
function decimalToNumber(
  value: Prisma.Decimal | number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Convert a transaction database record into its serialized form.
 */
function serializeTransaction(
  transaction: {
    id: string;
    businessId: string;
    productId: string;
    type: InventoryTransactionType;
    quantity: number;
    unitCost: Prisma.Decimal | null;
    referenceId: string | null;
    notes: string | null;
    createdAt: Date;
  },
): SerializedInventoryTransaction {
  return {
    id: transaction.id,
    businessId: transaction.businessId,
    productId: transaction.productId,
    type: transaction.type,
    quantity: transaction.quantity,
    unitCost: decimalToNumber(transaction.unitCost),
    referenceId: transaction.referenceId,
    notes: transaction.notes,
    createdAt: transaction.createdAt,
  };
}

/**
 * Converts an inventory transaction into its signed stock delta.
 *
 * Quantity stored in the ledger remains positive.
 * Transaction type determines whether stock increases or decreases.
 */
function getSignedQuantityDelta(
  type: InventoryTransactionType,
  quantity: number,
  auditDirection?: "INCREASE" | "DECREASE",
): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(
      "Inventory quantity must be a positive whole number.",
    );
  }

  switch (type) {
    case InventoryTransactionType.INITIAL_STOCK:
    case InventoryTransactionType.PRODUCTION_RUN:
    case InventoryTransactionType.PURCHASE_RESTOCK:
    case InventoryTransactionType.RETURN_RESTOCK:
      return quantity;

    case InventoryTransactionType.SALE:
    case InventoryTransactionType.DAMAGED_WRITE_OFF:
    case InventoryTransactionType.PROMOTIONAL_DISPATCH:
      return -quantity;

    case InventoryTransactionType.MANUAL_AUDIT:
      return auditDirection === "DECREASE"
        ? -quantity
        : quantity;

    default:
      throw new Error(
        `Unsupported inventory transaction type: ${type}`,
      );
  }
}

/**
 * Execute a normal inventory movement inside an existing transaction.
 *
 * Promotional dispatch is deliberately handled separately because
 * it must also update promotionalStock and create finance records.
 */
async function executeInventoryMovement(
  tx: PrismaTx,
  businessId: string,
  input: {
    productId: string;
    type: InventoryTransactionType;
    quantity: number;
    auditDirection?: "INCREASE" | "DECREASE";
    unitCost?: number | null;
    referenceId?: string | null;
    notes?: string | null;
  },
): Promise<InventoryMovementResult> {
  const {
    productId,
    type,
    quantity,
    auditDirection,
    unitCost,
    referenceId,
    notes,
  } = input;

  if (
    type === InventoryTransactionType.PROMOTIONAL_DISPATCH
  ) {
    throw new Error(
      "Promotional dispatch must be processed through the promotional inventory flow.",
    );
  }

  const products = await tx.$queryRaw<
    Array<{
      id: string;
      businessId: string;
      name: string;
      currentStock: number;
      promotionalStock: number;
    }>
  >`
    SELECT
      "id",
      "businessId",
      "name",
      "currentStock",
      "promotionalStock"
    FROM "Product"
    WHERE "id" = ${productId}
      AND "businessId" = ${businessId}
    FOR UPDATE
  `;

  const product = products[0];

  if (!product) {
    throw new Error(
      "Product not found or unauthorized.",
    );
  }

  const previousStock = product.currentStock;

  const delta = getSignedQuantityDelta(
    type,
    quantity,
    auditDirection,
  );

  const newStock = previousStock + delta;

  /**
   * Normal deductions can only consume stock that is
   * available for normal sales.
   *
   * Physical stock:
   * 20
   *
   * Promotional stock:
   * 20
   *
   * Available stock:
   * 0
   *
   * Therefore a normal sale of 1 must fail.
   */
  if (delta < 0) {
    const availableStock =
      product.currentStock -
      product.promotionalStock;

    const requestedDeduction = Math.abs(delta);

    if (requestedDeduction > availableStock) {
      throw new Error(
        `Insufficient available stock for "${product.name}". ` +
          `Available stock is ${availableStock} units; ` +
          `${product.promotionalStock} units are reserved for promotion.`,
      );
    }
  }

  if (newStock < 0) {
    throw new Error(
      `Insufficient physical stock for "${product.name}". ` +
        `Current stock is ${previousStock} units; ` +
        `cannot deduct ${Math.abs(delta)} units.`,
    );
  }

  /**
   * Physical stock must never fall below promotional stock.
   */
  if (newStock < product.promotionalStock) {
    throw new Error(
      `Cannot reduce physical stock for "${product.name}" below ` +
        `the ${product.promotionalStock} units reserved for promotion.`,
    );
  }

  let transactionNotes = notes?.trim() || null;

  if (
    type === InventoryTransactionType.MANUAL_AUDIT
  ) {
    const marker =
      auditDirection === "DECREASE"
        ? "[AUDIT_DIRECTION:DECREASE]"
        : "[AUDIT_DIRECTION:INCREASE]";

    transactionNotes = transactionNotes
      ? `${marker} ${transactionNotes}`
      : marker;
  }

  const createdRecord =
    await tx.inventoryTransaction.create({
      data: {
        businessId,
        productId,
        type,
        quantity,
        unitCost:
          unitCost === undefined ||
          unitCost === null
            ? null
            : new Prisma.Decimal(unitCost),
        referenceId:
          referenceId?.trim() || null,
        notes: transactionNotes,
      },
    });

  await tx.product.update({
    where: {
      id: productId,
    },
    data: {
      currentStock: newStock,
    },
  });

  return {
    transaction:
      serializeTransaction(createdRecord),
    previousStock,
    newStock,
    productId,
  };
}

/**
 * Record a normal inventory movement.
 */
export async function recordStockMovement(
  businessId: string,
  input: RecordStockMovementInput,
): Promise<InventoryMovementResult> {
  return await db.$transaction(async (tx) => {
    return await executeInventoryMovement(
      tx,
      businessId,
      {
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        auditDirection:
          input.auditDirection,
        unitCost: input.unitCost,
        referenceId:
          input.referenceId,
        notes: input.notes,
      },
    );
  });
}

/**
 * Allocate existing physical stock to promotional stock.
 *
 * IMPORTANT:
 * currentStock does NOT change.
 *
 * Example:
 *
 * Before:
 * Physical       20
 * Promotional     0
 * Available      20
 *
 * Allocate 20:
 *
 * Physical       20
 * Promotional    20
 * Available       0
 */
export async function allocatePromotionalStock(
  businessId: string,
  productId: string,
  quantity: number,
): Promise<PromotionalStockAllocationResult> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(
      "Promotional stock quantity must be a positive whole number.",
    );
  }

  return await db.$transaction(async (tx) => {
    const products = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        currentStock: number;
        promotionalStock: number;
      }>
    >`
      SELECT
        "id",
        "name",
        "currentStock",
        "promotionalStock"
      FROM "Product"
      WHERE "id" = ${productId}
        AND "businessId" = ${businessId}
      FOR UPDATE
    `;

    const product = products[0];

    if (!product) {
      throw new Error(
        "Product not found or unauthorized.",
      );
    }

    const availableStock =
      product.currentStock -
      product.promotionalStock;

    if (quantity > availableStock) {
      throw new Error(
        `Insufficient available stock for "${product.name}". ` +
          `Only ${availableStock} units are available for promotional allocation.`,
      );
    }

    const previousPromotionalStock =
      product.promotionalStock;

    const newPromotionalStock =
      previousPromotionalStock + quantity;

    await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        promotionalStock:
          newPromotionalStock,
      },
    });

    return {
      productId,
      previousPromotionalStock,
      newPromotionalStock,
      currentStock:
        product.currentStock,
      availableStock:
        product.currentStock -
        newPromotionalStock,
    };
  });
}

/**
 * Release previously allocated promotional stock.
 *
 * Physical stock does NOT change.
 */
export async function releasePromotionalStock(
  businessId: string,
  productId: string,
  quantity: number,
): Promise<PromotionalStockReleaseResult> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(
      "Promotional stock quantity must be a positive whole number.",
    );
  }

  return await db.$transaction(async (tx) => {
    const products = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        currentStock: number;
        promotionalStock: number;
      }>
    >`
      SELECT
        "id",
        "name",
        "currentStock",
        "promotionalStock"
      FROM "Product"
      WHERE "id" = ${productId}
        AND "businessId" = ${businessId}
      FOR UPDATE
    `;

    const product = products[0];

    if (!product) {
      throw new Error(
        "Product not found or unauthorized.",
      );
    }

    if (quantity > product.promotionalStock) {
      throw new Error(
        `Insufficient promotional stock for "${product.name}". ` +
          `Only ${product.promotionalStock} units are currently allocated.`,
      );
    }

    const previousPromotionalStock =
      product.promotionalStock;

    const newPromotionalStock =
      previousPromotionalStock - quantity;

    await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        promotionalStock:
          newPromotionalStock,
      },
    });

    return {
      productId,
      previousPromotionalStock,
      newPromotionalStock,
      currentStock:
        product.currentStock,
      availableStock:
        product.currentStock -
        newPromotionalStock,
    };
  });
}

/**
 * Execute a complete promotional dispatch.
 *
 * One transaction creates:
 *
 * 1. InventoryTransaction
 * 2. Expense
 * 3. PromotionalDispatch
 *
 * and updates:
 *
 * 4. currentStock
 * 5. promotionalStock
 */
async function executePromotionalDispatch(
  tx: PrismaTx,
  businessId: string,
  input: {
    productId: string;
    quantity: number;
    recipient: string;
    purpose: string;
    referenceId?: string | null;
    expenseDate?: Date;
  },
): Promise<PromotionalDispatchResult> {
  if (
    !Number.isInteger(input.quantity) ||
    input.quantity <= 0
  ) {
    throw new Error(
      "Promotional dispatch quantity must be a positive whole number.",
    );
  }

  const recipient =
    input.recipient.trim();

  const purpose =
    input.purpose.trim();

  if (recipient.length < 2) {
    throw new Error(
      "Recipient must be at least 2 characters.",
    );
  }

  if (purpose.length < 2) {
    throw new Error(
      "Purpose must be at least 2 characters.",
    );
  }

  /**
   * Lock product for the entire dispatch operation.
   */
  const products = await tx.$queryRaw<
    Array<{
      id: string;
      name: string;
      currentStock: number;
      promotionalStock: number;
      cogs: Prisma.Decimal | null;
    }>
  >`
    SELECT
      "id",
      "name",
      "currentStock",
      "promotionalStock",
      "cogs"
    FROM "Product"
    WHERE "id" = ${input.productId}
      AND "businessId" = ${businessId}
    FOR UPDATE
  `;

  const product = products[0];

  if (!product) {
    throw new Error(
      "Product not found or unauthorized.",
    );
  }

  if (
    input.quantity >
    product.promotionalStock
  ) {
    throw new Error(
      `Insufficient promotional stock for "${product.name}". ` +
        `Only ${product.promotionalStock} units are currently allocated.`,
    );
  }

  if (
    input.quantity >
    product.currentStock
  ) {
    throw new Error(
      `Insufficient physical stock for "${product.name}".`,
    );
  }

  /**
   * Promotional expense must be calculated using COGS,
   * not the selling price.
   */
  if (product.cogs === null) {
    throw new Error(
      `COGS is required for "${product.name}" before promotional stock can be dispatched.`,
    );
  }

  const unitCost =
    Number(product.cogs);

  const totalCostDecimal =
    product.cogs.mul(
      input.quantity,
    );

  const totalCost =
    Number(
      totalCostDecimal.toFixed(2),
    );

  const previousStock =
    product.currentStock;

  const previousPromotionalStock =
    product.promotionalStock;

  const newStock =
    previousStock -
    input.quantity;

  const newPromotionalStock =
    previousPromotionalStock -
    input.quantity;

  const availableStock =
    newStock -
    newPromotionalStock;

  /**
   * Create inventory ledger record.
   */
  const inventoryTransaction =
    await tx.inventoryTransaction.create({
      data: {
        businessId,
        productId:
          input.productId,
        type:
          InventoryTransactionType.PROMOTIONAL_DISPATCH,
        quantity:
          input.quantity,
        unitCost:
          product.cogs,
        referenceId:
          input.referenceId?.trim() ||
          null,
        notes:
          `Promotional dispatch to ${recipient} — ${purpose}`,
      },
    });

  /**
   * Create promotional finance expense.
   */
  const expense =
    await tx.expense.create({
      data: {
        businessId,
        expenseDate:
          input.expenseDate ??
          new Date(),
        category: "PROMOTIONAL",
        description:
          `Promotional stock — ${product.name}`,
        amount:
          new Prisma.Decimal(
            totalCost.toFixed(2),
          ),
        vendor: recipient,
        paymentMethod: null,
        isRecurring: false,
        notes:
          `Quantity: ${input.quantity}. ` +
          `Purpose: ${purpose}. ` +
          `Inventory transaction: ${inventoryTransaction.id}.`,
      },
    });

  /**
   * Create domain-level promotional dispatch record.
   */
  const dispatch =
    await tx.promotionalDispatch.create({
      data: {
        businessId,
        productId:
          input.productId,
        quantity:
          input.quantity,
        recipient,
        purpose,
        referenceId:
          input.referenceId?.trim() ||
          null,
        unitCost:
          product.cogs,
        totalCost:
          new Prisma.Decimal(
            totalCost.toFixed(2),
          ),
        inventoryTransactionId:
          inventoryTransaction.id,
        expenseId:
          expense.id,
      },
    });

  /**
   * Update both stock values atomically.
   */
  await tx.product.update({
    where: {
      id: input.productId,
    },
    data: {
      currentStock: newStock,
      promotionalStock:
        newPromotionalStock,
    },
  });

  return {
    dispatchId: dispatch.id,
    productId:
      input.productId,
    quantity:
      input.quantity,
    recipient,
    purpose,
    unitCost,
    totalCost,

    previousStock,
    newStock,

    previousPromotionalStock,
    newPromotionalStock,

    availableStock,

    inventoryTransactionId:
      inventoryTransaction.id,

    expenseId:
      expense.id,
  };
}

/**
 * Public entry point for promotional dispatch.
 */
export async function recordPromotionalDispatch(
  businessId: string,
  input: {
    productId: string;
    quantity: number;
    recipient: string;
    purpose: string;
    referenceId?: string | null;
    expenseDate?: Date;
  },
): Promise<PromotionalDispatchResult> {
  return await db.$transaction(
    async (tx) => {
      return await executePromotionalDispatch(
        tx,
        businessId,
        input,
      );
    },
  );
}

/**
 * Deduct stock for a commercial order.
 *
 * Promotional stock is protected by executeInventoryMovement(),
 * so normal sales can only consume available stock.
 */
export async function deductStockForOrder(
  tx: PrismaTx,
  businessId: string,
  productId: string,
  quantity: number,
  orderNumber: string,
): Promise<InventoryMovementResult> {
  return await executeInventoryMovement(
    tx,
    businessId,
    {
      productId,
      type:
        InventoryTransactionType.SALE,
      quantity,
      referenceId:
        `ORD-${orderNumber}`,
      notes:
        "Automated fulfillment deduction",
    },
  );
}

/**
 * Get recent inventory transactions.
 */
export async function getRecentInventoryTransactions(
  businessId: string,
  limit = 50,
): Promise<SerializedInventoryTransaction[]> {
  const transactions =
    await db.inventoryTransaction.findMany({
      where: {
        businessId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

  return transactions.map(
    serializeTransaction,
  );
}

/**
 * Get inventory overview.
 *
 * currentStock:
 *   Total physical inventory.
 *
 * promotionalStock:
 *   Physical inventory reserved for promotion.
 *
 * availableStock:
 *   Physical inventory available for normal commercial sales.
 */
export async function getInventoryOverview(
  businessId: string,
): Promise<{
  products: ProductStockSummary[];
  kpis: InventoryKPIs;
}> {
  const products =
    await db.product.findMany({
      where: {
        businessId,
      },
      orderBy: [
        {
          name: "asc",
        },
        {
          sku: "asc",
        },
      ],
    });

  let totalUnitsInStock = 0;
  let totalPromotionalUnits = 0;
  let totalAvailableUnits = 0;

  let lowStockCount = 0;
  let outOfStockCount = 0;

  let totalValuation: number | null =
    null;

  let hasAnyRecordedValuation = false;

  const summarizedProducts:
    ProductStockSummary[] =
    products.map((product) => {
      const stock =
        product.currentStock;

      /**
       * Defensive protection against invalid values.
       */
      const promotionalStock =
        Math.max(
          0,
          Math.min(
            product.promotionalStock,
            stock,
          ),
        );

      const availableStock =
        Math.max(
          0,
          stock - promotionalStock,
        );

      const reorderLevel =
        product.reorderLevel;

      const cogs =
        decimalToNumber(
          product.cogs,
        );

      totalUnitsInStock +=
        stock;

      totalPromotionalUnits +=
        promotionalStock;

      totalAvailableUnits +=
        availableStock;

      /**
       * Stock health is based on stock available
       * for normal commercial sales.
       */
      let stockStatus:
        ProductStockSummary["stockStatus"];

      if (
        availableStock <= 0
      ) {
        stockStatus =
          "OUT_OF_STOCK";

        outOfStockCount++;
      } else if (
        availableStock <=
        reorderLevel
      ) {
        stockStatus =
          "LOW_STOCK";

        lowStockCount++;
      } else {
        stockStatus =
          "HEALTHY";
      }

      /**
       * Valuation includes ALL physical stock,
       * including promotional stock.
       */
      let valuation:
        | number
        | null = null;

      if (cogs !== null) {
        valuation =
          stock * cogs;

        totalValuation =
          (totalValuation ?? 0) +
          valuation;

        hasAnyRecordedValuation =
          true;
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,

        currentStock:
          stock,

        promotionalStock:
          promotionalStock,

        availableStock:
          availableStock,

        reorderLevel:
          reorderLevel,

        cogs,

        stockStatus,

        valuation,
      };
    });

  return {
    products:
      summarizedProducts,

    kpis: {
      totalUnitsInStock,
      totalPromotionalUnits,
      totalAvailableUnits,

      lowStockCount,
      outOfStockCount,

      totalValuation:
        hasAnyRecordedValuation
          ? totalValuation
          : null,
    },
  };
}