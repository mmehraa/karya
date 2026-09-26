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