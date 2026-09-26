import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Package,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  getInventoryIntelligence,
  getRevenueIntelligence,
} from "@/modules/analytics/services";
import { analyticsDateRangeSchema } from "@/modules/analytics/validation";

interface AnalyticsPageProps {
  searchParams?: Promise<{
    period?: string;
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

function getPeriodStart(period: string): Date | null {
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
      return null;
  }
}

function emptyState(message: string) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl bg-slate-50">
      <div className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
          <BarChart3 className="h-5 w-5 text-slate-300" />
        </div>

        <p className="mt-3 text-sm font-medium text-slate-500">{message}</p>
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
            (index / (values.length - 1)) * (width - paddingX * 2);

      const y =
        height -
        paddingY -
        ((value - min) / range) * (height - paddingY * 2);

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
  channels: Array<{ channel: string; revenue: number }>,
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

  const total = channels.reduce((sum, item) => sum + item.revenue, 0);

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

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;

  const period =
    params?.period === "ALL" ||
    params?.period === "7D" ||
    params?.period === "30D" ||
    params?.period === "3M" ||
    params?.period === "1Y"
      ? params.period
      : "ALL";

  const parsed = analyticsDateRangeSchema.safeParse({
    from: params?.from ?? "",
    to: params?.to ?? "",
  });

  const customFrom =
    parsed.success && parsed.data.from
      ? new Date(`${parsed.data.from}T00:00:00`)
      : null;

  const customTo =
    parsed.success && parsed.data.to
      ? new Date(`${parsed.data.to}T23:59:59.999`)
      : null;

  const hasValidCustomFrom =
    customFrom !== null &&
    !Number.isNaN(customFrom.getTime());

  const hasValidCustomTo =
    customTo !== null &&
    !Number.isNaN(customTo.getTime());

  const from = hasValidCustomFrom
    ? customFrom
    : getPeriodStart(period);

  const to = hasValidCustomTo
    ? customTo
    : new Date();

  const { businessId, business } = await getDashboardContext();

  const [settings, revenue, inventory] = await Promise.all([
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

    getInventoryIntelligence(businessId, {
      from,
      to,
    }),
  ]);

  const currencySymbol = settings?.currencySymbol ?? "₹";

  const maxProductRevenue = Math.max(
    ...revenue.byProduct.map((item) => item.revenue),
    0,
  );

  const maxChannelRevenue = Math.max(
    ...revenue.byChannel.map((item) => item.revenue),
    0,
  );

  const monthlyValues = revenue.byMonth.map((item) => item.revenue);

  const monthlyMax = Math.max(...monthlyValues, 0);

  const monthlyMin = Math.min(...monthlyValues, 0);

  const monthlyRange = monthlyMax - monthlyMin || 1;

  const growthPositive =
    revenue.growth.changePercentage !== null &&
    revenue.growth.changePercentage > 0;

  const growthNegative =
    revenue.growth.changePercentage !== null &&
    revenue.growth.changePercentage < 0;

  const channelGradient = getChannelGradient(
    revenue.byChannel.map((item) => ({
      channel: item.channel,
      revenue: item.revenue,
    })),
  );

  const isAllTime = revenue.period.from === null;
  const hasGrowthComparison = !isAllTime;

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f7f6f2]">
      <main className="mx-auto w-full max-w-[1480px] px-5 pb-12 pt-3 lg:px-8">
        {/* ============================================================
            HEADER
        ============================================================ */}

        <section className="relative overflow-visible rounded-[24px] border border-slate-200 bg-white">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-50/80 blur-3xl" />

          <div className="pointer-events-none absolute bottom-[-100px] left-[38%] h-56 w-56 rounded-full bg-amber-50/60 blur-3xl" />

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
                See how your sales are moving, which products are generating
                revenue, and where your orders are coming from.
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

            {/* Date range */}

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-slate-200 bg-white p-1">
                {[
                  { value: "ALL", label: "All Time" },
                  { value: "7D", label: "7D" },
                  { value: "30D", label: "30D" },
                  { value: "3M", label: "3M" },
                  { value: "1Y", label: "1Y" },
                ].map((item) => (
                  <Link
                    key={item.value}
                    href={`/analytics?period=${item.value}`}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-medium transition ${
                      period === item.value
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Custom
                  <span>⌄</span>
                </summary>

                <form
                  action="/analytics"
                  className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
                >
                  <p className="text-xs font-semibold text-slate-900">
                    Custom period
                  </p>

                  <div className="mt-3 space-y-2">
                    <label className="block text-[10px] font-medium text-slate-500">
                      From
                      <input
                        type="date"
                        name="from"
                        defaultValue={
                          parsed.success ? parsed.data.from ?? "" : ""
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-slate-400"
                      />
                    </label>

                    <label className="block text-[10px] font-medium text-slate-500">
                      To
                      <input
                        type="date"
                        name="to"
                        defaultValue={
                          parsed.success ? parsed.data.to ?? "" : ""
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-slate-400"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Apply period
                  </button>
                </form>
              </details>
            </div>
          </div>
        </section>

        {/* ============================================================
            KPI CARDS
        ============================================================ */}

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* Revenue */}

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

          {/* Orders */}

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
                  Math.max(revenue.summary.paidOrderCount, 1),
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

          {/* Units */}

          <div className="relative overflow-hidden rounded-[22px] border border-amber-100 bg-white p-5">
            <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-amber-50" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Units Sold
                </p>

                <p className="mt-3 text-[30px] font-semibold tracking-[-0.055em] text-slate-950">
                  {revenue.summary.unitsSold.toLocaleString("en-IN")}
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
                    style={{ height: `${height / 2}px` }}
                  />
                ),
              )}
            </div>
          </div>

          {/* AOV */}

          <div className="relative overflow-hidden rounded-[22px] border border-violet-100 bg-white p-5">
            <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-violet-50" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Average Order Value
                </p>

                <p className="mt-3 text-[30px] font-semibold tracking-[-0.055em] text-slate-950">
                  {revenue.summary.averageOrderValue === null
                    ? "—"
                    : money(
                        revenue.summary.averageOrderValue,
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
          {/* Growth */}

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
                        revenue.growth.currentPeriodRevenue,
                        revenue.growth.previousPeriodRevenue,
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
                  ? percentage(revenue.growth.changePercentage)
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
                    revenue.growth.currentPeriodRevenue,
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
                    revenue.growth.previousPeriodRevenue,
                    currencySymbol,
                  )}
                </p>
              </div>
            </div>

            {hasGrowthComparison && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Change</span>

                  <span className="font-semibold text-slate-900">
                    {revenue.growth.changeAmount >= 0 ? "+" : ""}
                    {money(
                      revenue.growth.changeAmount,
                      currencySymbol,
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Revenue trend */}

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
                {emptyState("No paid revenue in this period.")}
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
                    {/* Grid */}

                    {[45, 95, 145, 195].map((y) => (
                      <line
                        key={y}
                        x1="20"
                        x2="880"
                        y1={y}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 6"
                      />
                    ))}

                    {/* Area */}

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

                    {/* Line */}

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

                    {/* Points */}

                    {monthlyValues.map((value, index) => {
                      const points = buildLinePoints(
                        monthlyValues,
                        900,
                        250,
                        25,
                        25,
                      ).split(" ");

                      const [x, y] = points[index]
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
                            y={Math.max(y - 15, 16)}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="600"
                            fill="#0f172a"
                          >
                            {money(value, currencySymbol)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="mt-1 flex justify-between gap-3 px-1">
                  {revenue.byMonth.map((item) => (
                    <div
                      key={item.month}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-[10px] font-semibold text-slate-600">
                        {item.month}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {item.orderCount}{" "}
                        {item.orderCount === 1 ? "order" : "orders"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================
            PRODUCT + CHANNEL
        ============================================================ */}

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          {/* Product performance */}

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
                {emptyState("No product sales in this period.")}
              </div>
            ) : (
              <div className="mt-7 space-y-5">
                {revenue.byProduct.map((item, index) => {
                  const percentageOfTop =
                    maxProductRevenue > 0
                      ? (item.revenue / maxProductRevenue) * 100
                      : 0;

                  return (
                    <div key={item.productId}>
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
                            {item.sku} · {item.unitsSold}{" "}
                            {item.unitsSold === 1
                              ? "unit"
                              : "units"}{" "}
                            · {item.orderCount}{" "}
                            {item.orderCount === 1
                              ? "order"
                              : "orders"}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-bold text-slate-900">
                          {money(item.revenue, currencySymbol)}
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
                })}
              </div>
            )}
          </div>

          {/* Channel mix */}

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
                {emptyState("No channel sales in this period.")}
              </div>
            ) : (
              <>
                <div className="mt-7 flex items-center justify-center">
                  <div className="relative h-44 w-44">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: channelGradient,
                      }}
                    />

                    <div className="absolute inset-[25px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Revenue
                      </p>

                      <p className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        {money(
                          revenue.summary.totalRevenue,
                          currencySymbol,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  {revenue.byChannel.map((item, index) => {
                    const channelPercentage =
                      revenue.summary.totalRevenue > 0
                        ? (item.revenue /
                            revenue.summary.totalRevenue) *
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
                              channelColors[index %
                                channelColors.length]
                            }`}
                          />

                          <span className="truncate text-xs font-medium text-slate-700">
                            {item.channel}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-[10px] text-slate-400">
                            {channelPercentage.toFixed(0)}%
                          </span>

                          <span className="text-xs font-semibold text-slate-900">
                            {money(item.revenue, currencySymbol)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
                  Revenue and paid-order activity by month
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
              {emptyState("No monthly sales data in this period.")}
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <div
                className="min-w-[650px]"
                style={{
                  minWidth:
                    revenue.byMonth.length > 6
                      ? `${Math.max(
                          revenue.byMonth.length * 105,
                          650,
                        )}px`
                      : undefined,
                }}
              >
                <div className="flex h-[250px] items-end gap-4 border-b border-slate-100 px-4">
                  {revenue.byMonth.map((item) => {
                    const revenueHeight =
                      monthlyMax > 0
                        ? (item.revenue / monthlyMax) * 190
                        : 0;

                    const maxOrders = Math.max(
                      ...revenue.byMonth.map(
                        (month) => month.orderCount,
                      ),
                      1,
                    );

                    const orderHeight =
                      (item.orderCount / maxOrders) * 130;

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
                              {item.orderCount === 1
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
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================
            INVENTORY INTELLIGENCE
        ============================================================ */}

        <section className="mt-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                Inventory Intelligence
              </p>

              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-slate-950">
                Inventory Position & Movement
              </h2>

              <p className="mt-1 max-w-[760px] text-xs leading-5 text-slate-500">
                Understand what inventory you hold today and how stock moved
                during the selected period.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Current position + selected period movement
            </span>
          </div>

          {/* Inventory valuation KPIs */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-[22px] border border-emerald-100 bg-white p-5">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-50" />

              <div className="relative">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Total Inventory Value
                </p>

                <p className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">
                  {inventory.summary.totalInventoryValue === null
                    ? "Unavailable"
                    : money(
                        inventory.summary.totalInventoryValue,
                        currencySymbol,
                      )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {inventory.summary.valuationComplete
                    ? "Finished goods + raw + packaging"
                    : "Finished-product valuation is incomplete"}
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[22px] border border-blue-100 bg-white p-5">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-50" />

              <div className="relative">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Finished Products
                </p>

                <p className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">
                  {inventory.summary.finishedProductValue === null
                    ? "Unavailable"
                    : money(
                        inventory.summary.finishedProductValue,
                        currencySymbol,
                      )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {inventory.summary.finishedProductCount}{" "}
                  {inventory.summary.finishedProductCount === 1
                    ? "product"
                    : "products"}{" "}
                  in stock
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[22px] border border-amber-100 bg-white p-5">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-50" />

              <div className="relative">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Raw Materials
                </p>

                <p className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">
                  {inventory.summary.rawMaterialValue === null
                    ? "Unavailable"
                    : money(
                        inventory.summary.rawMaterialValue,
                        currencySymbol,
                      )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {inventory.summary.rawMaterialCount}{" "}
                  {inventory.summary.rawMaterialCount === 1
                    ? "material"
                    : "materials"}{" "}
                  held
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[22px] border border-violet-100 bg-white p-5">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-50" />

              <div className="relative">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Packaging Materials
                </p>

                <p className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-slate-950">
                  {inventory.summary.packagingMaterialValue === null
                    ? "Unavailable"
                    : money(
                        inventory.summary.packagingMaterialValue,
                        currencySymbol,
                      )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {inventory.summary.packagingMaterialCount}{" "}
                  {inventory.summary.packagingMaterialCount === 1
                    ? "material"
                    : "materials"}{" "}
                  held
                </p>
              </div>
            </div>
          </div>

          {/* Stock alerts + movement summary */}

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_2.1fr]">
            <div className="rounded-[22px] border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                    Stock Alerts
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Based on available stock after promotional reservations.
                  </p>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                  !
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-red-500">
                    Out of Stock
                  </p>

                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-red-700">
                    {inventory.summary.outOfStockProductCount}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-600">
                    Low Stock
                  </p>

                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-amber-700">
                    {inventory.summary.lowStockProductCount}
                  </p>
                </div>
              </div>

              {inventory.lowStockProducts.length === 0 ? (
                <div className="mt-5 rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-semibold text-emerald-800">
                    No products are currently at or below their reorder level.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {inventory.lowStockProducts.slice(0, 8).map((item) => {
                    const outOfStock =
                      item.stockStatus === "OUT_OF_STOCK";

                    return (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {item.productName}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {item.sku} · reorder at{" "}
                            {item.reorderLevel}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold ${
                            outOfStock
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {outOfStock
                            ? "OUT"
                            : `${item.availableStock} left`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                    Inventory Movement
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Recorded stock movements during the selected period.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                  Movement
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[
                  [
                    "RM Purchases",
                    inventory.movement.summary.rawMaterialPurchases,
                  ],
                  [
                    "RM Consumption",
                    inventory.movement.summary.rawMaterialConsumption,
                  ],
                  [
                    "Packaging Purchases",
                    inventory.movement.summary.packagingPurchases,
                  ],
                  [
                    "Packaging Consumption",
                    inventory.movement.summary.packagingConsumption,
                  ],
                  [
                    "Production",
                    inventory.movement.summary.finishedProductProduction,
                  ],
                  [
                    "Sales",
                    inventory.movement.summary.finishedProductSales,
                  ],
                  [
                    "Returns",
                    inventory.movement.summary.finishedProductReturns,
                  ],
                  [
                    "Write-offs",
                    inventory.movement.summary.finishedProductWriteOffs,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 p-3"
                  >
                    <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      {label}
                    </p>

                    <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-900">
                      {Number(value).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>

              {inventory.movement.byMonth.length === 0 ? (
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xs font-medium text-slate-500">
                    No inventory movement recorded in this period.
                  </p>
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Month
                        </th>
                        <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          RM Purchases
                        </th>
                        <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          RM Consumption
                        </th>
                        <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Packaging
                        </th>
                        <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Production
                        </th>
                        <th className="pb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Sales
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventory.movement.byMonth.map((item) => (
                        <tr
                          key={item.month}
                          className="border-b border-slate-50 last:border-b-0"
                        >
                          <td className="py-3 pr-4 text-xs font-semibold text-slate-700">
                            {item.month}
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-600">
                            {item.rawMaterialPurchases.toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-600">
                            {item.rawMaterialConsumption.toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-600">
                            {item.packagingPurchases.toLocaleString(
                              "en-IN",
                            )}{" "}
                            /{" "}
                            {item.packagingConsumption.toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-600">
                            {item.finishedProductProduction.toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td className="py-3 text-xs text-slate-600">
                            {item.finishedProductSales.toLocaleString(
                              "en-IN",
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Finished-product stock */}

          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <Package className="h-5 w-5 text-emerald-700" />
                </span>

                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                    Finished Product Inventory
                  </h3>

                  <p className="text-xs text-slate-500">
                    Physical stock, available stock, and current valuation.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Current stock
              </span>
            </div>

            {inventory.finishedProducts.length === 0 ? (
              <div className="mt-6">
                {emptyState("No finished products found.")}
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="pb-3 pr-4 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Product
                      </th>
                      <th className="pb-3 pr-4 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Physical
                      </th>
                      <th className="pb-3 pr-4 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Promotional
                      </th>
                      <th className="pb-3 pr-4 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Available
                      </th>
                      <th className="pb-3 pr-4 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Unit Cost
                      </th>
                      <th className="pb-3 pr-4 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Valuation
                      </th>
                      <th className="pb-3 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {inventory.finishedProducts.map((item) => {
                      const statusClasses =
                        item.stockStatus === "OUT_OF_STOCK"
                          ? "bg-red-100 text-red-700"
                          : item.stockStatus === "LOW_STOCK"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700";

                      const statusLabel =
                        item.stockStatus === "OUT_OF_STOCK"
                          ? "Out of stock"
                          : item.stockStatus === "LOW_STOCK"
                            ? "Low stock"
                            : "Healthy";

                      return (
                        <tr
                          key={item.productId}
                          className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60"
                        >
                          <td className="py-4 pr-4">
                            <p className="text-xs font-semibold text-slate-800">
                              {item.productName}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {item.sku}
                            </p>
                          </td>

                          <td className="py-4 pr-4 text-right text-xs text-slate-700">
                            {item.physicalStock.toLocaleString(
                              "en-IN",
                            )}
                          </td>

                          <td className="py-4 pr-4 text-right text-xs text-slate-700">
                            {item.promotionalStock.toLocaleString(
                              "en-IN",
                            )}
                          </td>

                          <td className="py-4 pr-4 text-right text-xs font-semibold text-slate-900">
                            {item.availableStock.toLocaleString(
                              "en-IN",
                            )}
                          </td>

                          <td className="py-4 pr-4 text-right text-xs text-slate-600">
                            {item.valuationUnitCost === null
                              ? "—"
                              : money(
                                  item.valuationUnitCost,
                                  currencySymbol,
                                )}
                          </td>

                          <td className="py-4 pr-4 text-right text-xs font-semibold text-slate-900">
                            {item.valuation === null
                              ? "Unavailable"
                              : money(
                                  item.valuation,
                                  currencySymbol,
                                )}
                          </td>

                          <td className="py-4 text-right">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${statusClasses}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Raw + packaging inventory */}

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                    Raw Material Inventory
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Current quantity and inventory value.
                  </p>
                </div>

                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700">
                  {inventory.summary.rawMaterialValue === null
                    ? "Unavailable"
                    : money(
                        inventory.summary.rawMaterialValue,
                        currencySymbol,
                      )}
                </span>
              </div>

              {inventory.rawMaterials.length === 0 ? (
                <div className="mt-5">
                  {emptyState("No raw materials found.")}
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="pb-3 pr-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Material
                        </th>
                        <th className="pb-3 pr-3 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Quantity
                        </th>
                        <th className="pb-3 pr-3 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Avg. Cost
                        </th>
                        <th className="pb-3 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Value
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventory.rawMaterials.map((item) => (
                        <tr
                          key={item.rawMaterialId}
                          className="border-b border-slate-50 last:border-b-0"
                        >
                          <td className="py-3 pr-3">
                            <p className="text-xs font-semibold text-slate-800">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {item.baseUnit}
                            </p>
                          </td>
                          <td className="py-3 pr-3 text-right text-xs text-slate-700">
                            {item.currentQuantity.toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td className="py-3 pr-3 text-right text-xs text-slate-600">
                            {money(
                              item.weightedAverageCost,
                              currencySymbol,
                            )}
                          </td>
                          <td className="py-3 text-right text-xs font-semibold text-slate-900">
                            {money(
                              item.currentValue,
                              currencySymbol,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.035em] text-slate-950">
                    Packaging Inventory
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Current quantity and inventory value.
                  </p>
                </div>

                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-700">
                  {inventory.summary.packagingMaterialValue === null
                    ? "Unavailable"
                    : money(
                        inventory.summary.packagingMaterialValue,
                        currencySymbol,
                      )}
                </span>
              </div>

              {inventory.packagingMaterials.length === 0 ? (
                <div className="mt-5">
                  {emptyState("No packaging materials found.")}
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="pb-3 pr-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Material
                        </th>
                        <th className="pb-3 pr-3 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Quantity
                        </th>
                        <th className="pb-3 pr-3 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Avg. Cost
                        </th>
                        <th className="pb-3 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Value
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventory.packagingMaterials.map((item) => (
                        <tr
                          key={item.packagingMaterialId}
                          className="border-b border-slate-50 last:border-b-0"
                        >
                          <td className="py-3 pr-3">
                            <p className="text-xs font-semibold text-slate-800">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {item.baseUnit}
                            </p>
                          </td>
                          <td className="py-3 pr-3 text-right text-xs text-slate-700">
                            {item.currentQuantity.toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td className="py-3 pr-3 text-right text-xs text-slate-600">
                            {money(
                              item.weightedAverageCost,
                              currencySymbol,
                            )}
                          </td>
                          <td className="py-3 text-right text-xs font-semibold text-slate-900">
                            {money(
                              item.currentValue,
                              currencySymbol,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {inventory.summary.valuationIncompleteReason && (
            <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-700">
                Valuation note
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800">
                {inventory.summary.valuationIncompleteReason}
              </p>
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
                  Individual paid orders in the selected period
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
              {emptyState("No paid orders in this period.")}
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
                  {revenue.byOrder.map((item) => (
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
                        {formatDate(item.orderDate)}
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
                        {money(item.revenue, currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}