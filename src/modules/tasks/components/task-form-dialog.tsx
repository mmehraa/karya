"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  Check,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import {
  Priority,
  TaskStatus,
} from "@prisma/client";

import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "../actions";

import type {
  SerializedTask,
  TaskGoalOption,
  TaskListItem,
} from "../types";

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  task?: SerializedTask | TaskListItem | null;
  goals: TaskGoalOption[];
}

function formatDateForInput(
  date: Date | null,
): string {
  if (!date) return "";

  const value = new Date(date);

  const year = value.getFullYear();

  const month = String(
    value.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    value.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function TaskFormDialog({
  open,
  onClose,
  task,
  goals,
}: TaskFormDialogProps) {
  const [isPending, startTransition] =
    useTransition();

  const [isDeletePending, setIsDeletePending] =
    useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [priority, setPriority] =
    useState<Priority>(Priority.MEDIUM);

  const [status, setStatus] =
    useState<TaskStatus>(TaskStatus.TODO);

  const [dueDate, setDueDate] =
    useState("");

  const [goalId, setGoalId] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const isEditing = Boolean(task);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setIsDeleteConfirmOpen(false);
    setIsDeletePending(false);

    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority);
      setStatus(task.status);

      setDueDate(
        formatDateForInput(task.dueDate),
      );

      setGoalId(task.goalId ?? "");
      setNotes(task.notes ?? "");
    } else {
      setTitle("");
      setDescription("");
      setPriority(Priority.MEDIUM);
      setStatus(TaskStatus.TODO);
      setDueDate("");
      setGoalId("");
      setNotes("");
    }
  }, [open, task]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape" &&
        !isPending &&
        !isDeletePending
      ) {
        if (isDeleteConfirmOpen) {
          setIsDeleteConfirmOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    open,
    isPending,
    isDeletePending,
    isDeleteConfirmOpen,
    onClose,
  ]);

  if (!open) {
    return null;
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    const trimmedTitle =
      title.trim();

    if (trimmedTitle.length < 2) {
      setError(
        "Task title must be at least 2 characters.",
      );

      return;
    }

    const dueDateValue = dueDate
      ? new Date(`${dueDate}T00:00:00`)
      : null;

    startTransition(async () => {
      const input = {
        title: trimmedTitle,
        description,
        priority,
        status,
        dueDate: dueDateValue,
        goalId: goalId || null,
        notes,
      };

      const result =
        isEditing && task
          ? await updateTaskAction({
              id: task.id,
              ...input,
            })
          : await createTaskAction(input);

      if (!result.success) {
        setError(
          result.error ??
            `Unable to ${
              isEditing
                ? "update"
                : "create"
            } task.`,
        );

        return;
      }

      onClose();
    });
  }

  function handleStatusChange(
    nextStatus: TaskStatus,
  ) {
    if (!task) return;

    setError(null);

    startTransition(async () => {
      const result =
        await updateTaskAction({
          id: task.id,
          status: nextStatus,
        });

      if (!result.success) {
        setError(
          result.error ??
            "Unable to update the task status.",
        );

        return;
      }

      setStatus(nextStatus);
      onClose();
    });
  }

  function openDeleteConfirmation() {
    if (!task || isPending || isDeletePending) {
      return;
    }

    setError(null);
    setIsDeleteConfirmOpen(true);
  }

  function closeDeleteConfirmation() {
    if (isDeletePending) return;

    setIsDeleteConfirmOpen(false);
  }

  async function handleDelete() {
    if (!task || isDeletePending) {
      return;
    }

    setError(null);
    setIsDeletePending(true);

    const result =
      await deleteTaskAction(task.id);

    if (!result.success) {
      setError(
        result.error ??
          "Unable to delete the task.",
      );

      setIsDeletePending(false);
      setIsDeleteConfirmOpen(false);

      return;
    }

    setIsDeletePending(false);
    setIsDeleteConfirmOpen(false);

    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (
            event.target === event.currentTarget &&
            !isPending &&
            !isDeletePending &&
            !isDeleteConfirmOpen
          ) {
            onClose();
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-dialog-title"
          className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2
                id="task-dialog-title"
                className="text-lg font-semibold text-text-primary"
              >
                {isEditing
                  ? "Edit Task"
                  : "Add Task"}
              </h2>

              <p className="mt-1 text-sm text-text-secondary">
                {isEditing
                  ? "Update the task details and status."
                  : "Create an actionable item for your business."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={
                isPending ||
                isDeletePending
              }
              className="rounded-lg p-2 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5 px-6 py-6">
              {/* Title */}
              <div>
                <label
                  htmlFor="task-title"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Task Title
                </label>

                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Finalize product packaging"
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="task-description"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Description
                </label>

                <textarea
                  id="task-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  placeholder="Add context or details..."
                  rows={3}
                  disabled={isPending}
                  className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                />
              </div>

              {/* Priority + Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-1.5 block text-sm font-medium text-text-secondary"
                  >
                    Priority
                  </label>

                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target
                          .value as Priority,
                      )
                    }
                    disabled={isPending}
                    className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                  >
                    <option value={Priority.LOW}>
                      Low
                    </option>

                    <option value={Priority.MEDIUM}>
                      Medium
                    </option>

                    <option value={Priority.HIGH}>
                      High
                    </option>

                    <option value={Priority.CRITICAL}>
                      Critical
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-status"
                    className="mb-1.5 block text-sm font-medium text-text-secondary"
                  >
                    Status
                  </label>

                  <select
                    id="task-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target
                          .value as TaskStatus,
                      )
                    }
                    disabled={isPending}
                    className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                  >
                    <option value={TaskStatus.TODO}>
                      To Do
                    </option>

                    <option value={TaskStatus.IN_PROGRESS}>
                      In Progress
                    </option>

                    <option value={TaskStatus.DONE}>
                      Done
                    </option>
                  </select>
                </div>
              </div>

              {/* Due Date + Goal */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="task-due-date"
                    className="mb-1.5 block text-sm font-medium text-text-secondary"
                  >
                    Due Date
                  </label>

                  <input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) =>
                      setDueDate(
                        event.target.value,
                      )
                    }
                    disabled={isPending}
                    className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                  />
                </div>

                <div>
                  <label
                    htmlFor="task-goal"
                    className="mb-1.5 block text-sm font-medium text-text-secondary"
                  >
                    Goal
                  </label>

                  <select
                    id="task-goal"
                    value={goalId}
                    onChange={(event) =>
                      setGoalId(
                        event.target.value,
                      )
                    }
                    disabled={isPending}
                    className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                  >
                    <option value="">
                      No Goal
                    </option>

                    {goals.map((goal) => (
                      <option
                        key={goal.id}
                        value={goal.id}
                      >
                        {goal.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="task-notes"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Notes
                </label>

                <textarea
                  id="task-notes"
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value,
                    )
                  }
                  placeholder="Optional notes..."
                  rows={2}
                  disabled={isPending}
                  className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-border bg-surface-muted/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Lifecycle actions */}
              {isEditing && task ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openDeleteConfirmation}
                    disabled={
                      isPending ||
                      isDeletePending
                    }
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>

                  {status === TaskStatus.DONE ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          TaskStatus.TODO,
                        )
                      }
                      disabled={
                        isPending ||
                        isDeletePending
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Mark Pending
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          TaskStatus.DONE,
                        )
                      }
                      disabled={
                        isPending ||
                        isDeletePending
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Mark Complete
                    </button>
                  )}
                </div>
              ) : (
                <div />
              )}

              {/* Save actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={
                    isPending ||
                    isDeletePending
                  }
                  className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isPending ||
                    isDeletePending
                  }
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending
                    ? isEditing
                      ? "Saving..."
                      : "Creating..."
                    : isEditing
                      ? "Save Changes"
                      : "Create Task"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete confirmation */}
      {isDeleteConfirmOpen &&
        task && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
              if (
                event.target ===
                  event.currentTarget &&
                !isDeletePending
              ) {
                closeDeleteConfirmation();
              }
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-task-title"
              aria-describedby="delete-task-description"
              className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
            >
              <div className="p-6">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>

                <h3
                  id="delete-task-title"
                  className="text-lg font-semibold tracking-[-0.02em] text-text-primary"
                >
                  Delete this task?
                </h3>

                <p
                  id="delete-task-description"
                  className="mt-2 text-sm leading-6 text-text-secondary"
                >
                  <span className="font-semibold text-text-secondary">
                    {task.title}
                  </span>{" "}
                  will be permanently deleted.
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-muted/50 px-6 py-4">
                <button
                  type="button"
                  onClick={closeDeleteConfirmation}
                  disabled={isDeletePending}
                  className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeletePending}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletePending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  <Trash2 className="h-4 w-4" />

                  {isDeletePending
                    ? "Deleting..."
                    : "Delete Task"}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}