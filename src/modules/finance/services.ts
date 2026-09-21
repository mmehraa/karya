import { Prisma } from "@prisma/client";
import type { ExpenseCategory } from "@prisma/client";
import { db } from "@/lib/db";
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
  value: Prisma.Decimal | null | undefined
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
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export async function getExpenses(
  businessId: string
): Promise<SerializedExpense[]> {
  const expenses = await db.expense.findMany({
    where: { businessId },
    orderBy: [
      { expenseDate: "desc" },
      { createdAt: "desc" },
    ],
  });

  return expenses.map(serializeExpense);
}

export async function getExpenseById(
  businessId: string,
  expenseId: string
): Promise<SerializedExpense | null> {
  const expense = await db.expense.findFirst({
    where: {
      id: expenseId,
      businessId,
    },
  });

  return expense ? serializeExpense(expense) : null;
}

export async function createExpense(
  businessId: string,
  input: CreateExpenseInput
): Promise<SerializedExpense> {
  const expense = await db.expense.create({
    data: {
      businessId,
      expenseDate: input.expenseDate,
      category: input.category,
      description: input.description,
      amount: new Prisma.Decimal(input.amount),
      vendor: input.vendor ?? null,
      paymentMethod: input.paymentMethod ?? null,
      isRecurring: input.isRecurring,
      notes: input.notes ?? null,
    },
  });

  return serializeExpense(expense);
}

export async function updateExpense(
  businessId: string,
  input: UpdateExpenseInput
): Promise<SerializedExpense> {
  const existing = await db.expense.findFirst({
    where: {
      id: input.id,
      businessId,
    },
  });

  if (!existing) {
    throw new Error("Expense not found.");
  }

  const data: Prisma.ExpenseUpdateInput = {};

  if (input.expenseDate !== undefined) {
    data.expenseDate = input.expenseDate;
  }

  if (input.category !== undefined) {
    data.category = input.category;
  }

  if (input.description !== undefined) {
    data.description = input.description;
  }

  if (input.amount !== undefined) {
    data.amount = new Prisma.Decimal(input.amount);
  }

  if (input.vendor !== undefined) {
    data.vendor = input.vendor;
  }

  if (input.paymentMethod !== undefined) {
    data.paymentMethod = input.paymentMethod;
  }

  if (input.isRecurring !== undefined) {
    data.isRecurring = input.isRecurring;
  }

  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  const updated = await db.expense.update({
    where: { id: input.id },
    data,
  });

  return serializeExpense(updated);
}

export async function deleteExpense(
  businessId: string,
  expenseId: string
): Promise<void> {
  const existing = await db.expense.findFirst({
    where: {
      id: expenseId,
      businessId,
    },
    select: {
      id: true,
      promotionalDispatch: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Expense not found.");
  }

  if (existing.promotionalDispatch) {
    throw new Error(
      "This expense is linked to a promotional dispatch and cannot be deleted."
    );
  }

  await db.expense.delete({
    where: {
      id: expenseId,
    },
  });
}

export async function getFinanceSummary(
  businessId: string
): Promise<FinanceSummary> {
  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const [
    aggregate,
    expenseCount,
    recurringExpenseCount,
    currentMonthAggregate,
  ] = await Promise.all([
    db.expense.aggregate({
      where: { businessId },
      _sum: { amount: true },
    }),

    db.expense.count({
      where: { businessId },
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
      _sum: { amount: true },
    }),
  ]);

  return {
    totalExpenses: decimalToNumber(
      aggregate._sum.amount
    ),
    expenseCount,
    recurringExpenseCount,
    currentMonthExpenses: decimalToNumber(
      currentMonthAggregate._sum.amount
    ),
  };
}

export async function getExpenseCategorySummary(
  businessId: string
): Promise<ExpenseCategorySummary[]> {
  const grouped = await db.expense.groupBy({
    by: ["category"],
    where: { businessId },
    _sum: { amount: true },
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
    amount: decimalToNumber(row._sum.amount),
    count: row._count._all,
  }));
}