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
  X,
} from "lucide-react";

import type {
  ExpenseCategorySummary,
  FinanceSummary,
  SerializedExpense,
} from "@/modules/finance/types";

import type { OrderListItem } from "@/modules/orders/types";

import { DeleteExpenseButton } from "./delete-expense-button";
import { ExpenseFormDialog } from "./expense-form-dialog";

type FinancePeriod =
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "ALL_TIME";

const PERIOD_LABELS: Record<
  FinancePeriod,
  string
> = {
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
  const [isDialogOpen, setIsDialogOpen] =
    useState(false);

  const [period, setPeriod] =
    useState<FinancePeriod>("THIS_MONTH");

  const [isPeriodOpen, setIsPeriodOpen] =
    useState(false);

  const [isAllExpensesOpen, setIsAllExpensesOpen] =
    useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  const [isAllCategoriesOpen, setIsAllCategoriesOpen] =
    useState(false);

  const filteredData = useMemo(() => {
    const now = new Date();

    let start: Date | null = null;
    let end: Date | null = null;

    if (period === "THIS_MONTH") {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      );
    }

    if (period === "LAST_MONTH") {
      start = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
    }

    if (period === "THIS_YEAR") {
      start = new Date(
        now.getFullYear(),
        0,
        1,
      );

      end = new Date(
        now.getFullYear() + 1,
        0,
        1,
      );
    }

    const isInRange = (date: Date) => {
      if (!start || !end) {
        return true;
      }

      return date >= start && date < end;
    };

    const filteredOrders = paidOrders.filter(
      (order) =>
        isInRange(new Date(order.orderDate)),
    );

    const filteredExpenses = expenses.filter(
      (expense) =>
        isInRange(
          new Date(expense.expenseDate),
        ),
    );

    const revenue = filteredOrders.reduce(
      (total, order) =>
        total + order.totalAmount,
      0,
    );

    const expenseTotal =
      filteredExpenses.reduce(
        (total, expense) =>
          total + expense.amount,
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
   * Keep the server-calculated values authoritative
   * for All Time.
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

  /*
   * Build category summaries from the expenses currently
   * visible for the selected period.
   *
   * This makes category totals correct for:
   * - This Month
   * - Last Month
   * - This Year
   * - All Time
   */
  const visibleCategorySummary =
    useMemo<ExpenseCategorySummary[]>(() => {
      const grouped =
        new Map<
          string,
          {
            amount: number;
            count: number;
          }
        >();

      displayExpenseRecords.forEach(
        (expense) => {
          const existing =
            grouped.get(
              expense.category,
            ) ?? {
              amount: 0,
              count: 0,
            };

          grouped.set(
            expense.category,
            {
              amount:
                existing.amount +
                expense.amount,
              count:
                existing.count + 1,
            },
          );
        },
      );

      return Array.from(
        grouped.entries(),
      )
        .map(
          ([category, values]) => ({
            category:
              category as ExpenseCategorySummary["category"],
            amount: values.amount,
            count: values.count,
          }),
        )
        .sort(
          (a, b) =>
            b.amount - a.amount,
        );
    }, [displayExpenseRecords]);

  const selectedCategoryExpenses =
    useMemo(() => {
      if (!selectedCategory) {
        return [];
      }

      return [...displayExpenseRecords]
        .filter(
          (expense) =>
            expense.category ===
            selectedCategory,
        )
        .sort(
          (a, b) =>
            b.expenseDate.getTime() -
            a.expenseDate.getTime(),
        );
    }, [
      selectedCategory,
      displayExpenseRecords,
    ]);

  const selectedCategorySummary =
    useMemo(() => {
      if (!selectedCategory) {
        return undefined;
      }

      return visibleCategorySummary.find(
        (item) =>
          item.category ===
          selectedCategory,
      );
    }, [
      selectedCategory,
      visibleCategorySummary,
    ]);

  const currency = (value: number) =>
    `₹${value.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const isProfitPositive =
    displayProfit >= 0;

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
              Track your income, expenses and
              profitability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f4a40] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0c3e36]"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Expense
            </button>

            {/* Period Selector */}
            <div className="relative">
            <button
              type="button"
              onClick={() =>
                setIsPeriodOpen(
                  (open) => !open,
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              aria-haspopup="menu"
              aria-expanded={isPeriodOpen}
            >
              <span>
                {PERIOD_LABELS[period]}
              </span>

              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                  isPeriodOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {isPeriodOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                role="menu"
              >
                {(
                  Object.keys(
                    PERIOD_LABELS,
                  ) as FinancePeriod[]
                ).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setPeriod(option);
                      setIsPeriodOpen(
                        false,
                      );
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs transition ${
                      period === option
                        ? "bg-emerald-50 font-semibold text-emerald-800"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    role="menuitem"
                  >
                    {
                      PERIOD_LABELS[
                        option
                      ]
                    }
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        </section>

        {/* Financial Summary */}
        <section className="grid gap-3 md:grid-cols-3">
          <FinanceSummaryCard
            label="Total Revenue"
            value={currency(
              displayRevenue,
            )}
            icon={ArrowUpRight}
            iconClassName="bg-emerald-50 text-emerald-700"
            description={`${displayOrders.length} paid ${
              displayOrders.length === 1
                ? "order"
                : "orders"
            }`}
          />

          <FinanceSummaryCard
            label="Total Expenses"
            value={currency(
              displayExpenses,
            )}
            icon={Receipt}
            iconClassName="bg-red-50 text-red-500"
            description={`${displayExpenseRecords.length} recorded ${
              displayExpenseRecords.length ===
              1
                ? "expense"
                : "expenses"
            }`}
          />

          <FinanceSummaryCard
            label="Net Profit"
            value={currency(
              displayProfit,
            )}
            icon={
              isProfitPositive
                ? ArrowUpRight
                : ArrowDownRight
            }
            iconClassName={
              isProfitPositive
                ? "bg-blue-50 text-blue-600"
                : "bg-orange-50 text-orange-600"
            }
            description="Revenue minus expenses"
          />
        </section>

        {/* Revenue vs Expenses + Expense Categories */}
        <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <RevenueExpenseChart
            paidOrders={displayOrders}
            expenses={
              displayExpenseRecords
            }
            period={period}
          />

          <ExpenseCategories
            expenses={
              displayExpenseRecords
            }
            categorySummary={
              visibleCategorySummary
            }
            onCategoryClick={(category) =>
              setSelectedCategory(
                category,
              )
            }
            onShowAllCategories={() =>
              setIsAllCategoriesOpen(
                true,
              )
            }
          />
        </section>

        {/* Expense Ledger */}
        <ExpenseLedger
          expenses={
            displayExpenseRecords
          }
          onAddTransaction={() =>
            setIsDialogOpen(true)
          }
          onShowAll={() =>
            setIsAllExpensesOpen(
              true,
            )
          }
        />
      </div>

      {/* Full Expense Ledger */}
      {isAllExpensesOpen && (
        <AllExpensesDialog
          expenses={
            displayExpenseRecords
          }
          periodLabel={
            PERIOD_LABELS[period]
          }
          onClose={() =>
            setIsAllExpensesOpen(
              false,
            )
          }
          onAddTransaction={() => {
            setIsAllExpensesOpen(
              false,
            );
            setIsDialogOpen(true);
          }}
        />
      )}

      {/* All Categories */}
      {isAllCategoriesOpen && (
        <AllCategoriesDialog
          categories={
            visibleCategorySummary
          }
          onClose={() =>
            setIsAllCategoriesOpen(
              false,
            )
          }
          onCategoryClick={(category) => {
            setIsAllCategoriesOpen(
              false,
            );
            setSelectedCategory(
              category,
            );
          }}
        />
      )}

      {/* Category Details */}
      {selectedCategory && (
        <ExpenseCategoryDialog
          category={selectedCategory}
          expenses={
            selectedCategoryExpenses
          }
          summary={
            selectedCategorySummary
          }
          onClose={() =>
            setSelectedCategory(null)
          }
        />
      )}

      <ExpenseFormDialog
        open={isDialogOpen}
        onClose={() =>
          setIsDialogOpen(false)
        }
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

  /*
   * All Time uses a monthly chart.
   * This is important because the user wants historical
   * expenses grouped by month rather than one point per day.
   */
  if (period === "ALL_TIME") {
    return (
      <AllTimeMonthlyChart
        paidOrders={paidOrders}
        expenses={expenses}
      />
    );
  }

  let start: Date;
  let end: Date;

  if (period === "LAST_MONTH") {
    start = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    end = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
    );
  } else if (period === "THIS_YEAR") {
    start = new Date(
      now.getFullYear(),
      0,
      1,
    );

    end = new Date(
      now.getFullYear(),
      11,
      31,
    );
  } else {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    );
  }

  const dayCount =
    period === "THIS_YEAR"
      ? 12
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
      const date = new Date(
        order.orderDate,
      );

      if (
        date.getFullYear() ===
        now.getFullYear()
      ) {
        revenueByDay[
          date.getMonth()
        ] += order.totalAmount;
      }
    });

    expenses.forEach((expense) => {
      const date = new Date(
        expense.expenseDate,
      );

      if (
        date.getFullYear() ===
        now.getFullYear()
      ) {
        expensesByDay[
          date.getMonth()
        ] += expense.amount;
      }
    });
  } else {
    paidOrders.forEach((order) => {
      const date = new Date(
        order.orderDate,
      );

      if (
        date >= start &&
        date <= end
      ) {
        const index = Math.floor(
          (date.getTime() -
            start.getTime()) /
            (1000 *
              60 *
              60 *
              24),
        );

        if (
          index >= 0 &&
          index < dayCount
        ) {
          revenueByDay[index] +=
            order.totalAmount;
        }
      }
    });

    expenses.forEach((expense) => {
      const date = new Date(
        expense.expenseDate,
      );

      if (
        date >= start &&
        date <= end
      ) {
        const index = Math.floor(
          (date.getTime() -
            start.getTime()) /
            (1000 *
              60 *
              60 *
              24),
        );

        if (
          index >= 0 &&
          index < dayCount
        ) {
          expensesByDay[index] +=
            expense.amount;
        }
      }
    });
  }

  return (
    <FinanceChartShell
      paidOrders={paidOrders}
      expenses={expenses}
      revenueValues={revenueByDay}
      expenseValues={expensesByDay}
      labelIndexes={
        period === "THIS_YEAR"
          ? [
              0,
              2,
              4,
              6,
              8,
              10,
              11,
            ]
          : [
              0,
              Math.floor(
                (dayCount - 1) *
                  0.2,
              ),
              Math.floor(
                (dayCount - 1) *
                  0.4,
              ),
              Math.floor(
                (dayCount - 1) *
                  0.6,
              ),
              Math.floor(
                (dayCount - 1) *
                  0.8,
              ),
              dayCount - 1,
            ]
      }
      formatLabel={(index) => {
        if (
          period === "THIS_YEAR"
        ) {
          return new Date(
            now.getFullYear(),
            index,
            1,
          ).toLocaleDateString(
            "en-IN",
            {
              month: "short",
            },
          );
        }

        const date = new Date(
          start,
        );

        date.setDate(
          start.getDate() +
            index,
        );

        return date.toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
          },
        );
      }}
    />
  );
}

function AllTimeMonthlyChart({
  paidOrders,
  expenses,
}: {
  paidOrders: OrderListItem[];
  expenses: SerializedExpense[];
}) {
  const now = new Date();

  const allDates = [
    ...paidOrders.map(
      (order) =>
        new Date(order.orderDate),
    ),
    ...expenses.map(
      (expense) =>
        new Date(
          expense.expenseDate,
        ),
    ),
  ];

  if (allDates.length === 0) {
    const revenueValues = [0];
    const expenseValues = [0];

    return (
      <FinanceChartShell
        paidOrders={paidOrders}
        expenses={expenses}
        revenueValues={
          revenueValues
        }
        expenseValues={
          expenseValues
        }
        labelIndexes={[0]}
        formatLabel={() =>
          now.toLocaleDateString(
            "en-IN",
            {
              month: "short",
              year: "2-digit",
            },
          )
        }
      />
    );
  }

  const earliest = new Date(
    Math.min(
      ...allDates.map((date) =>
        date.getTime(),
      ),
    ),
  );

  const latest = new Date(
    Math.max(
      ...allDates.map((date) =>
        date.getTime(),
      ),
    ),
  );

  const firstMonth = new Date(
    earliest.getFullYear(),
    earliest.getMonth(),
    1,
  );

  const lastMonth = new Date(
    latest.getFullYear(),
    latest.getMonth(),
    1,
  );

  const monthCount =
    (lastMonth.getFullYear() -
      firstMonth.getFullYear()) *
      12 +
    (lastMonth.getMonth() -
      firstMonth.getMonth()) +
    1;

  const revenueByMonth =
    Array.from(
      {
        length: monthCount,
      },
      () => 0,
    );

  const expensesByMonth =
    Array.from(
      {
        length: monthCount,
      },
      () => 0,
    );

  paidOrders.forEach((order) => {
    const date = new Date(
      order.orderDate,
    );

    const index =
      (date.getFullYear() -
        firstMonth.getFullYear()) *
        12 +
      (date.getMonth() -
        firstMonth.getMonth());

    if (
      index >= 0 &&
      index < monthCount
    ) {
      revenueByMonth[index] +=
        order.totalAmount;
    }
  });

  expenses.forEach((expense) => {
    const date = new Date(
      expense.expenseDate,
    );

    const index =
      (date.getFullYear() -
        firstMonth.getFullYear()) *
        12 +
      (date.getMonth() -
        firstMonth.getMonth());

    if (
      index >= 0 &&
      index < monthCount
    ) {
      expensesByMonth[index] +=
        expense.amount;
    }
  });

  let labelIndexes: number[];

  if (monthCount <= 8) {
    labelIndexes = Array.from(
      {
        length: monthCount,
      },
      (_, index) => index,
    );
  } else {
    labelIndexes = [
      0,
      Math.floor(
        (monthCount - 1) * 0.2,
      ),
      Math.floor(
        (monthCount - 1) * 0.4,
      ),
      Math.floor(
        (monthCount - 1) * 0.6,
      ),
      Math.floor(
        (monthCount - 1) * 0.8,
      ),
      monthCount - 1,
    ];
  }

  return (
    <FinanceChartShell
      paidOrders={paidOrders}
      expenses={expenses}
      revenueValues={
        revenueByMonth
      }
      expenseValues={
        expensesByMonth
      }
      labelIndexes={labelIndexes}
      formatLabel={(index) =>
        new Date(
          firstMonth.getFullYear(),
          firstMonth.getMonth() +
            index,
          1,
        ).toLocaleDateString(
          "en-IN",
          {
            month: "short",
            year: "2-digit",
          },
        )
      }
    />
  );
}

function FinanceChartShell({
  paidOrders,
  expenses,
  revenueValues,
  expenseValues,
  labelIndexes,
  formatLabel,
}: {
  paidOrders: OrderListItem[];
  expenses: SerializedExpense[];
  revenueValues: number[];
  expenseValues: number[];
  labelIndexes: number[];
  formatLabel: (
    index: number,
  ) => string;
}) {
  const maxValue = Math.max(
    ...revenueValues,
    ...expenseValues,
    1,
  );

  const width = 700;
  const height = 210;

  const paddingLeft = 38;
  const paddingRight = 12;
  const paddingTop = 18;
  const paddingBottom = 28;

  const chartWidth =
    width -
    paddingLeft -
    paddingRight;

  const chartHeight =
    height -
    paddingTop -
    paddingBottom;

  const pointCount =
    revenueValues.length;

  const createPoints = (
    values: number[],
  ) =>
    values
      .map((value, index) => {
        const x =
          paddingLeft +
          (index /
            Math.max(
              pointCount - 1,
              1,
            )) *
            chartWidth;

        const y =
          paddingTop +
          chartHeight -
          (value / maxValue) *
            chartHeight;

        return `${x},${y}`;
      })
      .join(" ");

  const revenuePoints =
    createPoints(revenueValues);

  const expensePoints =
    createPoints(expenseValues);

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

            <span className="text-slate-400">
              Monthly
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
          {[0, 0.25, 0.5, 0.75, 1].map(
            (fraction) => {
              const y =
                paddingTop +
                chartHeight -
                fraction *
                  chartHeight;

              return (
                <line
                  key={fraction}
                  x1={paddingLeft}
                  x2={
                    width -
                    paddingRight
                  }
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 4"
                />
              );
            },
          )}

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

          {expenseValues.map(
            (value, index) => {
              if (value <= 0) {
                return null;
              }

              const x =
                paddingLeft +
                (index /
                  Math.max(
                    pointCount - 1,
                    1,
                  )) *
                  chartWidth;

              const y =
                paddingTop +
                chartHeight -
                (value / maxValue) *
                  chartHeight;

              return (
                <circle
                  key={`expense-${index}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#ef4444"
                />
              );
            },
          )}

          {labelIndexes.map(
            (index) => {
              const x =
                paddingLeft +
                (index /
                  Math.max(
                    pointCount - 1,
                    1,
                  )) *
                  chartWidth;

              return (
                <text
                  key={`${index}-${formatLabel(
                    index,
                  )}`}
                  x={x}
                  y={height - 7}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94a3b8"
                >
                  {formatLabel(index)}
                </text>
              );
            },
          )}
        </svg>

        {paidOrders.length === 0 &&
          expenses.length === 0 && (
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

function ExpenseCategories({
  expenses,
  categorySummary,
  onCategoryClick,
  onShowAllCategories,
}: {
  expenses: SerializedExpense[];
  categorySummary: ExpenseCategorySummary[];
  onCategoryClick: (
    category: string,
  ) => void;
  onShowAllCategories: () => void;
}) {
  const categories = [
    ...categorySummary,
  ]
    .filter((item) =>
      expenses.some(
        (expense) =>
          expense.category ===
          item.category,
      ),
    )
    .sort(
      (a, b) => b.amount - a.amount,
    );

  /*
   * Fixed-height card.
   *
   * We intentionally show only four categories
   * here so the card never grows vertically.
   */
  const visibleCategories =
    categories.slice(0, 4);

  return (
    <div className="flex h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Expense Categories
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Breakdown of recorded expenses.
          </p>
        </div>

        <Receipt className="h-4 w-4 text-slate-400" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {visibleCategories.length ===
        0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-slate-400">
              No expenses recorded.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleCategories.map(
              (item) => (
                <button
                  key={item.category}
                  type="button"
                  onClick={() =>
                    onCategoryClick(
                      item.category,
                    )
                  }
                  className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-slate-50"
                >
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-900">
                      {item.category.replaceAll(
                        "_",
                        " ",
                      )}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {item.count} record
                      {item.count ===
                      1
                        ? ""
                        : "s"}
                    </p>
                  </div>

                  <p className="text-xs font-semibold text-slate-900">
                    ₹
                    {item.amount.toFixed(
                      2,
                    )}
                  </p>
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {categories.length > 4 && (
        <div className="shrink-0 border-t border-slate-100">
          <button
            type="button"
            onClick={
              onShowAllCategories
            }
            className="flex w-full items-center justify-center gap-1.5 px-5 py-2.5 text-[10px] font-semibold text-emerald-700 transition hover:bg-slate-50"
          >
            Show all{" "}
            {categories.length}{" "}
            categories

            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function ExpenseLedger({
  expenses,
  onAddTransaction,
  onShowAll,
}: {
  expenses: SerializedExpense[];
  onAddTransaction: () => void;
  onShowAll: () => void;
}) {
  const sortedExpenses =
    [...expenses].sort(
      (a, b) =>
        b.expenseDate.getTime() -
        a.expenseDate.getTime(),
    );

  const visibleExpenses =
    sortedExpenses.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-950">
              Expense Ledger
            </h2>

            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-400">
              {expenses.length}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-slate-500">
            Latest recorded business
            expenses.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddTransaction}
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

              <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleExpenses.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-xs text-slate-400"
                >
                  No expenses recorded for this period.
                </td>
              </tr>
            ) : (
              visibleExpenses.map(
                (expense) => (
                  <ExpenseTableRow
                    key={expense.id}
                    expense={expense}
                  />
                ),
              )
            )}
          </tbody>
        </table>
      </div>

      {expenses.length > 5 && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={onShowAll}
            className="flex w-full items-center justify-center gap-1.5 px-5 py-3 text-[10px] font-semibold text-emerald-700 transition hover:bg-slate-50"
          >
            Show all{" "}
            {expenses.length}{" "}
            expenses

            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </section>
  );
}

function ExpenseTableRow({
  expense,
}: {
  expense: SerializedExpense;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
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
        {expense.category.replaceAll(
          "_",
          " ",
        )}
      </td>

      <td className="px-5 py-3 text-slate-400">
        {expense.vendor ?? "—"}
      </td>

      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-slate-900">
        ₹{expense.amount.toFixed(2)}
      </td>

      <td className="px-5 py-3 text-right">
        <div className="flex justify-end">
          <DeleteExpenseButton
            expenseId={expense.id}
            description={
              expense.description
            }
          />
        </div>
      </td>
    </tr>
  );
}

function AllExpensesDialog({
  expenses,
  periodLabel,
  onClose,
  onAddTransaction,
}: {
  expenses: SerializedExpense[];
  periodLabel: string;
  onClose: () => void;
  onAddTransaction: () => void;
}) {
  const sortedExpenses =
    [...expenses].sort(
      (a, b) =>
        b.expenseDate.getTime() -
        a.expenseDate.getTime(),
    );

  return (
    <ModalShell
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {periodLabel}
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Expense Ledger
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {expenses.length} recorded{" "}
            {expenses.length === 1
              ? "expense"
              : "expenses"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddTransaction}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f4a40] px-3 py-2 text-[10px] font-semibold text-white"
          >
            <Plus className="h-3 w-3" />
            Record Expense
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[65vh] overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Date
              </th>

              <th className="px-5 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Description
              </th>

              <th className="px-5 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Category
              </th>

              <th className="px-5 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Vendor
              </th>

              <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Amount
              </th>

              <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedExpenses.map(
              (expense) => (
                <ExpenseTableRow
                  key={expense.id}
                  expense={expense}
                />
              ),
            )}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}

function AllCategoriesDialog({
  categories,
  onClose,
  onCategoryClick,
}: {
  categories: ExpenseCategorySummary[];
  onClose: () => void;
  onCategoryClick: (
    category: string,
  ) => void;
}) {
  return (
    <ModalShell
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Expense Categories
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            All Categories
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Select a category to view its
            expenses.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[65vh] overflow-y-auto">
        <div className="divide-y divide-slate-100">
          {categories.map((item) => (
            <button
              key={item.category}
              type="button"
              onClick={() =>
                onCategoryClick(
                  item.category,
                )
              }
              className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-slate-50"
            >
              <div>
                <p className="text-xs font-medium uppercase text-slate-900">
                  {item.category.replaceAll(
                    "_",
                    " ",
                  )}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  {item.count} record
                  {item.count === 1
                    ? ""
                    : "s"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-slate-900">
                  ₹
                  {item.amount.toFixed(
                    2,
                  )}
                </p>

                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

function ExpenseCategoryDialog({
  category,
  expenses,
  summary,
  onClose,
}: {
  category: string;
  expenses: SerializedExpense[];
  summary:
    | ExpenseCategorySummary
    | undefined;
  onClose: () => void;
}) {
  return (
    <ModalShell
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Expense Category
          </p>

          <h2 className="mt-1 text-lg font-semibold uppercase text-slate-950">
            {category.replaceAll(
              "_",
              " ",
            )}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {summary?.count ??
              expenses.length}{" "}
            {expenses.length === 1
              ? "expense"
              : "expenses"}
            {" · "}
            ₹
            {(
              summary?.amount ??
              expenses.reduce(
                (total, expense) =>
                  total +
                  expense.amount,
                0,
              )
            ).toFixed(2)}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 max-h-[65vh] overflow-y-auto">
        {expenses.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-slate-400">
            No expenses in this category.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map(
              (expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900">
                      {
                        expense.description
                      }
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      <span>
                        {expense.expenseDate.toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>

                      {expense.vendor && (
                        <>
                          <span>·</span>

                          <span>
                            {
                              expense.vendor
                            }
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <p className="text-xs font-semibold text-slate-900">
                      ₹
                      {expense.amount.toFixed(
                        2,
                      )}
                    </p>

                    <DeleteExpenseButton
                      expenseId={
                        expense.id
                      }
                      description={
                        expense.description
                      }
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
  maxWidth,
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`flex max-h-[80vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {children}
      </div>
    </div>
  );
}