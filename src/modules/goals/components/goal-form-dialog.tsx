"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";

import { createGoalAction } from "../actions";

interface GoalFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GoalFormDialog({
  open,
  onClose,
}: GoalFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("0");
  const [unit, setUnit] = useState("Units");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!open) return;

    setError(null);
    setName("");
    setCategory("");
    setTargetValue("");
    setCurrentValue("0");
    setUnit("Units");
    setStartDate("");
    setEndDate("");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isPending, onClose]);

  if (!open) {
    return null;
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedUnit = unit.trim();

    if (trimmedName.length < 2) {
      setError("Goal name must be at least 2 characters.");
      return;
    }

    if (!trimmedCategory) {
      setError("Category is required.");
      return;
    }

    const target = Number(targetValue);
    const current = Number(currentValue);

    if (!Number.isFinite(target) || target <= 0) {
      setError("Target value must be greater than 0.");
      return;
    }

    if (!Number.isFinite(current) || current < 0) {
      setError("Current value cannot be negative.");
      return;
    }

    if (current > target) {
      setError("Current value cannot be greater than the target.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Start date and end date are required.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("End date cannot be before the start date.");
      return;
    }

    startTransition(async () => {
      const result = await createGoalAction({
        name: trimmedName,
        category: trimmedCategory,
        targetValue: target,
        currentValue: current,
        unit: trimmedUnit || "Units",
        startDate: new Date(`${startDate}T00:00:00`),
        endDate: new Date(`${endDate}T00:00:00`),
        isCompleted: current >= target,
      });

      if (!result.success) {
        setError(result.error ?? "Unable to create goal.");
        return;
      }

      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isPending
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-dialog-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2
              id="goal-dialog-title"
              className="text-lg font-semibold text-text-primary"
            >
              Add Goal
            </h2>

            <p className="mt-1 text-sm text-text-secondary">
              Create a measurable objective for your business.
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            {/* Goal Name */}
            <div>
              <label
                htmlFor="goal-name"
                className="mb-1.5 block text-sm font-medium text-text-secondary"
              >
                Goal Name
              </label>

              <input
                id="goal-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="e.g. Complete pre-launch preparation"
                disabled={isPending}
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
              />
            </div>

            {/* Category + Unit */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="goal-category"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Category
                </label>

                <input
                  id="goal-category"
                  type="text"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  placeholder="e.g. Pre-Launch"
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-unit"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Unit
                </label>

                <input
                  id="goal-unit"
                  type="text"
                  value={unit}
                  onChange={(event) =>
                    setUnit(event.target.value)
                  }
                  placeholder="Units"
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                />
              </div>
            </div>

            {/* Target + Current */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="goal-target"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Target Value
                </label>

                <input
                  id="goal-target"
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetValue}
                  onChange={(event) =>
                    setTargetValue(event.target.value)
                  }
                  placeholder="0"
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-current"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Current Value
                </label>

                <input
                  id="goal-current"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentValue}
                  onChange={(event) =>
                    setCurrentValue(event.target.value)
                  }
                  placeholder="0"
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="goal-start-date"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Start Date
                </label>

                <input
                  id="goal-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-end-date"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  End Date
                </label>

                <input
                  id="goal-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-muted/50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}