
import type { AnalyticsDateRange } from "@/modules/analytics/types";

/**
 * Classification communicates how a metric was obtained.
 * An assumption must never be presented as verified historical performance.
 */
export type InvestorMetricClassification =
  | "ACTUAL"
  | "CALCULATED"
  | "ESTIMATED"
  | "USER_PROVIDED_ASSUMPTION"
  | "UNAVAILABLE";

export type InvestorMetricCompleteness =
  | "COMPLETE"
  | "PARTIAL"
  | "UNAVAILABLE";

export type InvestorMetricUnit =
  | "CURRENCY"
  | "PERCENTAGE"
  | "COUNT"
  | "UNITS"
  | "DAYS"
  | "MONTHS"
  | "MULTIPLE";

export type InvestorMetricSource =
  | "ORDERS"
  | "ORDER_COST_SNAPSHOTS"
  | "PRODUCTION"
  | "INVENTORY"
  | "EXPENSES"
  | "CASH_LEDGER"
  | "CUSTOMERS"
  | "BUSINESS_ASSUMPTION"
  | "EXTERNAL_RESEARCH"
  | "DERIVED"
  | "NONE";

export interface InvestorMetric {
  key: string;
  label: string;
  value: number | null;
  unit: InvestorMetricUnit;
  classification: InvestorMetricClassification;
  completeness: InvestorMetricCompleteness;
  period: AnalyticsDateRange | null;
  asOfDate: Date | null;
  formula: string;
  explanation: string;
  source: InvestorMetricSource;
  limitations: string[];
}

export interface InvestorMetricGroup {
  key: string;
  label: string;
  description: string;
  metrics: InvestorMetric[];
}

export interface InvestorMarketAssumption {
  id: string;
  market: "TAM" | "SAM" | "SOM";
  value: number;
  currencyCode: string;
  marketDefinition: string;
  geography: string;
  methodology: string;
  sourceType: "USER_PROVIDED" | "EXTERNAL_RESEARCH";
  sourceName: string | null;
  sourceUrl: string | null;
  asOfDate: Date;
  notes: string | null;
}

export interface InvestorVerifiedCashBalance {
  amount: number;
  currencyCode: string;
  asOfDate: Date;
  sourceDescription: string;
  notes: string | null;
}

export interface InvestorMetricsOptions {
  from?: Date | null;
  to?: Date;
}

export interface InvestorBusinessFundamentals {
  period: AnalyticsDateRange;
  metrics: InvestorMetricGroup[];
}

export interface InvestorUnitEconomics {
  period: AnalyticsDateRange;
  metrics: InvestorMetricGroup[];
}

export interface InvestorStartupMetrics {
  period: AnalyticsDateRange;
  metrics: InvestorMetricGroup[];
}

export interface InvestorDecisionInsight {
  key: string;
  title: string;
  description: string;
  classification: InvestorMetricClassification;
  relatedMetricKeys: string[];
  limitations: string[];
}

export interface InvestorMetricsDashboard {
  period: AnalyticsDateRange;
  fundamentals: InvestorBusinessFundamentals;
  unitEconomics: InvestorUnitEconomics;
  startupMetrics: InvestorStartupMetrics;
  insights: InvestorDecisionInsight[];
}