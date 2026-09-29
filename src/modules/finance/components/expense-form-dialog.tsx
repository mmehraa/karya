"use client";

import { useEffect, useState, useTransition } from "react";
import type { ExpenseCategory } from "@prisma/client";
import { X } from "lucide-react";
import { createExpenseAction } from "@/modules/finance/actions";

interface ExpenseFormDialogProps {
  open: boolean;
  onClose: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: "PRODUCT_FORMULATION", label: "Product Formulation" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "PRINTING_LABELS", label: "Printing & Labels" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "MARKETING", label: "Marketing" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "WEBSITE_SOFTWARE", label: "Website & Software" },
  { value: "LEGAL_COMPLIANCE", label: "Legal & Compliance" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "OTHER", label: "Other" },
] as const;

export function ExpenseFormDialog({
  open,
  onClose,
}: ExpenseFormDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [expenseDate, setExpenseDate] = useState("");
  const [category, setCategory] =
    useState<ExpenseCategory>("OPERATIONS");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const today = new Date();
    const localDate = new Date(
      today.getTime() - today.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 10);

    setExpenseDate(localDate);
    setCategory("OPERATIONS");
    setDescription("");
    setAmount("");
    setVendor("");
    setPaymentMethod("");
    setIsRecurring(false);
    setNotes("");
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isPending, onClose]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!expenseDate) {
      setError("Please select an expense date.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter an expense description.");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Expense amount must be greater than zero.");
      return;
    }

    startTransition(async () => {
      const result = await createExpenseAction({
        expenseDate: new Date(`${expenseDate}T00:00:00`),
        category,
        description: description.trim(),
        amount: numericAmount,
        vendor: vendor.trim() || null,
        paymentMethod: paymentMethod.trim() || null,
        isRecurring,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error ?? "Unable to record expense.");
        return;
      }

      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-text-primary">
              Record Expense
            </h2>

            <p className="mt-1 text-sm text-text-secondary">
              Add a genuine business expense to the financial ledger.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-2 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="space-y-5 px-6 py-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="expense-date"
                  className="text-xs font-semibold text-text-secondary"
                >
                  Expense Date
                </label>

                <input
                  id="expense-date"
                  type="date"
                  value={expenseDate}
                  onChange={(event) =>
                    setExpenseDate(event.target.value)
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="expense-category"
                  className="text-xs font-semibold text-text-secondary"
                >
                  Category
                </label>

                <select
                  id="expense-category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as ExpenseCategory)
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  {EXPENSE_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="expense-description"
                className="text-xs font-semibold text-text-secondary"
              >
                Description
              </label>

              <input
                id="expense-description"
                type="text"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="e.g. Packaging material purchase"
                maxLength={200}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="expense-amount"
                  className="text-xs font-semibold text-text-secondary"
                >
                  Amount
                </label>

                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-text-muted">
                    ₹
                  </span>

                  <input
                    id="expense-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-border bg-surface-raised py-2.5 pl-8 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="expense-vendor"
                  className="text-xs font-semibold text-text-secondary"
                >
                  Vendor
                  <span className="ml-1 font-normal text-text-muted">
                    Optional
                  </span>
                </label>

                <input
                  id="expense-vendor"
                  type="text"
                  value={vendor}
                  onChange={(event) =>
                    setVendor(event.target.value)
                  }
                  placeholder="Vendor or supplier"
                  maxLength={150}
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="expense-payment-method"
                className="text-xs font-semibold text-text-secondary"
              >
                Payment Method
                <span className="ml-1 font-normal text-text-muted">
                  Optional
                </span>
              </label>

              <input
                id="expense-payment-method"
                type="text"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value)
                }
                placeholder="UPI, Cash, Bank Transfer..."
                maxLength={80}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(event) =>
                  setIsRecurring(event.target.checked)
                }
                className="h-4 w-4 rounded border-border-strong"
              />

              <span>
                <span className="block text-sm font-medium text-text-primary">
                  Recurring expense
                </span>

                <span className="block text-xs text-text-secondary">
                  Mark this expense as recurring for reporting purposes.
                </span>
              </span>
            </label>

            <div>
              <label
                htmlFor="expense-notes"
                className="text-xs font-semibold text-text-secondary"
              >
                Notes
                <span className="ml-1 font-normal text-text-muted">
                  Optional
                </span>
              </label>

              <textarea
                id="expense-notes"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Additional information..."
                maxLength={500}
                rows={4}
                className="mt-1.5 w-full resize-none rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-muted px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-text-secondary shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Recording..." : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}