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