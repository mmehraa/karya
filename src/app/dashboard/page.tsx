import Link from "next/link";

import { db } from "@/lib/db";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getBusinessSummary } from "@/modules/business/services";
import { getStageWithRequirements } from "@/modules/stages/services";
import { getAlerts } from "@/modules/alerts/services";
import { getInventoryOverview } from "@/modules/inventory/services";

import {
  AlertSeverity,
  OrderPaymentStatus,
  RequirementStatus,
  RequirementType,
} from "@prisma/client";

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Package,
  Plus,
  ShoppingCart,
  Target,
  WalletCards,
  Zap,
} from "lucide-react";

interface DashboardPageProps {
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

function severityDot(severity: AlertSeverity) {
  if (severity === AlertSeverity.CRITICAL) {
    return "bg-red-500";
  }

  if (severity === AlertSeverity.WARNING) {
    return "bg-amber-500";
  }

  return "bg-blue-500";
}

function severityBadge(severity: AlertSeverity) {
  if (severity === AlertSeverity.CRITICAL) {
    return "bg-red-50 text-red-700";
  }

  if (severity === AlertSeverity.WARNING) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-blue-50 text-blue-700";
}

function severityLabel(severity: AlertSeverity) {
  if (severity === AlertSeverity.CRITICAL) {
    return "Critical";
  }

  if (severity === AlertSeverity.WARNING) {
    return "Warning";
  }

  return "Info";
}

function requirementIcon(type: RequirementType) {
  if (type === RequirementType.MANDATORY) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50">
        <CircleAlert className="h-3 w-3 text-red-500" />
      </span>
    );
  }

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100">
      <span className="h-2 w-2 rounded-full border border-slate-400" />
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;

  const period =
    params?.period === "ALL" ||
    params?.period === "7D" ||
    params?.period === "30D" ||
    params?.period === "3M" ||
    params?.period === "1Y"
      ? params.period
      : "ALL";

  const customFrom = params?.from
    ? new Date(`${params.from}T00:00:00`)
    : null;

  const customTo = params?.to
    ? new Date(`${params.to}T23:59:59.999`)
    : null;

  const periodStart =
    customFrom && !Number.isNaN(customFrom.getTime())
      ? customFrom
      : getPeriodStart(period);

  const periodEnd =
    customTo && !Number.isNaN(customTo.getTime())
      ? customTo
      : new Date();

  const { business, businessId } = await getDashboardContext();

  /*
   * BusinessSettings is intentionally fetched separately.
   * getDashboardContext() currently returns the business and
   * current stage, but does not expose settings.
   */
  const [
    summary,
    stageData,
    alerts,
    inventoryOverview,
    settings,
    paidOrders,
    periodExpenses,
  ] = await Promise.all([
    getBusinessSummary(businessId),

    getStageWithRequirements(
      business.currentStageId,
      businessId,
    ),

    getAlerts(businessId),

    getInventoryOverview(businessId),

    db.businessSettings.findUnique({
      where: {
        businessId,
      },
      select: {
        currencySymbol: true,
      },
    }),

    db.order.findMany({
      where: {
        businessId,
        paymentStatus: OrderPaymentStatus.PAID,
        orderDate: {
          gte: periodStart ?? undefined,
          lte: periodEnd,
        },
      },
      select: {
        id: true,
        totalAmount: true,
        orderDate: true,
        fulfillmentStatus: true,
      },
      orderBy: {
        orderDate: "asc",
      },
    }),

    db.expense.findMany({
      where: {
        businessId,
        expenseDate: {
          gte: periodStart ?? undefined,
          lte: periodEnd,
        },
      },
      select: {
        id: true,
        amount: true,
        expenseDate: true,
      },
      orderBy: {
        expenseDate: "asc",
      },
    }),
  ]);

  const currencySymbol = settings?.currencySymbol ?? "₹";

  const requirements = stageData?.requirements ?? [];
  const metrics = stageData?.metrics;

  const activeAlerts = alerts.filter(
    (alert) => !alert.isResolved,
  );

  const completedRequirements = requirements.filter(
    (req) => req.status === RequirementStatus.COMPLETED,
  ).length;

  const blockerCount = metrics?.blockerCount ?? 0;

  const remainingCount = Math.max(
    requirements.length -
      completedRequirements -
      blockerCount,
    0,
  );

  const nextUpRequirements = requirements
    .filter(
      (req) => req.status !== RequirementStatus.COMPLETED,
    )
    .slice(0, 5);

  const revenue = paidOrders.reduce(
    (total, order) => total + Number(order.totalAmount),
    0,
  );

  const expenses = periodExpenses.reduce(
    (total, expense) => total + Number(expense.amount),
    0,
  );

  const periodOrderCount = paidOrders.length;

  const completedOrders = paidOrders.filter(
    (order) => order.fulfillmentStatus === "DELIVERED",
  ).length;

  const processingOrders = paidOrders.filter(
    (order) =>
      order.fulfillmentStatus === "PROCESSING" ||
      order.fulfillmentStatus === "PACKED" ||
      order.fulfillmentStatus === "SHIPPED",
  ).length;

  const pendingOrders = Math.max(
    periodOrderCount -
      completedOrders -
      processingOrders,
    0,
  );

  const inventoryProducts = inventoryOverview.products;

  const stockHealthy = inventoryProducts.filter(
    (product) => product.stockStatus === "HEALTHY",
  ).length;

  const stockLow = inventoryProducts.filter(
    (product) => product.stockStatus === "LOW_STOCK",
  ).length;

  const stockOut = inventoryProducts.filter(
    (product) => product.stockStatus === "OUT_OF_STOCK",
  ).length;

  const today = new Date();

  const greeting =
    today.getHours() < 12
      ? "Good morning!"
      : today.getHours() < 17
        ? "Good afternoon!"
        : "Good evening!";

  const dateLabel = today.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const progress = metrics?.overallProgressPct ?? 0;

  return (
    <div className="min-h-[calc(100vh-72px)] overflow-hidden bg-[#f7f6f2] text-slate-950">
      <main className="mx-auto flex w-full max-w-[1480px] flex-col px-5 pb-4 pt-5 lg:px-8">
        {/* Lifecycle hero */}
        <section className="grid shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[1.45fr_0.55fr_1.15fr]">
          {/* Left: stage overview */}
          <div className="p-6 lg:p-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Business Lifecycle
            </p>

            <h1 className="mt-4 text-[32px] font-semibold leading-none tracking-[-0.055em] text-slate-950 lg:text-[38px]">
              Build your foundation.
            </h1>

            <p className="mt-4 max-w-[540px] text-sm leading-5 text-slate-600">
              You&apos;re in{" "}
              <strong className="font-semibold text-slate-900">
                Stage {business.currentStage.id} ·{" "}
                {business.currentStage.name}
              </strong>
              . Complete the mandatory requirements to move to the next
              stage.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                </span>

                <span className="text-xs text-slate-600">
                  <strong className="font-semibold text-slate-900">
                    {completedRequirements}
                  </strong>{" "}
                  completed
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                </span>

                <span className="text-xs text-slate-600">
                  <strong className="font-semibold text-slate-900">
                    {remainingCount}
                  </strong>{" "}
                  remaining
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50">
                  <CircleAlert className="h-3.5 w-3.5 text-red-500" />
                </span>

                <span className="text-xs text-slate-600">
                  <strong className="font-semibold text-slate-900">
                    {blockerCount}
                  </strong>{" "}
                  blockers
                </span>
              </div>
            </div>

            <Link
              href="/stages"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#123f35] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0d3029]"
            >
              Review next steps
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Center: stage progress */}
          <div className="flex items-center justify-center border-y border-slate-100 px-5 py-6 lg:border-x lg:border-y-0">
            <div className="text-center">
              <div
                className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#496846 ${
                    progress * 3.6
                  }deg, #e2e6e2 ${
                    progress * 3.6
                  }deg 360deg)`,
                }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white">
                  <span className="text-[25px] font-semibold tracking-[-0.05em]">
                    {progress}%
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs font-semibold text-slate-900">
                Stage {business.currentStage.id}
              </p>

              <p className="text-sm font-medium text-slate-900">
                {business.currentStage.name}
              </p>

              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                {completedRequirements} of {requirements.length} requirements
                <br />
                completed
              </p>
            </div>
          </div>

          {/* Right: next requirements and decorative panel */}
          <div className="grid grid-cols-[1fr_150px] gap-5 p-6 lg:p-7">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Next Up
              </p>

              <div className="mt-3 space-y-2.5">
                {nextUpRequirements.map((requirement) => (
                  <Link
                    key={requirement.id}
                    href="/stages"
                    className="flex items-start gap-2.5"
                  >
                    {requirementIcon(requirement.type)}

                    <span className="min-w-0 text-[10px] leading-3.5 text-slate-700">
                      {requirement.title}
                    </span>
                  </Link>
                ))}
              </div>

              <Link
                href="/stages"
                className="mt-4 inline-flex items-center gap-1 text-[10px] font-medium text-slate-800"
              >
                View all requirements
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="relative hidden overflow-hidden rounded-xl bg-[#e7ebe5] sm:block">
              <div className="relative z-10 p-4">
                <span className="text-[10px] text-slate-500">—</span>

                <p className="mt-4 text-[17px] font-medium leading-5 tracking-[-0.03em] text-slate-900">
                  Small steps
                  <br />
                  today, a bigger
                  <br />
                  tomorrow.
                </p>

                <div className="mt-3 h-px w-5 bg-slate-700" />
              </div>

              <div className="absolute -bottom-8 left-[-15px] h-24 w-32 rounded-[50%] bg-[#bcc8bd]" />
              <div className="absolute -bottom-12 right-[-25px] h-28 w-40 rounded-[50%] bg-[#a8b8aa]" />
              <div className="absolute -bottom-16 left-8 h-24 w-28 rounded-[50%] bg-[#8da292]" />
            </div>
          </div>
        </section>

        {/* Business header and date filters */}
        <div className="mt-4 flex shrink-0 items-end justify-between">
          <div>
            <Link
              href="/settings"
              className="group flex items-center gap-2"
            >
              <h2 className="text-[22px] font-medium tracking-[-0.04em] text-slate-950">
                {business.name}
              </h2>

              <span className="text-sm text-slate-500 transition group-hover:text-slate-900">
                ⌄
              </span>
            </Link>

            <p className="mt-0.5 text-xs text-slate-500">
              {business.tagline || "Business Operating System"}
            </p>
          </div>

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
                  href={`/dashboard?period=${item.value}`}
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
                action="/dashboard"
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
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-slate-400"
                    />
                  </label>

                  <label className="block text-[10px] font-medium text-slate-500">
                    To
                    <input
                      type="date"
                      name="to"
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

        {/* Analytics and alerts */}
        <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
          {/* Four analytics cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Revenue */}
            <Link
              href="/orders"
              className="group relative min-h-[210px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                    <ArrowUpRight className="h-5 w-5 text-emerald-700" />
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    Revenue
                  </span>
                </div>

                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200">
                  <ArrowRight className="h-4 w-4 text-slate-700" />
                </span>
              </div>

              <div className="ml-[52px] mt-5">
                <p className="text-[29px] font-semibold tracking-[-0.055em]">
                  {money(revenue, currencySymbol)}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {periodOrderCount > 0
                    ? `${periodOrderCount} paid order${
                        periodOrderCount === 1 ? "" : "s"
                      }`
                    : "No sales yet"}
                </p>
              </div>

              <svg
                viewBox="0 0 300 70"
                preserveAspectRatio="none"
                className="absolute bottom-0 right-0 h-20 w-[58%]"
                aria-hidden="true"
              >
                <path
                  d="M0 58 C35 58 45 49 70 53 C100 57 110 43 135 48 C165 55 177 34 198 42 C222 51 234 16 258 22 C277 27 290 17 300 22 L300 70 L0 70 Z"
                  fill="rgba(80,130,95,0.10)"
                />

                <path
                  d="M0 58 C35 58 45 49 70 53 C100 57 110 43 135 48 C165 55 177 34 198 42 C222 51 234 16 258 22 C277 27 290 17 300 22"
                  fill="none"
                  stroke="rgba(80,130,95,0.45)"
                  strokeWidth="1.4"
                />
              </svg>
            </Link>

            {/* Expenses */}
            <Link
              href="/finance"
              className="group relative min-h-[210px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                    <CreditCard className="h-5 w-5 text-red-600" />
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    Expenses
                  </span>
                </div>

                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200">
                  <ArrowRight className="h-4 w-4 text-slate-700" />
                </span>
              </div>

              <div className="ml-[52px] mt-5">
                <p className="text-[29px] font-semibold tracking-[-0.055em]">
                  {money(expenses, currencySymbol)}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {periodExpenses.length > 0
                    ? `${periodExpenses.length} recorded expense${
                        periodExpenses.length === 1 ? "" : "s"
                      }`
                    : "No expenses yet"}
                </p>
              </div>

              <svg
                viewBox="0 0 300 70"
                preserveAspectRatio="none"
                className="absolute bottom-0 right-0 h-20 w-[58%]"
                aria-hidden="true"
              >
                <path
                  d="M0 60 C35 56 53 45 76 51 C105 58 115 38 140 45 C164 52 177 57 200 39 C224 23 239 14 258 24 C278 35 290 17 300 22 L300 70 L0 70 Z"
                  fill="rgba(220,96,96,0.09)"
                />

                <path
                  d="M0 60 C35 56 53 45 76 51 C105 58 115 38 140 45 C164 52 177 57 200 39 C224 23 239 14 258 24 C278 35 290 17 300 22"
                  fill="none"
                  stroke="rgba(220,96,96,0.45)"
                  strokeWidth="1.4"
                />
              </svg>
            </Link>

            {/* Inventory */}
            <Link
              href="/inventory"
              className="group min-h-[210px] rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                    <Package className="h-5 w-5 text-amber-700" />
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    Inventory
                  </span>
                </div>

                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200">
                  <ArrowRight className="h-4 w-4 text-slate-700" />
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-[29px] font-semibold tracking-[-0.055em]">
                    {inventoryProducts.length}
                  </p>

                  <p className="text-xs text-slate-500">
                    Products tracked
                  </p>

                  <div className="mt-5 flex h-1.5 w-44 overflow-hidden rounded-full bg-slate-100">
                    {stockHealthy > 0 && (
                      <div
                        className="bg-emerald-500"
                        style={{
                          width: `${
                            (stockHealthy /
                              Math.max(inventoryProducts.length, 1)) *
                            100
                          }%`,
                        }}
                      />
                    )}

                    {stockLow > 0 && (
                      <div
                        className="bg-amber-400"
                        style={{
                          width: `${
                            (stockLow /
                              Math.max(inventoryProducts.length, 1)) *
                            100
                          }%`,
                        }}
                      />
                    )}

                    {stockOut > 0 && (
                      <div
                        className="bg-red-500"
                        style={{
                          width: `${
                            (stockOut /
                              Math.max(inventoryProducts.length, 1)) *
                            100
                          }%`,
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-[9px] text-slate-600">
                  <div className="flex items-center justify-between gap-5">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      In Stock
                    </span>
                    <strong>{stockHealthy}</strong>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Low Stock
                    </span>
                    <strong>{stockLow}</strong>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Out of Stock
                    </span>
                    <strong>{stockOut}</strong>
                  </div>
                </div>
              </div>
            </Link>

            {/* Orders */}
            <Link
              href="/orders"
              className="group min-h-[210px] rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                    <ShoppingCart className="h-5 w-5 text-blue-700" />
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    Orders
                  </span>
                </div>

                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200">
                  <ArrowRight className="h-4 w-4 text-slate-700" />
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-[29px] font-semibold tracking-[-0.055em]">
                    {periodOrderCount}
                  </p>

                  <p className="text-xs text-slate-500">
                    Total orders
                  </p>
                </div>

                <div className="space-y-1.5 text-[9px] text-slate-600">
                  <div className="flex items-center justify-between gap-5">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Completed
                    </span>
                    <strong>{completedOrders}</strong>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Processing
                    </span>
                    <strong>{processingOrders}</strong>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      Pending
                    </span>
                    <strong>{pendingOrders}</strong>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Alerts */}
          <Link
            href="/alerts"
            className="group min-h-[423px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-slate-900" />

                <h3 className="text-xl font-semibold tracking-[-0.03em]">
                  Alerts
                </h3>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-700">
                View all
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>

            <div className="mt-3">
              {activeAlerts.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  No active alerts
                </div>
              ) : (
                activeAlerts.slice(0, 10).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-2.5 border-b border-slate-100 py-2.5 last:border-b-0"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDot(
                        alert.severity,
                      )}`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-medium leading-4 text-slate-900">
                        {alert.title}
                      </p>

                      <p className="line-clamp-1 text-[9px] leading-3.5 text-slate-500">
                        {alert.message}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-medium ${severityBadge(
                        alert.severity,
                      )}`}
                    >
                      {severityLabel(alert.severity)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Link>
        </section>

        {/* Quick actions */}
        <section className="mt-3 flex shrink-0 items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-slate-900" />

            <span className="text-sm font-semibold text-slate-900">
              Quick Actions
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-3 w-3" />
              Add Product
            </Link>

            <Link
              href="/finance"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <WalletCards className="h-3 w-3" />
              Record Expense
            </Link>

            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ShoppingCart className="h-3 w-3" />
              Add Order
            </Link>

            <Link
              href="/tasks"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <CheckCircle2 className="h-3 w-3" />
              Create Task
            </Link>

            <Link
              href="/goals"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Target className="h-3 w-3" />
              View Goals
            </Link>
          </div>

          <div className="hidden rounded-xl bg-[#edf1ea] px-5 py-2 text-[9px] leading-3.5 text-slate-600 xl:block">
            A better organised business
            <br />
            creates a freer you.
          </div>
        </section>
      </main>
    </div>
  );
}