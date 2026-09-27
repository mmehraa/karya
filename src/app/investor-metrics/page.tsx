
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Info,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getInvestorMetricsDashboard } from "@/modules/investor-metrics/services";
import InvestorMetricsInputs from "@/modules/investor-metrics/components/investor-metrics-inputs";
import type {
  InvestorDecisionInsight,
  InvestorMetric,
  InvestorMetricGroup,
} from "@/modules/investor-metrics/types";
import { analyticsDateRangeSchema } from "@/modules/analytics/validation";

interface InvestorMetricsPageProps {
  searchParams?: Promise<{
    period?: string;
    from?: string;
    to?: string;
  }>;
}

type PeriodPreset = "ALL" | "7D" | "30D" | "3M" | "1Y";

const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "ALL", label: "Year to date" },
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "3M", label: "3M" },
  { value: "1Y", label: "1Y" },
];

function getPeriodStart(period: PeriodPreset): Date | undefined {
  const now = new Date();

  switch (period) {
    case "7D": {
      const date = new Date(now);
      date.setDate(date.getDate() - 7);
      return date;
    }
    case "30D": {
      const date = new Date(now);
      date.setDate(date.getDate() - 30);
      return date;
    }
    case "3M": {
      const date = new Date(now);
      date.setMonth(date.getMonth() - 3);
      return date;
    }
    case "1Y": {
      const date = new Date(now);
      date.setFullYear(date.getFullYear() - 1);
      return date;
    }
    default:
      return new Date(Date.UTC(now.getFullYear(), 0, 1));
  }
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getPeriodLabel(from: Date | null, to: Date): string {
  if (!from) return `All time through ${formatDate(to)}`;
  return `${formatDate(from)} – ${formatDate(to)}`;
}

function formatCurrency(value: number | null, currencyCode = "INR"): string {
  if (value === null || !Number.isFinite(value)) return "—";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }
}

function getReportingCurrency(metric: InvestorMetric): string {
  const match = metric.explanation.match(/\b[A-Z]{3}\b/);
  return match?.[0] ?? "INR";
}

function formatMetricValue(
  metric: InvestorMetric,
  currencyCode = "INR",
): string {
  // Reporting currency is descriptive metadata, not a numeric metric.
  // Display it even though its value is intentionally null.
  if (metric.key === "reportingCurrency") {
    return getReportingCurrency(metric);
  }

  if (metric.value === null || !Number.isFinite(metric.value)) {
    return "Not available";
  }

  switch (metric.unit) {
    case "CURRENCY":
      return formatCurrency(metric.value, currencyCode);
    case "PERCENTAGE":
      return `${(metric.value * 100).toFixed(1)}%`;
    case "MONTHS":
      return `${metric.value.toFixed(1)} months`;
    case "UNITS":
      return metric.value.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      });
    case "COUNT":
      return metric.value.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      });
    case "DAYS":
      return `${metric.value.toLocaleString("en-IN", {
        maximumFractionDigits: 1,
      })} days`;
    case "MULTIPLE":
      return `${metric.value.toFixed(2)}×`;
    default:
      return String(metric.value);
  }
}

function classificationStyles(classification: string): string {
  switch (classification) {
    case "ACTUAL":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "CALCULATED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "ESTIMATED":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ASSUMPTION":
    case "USER_PROVIDED_ASSUMPTION":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-500";
  }
}

function classificationLabel(classification: string): string {
  switch (classification) {
    case "ACTUAL":
      return "Actual";
    case "CALCULATED":
      return "Calculated";
    case "ESTIMATED":
      return "Estimated";
    case "ASSUMPTION":
    case "USER_PROVIDED_ASSUMPTION":
      return "Assumption";
    case "UNAVAILABLE":
    default:
      return "Unavailable";
  }
}

function completenessLabel(completeness: string): string {
  switch (completeness) {
    case "COMPLETE":
      return "Complete";
    case "PARTIAL":
      return "Partial data";
    default:
      return "Unavailable";
  }
}

function getMetric(
  groups: InvestorMetricGroup[],
  key: string,
): InvestorMetric | undefined {
  return groups
    .flatMap((group) => group.metrics)
    .find((metric) => metric.key === key);
}

function MetricCard({
  metric,
  currencyCode,
  featured = false,
}: {
  metric: InvestorMetric;
  currencyCode: string;
  featured?: boolean;
}) {
  const isUnavailable =
    metric.value === null && metric.key !== "reportingCurrency";

  return (
    <article
      className={`relative overflow-hidden rounded-[22px] border bg-white p-5 ${
        featured ? "border-emerald-200" : "border-slate-200"
      }`}
    >
      {featured && (
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-50" />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {metric.label}
          </p>
          <p
            className={`mt-3 break-words font-semibold tracking-[-0.045em] ${
              featured
                ? "text-[28px] text-slate-950"
                : "text-[24px] text-slate-900"
            }`}
          >
            {formatMetricValue(metric, currencyCode)}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            {completenessLabel(metric.completeness)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${classificationStyles(
            metric.classification,
          )}`}
        >
          {classificationLabel(metric.classification)}
        </span>
      </div>

      {metric.explanation && (
        <p className="relative mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
          {metric.explanation}
        </p>
      )}

      {(metric.formula || metric.limitations.length > 0) && (
        <details className="relative mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <summary className="cursor-pointer list-none text-[10px] font-semibold text-slate-600">
            View methodology and limitations
            <span className="float-right text-slate-400">＋</span>
          </summary>

          <div className="mt-3 space-y-3 text-[11px] leading-5 text-slate-600">
            {metric.formula && (
              <div>
                <p className="font-bold text-slate-700">Calculation</p>
                <p>{metric.formula}</p>
              </div>
            )}

            {metric.source && (
              <div>
                <p className="font-bold text-slate-700">Source</p>
                <p>{metric.source.replaceAll("_", " ")}</p>
              </div>
            )}

            {metric.limitations.length > 0 && (
              <div>
                <p className="font-bold text-slate-700">Limitations</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {metric.limitations.map((limitation, index) => (
                    <li key={`${metric.key}-limitation-${index}`}>
                      {limitation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {isUnavailable && (
        <div className="relative mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-[10px] leading-4 text-amber-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This metric is intentionally not calculated without sufficient
            supporting data.
          </span>
        </div>
      )}
    </article>
  );
}

function MetricSection({
  group,
  currencyCode,
  featuredKeys = [],
}: {
  group: InvestorMetricGroup;
  currencyCode: string;
  featuredKeys?: string[];
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
          <BarChart3 className="h-5 w-5 text-slate-700" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
            {group.label}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {group.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {group.metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            metric={metric}
            currencyCode={currencyCode}
            featured={featuredKeys.includes(metric.key)}
          />
        ))}
      </div>
    </section>
  );
}

function InsightCard({ insight }: { insight: InvestorDecisionInsight }) {
  const unavailable = insight.classification === "UNAVAILABLE";

  return (
    <article className="rounded-[20px] border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            unavailable ? "bg-amber-50" : "bg-emerald-50"
          }`}
        >
          {unavailable ? (
            <ShieldAlert className="h-4 w-4 text-amber-700" />
          ) : (
            <Lightbulb className="h-4 w-4 text-emerald-700" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              {insight.title}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${classificationStyles(
                insight.classification,
              )}`}
            >
              {classificationLabel(insight.classification)}
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-600">
            {insight.description}
          </p>

          {insight.limitations.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-[10px] leading-4 text-slate-500">
              {insight.limitations.map((limitation, index) => (
                <li key={`${insight.key}-limitation-${index}`}>
                  {limitation}
                </li>
              ))}
            </ul>
          )}

          {insight.relatedMetricKeys.length > 0 && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-[9px] font-medium uppercase tracking-[0.1em] text-slate-400">
              Related metrics: {insight.relatedMetricKeys.join(", ")}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function getCurrencyCode(groups: InvestorMetricGroup[]): string {
  const contextMetric = getMetric(groups, "reportingCurrency");
  return contextMetric ? getReportingCurrency(contextMetric) : "INR";
}

export default async function InvestorMetricsPage({
  searchParams,
}: InvestorMetricsPageProps) {
  const params = await searchParams;

  const period: PeriodPreset =
    params?.period === "7D" ||
    params?.period === "30D" ||
    params?.period === "3M" ||
    params?.period === "1Y" ||
    params?.period === "ALL"
      ? params.period
      : "ALL";

  const parsed = analyticsDateRangeSchema.safeParse({
    from: params?.from ?? "",
    to: params?.to ?? "",
  });

  const customFrom =
    parsed.success && parsed.data.from
      ? new Date(`${parsed.data.from}T00:00:00.000Z`)
      : undefined;

  const customTo =
    parsed.success && parsed.data.to
      ? new Date(`${parsed.data.to}T23:59:59.999Z`)
      : undefined;

  const validCustomFrom =
    customFrom !== undefined && !Number.isNaN(customFrom.getTime());

  const validCustomTo =
    customTo !== undefined && !Number.isNaN(customTo.getTime());

  const from = validCustomFrom ? customFrom : getPeriodStart(period);
  const to = validCustomTo ? customTo : new Date();

  const { businessId, business } = await getDashboardContext();

  const dashboard = await getInvestorMetricsDashboard(businessId, {
    from,
    to,
  });

  const allGroups = [
    ...dashboard.fundamentals.metrics,
    ...dashboard.unitEconomics.metrics,
    ...dashboard.startupMetrics.metrics,
  ];

  const currencyCode = getCurrencyCode(allGroups);

  const earnedRevenue = getMetric(allGroups, "earnedRevenue");
  const grossMargin = getMetric(allGroups, "grossMargin");
  const runway = getMetric(allGroups, "estimatedRunwayMonths");
  const customerCount = getMetric(allGroups, "customerCount");

  const primaryMetrics = [
    earnedRevenue,
    grossMargin,
    runway,
    customerCount,
  ].filter((metric): metric is InvestorMetric => metric !== undefined);

  const dateLabel = getPeriodLabel(
    dashboard.period.from,
    dashboard.period.to,
  );

  return (
    <main className="min-h-screen bg-[#f8faf9] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-4">
          <Link
            href="/analytics"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Analytics
          </Link>
        </div>

        <section className="relative z-20 overflow-visible rounded-[28px] border border-emerald-100 bg-white">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-50/80 blur-2xl" />
            <div className="absolute left-[42%] top-28 h-48 w-48 rounded-full bg-amber-50/60 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                </span>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-700">
                  Phase 5 · Investor Metrics
                </p>
              </div>

              <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.06em] text-slate-950 lg:text-[42px]">
                Investor Metrics
              </h1>

              <p className="mt-3 max-w-[700px] text-sm leading-6 text-slate-600">
                A transparent view of business fundamentals, unit economics,
                cash runway estimates, and startup metrics—with clear
                distinctions between recorded facts, calculations, estimates,
                and unavailable data.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full bg-slate-50 px-3 py-1.5">
                  {business.name}
                </span>
                <span>•</span>
                <span>{dateLabel}</span>
                <span>•</span>
                <span>{currencyCode}</span>
              </div>
            </div>

            <div className="relative z-30 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center rounded-full border border-slate-200 bg-white p-1">
                {PERIOD_PRESETS.map((item) => (
                  <Link
                    key={item.value}
                    href={`/investor-metrics?period=${item.value}`}
                    className={`rounded-full px-3 py-2 text-[10px] font-semibold transition ${
                      period === item.value && !validCustomFrom && !validCustomTo
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Custom
                  <span>⌄</span>
                </summary>

                <form
                  action="/investor-metrics"
                  className="absolute right-0 top-12 z-50 w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
                >
                  <p className="text-xs font-semibold text-slate-900">
                    Custom reporting period
                  </p>

                  <div className="mt-3 space-y-3">
                    <label className="block text-[10px] font-semibold text-slate-500">
                      From
                      <input
                        type="date"
                        name="from"
                        defaultValue={
                          parsed.success ? parsed.data.from ?? "" : ""
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
                      />
                    </label>

                    <label className="block text-[10px] font-semibold text-slate-500">
                      To
                      <input
                        type="date"
                        name="to"
                        defaultValue={
                          parsed.success ? parsed.data.to ?? "" : ""
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Apply period
                  </button>
                </form>
              </details>
            </div>
          </div>
        </section>

        <section className="relative z-0 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {primaryMetrics.map((metric, index) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              currencyCode={currencyCode}
              featured={index === 0}
            />
          ))}
        </section>

        <section className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
              <Info className="h-4 w-4 text-amber-700" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-amber-950">
                Read the numbers with context
              </h2>
              <p className="mt-1 text-xs leading-5 text-amber-900/80">
                These metrics are based on records currently available in Karya.
                Delivered orders are used as an operational earned-sales proxy;
                paid orders are tracked separately as collections. Cash runway
                is only a ledger-based estimate, not a verified bank balance.
                CAC, LTV, and market sizing remain unavailable until their
                supporting data and assumptions are documented.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5">
          <InvestorMetricsInputs />
        </div>

        <div className="mt-5 space-y-4">
          {dashboard.fundamentals.metrics.map((group) => (
            <MetricSection
              key={group.key}
              group={group}
              currencyCode={currencyCode}
              featuredKeys={["earnedRevenue", "paidCollections"]}
            />
          ))}

          {dashboard.unitEconomics.metrics.map((group) => (
            <MetricSection
              key={group.key}
              group={group}
              currencyCode={currencyCode}
              featuredKeys={["grossProfit", "grossMargin"]}
            />
          ))}

          {dashboard.startupMetrics.metrics.map((group) => (
            <MetricSection
              key={group.key}
              group={group}
              currencyCode={currencyCode}
              featuredKeys={[
                "estimatedRunwayMonths",
                "customerAcquisitionCost",
                "customerLifetimeValue",
              ]}
            />
          ))}
        </div>

        <section className="mt-5 rounded-[22px] border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50">
              <Lightbulb className="h-5 w-5 text-violet-700" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                Decision layer
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Data coverage and interpretation notes to help identify what
                can be assessed now and what needs additional evidence.
              </p>
            </div>
          </div>

          {dashboard.insights.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl bg-slate-50 text-center">
              <Info className="h-5 w-5 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                No decision insights are available for this period.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {dashboard.insights.map((insight) => (
                <InsightCard key={insight.key} insight={insight} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                Actual and calculated
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-900/80">
              Values derived from recorded business data. Calculations may
              still have limitations, which are shown on each metric.
            </p>
          </div>

          <div className="rounded-[20px] border border-amber-100 bg-amber-50/60 p-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-700" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                Estimates
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-amber-900/80">
              Directional indicators based on historical records and
              assumptions. They are not verified financial statements or
              forecasts.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">
                Data gaps
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Metrics are marked unavailable rather than fabricated when
              customer attribution, market research, or verified cash data is
              missing.
            </p>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-5 text-[10px] text-slate-400">
          <span>
            Investor Metrics · {business.name} · {dateLabel}
          </span>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1.5 font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <CircleDollarSign className="h-3.5 w-3.5" />
            View Business Analytics
          </Link>
        </div>
      </div>
    </main>
  );
}