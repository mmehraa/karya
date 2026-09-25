import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

import type {
  SerializedCashTransaction,
  CashFlowSummary,
  CashFlowCategorySummary,
} from "./types";

import type {
  CreateCashTransactionInput,
  CashFlowPeriodInput,
} from "./validation";

type CashTransactionClient =
  Prisma.TransactionClient;

function serializeCashTransaction(
  transaction: {
    id: string;
    businessId: string;
    transactionDate: Date;
    type: "INFLOW" | "OUTFLOW";
    category:
      | "CUSTOMER_PAYMENT"
      | "OTHER_INCOME"
      | "RAW_MATERIAL_PURCHASE"
      | "PACKAGING_MATERIAL_PURCHASE"
      | "OPERATING_EXPENSE"
      | "SHIPPING"
      | "PAYMENT_PROCESSING_FEE"
      | "CUSTOMER_REFUND"
      | "OTHER";
    amount: Prisma.Decimal;
    paymentMethod: string | null;
    description: string;
    referenceId: string | null;
    sourceType: string | null;
    sourceId: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
): SerializedCashTransaction {
  return {
    id: transaction.id,
    businessId: transaction.businessId,
    transactionDate: transaction.transactionDate,
    type: transaction.type,
    category: transaction.category,
    amount: Number(transaction.amount),
    paymentMethod: transaction.paymentMethod,
    description: transaction.description,
    referenceId: transaction.referenceId,
    sourceType: transaction.sourceType,
    sourceId: transaction.sourceId,
    notes: transaction.notes,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

function buildDateWhere(
  period?: CashFlowPeriodInput,
): {
  transactionDate?: {
    gte?: Date;
    lte?: Date;
  };
} {
  if (!period?.startDate && !period?.endDate) {
    return {};
  }

  const where: {
    transactionDate?: {
      gte?: Date;
      lte?: Date;
    };
  } = {
    transactionDate: {},
  };

  if (period.startDate) {
    where.transactionDate!.gte = period.startDate;
  }

  if (period.endDate) {
    const endDate = new Date(period.endDate);
    endDate.setHours(23, 59, 59, 999);

    where.transactionDate!.lte = endDate;
  }

  return where;
}

/**
 * Creates a cash transaction using an existing Prisma transaction.
 *
 * This is used by domain services such as raw-material purchases,
 * packaging purchases, expenses and orders so the source operation
 * and its cash movement succeed or fail together.
 */
export async function createCashTransactionInTransaction(
  tx: CashTransactionClient,
  input: {
    businessId: string;
    transactionDate: Date;
    type: "INFLOW" | "OUTFLOW";
    category:
      | "CUSTOMER_PAYMENT"
      | "OTHER_INCOME"
      | "RAW_MATERIAL_PURCHASE"
      | "PACKAGING_MATERIAL_PURCHASE"
      | "OPERATING_EXPENSE"
      | "SHIPPING"
      | "PAYMENT_PROCESSING_FEE"
      | "CUSTOMER_REFUND"
      | "OTHER";
    amount: Prisma.Decimal | number;
    paymentMethod?: string | null;
    description: string;
    referenceId?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    notes?: string | null;
  },
) {
  return tx.cashTransaction.create({
    data: {
      businessId: input.businessId,
      transactionDate: input.transactionDate,
      type: input.type,
      category: input.category,
      amount:
        input.amount instanceof Prisma.Decimal
          ? input.amount
          : new Prisma.Decimal(input.amount),
      paymentMethod: input.paymentMethod ?? null,
      description: input.description,
      referenceId: input.referenceId ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      notes: input.notes ?? null,
    },
  });
}

/**
 * Creates a manual cash transaction.
 *
 * Manual transactions are marked with sourceType = MANUAL.
 */
export async function createCashTransaction(
  businessId: string,
  input: CreateCashTransactionInput,
): Promise<SerializedCashTransaction> {
  const transaction = await db.cashTransaction.create({
    data: {
      businessId,
      transactionDate: input.transactionDate,
      type: input.type,
      category: input.category,
      amount: new Prisma.Decimal(input.amount),
      paymentMethod: input.paymentMethod ?? null,
      description: input.description,
      referenceId: input.referenceId ?? null,
      sourceType: "MANUAL",
      sourceId: null,
      notes: input.notes ?? null,
    },
  });

  return serializeCashTransaction(transaction);
}

/**
 * Lists cash transactions for the active business.
 */
export async function getCashTransactions(
  businessId: string,
  period?: CashFlowPeriodInput,
): Promise<SerializedCashTransaction[]> {
  const transactions = await db.cashTransaction.findMany({
    where: {
      businessId,
      ...buildDateWhere(period),
    },
    orderBy: [
      {
        transactionDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return transactions.map(serializeCashTransaction);
}

/**
 * Returns total inflows, outflows and net cash flow.
 */
export async function getCashFlowSummary(
  businessId: string,
  period?: CashFlowPeriodInput,
): Promise<CashFlowSummary> {
  const where = {
    businessId,
    ...buildDateWhere(period),
  };

  const [inflows, outflows, inflowCount, outflowCount] =
    await Promise.all([
      db.cashTransaction.aggregate({
        where: {
          ...where,
          type: "INFLOW",
        },
        _sum: {
          amount: true,
        },
      }),

      db.cashTransaction.aggregate({
        where: {
          ...where,
          type: "OUTFLOW",
        },
        _sum: {
          amount: true,
        },
      }),

      db.cashTransaction.count({
        where: {
          ...where,
          type: "INFLOW",
        },
      }),

      db.cashTransaction.count({
        where: {
          ...where,
          type: "OUTFLOW",
        },
      }),
    ]);

  const totalInflows = Number(inflows._sum.amount ?? 0);
  const totalOutflows = Number(outflows._sum.amount ?? 0);

  return {
    totalInflows,
    totalOutflows,
    netCashFlow: totalInflows - totalOutflows,
    inflowCount,
    outflowCount,
  };
}

/**
 * Returns cash movement grouped by category.
 */
export async function getCashFlowCategorySummary(
  businessId: string,
  period?: CashFlowPeriodInput,
): Promise<CashFlowCategorySummary[]> {
  const transactions = await db.cashTransaction.findMany({
    where: {
      businessId,
      ...buildDateWhere(period),
    },
    select: {
      type: true,
      category: true,
      amount: true,
    },
  });

  const grouped = new Map<
    string,
    {
      category: CashFlowCategorySummary["category"];
      type: CashFlowCategorySummary["type"];
      amount: number;
      count: number;
    }
  >();

  for (const transaction of transactions) {
    const key = `${transaction.type}:${transaction.category}`;

    const existing = grouped.get(key);

    if (existing) {
      existing.amount += Number(transaction.amount);
      existing.count += 1;
      continue;
    }

    grouped.set(key, {
      category: transaction.category,
      type: transaction.type,
      amount: Number(transaction.amount),
      count: 1,
    });
  }

  return Array.from(grouped.values()).sort(
    (a, b) => b.amount - a.amount,
  );
}

/**
 * Deletes a manually-created cash transaction.
 *
 * Automatically generated transactions must be managed through
 * their source record.
 */
export async function deleteManualCashTransaction(
  businessId: string,
  transactionId: string,
): Promise<void> {
  const transaction = await db.cashTransaction.findFirst({
    where: {
      id: transactionId,
      businessId,
    },
    select: {
      id: true,
      sourceType: true,
    },
  });

  if (!transaction) {
    throw new Error("Cash transaction not found.");
  }

  if (transaction.sourceType !== "MANUAL") {
    throw new Error(
      "Automatically generated cash transactions must be managed from their source record.",
    );
  }

  await db.cashTransaction.delete({
    where: {
      id: transaction.id,
    },
  });
}