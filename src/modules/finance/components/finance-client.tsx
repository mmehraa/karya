"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Plus,
  Receipt,
  Wallet,
} from "lucide-react";

import type {
  ExpenseCategorySummary,
  FinanceSummary,
  SerializedExpense,
} from "@/modules/finance/types";

import type { OrderListItem } from "@/modules/orders/types";

import { ExpenseFormDialog } from "./expense-form-dialog";

type FinancePeriod = "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "ALL_TIME";

const PERIOD_LABELS: Record<FinancePeriod, string> = {
  THIS_MONTH: "This Month",
  LAST_MONTH: "Last Month",
  THIS_YEAR: "This Year",
  ALL_TIME: "All Time",
};

interface FinanceClientProps {
  expenses: SerializedExpense[];
  summary: FinanceSummary;
  categorySummary: ExpenseCategorySummary[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  paidOrders: OrderListItem[];
}

export function FinanceClient({
  expenses,
  summary,
  categorySummary,
  totalRevenue,
  totalExpenses,
  netProfit,
  paidOrders,
}: FinanceClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [period, setPeriod] = useState<FinancePeriod>("THIS_MONTH");
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  const filteredData = useMemo(() => {
    const now = new Date();

    let start: Date | null = null;
    let end: Date | null = null;

    if (period === "THIS_MONTH") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      );
    }

    if (period === "LAST_MONTH") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (period === "THIS_YEAR") {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
    }

    const isInRange = (date: Date) => {
      if (!start || !end) {
        return true;
      }

      return date >= start && date < end;
    };

    const filteredOrders = paidOrders.filter((order) =>
      isInRange(new Date(order.orderDate)),
    );

    const filteredExpenses = expenses.filter((expense) =>
      isInRange(new Date(expense.expenseDate)),
    );

    const revenue = filteredOrders.reduce(
      (total, order) => total + order.totalAmount,
      0,
    );

    const expenseTotal = filteredExpenses.reduce(
      (total, expense) => total + expense.amount,
      0,
    );

    return {
      orders: filteredOrders,
      expenses: filteredExpenses,
      revenue,
      expensesTotal: expenseTotal,
      profit: revenue - expenseTotal,
    };
  }, [period, paidOrders, expenses]);

  /*
   * Keep these references intentionally available so the component
   * continues to accept the server-calculated finance summary.
   *
   * For "All Time", the server values are authoritative.
   */
  const displayRevenue =
    period === "ALL_TIME"
      ? totalRevenue
      : filteredData.revenue;

  const displayExpenses =
    period === "ALL_TIME"
      ? totalExpenses
      : filteredData.expensesTotal;

  const displayProfit =
    period === "ALL_TIME"
      ? netProfit
      : filteredData.profit;

  const displayOrders =
    period === "ALL_TIME"
      ? paidOrders
      : filteredData.orders;

  const displayExpenseRecords =
    period === "ALL_TIME"
      ? expenses
      : filteredData.expenses;

  const currency = (value: number) =>
    `₹${value.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const isProfitPositive = displayProfit >= 0;

  return (
    <>
      <div className="space-y-4">
        {/* Finance Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Finance Workspace
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              Finance
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track your income, expenses and profitability.
            </p>
          </div>

          {/* Period Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPeriodOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              aria-haspopup="menu"
              aria-expanded={isPeriodOpen}
            >
              <span>{PERIOD_LABELS[period]}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                  isPeriodOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isPeriodOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                role="menu"
              >
                {(Object.keys(PERIOD_LABELS) as FinancePeriod[]).map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setPeriod(option);
                        setIsPeriodOpen(false);
                      }}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs transition ${
                        period === option
                          ? "bg-emerald-50 font-semibold text-emerald-800"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      role="menuitem"
                    >
                      {PERIOD_LABELS[option]}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </section>

        {/* Financial Summary */}
        <section className="grid gap-3 md:grid-cols-3">
          <FinanceSummaryCard
            label="Total Revenue"
            value={currency(displayRevenue)}
            icon={ArrowUpRight}
            iconClassName="bg-emerald-50 text-emerald-700"
            description={`${displayOrders.length} paid ${
              displayOrders.length === 1 ? "order" : "orders"
            }`}
          />

          <FinanceSummaryCard
            label="Total Expenses"
            value={currency(displayExpenses)}
            icon={Receipt}
            iconClassName="bg-red-50 text-red-500"
            description={`${displayExpenseRecords.length} recorded ${
              displayExpenseRecords.length === 1
                ? "expense"
                : "expenses"
            }`}
          />

          <FinanceSummaryCard
            label="Net Profit"
            value={currency(displayProfit)}
            icon={
              isProfitPositive ? ArrowUpRight : ArrowDownRight
            }
            iconClassName={
              isProfitPositive
                ? "bg-blue-50 text-blue-600"
                : "bg-orange-50 text-orange-600"
            }
            description="Revenue minus expenses"
          />
        </section>

        {/* Revenue vs Expenses + Recent Transactions */}
        <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <RevenueExpenseChart
            paidOrders={displayOrders}
            expenses={displayExpenseRecords}
            period={period}
          />

          <RecentTransactions
            expenses={displayExpenseRecords}
            onAddTransaction={() => setIsDialogOpen(true)}
          />
        </section>

        {/* Expense Ledger */}
        {displayExpenseRecords.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-950">
                    Expense Ledger
                  </h2>

                  <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-400">
                    {displayExpenseRecords.length}
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-slate-500">
                  Detailed business expense records.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f4a40] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0c3e36]"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Expense
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                    <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Description
                    </th>

                    <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Category
                    </th>

                    <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Vendor
                    </th>

                    <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {displayExpenseRecords.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                        {expense.expenseDate.toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </td>

                      <td className="px-5 py-3 font-medium text-slate-900">
                        {expense.description}
                      </td>

                      <td className="px-5 py-3 text-slate-500">
                        {expense.category.replaceAll("_", " ")}
                      </td>

                      <td className="px-5 py-3 text-slate-400">
                        {expense.vendor ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-slate-900">
                        ₹{expense.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {categorySummary.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-950">
                Expense Categories
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Breakdown of recorded expenses by category.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {categorySummary.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-900">
                      {item.category.replaceAll("_", " ")}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {item.count} record
                      {item.count === 1 ? "" : "s"}
                    </p>
                  </div>

                  <p className="text-xs font-semibold text-slate-900">
                    ₹{item.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <ExpenseFormDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}

function FinanceSummaryCard({
  label,
  value,
  description,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof ArrowUpRight;
  iconClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function RevenueExpenseChart({
  paidOrders,
  expenses,
  period,
}: {
  paidOrders: OrderListItem[];
  expenses: SerializedExpense[];
  period: FinancePeriod;
}) {
  const now = new Date();

  let start: Date;
  let end: Date;

  if (period === "LAST_MONTH") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (period === "THIS_YEAR") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  } else if (period === "ALL_TIME") {
    const allDates = [
      ...paidOrders.map((order) => new Date(order.orderDate)),
      ...expenses.map((expense) => new Date(expense.expenseDate)),
    ];

    if (allDates.length === 0) {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      );
    } else {
      start = new Date(
        Math.min(...allDates.map((date) => date.getTime())),
      );

      end = new Date(
        Math.max(...allDates.map((date) => date.getTime())),
      );
    }
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    );
  }

  const dayCount =
    period === "THIS_YEAR"
      ? 12
      : period === "ALL_TIME"
        ? Math.max(
            1,
            Math.ceil(
              (end.getTime() - start.getTime()) /
                (1000 * 60 * 60 * 24),
            ) + 1,
          )
        : end.getDate();

  const revenueByDay = Array.from(
    { length: dayCount },
    () => 0,
  );

  const expensesByDay = Array.from(
    { length: dayCount },
    () => 0,
  );

  if (period === "THIS_YEAR") {
    paidOrders.forEach((order) => {
      const date = new Date(order.orderDate);

      if (date.getFullYear() === now.getFullYear()) {
        revenueByDay[date.getMonth()] += order.totalAmount;
      }
    });

    expenses.forEach((expense) => {
      const date = new Date(expense.expenseDate);

      if (date.getFullYear() === now.getFullYear()) {
        expensesByDay[date.getMonth()] += expense.amount;
      }
    });
  } else {
    paidOrders.forEach((order) => {
      const date = new Date(order.orderDate);

      if (date >= start && date <= end) {
        const index = Math.floor(
          (date.getTime() - start.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (index >= 0 && index < dayCount) {
          revenueByDay[index] += order.totalAmount;
        }
      }
    });

    expenses.forEach((expense) => {
      const date = new Date(expense.expenseDate);

      if (date >= start && date <= end) {
        const index = Math.floor(
          (date.getTime() - start.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (index >= 0 && index < dayCount) {
          expensesByDay[index] += expense.amount;
        }
      }
    });
  }

  const maxValue = Math.max(
    ...revenueByDay,
    ...expensesByDay,
    1,
  );

  const width = 700;
  const height = 210;
  const paddingLeft = 38;
  const paddingRight = 12;
  const paddingTop = 18;
  const paddingBottom = 28;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const createPoints = (values: number[]) =>
    values
      .map((value, index) => {
        const x =
          paddingLeft +
          (index / Math.max(dayCount - 1, 1)) *
            chartWidth;

        const y =
          paddingTop +
          chartHeight -
          (value / maxValue) * chartHeight;

        return `${x},${y}`;
      })
      .join(" ");

  const revenuePoints = createPoints(revenueByDay);
  const expensePoints = createPoints(expensesByDay);

  const formatLabel = (index: number) => {
    if (period === "THIS_YEAR") {
      return new Date(
        now.getFullYear(),
        index,
        1,
      ).toLocaleDateString("en-IN", {
        month: "short",
      });
    }

    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  const labelIndexes =
    period === "THIS_YEAR"
      ? [0, 2, 4, 6, 8, 10, 11]
      : [
          0,
          Math.floor((dayCount - 1) * 0.2),
          Math.floor((dayCount - 1) * 0.4),
          Math.floor((dayCount - 1) * 0.6),
          Math.floor((dayCount - 1) * 0.8),
          dayCount - 1,
        ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Revenue vs Expenses
          </h2>

          <div className="mt-1 flex items-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Revenue
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Expenses
            </span>
          </div>
        </div>

        <CalendarDays className="h-4 w-4 text-slate-400" />
      </div>

      <div className="px-4 pb-4 pt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[210px] w-full"
          preserveAspectRatio="none"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y =
              paddingTop +
              chartHeight -
              fraction * chartHeight;

            return (
              <line
                key={fraction}
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 4"
              />
            );
          })}

          <polyline
            points={revenuePoints}
            fill="none"
            stroke="#059669"
            strokeWidth="2"
          />

          <polyline
            points={expensePoints}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />

          {labelIndexes.map((index) => {
            const x =
              paddingLeft +
              (index / Math.max(dayCount - 1, 1)) *
                chartWidth;

            return (
              <text
                key={`${index}-${formatLabel(index)}`}
                x={x}
                y={height - 7}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
              >
                {formatLabel(index)}
              </text>
            );
          })}
        </svg>

        {paidOrders.length === 0 && expenses.length === 0 && (
          <div className="-mt-[135px] mb-[105px] flex justify-center">
            <span className="rounded-full bg-white px-3 py-1 text-[10px] text-slate-400 shadow-sm">
              No financial data yet
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function RecentTransactions({
  expenses,
  onAddTransaction,
}: {
  expenses: SerializedExpense[];
  onAddTransaction: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Recent Transactions
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Latest recorded expenses.
          </p>
        </div>

        <ArrowRight className="h-4 w-4 text-slate-400" />
      </div>

      {expenses.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
            <Wallet className="h-5 w-5 text-slate-400" />
          </div>

          <h3 className="mt-4 text-xs font-semibold text-slate-900">
            No transactions yet
          </h3>

          <p className="mt-1 max-w-[220px] text-[10px] leading-4 text-slate-400">
            Your transactions will appear here once you record an
            expense.
          </p>

          <button
            type="button"
            onClick={onAddTransaction}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0f4a40] px-4 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#0c3e36]"
          >
            <Plus className="h-3 w-3" />
            Add Transaction
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {expenses.slice(0, 6).map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-900">
                  {expense.description}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  {expense.expenseDate.toLocaleDateString(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                    },
                  )}
                </p>
              </div>

              <p className="ml-3 shrink-0 text-xs font-semibold text-slate-900">
                ₹{expense.amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}