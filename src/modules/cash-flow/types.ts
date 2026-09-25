import type {
  CashTransactionCategory,
  CashTransactionType,
} from "@prisma/client";

export interface SerializedCashTransaction {
  id: string;
  businessId: string;
  transactionDate: Date;
  type: CashTransactionType;
  category: CashTransactionCategory;
  amount: number;
  paymentMethod: string | null;
  description: string;
  referenceId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashFlowSummary {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  inflowCount: number;
  outflowCount: number;
}

export interface CashFlowCategorySummary {
  category: CashTransactionCategory;
  type: CashTransactionType;
  amount: number;
  count: number;
}