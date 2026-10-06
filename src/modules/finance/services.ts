import { Prisma } from "@prisma/client";
import type { ExpenseCategory } from "@prisma/client";
import { db } from "@/lib/db";

import { createCashTransactionInTransaction } from "@/modules/cash-flow/services";

import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from "./validation";

import type {
  ExpenseCategorySummary,
  FinanceSummary,
  SerializedExpense,
} from "./types";

function decimalToNumber(
  value: Prisma.Decimal | null | undefined,
): number {
  return value === null || value === undefined
    ? 0
    : Number(value);
}

function serializeExpense(expense: {
  id: string;
  businessId: string;
  expenseDate: Date;
  category: ExpenseCategory;
  description: string;
  amount: Prisma.Decimal;
  vendor: string | null;
  paymentMethod: string | null;
  isRecurring: boolean;
  notes: string | null;
  isCashExpense: boolean;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedExpense {
  return {
    id: expense.id,
    businessId: expense.businessId,
    expenseDate: expense.expenseDate,
    category: expense.category,
    description: expense.description,
    amount: decimalToNumber(expense.amount),
    vendor: expense.vendor,
    paymentMethod: expense.paymentMethod,
    isRecurring: expense.isRecurring,
    notes: expense.notes,
    isCashExpense: expense.isCashExpense,
    sourceType: expense.sourceType,
    sourceId: expense.sourceId,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export async function getExpenses(
  businessId: string,
): Promise<SerializedExpense[]> {
  const expenses = await db.expense.findMany({
    where: {
      businessId,
    },
    orderBy: [
      {
        expenseDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return expenses.map(serializeExpense);
}

export async function getExpenseById(
  businessId: string,
  expenseId: string,
): Promise<SerializedExpense | null> {
  const expense = await db.expense.findFirst({
    where: {
      id: expenseId,
      businessId,
    },
  });

  return expense
    ? serializeExpense(expense)
    : null;
}

/**
 * Creates an expense and its corresponding cash outflow
 * atomically.
 *
 * Expenses remain P&L expenses.
 *
 * CashTransaction records the actual money movement.
 */
export async function createExpense(
  businessId: string,
  input: CreateExpenseInput,
): Promise<SerializedExpense> {
  return db.$transaction(async (tx) => {
    const amount = new Prisma.Decimal(
      input.amount,
    );

    const expense =
      await tx.expense.create({
        data: {
          businessId,
          expenseDate:
            input.expenseDate,
          category:
            input.category,
          description:
            input.description,
          amount,
          vendor:
            input.vendor ?? null,
          paymentMethod:
            input.paymentMethod ?? null,
          isRecurring:
            input.isRecurring,
          notes:
            input.notes ?? null,

          // Expenses created through the normal
          // finance form represent an actual cash outflow.
          isCashExpense: true,
          sourceType: null,
          sourceId: null,
        },
      });

    await createCashTransactionInTransaction(
      tx,
      {
        businessId,
        transactionDate:
          input.expenseDate,
        type: "OUTFLOW",
        category: "OPERATING_EXPENSE",
        amount,
        paymentMethod:
          input.paymentMethod ?? null,
        description:
          input.description,
        referenceId:
          expense.id,
        sourceType: "EXPENSE",
        sourceId: expense.id,
        notes:
          input.vendor
            ? `Vendor: ${input.vendor}`
            : input.notes ?? null,
      },
    );

    return serializeExpense(expense);
  });
}

/**
 * Updates an expense and keeps its linked cash transaction
 * synchronized.
 *
 * Cash transactions are only maintained for expenses where
 * isCashExpense = true.
 */
export async function updateExpense(
  businessId: string,
  input: UpdateExpenseInput,
): Promise<SerializedExpense> {
  return db.$transaction(async (tx) => {
    const existing =
      await tx.expense.findFirst({
        where: {
          id: input.id,
          businessId,
        },
      });

    if (!existing) {
      throw new Error(
        "Expense not found.",
      );
    }

    const data: Prisma.ExpenseUpdateInput =
      {};

    if (
      input.expenseDate !== undefined
    ) {
      data.expenseDate =
        input.expenseDate;
    }

    if (input.category !== undefined) {
      data.category =
        input.category;
    }

    if (
      input.description !== undefined
    ) {
      data.description =
        input.description;
    }

    if (input.amount !== undefined) {
      data.amount =
        new Prisma.Decimal(
          input.amount,
        );
    }

    if (input.vendor !== undefined) {
      data.vendor =
        input.vendor;
    }

    if (
      input.paymentMethod !==
      undefined
    ) {
      data.paymentMethod =
        input.paymentMethod;
    }

    if (
      input.isRecurring !==
      undefined
    ) {
      data.isRecurring =
        input.isRecurring;
    }

    if (input.notes !== undefined) {
      data.notes =
        input.notes;
    }

    const updated =
      await tx.expense.update({
        where: {
          id: input.id,
        },
        data,
      });

    /**
     * Non-cash expenses, such as material wastage,
     * must never create a cash transaction.
     */
    if (!existing.isCashExpense) {
      await tx.cashTransaction.deleteMany({
        where: {
          businessId,
          sourceType: "EXPENSE",
          sourceId: existing.id,
        },
      });

      return serializeExpense(
        updated,
      );
    }

    /**
     * Find the automatically generated
     * cash transaction for this expense.
     */
    const cashTransaction =
      await tx.cashTransaction.findFirst({
        where: {
          businessId,
          sourceType: "EXPENSE",
          sourceId: existing.id,
        },
      });

    /**
     * Existing cash expenses created before Phase 3B
     * may not have a cash transaction.
     *
     * In that case, create one now so the ledger
     * becomes complete.
     */
    if (!cashTransaction) {
      await createCashTransactionInTransaction(
        tx,
        {
          businessId,
          transactionDate:
            updated.expenseDate,
          type: "OUTFLOW",
          category:
            "OPERATING_EXPENSE",
          amount:
            updated.amount,
          paymentMethod:
            updated.paymentMethod,
          description:
            updated.description,
          referenceId:
            updated.id,
          sourceType:
            "EXPENSE",
          sourceId:
            updated.id,
          notes:
            updated.vendor
              ? `Vendor: ${updated.vendor}`
              : updated.notes,
        },
      );
    } else {
      await tx.cashTransaction.update({
        where: {
          id: cashTransaction.id,
        },
        data: {
          transactionDate:
            updated.expenseDate,
          amount:
            updated.amount,
          paymentMethod:
            updated.paymentMethod,
          description:
            updated.description,
          notes:
            updated.vendor
              ? `Vendor: ${updated.vendor}`
              : updated.notes,
        },
      });
    }

    return serializeExpense(
      updated,
    );
  });
}

/**
 * Deletes an expense and its automatically generated
 * cash transaction atomically.
 *
 * Non-cash expenses do not have a cash transaction,
 * so only the expense itself is removed.
 */
export async function deleteExpense(
  businessId: string,
  expenseId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const existing =
      await tx.expense.findFirst({
        where: {
          id: expenseId,
          businessId,
        },
        select: {
          id: true,
          isCashExpense: true,
          promotionalDispatch: {
            select: {
              id: true,
            },
          },
        },
      });

    if (!existing) {
      throw new Error(
        "Expense not found.",
      );
    }

    if (existing.promotionalDispatch) {
      throw new Error(
        "This expense is linked to a promotional dispatch and cannot be deleted.",
      );
    }

    /**
     * Remove the generated cash movement
     * only when this expense represents cash.
     */
    if (existing.isCashExpense) {
      await tx.cashTransaction.deleteMany({
        where: {
          businessId,
          sourceType: "EXPENSE",
          sourceId: existing.id,
        },
      });
    }

    await tx.expense.delete({
      where: {
        id: expenseId,
      },
    });
  });
}

export async function getFinanceSummary(
  businessId: string,
): Promise<FinanceSummary> {
  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const [
    aggregate,
    expenseCount,
    recurringExpenseCount,
    currentMonthAggregate,
  ] = await Promise.all([
    db.expense.aggregate({
      where: {
        businessId,
      },
      _sum: {
        amount: true,
      },
    }),

    db.expense.count({
      where: {
        businessId,
      },
    }),

    db.expense.count({
      where: {
        businessId,
        isRecurring: true,
      },
    }),

    db.expense.aggregate({
      where: {
        businessId,
        expenseDate: {
          gte: startOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  return {
    totalExpenses:
      decimalToNumber(
        aggregate._sum.amount,
      ),

    expenseCount,

    recurringExpenseCount,

    currentMonthExpenses:
      decimalToNumber(
        currentMonthAggregate
          ._sum.amount,
      ),
  };
}

export async function getExpenseCategorySummary(
  businessId: string,
): Promise<ExpenseCategorySummary[]> {
  const grouped =
    await db.expense.groupBy({
      by: ["category"],
      where: {
        businessId,
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
    });

  return grouped.map((row) => ({
    category: row.category,
    amount: decimalToNumber(
      row._sum.amount,
    ),
    count: row._count._all,
  }));
}