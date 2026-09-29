"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import {
  createCashTransactionAction,
  deleteCashTransactionAction,
} from "@/modules/cash-flow/actions";

import type {
  CashFlowCategorySummary,
  CashFlowSummary,
  SerializedCashTransaction,
} from "@/modules/cash-flow/types";

import type {
  CashTransactionCategory,
  CashTransactionType,
} from "@prisma/client";

type Props = {
  initialTransactions: SerializedCashTransaction[];
  initialSummary: CashFlowSummary;
  initialCategorySummary: CashFlowCategorySummary[];
};

type FilterType =
  | "ALL"
  | CashTransactionType;

type PeriodType =
  | "ALL"
  | "7D"
  | "3M"
  | "1Y";

const categoryLabels: Record<
  CashTransactionCategory,
  string
> = {
  CUSTOMER_PAYMENT:
    "Customer payment",
  OTHER_INCOME:
    "Other income",
  RAW_MATERIAL_PURCHASE:
    "Raw material purchase",
  PACKAGING_MATERIAL_PURCHASE:
    "Packaging purchase",
  OPERATING_EXPENSE:
    "Operating expense",
  SHIPPING:
    "Shipping",
  PAYMENT_PROCESSING_FEE:
    "Payment processing",
  CUSTOMER_REFUND:
    "Customer refund",
  OTHER: "Other",
};

const paymentMethodLabels: Record<
  string,
  string
> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatDate(
  value: Date | string,
) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(value));
}

function getCategoryLabel(
  category: CashTransactionCategory,
) {
  return categoryLabels[category];
}

function getPaymentMethodLabel(
  paymentMethod: string | null,
) {
  if (!paymentMethod) {
    return "—";
  }

  return (
    paymentMethodLabels[
      paymentMethod
    ] ?? paymentMethod
  );
}

function getPeriodStart(
  period: PeriodType,
) {
  if (period === "ALL") {
    return null;
  }

  const now = new Date();

  if (period === "7D") {
    const date = new Date(now);
    date.setDate(
      date.getDate() - 7,
    );
    return date;
  }

  if (period === "3M") {
    const date = new Date(now);
    date.setMonth(
      date.getMonth() - 3,
    );
    return date;
  }

  const date = new Date(now);
  date.setFullYear(
    date.getFullYear() - 1,
  );

  return date;
}

function calculateSummary(
  transactions: SerializedCashTransaction[],
): CashFlowSummary {
  let totalInflows = 0;
  let totalOutflows = 0;
  let inflowCount = 0;
  let outflowCount = 0;

  for (const transaction of transactions) {
    if (
      transaction.type ===
      "INFLOW"
    ) {
      totalInflows +=
        transaction.amount;
      inflowCount += 1;
    } else {
      totalOutflows +=
        transaction.amount;
      outflowCount += 1;
    }
  }

  return {
    totalInflows,
    totalOutflows,
    netCashFlow:
      totalInflows -
      totalOutflows,
    inflowCount,
    outflowCount,
  };
}

export function CashFlowClient({
  initialTransactions,
  initialSummary,
  initialCategorySummary,
}: Props) {
  const [
    transactions,
    setTransactions,
  ] = useState(
    initialTransactions,
  );

  const [filter, setFilter] =
    useState<FilterType>("ALL");

  const [period, setPeriod] =
    useState<PeriodType>("ALL");

  const [
    isCreateOpen,
    setIsCreateOpen,
  ] = useState(false);

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<SerializedCashTransaction | null>(
      null,
    );

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const filteredTransactions =
    useMemo(() => {
      const periodStart =
        getPeriodStart(period);

      return transactions.filter(
        (transaction) => {
          if (
            filter !== "ALL" &&
            transaction.type !==
              filter
          ) {
            return false;
          }

          if (
            periodStart &&
            new Date(
              transaction.transactionDate,
            ) < periodStart
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      transactions,
      filter,
      period,
    ]);

  const visibleSummary =
    useMemo(
      () =>
        calculateSummary(
          filteredTransactions,
        ),
      [filteredTransactions],
    );

  const categorySummary =
    useMemo(() => {
      const grouped =
        new Map<
          string,
          {
            category: CashTransactionCategory;
            type: CashTransactionType;
            amount: number;
            count: number;
          }
        >();

      for (const transaction of filteredTransactions) {
        const key =
          `${transaction.type}-${transaction.category}`;

        const existing =
          grouped.get(key);

        if (existing) {
          existing.amount +=
            transaction.amount;
          existing.count += 1;
        } else {
          grouped.set(key, {
            category:
              transaction.category,
            type: transaction.type,
            amount:
              transaction.amount,
            count: 1,
          });
        }
      }

      return Array.from(
        grouped.values(),
      ).sort(
        (a, b) =>
          b.amount - a.amount,
      );
    }, [filteredTransactions]);

  function handleCreate(
    formData: FormData,
  ) {
    setError(null);

    const transactionDate =
      String(
        formData.get(
          "transactionDate",
        ) ?? "",
      );

    const type =
      String(
        formData.get("type") ?? "",
      ) as CashTransactionType;

    const category =
      String(
        formData.get(
          "category",
        ) ?? "",
      ) as CashTransactionCategory;

    const amount = Number(
      formData.get("amount") ?? 0,
    );

    const description =
      String(
        formData.get(
          "description",
        ) ?? "",
      ).trim();

    const paymentMethodValue =
      String(
        formData.get(
          "paymentMethod",
        ) ?? "",
      ).trim();

    const notesValue =
      String(
        formData.get("notes") ?? "",
      ).trim();

    if (
      !transactionDate ||
      !type ||
      !category ||
      !description ||
      !amount ||
      amount <= 0
    ) {
      setError(
        "Please complete all required fields.",
      );
      return;
    }

    startTransition(
      async () => {
        const result =
          await createCashTransactionAction(
            {
              transactionDate:
                new Date(
                  transactionDate,
                ),
              type,
              category,
              amount,
              paymentMethod:
                paymentMethodValue ||
                null,
              description,
              notes:
                notesValue || null,
            },
          );

        if (!result.success) {
          setError(
            result.error ??
              "Unable to create transaction.",
          );
          return;
        }

        const created =
          result.data;

        if (created) {
          setTransactions(
            (current) => [
              created,
              ...current,
            ],
          );
        }

        setIsCreateOpen(false);
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    const transactionId =
      deleteTarget.id;

    setError(null);

    startTransition(
      async () => {
        const result =
          await deleteCashTransactionAction(
            {
              id: transactionId,
            },
          );

        if (!result.success) {
          setError(
            result.error ??
              "Unable to delete transaction.",
          );
          return;
        }

        setTransactions(
          (current) =>
            current.filter(
              (transaction) =>
                transaction.id !==
                transactionId,
            ),
        );

        setDeleteTarget(null);
      },
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Cash in"
          value={formatCurrency(
            visibleSummary.totalInflows,
          )}
          detail={`${visibleSummary.inflowCount} transaction${
            visibleSummary.inflowCount ===
            1
              ? ""
              : "s"
          }`}
          icon={ArrowDownLeft}
          positive
        />

        <SummaryCard
          label="Cash out"
          value={formatCurrency(
            visibleSummary.totalOutflows,
          )}
          detail={`${visibleSummary.outflowCount} transaction${
            visibleSummary.outflowCount ===
            1
              ? ""
              : "s"
          }`}
          icon={ArrowUpRight}
        />

        <SummaryCard
          label="Net cash flow"
          value={formatCurrency(
            visibleSummary.netCashFlow,
          )}
          detail={
            visibleSummary.netCashFlow >=
            0
              ? "Positive net movement"
              : "Negative net movement"
          }
          icon={Wallet}
          positive={
            visibleSummary.netCashFlow >=
            0
          }
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-[-0.02em] text-text-primary">
                Cash ledger
              </h2>

              <p className="mt-1 text-xs leading-5 text-text-secondary">
                Every recorded cash movement
                for this business.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsCreateOpen(true)
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add transaction
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-border bg-surface-muted p-1">
              {(
                [
                  ["ALL", "All"],
                  ["INFLOW", "In"],
                  ["OUTFLOW", "Out"],
                ] as const
              ).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFilter(value)
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      filter === value
                        ? "bg-surface-raised text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

              <select
                value={period}
                onChange={(event) =>
                  setPeriod(
                    event.target
                      .value as PeriodType,
                  )
                }
                className="h-9 appearance-none rounded-xl border border-border bg-surface-raised pl-9 pr-9 text-xs font-medium text-text-secondary outline-none transition focus:border-slate-400"
              >
                <option value="ALL">
                  All time
                </option>
                <option value="7D">
                  Last 7 days
                </option>
                <option value="3M">
                  Last 3 months
                </option>
                <option value="1Y">
                  Last 12 months
                </option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {filteredTransactions.length ===
        0 ? (
          <EmptyState
            onAdd={() =>
              setIsCreateOpen(true)
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-border bg-surface-muted/70">
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Date
                  </th>

                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Description
                  </th>

                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Category
                  </th>

                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Method
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Amount
                  </th>

                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map(
                  (transaction) => {
                    const isInflow =
                      transaction.type ===
                      "INFLOW";

                    const isManual =
                      transaction.sourceType ===
                        "MANUAL" ||
                      !transaction.sourceType;

                    return (
                      <tr
                        key={
                          transaction.id
                        }
                        className="border-b border-border last:border-0"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-text-secondary">
                          {formatDate(
                            transaction.transactionDate,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                isInflow
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-rose-50 text-rose-600"
                              }`}
                            >
                              {isInflow ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </div>

                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                {
                                  transaction.description
                                }
                              </p>

                              {transaction.sourceType && (
                                <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-text-muted">
                                  {transaction.sourceType.replaceAll(
                                    "_",
                                    " ",
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                            {getCategoryLabel(
                              transaction.category,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs text-text-secondary">
                          {getPaymentMethodLabel(
                            transaction.paymentMethod,
                          )}
                        </td>

                        <td
                          className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold ${
                            isInflow
                              ? "text-emerald-600"
                              : "text-text-primary"
                          }`}
                        >
                          {isInflow
                            ? "+"
                            : "−"}
                          {formatCurrency(
                            transaction.amount,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right">
                          {isManual && (
                            <button
                              type="button"
                              disabled={
                                isPending
                              }
                              onClick={() =>
                                setDeleteTarget(
                                  transaction,
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface-raised shadow-sm">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-text-primary">
              Cash movement by category
            </h2>

            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Breakdown for the selected
              period.
            </p>
          </div>

          {categorySummary.length ===
          0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-text-muted">
                No cash movements for
                this period.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {categorySummary.map(
                (item) => (
                  <div
                    key={`${item.type}-${item.category}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          item.type ===
                          "INFLOW"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-surface-muted text-text-secondary"
                        }`}
                      >
                        {item.type ===
                        "INFLOW" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-secondary">
                          {getCategoryLabel(
                            item.category,
                          )}
                        </p>

                        <p className="mt-0.5 text-[11px] text-text-muted">
                          {item.count}{" "}
                          transaction
                          {item.count ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </div>
                    </div>

                    <p
                      className={`whitespace-nowrap text-sm font-semibold ${
                        item.type ===
                        "INFLOW"
                          ? "text-emerald-600"
                          : "text-text-primary"
                      }`}
                    >
                      {item.type ===
                      "INFLOW"
                        ? "+"
                        : "−"}
                      {formatCurrency(
                        item.amount,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised shadow-sm">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-text-primary">
              Cash position
            </h2>

            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Movement summary for the
              selected period.
            </p>
          </div>

          <div className="space-y-1 px-5 py-4 sm:px-6">
            <MetricRow
              label="Cash in"
              value={formatCurrency(
                visibleSummary.totalInflows,
              )}
              positive
            />

            <MetricRow
              label="Cash out"
              value={formatCurrency(
                visibleSummary.totalOutflows,
              )}
            />

            <div className="my-3 border-t border-border" />

            <MetricRow
              label="Net movement"
              value={formatCurrency(
                visibleSummary.netCashFlow,
              )}
              emphasized
              positive={
                visibleSummary.netCashFlow >=
                0
              }
            />
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <Modal
          title="Add cash transaction"
          description="Record a cash movement that is not automatically created by another Karya workflow."
          onClose={() =>
            setIsCreateOpen(false)
          }
        >
          <form
            action={handleCreate}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Transaction date"
                required
              >
                <input
                  name="transactionDate"
                  type="date"
                  defaultValue={
                    new Date()
                      .toISOString()
                      .slice(0, 10)
                  }
                  className={inputClassName}
                  required
                />
              </Field>

              <Field
                label="Direction"
                required
              >
                <select
                  name="type"
                  defaultValue="OUTFLOW"
                  className={inputClassName}
                  required
                >
                  <option value="OUTFLOW">
                    Cash out
                  </option>
                  <option value="INFLOW">
                    Cash in
                  </option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Category"
                required
              >
                <select
                  name="category"
                  defaultValue="OTHER"
                  className={inputClassName}
                  required
                >
                  <option value="OTHER">
                    Other
                  </option>

                  <option value="OTHER_INCOME">
                    Other income
                  </option>

                  <option value="SHIPPING">
                    Shipping
                  </option>

                  <option value="PAYMENT_PROCESSING_FEE">
                    Payment processing fee
                  </option>

                  <option value="OPERATING_EXPENSE">
                    Operating expense
                  </option>

                  <option value="RAW_MATERIAL_PURCHASE">
                    Raw material purchase
                  </option>

                  <option value="PACKAGING_MATERIAL_PURCHASE">
                    Packaging purchase
                  </option>

                  <option value="CUSTOMER_PAYMENT">
                    Customer payment
                  </option>

                  <option value="CUSTOMER_REFUND">
                    Customer refund
                  </option>
                </select>
              </Field>

              <Field
                label="Amount"
                required
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                    ₹
                  </span>

                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className={`${inputClassName} pl-8`}
                    required
                  />
                </div>
              </Field>
            </div>

            <Field
              label="Description"
              required
            >
              <input
                name="description"
                type="text"
                placeholder="e.g. Bank charge"
                className={inputClassName}
                required
              />
            </Field>

            <Field label="Payment method">
              <select
                name="paymentMethod"
                defaultValue=""
                className={inputClassName}
              >
                <option value="">
                  Not specified
                </option>

                <option value="CASH">
                  Cash
                </option>

                <option value="UPI">
                  UPI
                </option>

                <option value="CARD">
                  Card
                </option>

                <option value="BANK_TRANSFER">
                  Bank transfer
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            </Field>

            <Field label="Notes">
              <textarea
                name="notes"
                rows={3}
                placeholder="Optional notes"
                className={`${inputClassName} min-h-[80px] resize-none py-2.5`}
              />
            </Field>

            <div className="flex justify-end gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={() =>
                  setIsCreateOpen(
                    false,
                  )
                }
                className="h-10 rounded-xl px-4 text-sm font-medium text-text-secondary transition hover:bg-surface-muted"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="h-10 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? "Saving..."
                  : "Add transaction"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete transaction?"
          description="This manually-created cash transaction will be permanently removed."
          onClose={() =>
            setDeleteTarget(null)
          }
          compact
        >
          <div className="rounded-xl border border-border bg-surface-muted p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {
                    deleteTarget.description
                  }
                </p>

                <p className="mt-1 text-xs text-text-secondary">
                  {formatDate(
                    deleteTarget.transactionDate,
                  )}
                </p>
              </div>

              <p className="text-sm font-semibold text-text-primary">
                {formatCurrency(
                  deleteTarget.amount,
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                setDeleteTarget(
                  null,
                )
              }
              className="h-10 rounded-xl px-4 text-sm font-medium text-text-secondary transition hover:bg-surface-muted"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={
                handleDelete
              }
              className="h-10 rounded-xl bg-red-600 px-5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Deleting..."
                : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  positive = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wallet;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-text-secondary">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-semibold tracking-[-0.035em] ${
              positive
                ? "text-emerald-600"
                : "text-text-primary"
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-[11px] text-text-muted">
            {detail}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-surface-muted text-text-secondary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  positive = false,
  emphasized = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span
        className={`text-sm ${
          emphasized
            ? "font-semibold text-text-primary"
            : "text-text-secondary"
        }`}
      >
        {label}
      </span>

      <span
        className={`text-sm ${
          emphasized
            ? "font-semibold"
            : "font-medium"
        } ${
          positive
            ? "text-emerald-600"
            : "text-text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-text-secondary">
        <CircleDollarSign className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-text-primary">
        No cash transactions yet
      </h3>

      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-text-secondary">
        Cash movements will appear here
        automatically when purchases, expenses,
        and paid orders are recorded.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-medium text-white transition hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Add transaction
      </button>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
        {label}
        {required && (
          <span className="ml-1 text-emerald-600">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
  compact = false,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
      <div
        className={`w-full overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl ${
          compact
            ? "max-w-md"
            : "max-w-xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-semibold tracking-[-0.02em] text-text-primary">
              {title}
            </h2>

            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-muted hover:text-text-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}