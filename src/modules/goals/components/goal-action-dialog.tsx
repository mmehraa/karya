"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteGoalAction,
  updateGoalAction,
} from "../actions";

import type { GoalListItem } from "../types";

interface GoalActionDialogProps {
  goal: GoalListItem | null;
  open: boolean;
  onClose: () => void;
}

function toDateInputValue(date: Date) {
  const value = new Date(date);

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function GoalActionDialog({
  goal,
  open,
  onClose,
}: GoalActionDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<"view" | "edit">("view");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [unit, setUnit] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [error, setError] = useState<string | null>(null);

  // Custom in-app delete confirmation.
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState(false);

  useEffect(() => {
    if (!goal || !open) {
      return;
    }

    setMode("view");
    setError(null);
    setIsDeleteConfirmOpen(false);

    setName(goal.name);
    setCategory(goal.category);
    setTargetValue(String(goal.targetValue));
    setCurrentValue(String(goal.currentValue));
    setUnit(goal.unit);

    setStartDate(toDateInputValue(goal.startDate));
    setEndDate(toDateInputValue(goal.endDate));
  }, [goal, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isPending) {
        return;
      }

      if (isDeleteConfirmOpen) {
        setIsDeleteConfirmOpen(false);
        return;
      }

      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    open,
    isPending,
    isDeleteConfirmOpen,
    onClose,
  ]);

  if (!open || !goal) {
    return null;
  }

  const currentGoal = goal;

  function handleSave() {
    setError(null);

    const target = Number(targetValue);
    const current = Number(currentValue);

    if (!name.trim()) {
      setError("Goal name is required.");
      return;
    }

    if (!category.trim()) {
      setError("Category is required.");
      return;
    }

    if (!Number.isFinite(target) || target <= 0) {
      setError("Target value must be greater than 0.");
      return;
    }

    if (!Number.isFinite(current) || current < 0) {
      setError("Current value cannot be negative.");
      return;
    }

    if (current > target) {
      setError(
        "Current value cannot be greater than the target."
      );
      return;
    }

    if (!startDate || !endDate) {
      setError(
        "Start date and end date are required."
      );
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError(
        "End date cannot be before the start date."
      );
      return;
    }

    startTransition(async () => {
      const result = await updateGoalAction({
        id: currentGoal.id,
        name: name.trim(),
        category: category.trim(),
        targetValue: target,
        currentValue: current,
        unit: unit.trim() || "Units",
        startDate: new Date(`${startDate}T00:00:00`),
        endDate: new Date(`${endDate}T00:00:00`),
      });

      if (!result.success) {
        setError(
          result.error ?? "Unable to update goal."
        );
        return;
      }

      onClose();
    });
  }

  function handleComplete() {
    setError(null);

    startTransition(async () => {
      const result = await updateGoalAction({
        id: currentGoal.id,
        isCompleted: !currentGoal.isCompleted,
      });

      if (!result.success) {
        setError(
          result.error ?? "Unable to update goal."
        );
        return;
      }

      onClose();
    });
  }

  function handleDeleteRequest() {
    setError(null);
    setIsDeleteConfirmOpen(true);
  }

  function handleDeleteCancel() {
    if (isPending) {
      return;
    }

    setIsDeleteConfirmOpen(false);
  }

  function handleDeleteConfirm() {
    setError(null);

    startTransition(async () => {
      const result = await deleteGoalAction(currentGoal.id);

      if (!result.success) {
        setError(
          result.error ?? "Unable to delete goal."
        );
        setIsDeleteConfirmOpen(false);
        return;
      }

      setIsDeleteConfirmOpen(false);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isPending &&
          !isDeleteConfirmOpen
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-dialog-title"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Main dialog */}
        <div
          className={
            isDeleteConfirmOpen
              ? "pointer-events-none opacity-40"
              : ""
          }
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Goal
              </p>

              <h2
                id="goal-dialog-title"
                className="mt-1 text-lg font-semibold tracking-tight text-slate-950"
              >
                {mode === "edit"
                  ? "Edit Goal"
                  : currentGoal.name}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {currentGoal.category}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isPending || isDeleteConfirmOpen}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {mode === "view" ? (
            <>
              {/* Goal details */}
              <div className="space-y-5 px-6 py-6">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Progress
                    </span>

                    <span className="text-slate-500">
                      {currentGoal.currentValue} /{" "}
                      {currentGoal.targetValue}{" "}
                      {currentGoal.unit}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-800 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            currentGoal.progressPercent
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {currentGoal.progressPercent}% complete
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      Start
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatDate(currentGoal.startDate)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      Target
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatDate(currentGoal.endDate)}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <button
                  type="button"
                  onClick={handleDeleteRequest}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />

                    {currentGoal.isCompleted
                      ? "Mark Active"
                      : "Mark Complete"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Edit form */}
              <div className="space-y-4 px-6 py-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">
                    Goal Name
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    disabled={isPending}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      Category
                    </label>

                    <input
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value)
                      }
                      disabled={isPending}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      Unit
                    </label>

                    <input
                      value={unit}
                      onChange={(event) =>
                        setUnit(event.target.value)
                      }
                      disabled={isPending}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      Target Value
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={targetValue}
                      onChange={(event) =>
                        setTargetValue(event.target.value)
                      }
                      disabled={isPending}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      Current Value
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentValue}
                      onChange={(event) =>
                        setCurrentValue(event.target.value)
                      }
                      disabled={isPending}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      Start Date
                    </label>

                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) =>
                        setStartDate(event.target.value)
                      }
                      disabled={isPending}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">
                      End Date
                    </label>

                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) =>
                        setEndDate(event.target.value)
                      }
                      disabled={isPending}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {/* Edit actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded-xl bg-emerald-950 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  {isPending
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Custom delete confirmation */}
        {isDeleteConfirmOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 p-5 backdrop-blur-[2px]">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-goal-title"
              aria-describedby="delete-goal-description"
              className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>

              <h3
                id="delete-goal-title"
                className="mt-4 text-base font-semibold text-slate-950"
              >
                Delete this goal?
              </h3>

              <p
                id="delete-goal-description"
                className="mt-2 text-sm leading-6 text-slate-500"
              >
                <span className="font-medium text-slate-700">
                  {currentGoal.name}
                </span>{" "}
                will be permanently deleted. This action
                cannot be undone.
              </p>

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
                  <Trash2 className="h-4 w-4" />

                  {isPending
                    ? "Deleting..."
                    : "Delete Goal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}