"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Trash2,
} from "lucide-react";

import { deleteExpenseAction } from "@/modules/finance/actions";

interface DeleteExpenseButtonProps {
  expenseId: string;
  description: string;
}

export function DeleteExpenseButton({
  expenseId,
  description,
}: DeleteExpenseButtonProps) {
  const [isPending, startTransition] =
    useTransition();

  const [
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  function handleDeleteRequest() {
    if (isPending) {
      return;
    }

    setError(null);
    setIsDeleteConfirmOpen(true);
  }

  function handleDeleteCancel() {
    if (isPending) {
      return;
    }

    setIsDeleteConfirmOpen(false);
    setError(null);
  }

  function handleDeleteConfirm() {
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result =
        await deleteExpenseAction({
          id: expenseId,
        });

      if (!result.success) {
        setError(
          result.error ??
            "Unable to delete expense.",
        );

        setIsDeleteConfirmOpen(false);
        return;
      }

      setIsDeleteConfirmOpen(false);
    });
  }

  return (
    <>
      {/* Delete button */}
      <button
        type="button"
        onClick={handleDeleteRequest}
        disabled={isPending}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Delete expense: ${description}`}
        title="Delete expense"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 shadow-lg">
          {error}
        </div>
      )}

      {/* Custom delete confirmation */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isPending
            ) {
              handleDeleteCancel();
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-expense-title"
            aria-describedby="delete-expense-description"
            className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xl"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            {/* Icon */}
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>

            {/* Title */}
            <h3
              id="delete-expense-title"
              className="mt-4 text-left text-base font-semibold text-slate-950"
            >
              Delete this expense?
            </h3>

            {/* Description */}
            <p
              id="delete-expense-description"
              className="mt-2 text-left text-sm leading-6 text-slate-500"
            >
              <span className="font-medium text-slate-700">
                {description}
              </span>{" "}
              will be permanently deleted. This action
              cannot be undone.
            </p>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}

                {isPending
                  ? "Deleting..."
                  : "Delete Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}