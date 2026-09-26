import type {
  CashTransactionCategory,
  CashTransactionType,
  ExpenseCategory,
} from "@prisma/client";

export interface AnalyticsDateRange {
  from: Date | null;
  to: Date;
}

export interface RevenueSummary {
  totalRevenue: number;
  paidOrderCount: number;
  unitsSold: number;
  averageOrderValue: number | null;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  orderCount: number;
}

export interface RevenueByProduct {
  productId: string;
  productName: string;
  sku: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
}

export interface RevenueByOrder {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  revenue: number;
  channel: string;
}

export interface RevenueByChannel {
  channel: string;
  revenue: number;
  orderCount: number;
  unitsSold: number;
}

export interface RevenueGrowth {
  currentPeriodRevenue: number;
  previousPeriodRevenue: number;
  changeAmount: number;
  changePercentage: number | null;
}

export interface RevenueIntelligence {
  period: AnalyticsDateRange;
  summary: RevenueSummary;
  byMonth: RevenueByMonth[];
  byProduct: RevenueByProduct[];
  byOrder: RevenueByOrder[];
  byChannel: RevenueByChannel[];
  growth: RevenueGrowth;
}

/* ============================================================
   PRODUCT INTELLIGENCE
   ============================================================ */

export interface ProductCurrentEconomics {
  productId: string;
  productName: string;
  sku: string;
  sellingPrice: number | null;
  rawMaterialCostPerUnit: number | null;
  packagingCostPerUnit: number | null;
  preShippingUnitCost: number | null;
  contributionProfitPerUnit: number | null;
  contributionMarginPct: number | null;
  isComplete: boolean;
  incompleteReason: string | null;
}

export interface ProductSalesProfitability {
  productId: string;
  productName: string;
  sku: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
  historicalCost: number | null;
  contributionProfit: number | null;
  contributionMarginPct: number | null;
}

export interface ProductProductionIntelligence {
  productId: string;
  productName: string;
  sku: string;
  batchesCompleted: number;
  unitsProduced: number;
  productionCost: number | null;
  averageProductionCostPerUnit: number | null;
  latestProductionCostPerUnit: number | null;
}

export interface ProductIntelligenceRow {
  productId: string;
  productName: string;
  sku: string;
  currentEconomics: ProductCurrentEconomics;
  sales: ProductSalesProfitability;
  production: ProductProductionIntelligence;
}

export interface ProductIntelligence {
  period: AnalyticsDateRange;
  products: ProductIntelligenceRow[];
}

/* ============================================================
   PRODUCTION INTELLIGENCE
   ============================================================ */

export interface ProductionSummary {
  totalBatches: number;
  completedBatches: number;
  cancelledBatches: number;
  unitsProduced: number;
  productionCost: number | null;
  averageProductionCostPerUnit: number | null;
}

export interface ProductionByProduct {
  productId: string;
  productName: string;
  sku: string;
  totalBatches: number;
  completedBatches: number;
  cancelledBatches: number;
  unitsProduced: number;
  productionCost: number | null;
  averageProductionCostPerUnit: number | null;
}

export interface ProductionByMonth {
  month: string;
  totalBatches: number;
  completedBatches: number;
  cancelledBatches: number;
  unitsProduced: number;
  productionCost: number | null;
}

export interface ProductionIntelligence {
  period: AnalyticsDateRange;
  summary: ProductionSummary;
  byProduct: ProductionByProduct[];
  byMonth: ProductionByMonth[];
}

/* ============================================================
   INVENTORY INTELLIGENCE
   ============================================================ */

export type InventoryStockStatus =
  | "OUT_OF_STOCK"
  | "LOW_STOCK"
  | "HEALTHY";

export interface InventoryFinishedProduct {
  productId: string;
  productName: string;
  sku: string;
  physicalStock: number;
  promotionalStock: number;
  availableStock: number;
  reorderLevel: number;
  stockStatus: InventoryStockStatus;
  valuationUnitCost: number | null;
  valuation: number | null;
  valuationComplete: boolean;
  valuationIncompleteReason: string | null;
}

export interface InventoryRawMaterial {
  rawMaterialId: string;
  name: string;
  baseUnit: "GRAM" | "MILLILITER" | "PIECE";
  currentQuantity: number;
  currentValue: number;
  weightedAverageCost: number;
}

export interface InventoryPackagingMaterial {
  packagingMaterialId: string;
  name: string;
  baseUnit: "PIECE";
  currentQuantity: number;
  currentValue: number;
  weightedAverageCost: number;
}

export interface InventoryLowStockProduct {
  productId: string;
  productName: string;
  sku: string;
  availableStock: number;
  reorderLevel: number;
  stockStatus: InventoryStockStatus;
}

export interface InventorySummary {
  finishedProductValue: number | null;
  rawMaterialValue: number | null;
  packagingMaterialValue: number | null;
  totalInventoryValue: number | null;
  finishedProductCount: number;
  rawMaterialCount: number;
  packagingMaterialCount: number;
  lowStockProductCount: number;
  outOfStockProductCount: number;
  valuationComplete: boolean;
  valuationIncompleteReason: string | null;
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
  period: AnalyticsDateRange;
  summary: InventoryMovementSummary;
  byMonth: InventoryMovementByMonth[];
}

export interface InventoryIntelligence {
  summary: InventorySummary;
  finishedProducts: InventoryFinishedProduct[];
  rawMaterials: InventoryRawMaterial[];
  packagingMaterials: InventoryPackagingMaterial[];
  lowStockProducts: InventoryLowStockProduct[];
  movement: InventoryMovementIntelligence;
}

/* ============================================================
   EXPENSE INTELLIGENCE
   ============================================================ */

export interface ExpenseSummary {
  totalExpenses: number;
  expenseCount: number;
  averageExpense: number | null;
  recurringExpenseTotal: number;
  recurringExpenseCount: number;
}

export interface ExpenseByCategory {
  category: ExpenseCategory;
  totalAmount: number;
  expenseCount: number;
  percentageOfTotal: number | null;
}

export interface ExpenseByMonth {
  month: string;
  totalAmount: number;
  expenseCount: number;
}

export interface ExpenseTrend {
  currentPeriodExpenses: number;
  previousPeriodExpenses: number;
  changeAmount: number;
  changePercentage: number | null;
}

export interface ExpenseConcentration {
  topCategorySharePct: number | null;
  topThreeCategorySharePct: number | null;
}

export interface ExpenseIntelligence {
  period: AnalyticsDateRange;
  summary: ExpenseSummary;
  byCategory: ExpenseByCategory[];
  majorCategories: ExpenseByCategory[];
  byMonth: ExpenseByMonth[];
  trend: ExpenseTrend;
  concentration: ExpenseConcentration;
}

/* ============================================================
   CASH FLOW INTELLIGENCE
   ============================================================ */

export interface CashFlowSummary {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  customerCollections: number;
  otherIncome: number;
  inventoryCashOutflow: number;
  operatingCashOutflow: number;
  shippingPayments: number;
  paymentProcessingFees: number;
  refunds: number;
  otherCashOutflow: number;
}

export interface CashFlowByMonth {
  month: string;
  inflows: number;
  outflows: number;
  netCashFlow: number;
}

export interface CashFlowByCategory {
  category: CashTransactionCategory;
  type: CashTransactionType;
  amount: number;
  percentageOfTotal: number | null;
  count: number;
}

export interface CashFlowTrend {
  currentPeriodNetCashFlow: number;
  previousPeriodNetCashFlow: number;
  changeAmount: number;
  changePercentage: number | null;
}

export interface CashFlowIntelligence {
  period: AnalyticsDateRange;
  summary: CashFlowSummary;
  byMonth: CashFlowByMonth[];
  byCategory: CashFlowByCategory[];
  trend: CashFlowTrend;
}