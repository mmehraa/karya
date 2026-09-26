import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Factory,
  Package,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  getProductIntelligence,
  getProductionIntelligence,
  getRevenueIntelligence,
} from "@/modules/analytics/services";
import { analyticsDateRangeSchema } from "@/modules/analytics/validation";

interface AnalyticsPageProps {
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
}

function money(value: number, symbol: string) {
  return `${symbol}${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function percentage(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPeriodLabel(from: Date | null, to: Date) {
  if (!from) {
    return `All time through ${formatDate(to)}`;
  }

  return `${formatDate(from)} – ${formatDate(to)}`;
}

function getRevenueGrowthLabel(
  currentRevenue: number,
  previousRevenue: number,
) {
  if (previousRevenue === 0 && currentRevenue > 0) {
    return "No previous-period baseline";
  }

  if (previousRevenue === 0 && currentRevenue === 0) {
    return "No revenue in either period";
  }

  return "vs previous comparable period";
}

function emptyState(message: string) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl bg-slate-50">
      <div className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
          <BarChart3 className="h-5 w-5 text-slate-300" />
        </div>

        <p className="mt-3 text-sm font-medium text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}

function buildLinePoints(
  values: number[],
  width: number,
  height: number,
  paddingX = 20,
  paddingY = 24,
) {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : paddingX +
            (index / (values.length - 1)) *
              (width - paddingX * 2);

      const y =
        height -
        paddingY -
        ((value - min) / range) *
          (height - paddingY * 2);

      return `${x},${y}`;
    })
    .join(" ");
}

function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  paddingX = 20,
  paddingY = 24,
) {
  if (values.length === 0) {
    return "";
  }

  const points = buildLinePoints(
    values,
    width,
    height,
    paddingX,
    paddingY,
  );

  const firstX =
    values.length === 1
      ? width / 2
      : paddingX;

  const lastX =
    values.length === 1
      ? width / 2
      : width - paddingX;

  const bottomY = height - paddingY;

  return `M ${firstX} ${bottomY} L ${points
    .split(" ")
    .map((point) => point.replace(",", " "))
    .join(" L ")} L ${lastX} ${bottomY} Z`;
}

function getChannelGradient(
  channels: Array<{
    channel: string;
    revenue: number;
  }>,
) {
  if (channels.length === 0) {
    return "conic-gradient(#e2e8f0 0deg 360deg)";
  }

  const colors = [
    "#123f35",
    "#2563eb",
    "#f59e0b",
    "#8b5cf6",
    "#ef4444",
    "#06b6d4",
  ];

  const total = channels.reduce(
    (sum, item) => sum + item.revenue,
    0,
  );

  if (total === 0) {
    return "conic-gradient(#e2e8f0 0deg 360deg)";
  }

  let currentAngle = 0;

  const segments = channels.map((item, index) => {
    const start = currentAngle;
    const angle = (item.revenue / total) * 360;
    currentAngle += angle;

    return `${colors[index % colors.length]} ${start}deg ${currentAngle}deg`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function formatMetricNumber(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;

  const parsed = analyticsDateRangeSchema.safeParse({
    from: params?.from ?? "",
    to: params?.to ?? "",
  });

  const from =
    parsed.success && parsed.data.from
      ? new Date(`${parsed.data.from}T00:00:00`)
      : null;

  const to =
    parsed.success && parsed.data.to
      ? new Date(`${parsed.data.to}T23:59:59.999`)
      : new Date();

  const { businessId, business } =
    await getDashboardContext();

  const [
    settings,
    revenue,
    productIntelligence,
    productionIntelligence,
  ] = await Promise.all([
    import("@/lib/db").then(({ db }) =>
      db.businessSettings.findUnique({
        where: {
          businessId,
        },
        select: {
          currencySymbol: true,
        },
      }),
    ),

    getRevenueIntelligence(businessId, {
      from,
      to,
    }),

    getProductIntelligence(businessId, {
      from,
      to,
    }),

    getProductionIntelligence(businessId, {
      from,
      to,
    }),
  ]);

  const currencySymbol =
    settings?.currencySymbol ?? "₹";

  const maxProductRevenue = Math.max(
    ...revenue.byProduct.map(
      (item) => item.revenue,
    ),
    0,
  );

  const monthlyValues = revenue.byMonth.map(
    (item) => item.revenue,
  );

  const monthlyMax = Math.max(
    ...monthlyValues,
    0,
  );

  const growthPositive =
    revenue.growth.changePercentage !== null &&
    revenue.growth.changePercentage > 0;

  const growthNegative =
    revenue.growth.changePercentage !== null &&
    revenue.growth.changePercentage < 0;

  const channelGradient =
    getChannelGradient(
      revenue.byChannel.map((item) => ({
        channel: item.channel,
        revenue: item.revenue,
      })),
    );

  const isAllTime =
    revenue.period.from === null;

  const hasGrowthComparison =
    !isAllTime;

  const completeProductEconomics =
    productIntelligence.products.filter(
      (product) => product.currentEconomics.isComplete,
    ).length;

  const totalProducts =
    productIntelligence.products.length;

  const productionMonthlyUnits =
    productionIntelligence.byMonth.map(
      (item) => item.unitsProduced,
    );

  const productionMonthlyCosts =
    productionIntelligence.byMonth.map(
      (item) => item.productionCost ?? 0,
    );

  const maxProductionUnits = Math.max(
    ...productionMonthlyUnits,
    0,
  );

  const maxProductionCost = Math.max(
    ...productionMonthlyCosts,
    0,
  );

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f7f6f2]">
      <main className="mx-auto w-full max-w-[1480px] px-5 pb-12 pt-3 lg:px-8">
        {/* ============================================================
            HEADER
        ============================================================ */}

        <section className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-50/80 blur-3xl" />

          <div className="absolute bottom-[-100px] left-[38%] h-56 w-56 rounded-full bg-amber-50/60 blur-3xl" />

          <div className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                </span>

                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-700">
                  Business Intelligence
                </p>
              </div>

              <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.06em] text-slate-950 lg:text-[42px]">
                Revenue Intelligence
              </h1>

              <p className="mt-3 max-w-[700px] text-sm leading-6 text-slate-600">
                See how your sales are moving, which
                products are generating revenue, and
                where your orders are coming from.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full bg-slate-50 px-3 py-1.5">
                  {business.name}
                </span>

                <span>•</span>

                <span>
                  {getPeriodLabel(
                    revenue.period.from,
                    revenue.period.to,
                  )}
                </span>
              </div>
            </div>

            <form
              action="/analytics"
              className="relative rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />

                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Custom period
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="block">
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    From
                  </span>

                  <input
                    type="date"
                    name="from"
                    defaultValue={
                      parsed.success
                        ? parsed.data.from ?? ""
                        : ""
                    }
                    className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-emerald-600"
                  />
                </label>

                <label className="block">
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    To
                  </span>

                  <input
                    type="date"
                    name="to"
                    defaultValue={
                      parsed.success
                        ? parsed.data.to ?? ""
                        : ""
                    }
                    className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-emerald-600"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-xl bg-[#123f35] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0d3029]"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ============================================================
            REVENUE KPI CARDS
        ============================================================ */}

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-[22px] border border-emerald-100 bg-white p-5">
            <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-emerald-50" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Total Revenue
                </p>

                <p className="mt-3 text-[30px] font-semibold tracking-[-0.055em] text-slate-950">
                  {money(
                    revenue.summary.totalRevenue,
                    currencySymbol,
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Paid orders only
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                <CircleDollarSign className="h-5 w-5 text-emerald-700" />
              </span>
            </div>

            <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-emerald-50">
              <div className="h-full w-[72%] rounded-full bg-emerald-600" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[22px] border border-blue-100 bg-white p-5">
            <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-blue-50" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Paid Orders
                </p>

                <p className="mt-3 text-[30px] font-semibold tracking-[-0.055em] text-slate-950">
                  {revenue.summary.paidOrderCount.toLocaleString(
                    "en-IN",
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Orders included in revenue
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <ShoppingCart className="h-5 w-5 text-blue-700" />
              </span>
            </div>

            <div className="relative mt-5 flex items-center gap-1">
              {Array.from({
                length: Math.min(
                  Math.max(
                    revenue.summary.paidOrderCount,
                    1,
                  ),
                  12,
                ),
              }).map((_, index) => (
                <span
                  key={index}
                  className="h-1.5 flex-1 rounded-full bg-blue-500"
                />
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[22px] border border-amber-100 bg-white p-5">
            <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-amber-50" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Units Sold
                </p>

                <p className="mt-3 text-[30px] font-semibold tracking-[-0.055em] text-slate-950">
                  {revenue.summary.unitsSold.toLocaleString(
                    "en-IN",
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  From paid order items
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                <Package className="h-5 w-5 text-amber-700" />
              </span>
            </div>

            <div className="relative mt-5 flex items-end gap-1">
              {[32, 48, 38, 62, 52, 76, 58].map(
                (height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t-md bg-amber-400"
                    style={{
                      height: `${height / 2}px`,
                    }}
                  />
                ),
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[22px] border border-violet-100 bg-white p-5">
            <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-violet-50" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Average Order Value
                </p>

                <p className="mt-3 text-[30px] font-semibold tracking-[-0.055em] text-slate-950">
                  {revenue.summary.averageOrderValue ===
                  null
                    ? "—"
                    : money(
                        revenue.summary
                          .averageOrderValue,
                        currencySymbol,
                      )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Revenue ÷ paid orders
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                <WalletCards className="h-5 w-5 text-violet-700" />
              </span>
            </div>

            <div className="relative mt-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <span className="h-2 flex-1 rounded-full bg-violet-100" />
              <span className="h-2 w-2 rounded-full bg-violet-300" />
            </div>
          </div>
        </section>

        {/* ============================================================
            GROWTH + REVENUE TREND
        ============================================================ */}

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_2fr]">
          <div className="rounded-[22px] border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Revenue Growth
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {isAllTime
                    ? "No previous-period baseline"
                    : getRevenueGrowthLabel(
                        revenue.growth
                          .currentPeriodRevenue,
                        revenue.growth
                          .previousPeriodRevenue,
                      )}
                </p>
              </div>

              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  growthPositive
                    ? "bg-emerald-50"
                    : growthNegative
                      ? "bg-red-50"
                      : "bg-slate-50"
                }`}
              >
                {growthPositive ? (
                  <ArrowUpRight className="h-5 w-5 text-emerald-700" />
                ) : growthNegative ? (
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-slate-400" />
                )}
              </span>
            </div>

            <div className="mt-7">
              <p
                className={`text-[40px] font-semibold tracking-[-0.06em] ${
                  growthPositive
                    ? "text-emerald-700"
                    : growthNegative
                      ? "text-red-600"
                      : "text-slate-950"
                }`}
              >
                {hasGrowthComparison
                  ? percentage(
                      revenue.growth
                        .changePercentage,
                    )
                  : "—"}
              </p>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Current
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {money(
                    revenue.growth
                      .currentPeriodRevenue,
                    currencySymbol,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Previous
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {money(
                    revenue.growth
                      .previousPeriodRevenue,
                    currencySymbol,
                  )}
                </p>
              </div>
            </div>

            {hasGrowthComparison && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Change
                  </span>

                  <span className="font-semibold text-slate-900">
                    {revenue.growth
                      .changeAmount >= 0
                      ? "+"
                      : ""}
                    {money(
                      revenue.growth.changeAmount,
                      currencySymbol,
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                    <TrendingUp className="h-4 w-4 text-emerald-700" />
                  </span>

                  <div>
                    <h2 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                      Revenue Trend
                    </h2>

                    <p className="text-xs text-slate-500">
                      Paid revenue by order month
                    </p>
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Revenue
              </span>
            </div>

            {revenue.byMonth.length === 0 ? (
              <div className="mt-6">
                {emptyState(
                  "No paid revenue in this period.",
                )}
              </div>
            ) : (
              <div className="mt-6">
                <div className="relative h-[250px]">
                  <svg
                    viewBox="0 0 900 250"
                    className="h-full w-full overflow-visible"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Revenue trend chart"
                  >
                    {[45, 95, 145, 195].map(
                      (y) => (
                        <line
                          key={y}
                          x1="20"
                          x2="880"
                          y1={y}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray="4 6"
                        />
                      ),
                    )}

                    <path
                      d={buildAreaPath(
                        monthlyValues,
                        900,
                        250,
                        25,
                        25,
                      )}
                      fill="rgba(16,185,129,0.10)"
                    />

                    <polyline
                      points={buildLinePoints(
                        monthlyValues,
                        900,
                        250,
                        25,
                        25,
                      )}
                      fill="none"
                      stroke="#047857"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {monthlyValues.map(
                      (value, index) => {
                        const points =
                          buildLinePoints(
                            monthlyValues,
                            900,
                            250,
                            25,
                            25,
                          ).split(" ");

                        const [x, y] =
                          points[index]
                            .split(",")
                            .map(Number);

                        return (
                          <g key={index}>
                            <circle
                              cx={x}
                              cy={y}
                              r="7"
                              fill="white"
                              stroke="#047857"
                              strokeWidth="4"
                            />

                            <text
                              x={x}
                              y={Math.max(
                                y - 15,
                                16,
                              )}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="600"
                              fill="#0f172a"
                            >
                              {money(
                                value,
                                currencySymbol,
                              )}
                            </text>
                          </g>
                        );
                      },
                    )}
                  </svg>
                </div>

                <div className="mt-1 flex justify-between gap-3 px-1">
                  {revenue.byMonth.map(
                    (item) => (
                      <div
                        key={item.month}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate text-[10px] font-semibold text-slate-600">
                          {item.month}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {item.orderCount}{" "}
                          {item.orderCount === 1
                            ? "order"
                            : "orders"}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================
            PRODUCT + CHANNEL
        ============================================================ */}

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[22px] border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                  <Package className="h-5 w-5 text-amber-700" />
                </span>

                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                    Product Performance
                  </h2>

                  <p className="text-xs text-slate-500">
                    Revenue generated by each product
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700">
                Products
              </span>
            </div>

            {revenue.byProduct.length === 0 ? (
              <div className="mt-6">
                {emptyState(
                  "No product sales in this period.",
                )}
              </div>
            ) : (
              <div className="mt-7 space-y-5">
                {revenue.byProduct.map(
                  (item, index) => {
                    const percentageOfTop =
                      maxProductRevenue > 0
                        ? (item.revenue /
                            maxProductRevenue) *
                          100
                        : 0;

                    return (
                      <div
                        key={item.productId}
                      >
                        <div className="flex items-end justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                                {index + 1}
                              </span>

                              <p className="truncate text-sm font-semibold text-slate-900">
                                {item.productName}
                              </p>
                            </div>

                            <p className="mt-1 ml-8 text-[10px] text-slate-400">
                              {item.sku} ·{" "}
                              {item.unitsSold}{" "}
                              {item.unitsSold ===
                              1
                                ? "unit"
                                : "units"}{" "}
                              ·{" "}
                              {item.orderCount}{" "}
                              {item.orderCount ===
                              1
                                ? "order"
                                : "orders"}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-bold text-slate-900">
                            {money(
                              item.revenue,
                              currencySymbol,
                            )}
                          </p>
                        </div>

                        <div className="mt-2 ml-8 h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                            style={{
                              width: `${Math.max(
                                percentageOfTop,
                                4,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <ShoppingCart className="h-5 w-5 text-blue-700" />
                </span>

                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                    Sales Channel Mix
                  </h2>

                  <p className="text-xs text-slate-500">
                    Where paid orders came from
                  </p>
                </div>
              </div>
            </div>

            {revenue.byChannel.length === 0 ? (
              <div className="mt-6">
                {emptyState(
                  "No channel sales in this period.",
                )}
              </div>
            ) : (
              <>
                <div className="mt-7 flex items-center justify-center">
                  <div className="relative h-44 w-44">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          channelGradient,
                      }}
                    />

                    <div className="absolute inset-[25px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Revenue
                      </p>

                      <p className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        {money(
                          revenue.summary
                            .totalRevenue,
                          currencySymbol,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  {revenue.byChannel.map(
                    (item, index) => {
                      const channelPercentage =
                        revenue.summary
                          .totalRevenue > 0
                          ? (item.revenue /
                              revenue.summary
                                .totalRevenue) *
                            100
                          : 0;

                      const channelColors = [
                        "bg-[#123f35]",
                        "bg-blue-600",
                        "bg-amber-500",
                        "bg-violet-500",
                        "bg-red-500",
                        "bg-cyan-500",
                      ];

                      return (
                        <div
                          key={item.channel}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                channelColors[
                                  index %
                                    channelColors.length
                                ]
                              }`}
                            />

                            <span className="truncate text-xs font-medium text-slate-700">
                              {item.channel}
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-[10px] text-slate-400">
                              {channelPercentage.toFixed(
                                0,
                              )}
                              %
                            </span>

                            <span className="text-xs font-semibold text-slate-900">
                              {money(
                                item.revenue,
                                currencySymbol,
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ============================================================
            REVENUE + ORDERS COMPARISON
        ============================================================ */}

        <section className="mt-4 rounded-[22px] border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                <BarChart3 className="h-5 w-5 text-violet-700" />
              </span>

              <div>
                <h2 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                  Revenue & Order Volume
                </h2>

                <p className="text-xs text-slate-500">
                  Revenue and paid-order activity by
                  month
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-4 sm:flex">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                Revenue
              </span>

              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                Orders
              </span>
            </div>
          </div>

          {revenue.byMonth.length === 0 ? (
            <div className="mt-6">
              {emptyState(
                "No monthly sales data in this period.",
              )}
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <div
                className="min-w-[650px]"
                style={{
                  minWidth:
                    revenue.byMonth.length > 6
                      ? `${Math.max(
                          revenue.byMonth.length *
                            105,
                          650,
                        )}px`
                      : undefined,
                }}
              >
                <div className="flex h-[250px] items-end gap-4 border-b border-slate-100 px-4">
                  {revenue.byMonth.map(
                    (item) => {
                      const revenueHeight =
                        monthlyMax > 0
                          ? (item.revenue /
                              monthlyMax) *
                            190
                          : 0;

                      const maxOrders =
                        Math.max(
                          ...revenue.byMonth.map(
                            (month) =>
                              month.orderCount,
                          ),
                          1,
                        );

                      const orderHeight =
                        (item.orderCount /
                          maxOrders) *
                        130;

                      return (
                        <div
                          key={item.month}
                          className="flex h-full flex-1 flex-col justify-end"
                        >
                          <div className="flex h-full items-end justify-center gap-2">
                            <div className="group relative flex h-full items-end">
                              <div
                                className="w-8 rounded-t-xl bg-gradient-to-t from-emerald-700 to-emerald-400 transition-all group-hover:from-emerald-800 group-hover:to-emerald-500"
                                style={{
                                  height: `${Math.max(
                                    revenueHeight,
                                    5,
                                  )}px`,
                                }}
                              />

                              <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                                {money(
                                  item.revenue,
                                  currencySymbol,
                                )}
                              </div>
                            </div>

                            <div className="group relative flex h-full items-end">
                              <div
                                className="w-5 rounded-t-lg bg-violet-500"
                                style={{
                                  height: `${Math.max(
                                    orderHeight,
                                    5,
                                  )}px`,
                                }}
                              />

                              <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                                {item.orderCount}{" "}
                                {item.orderCount ===
                                1
                                  ? "order"
                                  : "orders"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pb-1 text-center">
                            <p className="truncate text-[10px] font-semibold text-slate-600">
                              {item.month}
                            </p>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================
            ORDERS
        ============================================================ */}

        <section className="mt-4 rounded-[22px] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <ShoppingCart className="h-5 w-5 text-slate-700" />
              </span>

              <div>
                <h2 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                  Revenue by Order
                </h2>

                <p className="text-xs text-slate-500">
                  Individual paid orders in the selected
                  period
                </p>
              </div>
            </div>

            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              Open orders
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {revenue.byOrder.length === 0 ? (
            <div className="mt-6">
              {emptyState(
                "No paid orders in this period.",
              )}
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Order
                    </th>

                    <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Date
                    </th>

                    <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Customer
                    </th>

                    <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Channel
                    </th>

                    <th className="pb-3 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Revenue
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {revenue.byOrder.map(
                    (item) => (
                      <tr
                        key={item.orderId}
                        className="group border-b border-slate-50 transition hover:bg-slate-50/70 last:border-b-0"
                      >
                        <td className="py-4 pr-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-700">
                            {item.orderNumber}
                          </span>
                        </td>

                        <td className="py-4 pr-4 text-xs text-slate-500">
                          {formatDate(
                            item.orderDate,
                          )}
                        </td>

                        <td className="py-4 pr-4 text-xs font-medium text-slate-700">
                          {item.customerName}
                        </td>

                        <td className="py-4 pr-4">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                            {item.channel}
                          </span>
                        </td>

                        <td className="py-4 text-right text-sm font-bold text-slate-900">
                          {money(
                            item.revenue,
                            currencySymbol,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ============================================================
            PRODUCT INTELLIGENCE
        ============================================================ */}

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                </span>

                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                  Product Intelligence
                </p>
              </div>

              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">
                Product Economics & Profitability
              </h2>

              <p className="mt-2 max-w-[760px] text-sm leading-6 text-slate-500">
                Compare current product economics with
                historical sales profitability and actual
                completed production costs.
              </p>
            </div>

            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-500">
              {completeProductEconomics} of{" "}
              {totalProducts} products have complete
              current economics
            </div>
          </div>

          {productIntelligence.products.length ===
          0 ? (
            <div className="rounded-[22px] border border-slate-200 bg-white p-6">
              {emptyState(
                "No products available for Product Intelligence.",
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {productIntelligence.products.map(
                (product) => {
                  const economics =
                    product.currentEconomics;

                  const sales = product.sales;

                  const production =
                    product.production;

                  return (
                    <article
                      key={product.productId}
                      className="overflow-hidden rounded-[22px] border border-slate-200 bg-white"
                    >
                      <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                            <Package className="h-5 w-5 text-slate-600" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-semibold tracking-[-0.035em] text-slate-950">
                                {product.productName}
                              </h3>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                {product.sku}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-400">
                              Current economics + selected-period sales + selected-period production
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {economics.isComplete ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                              Economics complete
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-amber-700">
                              Economics incomplete
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CircleDollarSign className="h-4 w-4 text-emerald-700" />

                            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">
                              Current Economics
                            </h4>
                          </div>

                          {!economics.isComplete &&
                            economics.incompleteReason && (
                              <span className="max-w-[420px] text-right text-[10px] text-amber-600">
                                {economics.incompleteReason}
                              </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                              Selling Price
                            </p>

                            <p className="mt-1.5 text-sm font-semibold text-slate-900">
                              {economics.sellingPrice ===
                              null
                                ? "—"
                                : money(
                                    economics.sellingPrice,
                                    currencySymbol,
                                  )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                              Raw Material / Unit
                            </p>

                            <p className="mt-1.5 text-sm font-semibold text-slate-900">
                              {economics.rawMaterialCostPerUnit ===
                              null
                                ? "—"
                                : money(
                                    economics.rawMaterialCostPerUnit,
                                    currencySymbol,
                                  )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                              Packaging / Unit
                            </p>

                            <p className="mt-1.5 text-sm font-semibold text-slate-900">
                              {economics.packagingCostPerUnit ===
                              null
                                ? "—"
                                : money(
                                    economics.packagingCostPerUnit,
                                    currencySymbol,
                                  )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                              Pre-shipping Cost
                            </p>

                            <p className="mt-1.5 text-sm font-semibold text-slate-900">
                              {economics.preShippingUnitCost ===
                              null
                                ? "—"
                                : money(
                                    economics.preShippingUnitCost,
                                    currencySymbol,
                                  )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-emerald-50 p-3">
                            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                              Contribution / Unit
                            </p>

                            <p className="mt-1.5 text-sm font-semibold text-emerald-800">
                              {economics.contributionProfitPerUnit ===
                              null
                                ? "—"
                                : money(
                                    economics.contributionProfitPerUnit,
                                    currencySymbol,
                                  )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-emerald-50 p-3">
                            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                              Contribution Margin
                            </p>

                            <p className="mt-1.5 text-sm font-semibold text-emerald-800">
                              {economics.contributionMarginPct ===
                              null
                                ? "—"
                                : `${economics.contributionMarginPct.toFixed(
                                    1,
                                  )}%`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/50 p-6 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4 text-blue-700" />

                              <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">
                                Sales & Profitability
                              </h4>
                            </div>

                            <span className="text-[9px] text-slate-400">
                              Selected period
                            </span>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Revenue
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                {money(
                                  sales.revenue,
                                  currencySymbol,
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Units Sold
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                {formatMetricNumber(
                                  sales.unitsSold,
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Orders
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                {formatMetricNumber(
                                  sales.orderCount,
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Historical Cost
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                {sales.historicalCost ===
                                null
                                  ? "—"
                                  : money(
                                      sales.historicalCost,
                                      currencySymbol,
                                    )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-emerald-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                                Contribution Profit
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-emerald-800">
                                {sales.contributionProfit ===
                                null
                                  ? "—"
                                  : money(
                                      sales.contributionProfit,
                                      currencySymbol,
                                    )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-emerald-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                                Contribution Margin
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-emerald-800">
                                {sales.contributionMarginPct ===
                                null
                                  ? "—"
                                  : `${sales.contributionMarginPct.toFixed(
                                      1,
                                    )}%`}
                              </p>
                            </div>
                          </div>

                          {sales.historicalCost ===
                            null &&
                            sales.unitsSold > 0 && (
                            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] leading-5 text-amber-700">
                              Historical profitability is
                              unavailable because at least
                              one sold unit does not have a
                              stored historical cost snapshot.
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Factory className="h-4 w-4 text-violet-700" />

                              <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">
                                Production
                              </h4>
                            </div>

                            <span className="text-[9px] text-slate-400">
                              Completed batches
                            </span>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Batches Completed
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                {formatMetricNumber(
                                  production.batchesCompleted,
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Units Produced
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                {formatMetricNumber(
                                  production.unitsProduced,
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Production Cost
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                {production.productionCost ===
                                null
                                  ? "—"
                                  : money(
                                      production.productionCost,
                                      currencySymbol,
                                    )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Avg. Cost / Unit
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                {production.averageProductionCostPerUnit ===
                                null
                                  ? "—"
                                  : money(
                                      production.averageProductionCostPerUnit,
                                      currencySymbol,
                                    )}
                              </p>
                            </div>

                            <div className="col-span-2 rounded-xl bg-violet-50 p-3">
                              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-violet-700">
                                Latest Production Cost / Unit
                              </p>

                              <p className="mt-1.5 text-sm font-semibold text-violet-800">
                                {production.latestProductionCostPerUnit ===
                                null
                                  ? "—"
                                  : money(
                                      production.latestProductionCostPerUnit,
                                      currencySymbol,
                                    )}
                              </p>
                            </div>
                          </div>

                          {production.batchesCompleted ===
                            0 && (
                            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] leading-5 text-slate-500">
                              No completed production batches
                              were recorded in the selected
                              period.
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* ============================================================
            PRODUCTION INTELLIGENCE
        ============================================================ */}

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50">
                  <Factory className="h-4 w-4 text-violet-700" />
                </span>

                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-violet-700">
                  Production Intelligence
                </p>
              </div>

              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">
                Production Overview
              </h2>

              <p className="mt-2 max-w-[760px] text-sm leading-6 text-slate-500">
                Track production activity, completed
                output, cancelled batches, production
                cost, and production volume across the
                selected period.
              </p>
            </div>

            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-500">
              {getPeriodLabel(
                productionIntelligence.period.from,
                productionIntelligence.period.to,
              )}
            </div>
          </div>

          {/* Production KPI cards */}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-[20px] border border-slate-200 bg-white p-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Total Batches
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatMetricNumber(
                  productionIntelligence.summary
                    .totalBatches,
                )}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                All statuses
              </p>
            </div>

            <div className="rounded-[20px] border border-emerald-100 bg-white p-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Completed
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-emerald-800">
                {formatMetricNumber(
                  productionIntelligence.summary
                    .completedBatches,
                )}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Completed batches
              </p>
            </div>

            <div className="rounded-[20px] border border-red-100 bg-white p-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-red-600">
                Cancelled
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-red-700">
                {formatMetricNumber(
                  productionIntelligence.summary
                    .cancelledBatches,
                )}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Cancelled batches
              </p>
            </div>

            <div className="rounded-[20px] border border-amber-100 bg-white p-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-amber-700">
                Units Produced
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                {formatMetricNumber(
                  productionIntelligence.summary
                    .unitsProduced,
                )}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Completed output
              </p>
            </div>

            <div className="rounded-[20px] border border-violet-100 bg-white p-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-violet-700">
                Production Cost
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                {productionIntelligence.summary
                  .productionCost === null
                  ? "—"
                  : money(
                      productionIntelligence.summary
                        .productionCost,
                      currencySymbol,
                    )}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Stored actual cost
              </p>
            </div>

            <div className="rounded-[20px] border border-blue-100 bg-white p-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-blue-700">
                Avg. Cost / Unit
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                {productionIntelligence.summary
                  .averageProductionCostPerUnit ===
                null
                  ? "—"
                  : money(
                      productionIntelligence.summary
                        .averageProductionCostPerUnit,
                      currencySymbol,
                    )}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Weighted by units produced
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
            {/* Production by product */}

            <div className="rounded-[22px] border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                    <Package className="h-5 w-5 text-violet-700" />
                  </span>

                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                      Production by Product
                    </h3>

                    <p className="text-xs text-slate-500">
                      Production volume and actual cost
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-700">
                  Products
                </span>
              </div>

              {productionIntelligence.byProduct.length ===
              0 ? (
                <div className="mt-6">
                  {emptyState(
                    "No production batches in this period.",
                  )}
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[650px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Product
                        </th>

                        <th className="pb-3 pr-4 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Batches
                        </th>

                        <th className="pb-3 pr-4 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Units
                        </th>

                        <th className="pb-3 pr-4 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Cost
                        </th>

                        <th className="pb-3 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Cost / Unit
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {productionIntelligence.byProduct.map(
                        (item) => (
                          <tr
                            key={item.productId}
                            className="border-b border-slate-50 last:border-b-0"
                          >
                            <td className="py-4 pr-4">
                              <p className="text-xs font-semibold text-slate-900">
                                {item.productName}
                              </p>

                              <p className="mt-1 text-[9px] text-slate-400">
                                {item.sku}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700">
                                  {item.completedBatches}{" "}
                                  completed
                                </span>

                                {item.cancelledBatches >
                                  0 && (
                                  <span className="rounded-full bg-red-50 px-2 py-1 text-[8px] font-semibold text-red-600">
                                    {item.cancelledBatches}{" "}
                                    cancelled
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 pr-4 text-right text-xs font-semibold text-slate-700">
                              {formatMetricNumber(
                                item.totalBatches,
                              )}
                            </td>

                            <td className="py-4 pr-4 text-right text-xs font-semibold text-slate-700">
                              {formatMetricNumber(
                                item.unitsProduced,
                              )}
                            </td>

                            <td className="py-4 pr-4 text-right text-xs font-semibold text-slate-900">
                              {item.productionCost ===
                              null
                                ? "—"
                                : money(
                                    item.productionCost,
                                    currencySymbol,
                                  )}
                            </td>

                            <td className="py-4 text-right text-xs font-bold text-violet-700">
                              {item.averageProductionCostPerUnit ===
                              null
                                ? "—"
                                : money(
                                    item.averageProductionCostPerUnit,
                                    currencySymbol,
                                  )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Production activity */}

            <div className="rounded-[22px] border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                    <Factory className="h-5 w-5 text-amber-700" />
                  </span>

                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                      Production Activity
                    </h3>

                    <p className="text-xs text-slate-500">
                      Batch status across the period
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700">
                  Activity
                </span>
              </div>

              {productionIntelligence.byMonth.length ===
              0 ? (
                <div className="mt-6">
                  {emptyState(
                    "No production activity in this period.",
                  )}
                </div>
              ) : (
                <div className="mt-7 space-y-5">
                  {productionIntelligence.byMonth.map(
                    (item) => {
                      const unitWidth =
                        maxProductionUnits > 0
                          ? (item.unitsProduced /
                              maxProductionUnits) *
                            100
                          : 0;

                      return (
                        <div
                          key={item.month}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-slate-700">
                                {item.month}
                              </p>

                              <p className="mt-1 text-[9px] text-slate-400">
                                {item.totalBatches}{" "}
                                {item.totalBatches ===
                                1
                                  ? "batch"
                                  : "batches"}{" "}
                                ·{" "}
                                {item.completedBatches}{" "}
                                completed
                                {item.cancelledBatches >
                                0
                                  ? ` · ${item.cancelledBatches} cancelled`
                                  : ""}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-900">
                                {formatMetricNumber(
                                  item.unitsProduced,
                                )}{" "}
                                units
                              </p>

                              <p className="mt-1 text-[9px] text-slate-400">
                                {item.productionCost ===
                                null
                                  ? "Cost unavailable"
                                  : money(
                                      item.productionCost,
                                      currencySymbol,
                                    )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-amber-400"
                              style={{
                                width: `${Math.max(
                                  unitWidth,
                                  item.unitsProduced >
                                    0
                                    ? 4
                                    : 0,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Production cost trend */}

          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <TrendingUp className="h-5 w-5 text-emerald-700" />
                </span>

                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                    Production Cost Trend
                  </h3>

                  <p className="text-xs text-slate-500">
                    Actual stored production cost and
                    production volume by month
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-[9px] font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                  Production cost
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Units produced
                </span>
              </div>
            </div>

            {productionIntelligence.byMonth.length ===
            0 ? (
              <div className="mt-6">
                {emptyState(
                  "No production trend data in this period.",
                )}
              </div>
            ) : (
              <div className="mt-8 overflow-x-auto">
                <div
                  className="min-w-[700px]"
                  style={{
                    minWidth:
                      productionIntelligence
                        .byMonth.length > 6
                        ? `${Math.max(
                            productionIntelligence
                              .byMonth.length *
                              115,
                            700,
                          )}px`
                        : undefined,
                  }}
                >
                  <div className="flex h-[270px] items-end gap-5 border-b border-slate-100 px-4">
                    {productionIntelligence.byMonth.map(
                      (item) => {
                        const costHeight =
                          maxProductionCost > 0 &&
                          item.productionCost !==
                            null
                            ? (item.productionCost /
                                maxProductionCost) *
                              190
                            : 0;

                        const unitHeight =
                          maxProductionUnits > 0
                            ? (item.unitsProduced /
                                maxProductionUnits) *
                              140
                            : 0;

                        return (
                          <div
                            key={item.month}
                            className="flex h-full flex-1 flex-col justify-end"
                          >
                            <div className="flex h-full items-end justify-center gap-2">
                              <div className="group relative flex h-full items-end">
                                <div
                                  className="w-10 rounded-t-xl bg-gradient-to-t from-violet-700 to-violet-400"
                                  style={{
                                    height: `${Math.max(
                                      costHeight,
                                      item.productionCost !==
                                        null
                                        ? 5
                                        : 0,
                                    )}px`,
                                  }}
                                />

                                {item.productionCost !==
                                  null && (
                                  <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                                    {money(
                                      item.productionCost,
                                      currencySymbol,
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="group relative flex h-full items-end">
                                <div
                                  className="w-6 rounded-t-lg bg-amber-400"
                                  style={{
                                    height: `${Math.max(
                                      unitHeight,
                                      item.unitsProduced >
                                        0
                                        ? 5
                                        : 0,
                                    )}px`,
                                  }}
                                />

                                {item.unitsProduced >
                                  0 && (
                                  <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                                    {formatMetricNumber(
                                      item.unitsProduced,
                                    )}{" "}
                                    units
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 pb-1 text-center">
                              <p className="truncate text-[10px] font-semibold text-slate-600">
                                {item.month}
                              </p>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}