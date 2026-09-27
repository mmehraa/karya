
import { db } from "@/lib/db";
import type { AnalyticsDateRange } from "@/modules/analytics/types";
import type {
  InvestorDecisionInsight,
  InvestorMetric,
  InvestorMetricGroup,
  InvestorMetricsDashboard,
  InvestorMetricsOptions,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30.4375;

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function nextDay(date: Date): Date {
  return new Date(startOfDay(date).getTime() + DAY_MS);
}

function getPeriod(options: InvestorMetricsOptions = {}): AnalyticsDateRange {
  const now = new Date();
  const to = endOfDay(options.to ?? now);
  const from = options.from
    ? startOfDay(options.from)
    : new Date(Date.UTC(to.getUTCFullYear(), 0, 1));

  if (from > to) {
    throw new Error("Start date must be on or before the end date.");
  }

  return { from, to };
}

function periodFilter(period: AnalyticsDateRange) {
  return {
    gte: period.from ?? undefined,
    lt: nextDay(period.to),
  };
}

function sum(values: Array<number | { toString(): string }>): number {
  return values.reduce<number>(
    (total, value) => total + Number(value),
    0,
  );
}

function divide(numerator: number, denominator: number): number | null {
  return denominator > 0 && Number.isFinite(numerator / denominator)
    ? numerator / denominator
    : null;
}

function makeMetric(
  period: AnalyticsDateRange,
  asOfDate: Date,
  input: Omit<InvestorMetric, "period" | "asOfDate" | "limitations"> & {
    limitations?: string[];
  },
): InvestorMetric {
  return {
    ...input,
    period,
    asOfDate,
    limitations: input.limitations ?? [],
  };
}

function makeGroup(
  key: string,
  label: string,
  description: string,
  metrics: InvestorMetric[],
): InvestorMetricGroup {
  return { key, label, description, metrics };
}

function makeInsight(
  key: string,
  title: string,
  description: string,
  classification: InvestorDecisionInsight["classification"],
  relatedMetricKeys: string[],
  limitations: string[] = [],
): InvestorDecisionInsight {
  return {
    key,
    title,
    description,
    classification,
    relatedMetricKeys,
    limitations,
  };
}

function normalizeCurrencyCode(code: string | null | undefined): string {
  return (code ?? "INR").trim().toUpperCase();
}

/**
 * Investor-facing metrics based on existing local business records.
 *
 * Accounting conventions:
 * - DELIVERED orders are the operational proxy for earned sales.
 * - PAID orders are reported separately as collections.
 * - Historical OrderItem.costPriceSnapshot values are used for COGS.
 * - The cash-ledger net is an estimate, not a bank-verified balance.
 * - CAC and LTV remain unavailable without supporting data.
 * - TAM, SAM, and SOM are documented assumptions, not verified measurements.
 * - Manually entered cash and market assumptions are only shown as monetary
 *   values when their currency matches the business reporting currency.
 *
 * All database queries are scoped to the supplied businessId.
 */
export async function getInvestorMetricsDashboard(
  businessId: string,
  options: InvestorMetricsOptions = {},
): Promise<InvestorMetricsDashboard> {
  if (!businessId.trim()) {
    throw new Error("A business ID is required.");
  }

  const period = getPeriod(options);
  const asOfDate = new Date();
  const dateFilter = periodFilter(period);

  const [
    settings,
    deliveredOrders,
    paidOrders,
    expenses,
    cashTransactions,
    customerCount,
    verifiedCashBalance,
    marketAssumptions,
  ] = await Promise.all([
    db.businessSettings.findUnique({
      where: { businessId },
      select: { currencyCode: true },
    }),

    db.order.findMany({
      where: {
        businessId,
        fulfillmentStatus: "DELIVERED",
        orderDate: dateFilter,
      },
      select: {
        totalAmount: true,
        items: {
          select: {
            quantity: true,
            costPriceSnapshot: true,
          },
        },
      },
    }),

    db.order.findMany({
      where: {
        businessId,
        paymentStatus: "PAID",
        orderDate: dateFilter,
      },
      select: { totalAmount: true },
    }),

    db.expense.findMany({
      where: {
        businessId,
        expenseDate: dateFilter,
      },
      select: {
        amount: true,
        isRecurring: true,
      },
    }),

    db.cashTransaction.findMany({
      where: { businessId },
      select: {
        type: true,
        amount: true,
        transactionDate: true,
      },
    }),

    db.customer.count({ where: { businessId } }),

    db.investorVerifiedCashBalance.findFirst({
      where: { businessId },
      orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }],
      select: {
        amount: true,
        currencyCode: true,
        asOfDate: true,
        sourceDescription: true,
        notes: true,
      },
    }),

    db.investorMarketAssumption.findMany({
      where: { businessId },
      orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        market: true,
        value: true,
        currencyCode: true,
        marketDefinition: true,
        geography: true,
        methodology: true,
        sourceType: true,
        sourceName: true,
        sourceUrl: true,
        asOfDate: true,
        notes: true,
      },
    }),
  ]);

  const currencyCode = normalizeCurrencyCode(settings?.currencyCode);
  const deliveredCount = deliveredOrders.length;
  const paidCount = paidOrders.length;
  const expenseCount = expenses.length;
  const hasCashHistory = cashTransactions.length > 0;

  const earnedRevenue = sum(deliveredOrders.map((order) => order.totalAmount));
  const paidCollections = sum(paidOrders.map((order) => order.totalAmount));

  const deliveredUnits = deliveredOrders.reduce(
    (total, order) =>
      total +
      order.items.reduce((subtotal, item) => subtotal + item.quantity, 0),
    0,
  );

  const deliveredCogs = deliveredOrders.reduce(
    (total, order) =>
      total +
      order.items.reduce(
        (subtotal, item) =>
          subtotal + Number(item.costPriceSnapshot) * item.quantity,
        0,
      ),
    0,
  );

  const grossProfit = earnedRevenue - deliveredCogs;
  const grossMargin = divide(grossProfit, earnedRevenue);
  const recordedExpenses = sum(expenses.map((expense) => expense.amount));
  const recurringExpenses = sum(
    expenses
      .filter((expense) => expense.isRecurring)
      .map((expense) => expense.amount),
  );

  const periodStart = period.from ?? period.to;
  const periodDays = Math.max(
    1,
    Math.ceil(
      (nextDay(period.to).getTime() - periodStart.getTime()) / DAY_MS,
    ),
  );

  const averageMonthlyExpense =
    (recordedExpenses / periodDays) * DAYS_PER_MONTH;

  const periodTransactions = cashTransactions.filter(
    (transaction) =>
      transaction.transactionDate >= periodStart &&
      transaction.transactionDate < nextDay(period.to),
  );

  const ledgerBalance = cashTransactions.reduce(
    (total, transaction) =>
      total +
      (transaction.type === "INFLOW"
        ? Number(transaction.amount)
        : -Number(transaction.amount)),
    0,
  );

  const netCashMovement = periodTransactions.reduce(
    (total, transaction) =>
      total +
      (transaction.type === "INFLOW"
        ? Number(transaction.amount)
        : -Number(transaction.amount)),
    0,
  );

  const periodCashOutflow = sum(
    periodTransactions
      .filter((transaction) => transaction.type === "OUTFLOW")
      .map((transaction) => transaction.amount),
  );

  const averageMonthlyCashOutflow =
    (periodCashOutflow / periodDays) * DAYS_PER_MONTH;

  const estimatedRunway =
    ledgerBalance > 0 && averageMonthlyCashOutflow > 0
      ? ledgerBalance / averageMonthlyCashOutflow
      : null;

  const verifiedCashCurrency = verifiedCashBalance
    ? normalizeCurrencyCode(verifiedCashBalance.currencyCode)
    : null;

  const verifiedCashCurrencyMatches =
    verifiedCashCurrency === currencyCode;

  const verifiedCashAmount =
    verifiedCashBalance && verifiedCashCurrencyMatches
      ? Number(verifiedCashBalance.amount)
      : null;

  const verifiedRunway =
    verifiedCashAmount !== null &&
    verifiedCashAmount > 0 &&
    averageMonthlyCashOutflow > 0
      ? verifiedCashAmount / averageMonthlyCashOutflow
      : null;

  const latestMarketAssumptions = new Map<
    "TAM" | "SAM" | "SOM",
    (typeof marketAssumptions)[number]
  >();

  for (const assumption of marketAssumptions) {
    if (!latestMarketAssumptions.has(assumption.market)) {
      latestMarketAssumptions.set(assumption.market, assumption);
    }
  }

  const salesLimitations = [
    "Includes only orders marked DELIVERED within the selected order-date period.",
    "The current order data does not separately model tax, returns, or accounting revenue adjustments.",
  ];

  const cogsLimitations = [
    "Uses the historical cost snapshot stored on each order item.",
    "Shipping fulfillment costs and payment-processing fees are not consistently allocated to individual orders.",
  ];

  const fundamentals = makeGroup(
    "fundamentals",
    "Business fundamentals",
    "Recorded sales, expenses, and cash movement for the selected period.",
    [
      makeMetric(period, asOfDate, {
        key: "earnedRevenue",
        label: "Earned revenue",
        value: deliveredCount ? earnedRevenue : null,
        unit: "CURRENCY",
        classification: deliveredCount ? "CALCULATED" : "UNAVAILABLE",
        completeness: deliveredCount ? "PARTIAL" : "UNAVAILABLE",
        formula:
          "Sum of total amounts for DELIVERED orders in the selected period.",
        explanation:
          "Delivered orders are used as the operational earned-sales proxy.",
        source: "ORDERS",
        limitations: salesLimitations,
      }),

      makeMetric(period, asOfDate, {
        key: "paidCollections",
        label: "Paid collections",
        value: paidCount ? paidCollections : null,
        unit: "CURRENCY",
        classification: paidCount ? "CALCULATED" : "UNAVAILABLE",
        completeness: paidCount ? "PARTIAL" : "UNAVAILABLE",
        formula:
          "Sum of total amounts for orders marked PAID in the selected period.",
        explanation:
          "Collections are shown separately from delivered-order revenue.",
        source: "ORDERS",
        limitations: [
          "Based on order payment status and order date, not bank reconciliation.",
          "Refunds and settlement timing may differ from actual cash received during the period.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "recordedExpenses",
        label: "Recorded expenses",
        value: expenseCount ? recordedExpenses : null,
        unit: "CURRENCY",
        classification: expenseCount ? "CALCULATED" : "UNAVAILABLE",
        completeness: expenseCount ? "PARTIAL" : "UNAVAILABLE",
        formula: "Sum of Expense.amount by expenseDate.",
        explanation:
          "Expenses entered in Karya for this business and period.",
        source: "EXPENSES",
        limitations: [
          "Unrecorded costs are not included.",
          "Inventory purchases and other cash movements are not automatically treated as P&L expenses.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "recurringExpenses",
        label: "Recorded recurring expenses",
        value: expenses.some((expense) => expense.isRecurring)
          ? recurringExpenses
          : null,
        unit: "CURRENCY",
        classification: expenses.some((expense) => expense.isRecurring)
          ? "CALCULATED"
          : "UNAVAILABLE",
        completeness: "PARTIAL",
        formula:
          "Sum of expenses marked isRecurring in the selected period.",
        explanation:
          "A partial view of recurring commitments entered in Karya.",
        source: "EXPENSES",
        limitations: [
          "Does not include future obligations or recurring bills that have not been entered.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "ledgerNetCashMovement",
        label: "Ledger net cash movement",
        value: hasCashHistory ? netCashMovement : null,
        unit: "CURRENCY",
        classification: hasCashHistory ? "CALCULATED" : "UNAVAILABLE",
        completeness: hasCashHistory ? "PARTIAL" : "UNAVAILABLE",
        formula: "Period cash-ledger inflows minus outflows.",
        explanation: "Recorded cash movement, not profit.",
        source: "CASH_LEDGER",
        limitations: [
          "Depends on the completeness and accuracy of the cash ledger.",
          "Not reconciled against bank, wallet, or payment-provider balances.",
        ],
      }),
    ],
  );

  const unitEconomics = makeGroup(
    "unit-economics",
    "Unit economics",
    "Order-level economics using historical item cost snapshots.",
    [
      makeMetric(period, asOfDate, {
        key: "averageDeliveredOrderValue",
        label: "Average delivered order value",
        value: deliveredCount ? earnedRevenue / deliveredCount : null,
        unit: "CURRENCY",
        classification: deliveredCount ? "CALCULATED" : "UNAVAILABLE",
        completeness: deliveredCount ? "COMPLETE" : "UNAVAILABLE",
        formula:
          "Delivered-order total value divided by delivered order count.",
        explanation:
          "Average order value for delivered orders in the selected period.",
        source: "ORDERS",
        limitations: salesLimitations,
      }),

      makeMetric(period, asOfDate, {
        key: "deliveredCogs",
        label: "Delivered-order COGS",
        value: deliveredCount ? deliveredCogs : null,
        unit: "CURRENCY",
        classification: deliveredCount ? "CALCULATED" : "UNAVAILABLE",
        completeness: deliveredCount ? "PARTIAL" : "UNAVAILABLE",
        formula:
          "Sum of item cost snapshots multiplied by item quantities for delivered orders.",
        explanation:
          "Uses the cost snapshot captured when each order item was created.",
        source: "ORDER_COST_SNAPSHOTS",
        limitations: cogsLimitations,
      }),

      makeMetric(period, asOfDate, {
        key: "grossProfit",
        label: "Gross profit proxy",
        value: deliveredCount ? grossProfit : null,
        unit: "CURRENCY",
        classification: deliveredCount ? "CALCULATED" : "UNAVAILABLE",
        completeness: deliveredCount ? "PARTIAL" : "UNAVAILABLE",
        formula:
          "Delivered-order total value minus historical order-item COGS.",
        explanation:
          "An operational gross-profit proxy, not a finalized accounting statement.",
        source: "DERIVED",
        limitations: [...salesLimitations, ...cogsLimitations],
      }),

      makeMetric(period, asOfDate, {
        key: "grossMargin",
        label: "Gross margin proxy",
        value: grossMargin,
        unit: "PERCENTAGE",
        classification: grossMargin === null ? "UNAVAILABLE" : "CALCULATED",
        completeness: grossMargin === null ? "UNAVAILABLE" : "PARTIAL",
        formula:
          "(Delivered revenue − historical item COGS) ÷ delivered revenue.",
        explanation:
          "Stored as a decimal ratio; multiply by 100 to display as a percentage.",
        source: "DERIVED",
        limitations: [...salesLimitations, ...cogsLimitations],
      }),

      makeMetric(period, asOfDate, {
        key: "averageUnitsPerDeliveredOrder",
        label: "Average units per delivered order",
        value: deliveredCount ? deliveredUnits / deliveredCount : null,
        unit: "UNITS",
        classification: deliveredCount ? "CALCULATED" : "UNAVAILABLE",
        completeness: deliveredCount ? "COMPLETE" : "UNAVAILABLE",
        formula:
          "Delivered item quantity divided by delivered order count.",
        explanation: "Average number of units per delivered order.",
        source: "ORDERS",
      }),
    ],
  );

  const startupMetrics = makeGroup(
    "startup-metrics",
    "Startup and investor metrics",
    "Historical estimates and investor metrics that require additional data.",
    [
      makeMetric(period, asOfDate, {
        key: "averageMonthlyRecordedExpense",
        label: "Average monthly recorded expenses",
        value: expenseCount ? averageMonthlyExpense : null,
        unit: "CURRENCY",
        classification: expenseCount ? "ESTIMATED" : "UNAVAILABLE",
        completeness: expenseCount ? "PARTIAL" : "UNAVAILABLE",
        formula:
          "Recorded period expenses ÷ period days × 30.4375.",
        explanation:
          "Normalized historical expense pace, not a forward budget.",
        source: "EXPENSES",
        limitations: [
          "A short or unusual reporting period may not represent a sustainable monthly cost base.",
          "Missing or irregularly entered expenses will understate this estimate.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "ledgerCashBalanceProxy",
        label: "Ledger cash balance proxy",
        value: hasCashHistory ? ledgerBalance : null,
        unit: "CURRENCY",
        classification: hasCashHistory ? "ESTIMATED" : "UNAVAILABLE",
        completeness: hasCashHistory ? "PARTIAL" : "UNAVAILABLE",
        formula:
          "All-time recorded ledger inflows minus all-time recorded ledger outflows.",
        explanation:
          "Ledger-derived proxy only; not verified available cash.",
        source: "CASH_LEDGER",
        limitations: [
          "Not bank-verified or reconciled.",
          "May omit opening balances, unrecorded transactions, transfers, or settlement timing.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "verifiedCashBalance",
        label: "Verified cash balance",
        value: verifiedCashAmount,
        unit: "CURRENCY",
        classification:
          verifiedCashBalance && verifiedCashCurrencyMatches
            ? "ACTUAL"
            : "UNAVAILABLE",
        completeness:
          verifiedCashBalance && verifiedCashCurrencyMatches
            ? "PARTIAL"
            : "UNAVAILABLE",
        formula:
          "Most recently recorded verified cash balance for this business, shown only when its currency matches the reporting currency.",
        explanation: verifiedCashBalance
          ? verifiedCashCurrencyMatches
            ? `Recorded as of ${verifiedCashBalance.asOfDate.toLocaleDateString()}; source: ${verifiedCashBalance.sourceDescription}.`
            : `A cash balance is recorded in ${verifiedCashCurrency}, but the business reporting currency is ${currencyCode}. Currency conversion is not performed, so the amount is not displayed as a reporting-currency value.`
          : "No verified cash balance has been recorded.",
        source: verifiedCashBalance ? "BUSINESS_ASSUMPTION" : "NONE",
        limitations: verifiedCashBalance
          ? [
              "A manually recorded balance; verify that the source statement or account evidence is current.",
              "This is a point-in-time balance and may not represent funds available after outstanding obligations.",
              ...(verifiedCashCurrencyMatches
                ? []
                : [
                    `Recorded currency ${verifiedCashCurrency} differs from reporting currency ${currencyCode}; the value is withheld to avoid misrepresentation.`,
                  ]),
              ...(verifiedCashBalance.notes
                ? [verifiedCashBalance.notes]
                : []),
            ]
          : [
              "Enter a dated, sourced balance to distinguish verified cash from the ledger proxy.",
            ],
      }),

      makeMetric(period, asOfDate, {
        key: "averageMonthlyCashOutflow",
        label: "Average monthly recorded cash outflow",
        value: periodCashOutflow > 0 ? averageMonthlyCashOutflow : null,
        unit: "CURRENCY",
        classification:
          periodCashOutflow > 0 ? "ESTIMATED" : "UNAVAILABLE",
        completeness:
          periodCashOutflow > 0 ? "PARTIAL" : "UNAVAILABLE",
        formula:
          "Period ledger outflows ÷ period days × 30.4375.",
        explanation:
          "Historical cash-outflow pace, not necessarily operating burn.",
        source: "CASH_LEDGER",
        limitations: [
          "Depends on ledger completeness and how representative the selected period is.",
          "May include inventory or capital purchases rather than operating costs alone.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "estimatedRunwayMonths",
        label: "Estimated ledger-based runway",
        value: estimatedRunway,
        unit: "MONTHS",
        classification:
          estimatedRunway === null ? "UNAVAILABLE" : "ESTIMATED",
        completeness:
          estimatedRunway === null ? "UNAVAILABLE" : "PARTIAL",
        formula:
          "Positive all-time ledger balance proxy ÷ average monthly recorded cash outflow.",
        explanation:
          "Illustrative proxy only; the database does not currently store a verified cash balance.",
        source: "DERIVED",
        limitations: [
          "Not confirmed runway because cash is not bank-verified.",
          "Assumes the selected-period outflow pace continues.",
          "Does not model future revenue, financing, or planned spending.",
          "Unavailable if the ledger balance is non-positive or no outflows were recorded.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "verifiedRunwayMonths",
        label: "Verified-cash-based runway estimate",
        value: verifiedRunway,
        unit: "MONTHS",
        classification:
          verifiedRunway === null ? "UNAVAILABLE" : "ESTIMATED",
        completeness:
          verifiedRunway === null ? "UNAVAILABLE" : "PARTIAL",
        formula:
          "Latest recorded verified cash balance ÷ average monthly recorded cash outflow.",
        explanation:
          verifiedRunway === null
            ? verifiedCashBalance && !verifiedCashCurrencyMatches
              ? `Unavailable because the saved cash balance is in ${verifiedCashCurrency}, while the reporting currency is ${currencyCode}.`
              : "Unavailable until a positive verified cash balance and positive recorded cash outflow are available."
            : "Uses the latest manually verified cash balance and the selected-period historical cash-outflow pace.",
        source: "DERIVED",
        limitations: [
          "The cash balance is manually recorded and is not independently reconciled by Karya.",
          "Assumes the selected-period outflow pace continues.",
          "Does not model future revenue, financing, planned spending, or outstanding obligations.",
          "This is an estimate, not a forecast or assurance of liquidity.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "customerCount",
        label: "Customers recorded",
        value: customerCount,
        unit: "COUNT",
        classification: "ACTUAL",
        completeness: "COMPLETE",
        formula:
          "Count of customer records for this business as of calculation time.",
        explanation:
          "Current customer-record count, not period-specific customer acquisition.",
        source: "CUSTOMERS",
        limitations: [
          "Customer records do not establish acquisition source, first purchase date, or marketing attribution.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "customerAcquisitionCost",
        label: "Customer acquisition cost (CAC)",
        value: null,
        unit: "CURRENCY",
        classification: "UNAVAILABLE",
        completeness: "UNAVAILABLE",
        formula:
          "Attributable acquisition spend divided by new customers acquired in the same cohort and period.",
        explanation:
          "Not calculated because marketing spend is not reliably attributed to new customers.",
        source: "NONE",
        limitations: [
          "The current schema does not record customer acquisition source or cohort attribution.",
          "Marketing expense alone is insufficient for defensible CAC.",
        ],
      }),

      makeMetric(period, asOfDate, {
        key: "customerLifetimeValue",
        label: "Customer lifetime value (LTV)",
        value: null,
        unit: "CURRENCY",
        classification: "UNAVAILABLE",
        completeness: "UNAVAILABLE",
        formula:
          "Requires validated customer-level contribution margin and repeat-purchase or retention modeling.",
        explanation:
          "Not calculated because the available records do not support a validated lifetime-value model.",
        source: "NONE",
        limitations: [
          "Historical customer records alone do not establish future lifetime value.",
          "A defensible contribution-margin basis and adequate cohort history are needed.",
        ],
      }),

      ...(["tam", "sam", "som"] as const).map((key) => {
        const market = key.toUpperCase() as "TAM" | "SAM" | "SOM";
        const assumption = latestMarketAssumptions.get(market);
        const assumptionCurrency = assumption
          ? normalizeCurrencyCode(assumption.currencyCode)
          : null;
        const currencyMatches =
          assumption !== undefined &&
          assumptionCurrency === currencyCode;

        return makeMetric(period, asOfDate, {
          key,
          label:
            key === "tam"
              ? "Total addressable market (TAM)"
              : key === "sam"
                ? "Serviceable available market (SAM)"
                : "Serviceable obtainable market (SOM)",
          value:
            assumption && currencyMatches
              ? Number(assumption.value)
              : null,
          unit: "CURRENCY",
          classification: !assumption
            ? "UNAVAILABLE"
            : currencyMatches
              ? "USER_PROVIDED_ASSUMPTION"
              : "UNAVAILABLE",
          completeness:
            assumption && currencyMatches
              ? "PARTIAL"
              : "UNAVAILABLE",
          formula:
            key === "tam"
              ? "Documented market-size assumption with definition, geography, methodology, source, and as-of date."
              : key === "sam"
                ? "Documented serviceable-market assumption narrowed by target segment, product scope, and geography."
                : "Documented obtainable-market assumption based on stated capacity, channels, and competitive context.",
          explanation: assumption
            ? currencyMatches
              ? `${assumption.marketDefinition} Geography: ${assumption.geography}. Method: ${assumption.methodology}. As of ${assumption.asOfDate.toLocaleDateString()}.`
              : `A ${market} assumption is saved in ${assumptionCurrency}, but the business reporting currency is ${currencyCode}. Currency conversion is not performed, so the amount is withheld rather than shown with the wrong currency.`
            : "No documented market-sizing assumption is currently stored.",
          source: assumption
            ? assumption.sourceType === "EXTERNAL_RESEARCH"
              ? "EXTERNAL_RESEARCH"
              : "BUSINESS_ASSUMPTION"
            : "NONE",
          limitations: assumption
            ? [
                `Recorded currency: ${assumptionCurrency}. Reporting currency: ${currencyCode}.`,
                ...(assumption.sourceName
                  ? [`Source: ${assumption.sourceName}.`]
                  : []),
                ...(assumption.sourceUrl
                  ? [`Source URL: ${assumption.sourceUrl}`]
                  : []),
                ...(assumption.notes ? [assumption.notes] : []),
                ...(!currencyMatches
                  ? [
                      "The stored value is not displayed because its currency differs from the business reporting currency; no exchange-rate conversion is applied.",
                    ]
                  : []),
                "This is a documented assumption, not independently verified market measurement.",
              ]
            : [
                "Market-size assumptions are not yet recorded for this business.",
                "Document definition, geography, methodology, source, and as-of date before investor use.",
              ],
        });
      }),
    ],
  );

  const insights: InvestorDecisionInsight[] = [
    makeInsight(
      "sales-coverage",
      deliveredCount
        ? "Delivered sales are available"
        : "Delivered sales are not available for this period",
      deliveredCount
        ? "Earned revenue and order-level cost snapshots support a preliminary gross-margin view. Review the metric limitations before using it in formal investor materials."
        : "No delivered orders were found in the selected period, so order-based earned revenue and gross-margin metrics are unavailable.",
      deliveredCount ? "CALCULATED" : "UNAVAILABLE",
      ["earnedRevenue", "deliveredCogs", "grossProfit", "grossMargin"],
      cogsLimitations,
    ),

    makeInsight(
      "runway-qualification",
      verifiedRunway === null && estimatedRunway === null
        ? "Runway estimates need cash and outflow data"
        : verifiedRunway !== null
          ? "A verified-cash-based runway estimate is available"
          : "Only a ledger-based runway proxy is available",
      verifiedRunway !== null
        ? "The estimate uses the latest manually recorded verified cash balance and the selected-period recorded cash-outflow pace. Confirm the balance evidence and review the limitations before relying on it."
        : estimatedRunway !== null
          ? "A ledger-based estimate is available, but no usable verified cash balance and outflow combination is recorded. Reconcile cash against actual accounts before relying on it."
          : verifiedCashBalance && !verifiedCashCurrencyMatches
            ? `A cash balance is recorded in ${verifiedCashCurrency}, but it cannot be combined with ledger outflows denominated in ${currencyCode} without currency conversion.`
            : "A positive cash balance and recorded cash outflows are required. Record a verified balance to distinguish it from the ledger proxy.",
      verifiedRunway !== null || estimatedRunway !== null
        ? "ESTIMATED"
        : "UNAVAILABLE",
      [
        "verifiedCashBalance",
        "verifiedRunwayMonths",
        "ledgerCashBalanceProxy",
        "averageMonthlyCashOutflow",
        "estimatedRunwayMonths",
      ],
    ),

    makeInsight(
      "cac-ltv-data-gap",
      "CAC and LTV require stronger customer attribution",
      "Marketing expenses and customer counts do not reliably connect acquisition spend to new-customer cohorts or establish a validated lifetime-value model.",
      "UNAVAILABLE",
      ["customerAcquisitionCost", "customerLifetimeValue", "customerCount"],
    ),

    makeInsight(
      "market-sizing-inputs",
      "Market sizing uses documented assumptions",
      latestMarketAssumptions.size
        ? "The dashboard displays the latest saved TAM, SAM, and SOM assumptions when their currency matches the business reporting currency. Review each definition, geography, methodology, source, currency, and as-of date; these remain assumptions rather than independently verified market measurements."
        : "TAM, SAM, and SOM should be supported by a clear definition, geography, methodology, source, and as-of date before being presented as investor-ready figures. No assumptions are currently saved.",
      latestMarketAssumptions.size
        ? "USER_PROVIDED_ASSUMPTION"
        : "UNAVAILABLE",
      ["tam", "sam", "som"],
    ),
  ];

  const reportingContext = makeGroup(
    "reporting-context",
    "Reporting context",
    "Currency used for monetary metrics.",
    [
      makeMetric(period, asOfDate, {
        key: "reportingCurrency",
        label: "Reporting currency",
        value: null,
        unit: "COUNT",
        classification: "ACTUAL",
        completeness: "COMPLETE",
        formula: "BusinessSettings.currencyCode.",
        explanation: `Monetary values use ${currencyCode}.`,
        source: "BUSINESS_ASSUMPTION",
      }),
    ],
  );

  return {
    period,
    fundamentals: {
      period,
      metrics: [fundamentals, reportingContext],
    },
    unitEconomics: {
      period,
      metrics: [unitEconomics],
    },
    startupMetrics: {
      period,
      metrics: [startupMetrics],
    },
    insights,
  };
}