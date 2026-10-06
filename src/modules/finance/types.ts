import type { ExpenseCategory } from "@prisma/client";

export interface SerializedExpense {
  id: string;
  businessId: string;
  expenseDate: Date;
  category: ExpenseCategory;
  description: string;
  amount: number;
  vendor: string | null;
  paymentMethod: string | null;
  isRecurring: boolean;
  notes: string | null;

  // False for expenses such as material wastage that affect
  // accounting but do not represent a new cash outflow.
  isCashExpense: boolean;

  // Used to link system-generated expenses back to their source record.
  sourceType: string | null;
  sourceId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface FinanceSummary {
  totalExpenses: number;
  expenseCount: number;
  recurringExpenseCount: number;
  currentMonthExpenses: number;
}

export interface ExpenseCategorySummary {
  category: ExpenseCategory;
  amount: number;
  count: number;
}