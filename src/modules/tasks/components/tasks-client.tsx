"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";
import { Priority, TaskStatus } from "@prisma/client";

import type {
  TaskGoalOption,
  TaskListItem,
  TasksSummary,
} from "../types";

import { TaskFormDialog } from "./task-form-dialog";

interface TasksClientProps {
  tasks: TaskListItem[];
  summary: TasksSummary;
  goals: TaskGoalOption[];
}

type TaskFilter = "ALL" | "PENDING" | "COMPLETED";

function formatDate(date: Date | null): string {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function priorityLabel(priority: Priority): string {
  switch (priority) {
    case Priority.LOW:
      return "Low";
    case Priority.MEDIUM:
      return "Medium";
    case Priority.HIGH:
      return "High";
    case Priority.CRITICAL:
      return "Critical";
    default:
      return priority;
  }
}

function priorityClasses(priority: Priority): string {
  switch (priority) {
    case Priority.CRITICAL:
      return "bg-red-50 text-red-700";
    case Priority.HIGH:
      return "bg-red-50 text-red-600";
    case Priority.MEDIUM:
      return "bg-amber-50 text-amber-700";
    case Priority.LOW:
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function statusClasses(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.DONE:
      return "bg-emerald-50 text-emerald-700";

    case TaskStatus.IN_PROGRESS:
      return "bg-amber-50 text-amber-700";

    case TaskStatus.TODO:
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function statusLabel(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.DONE:
      return "Completed";

    case TaskStatus.IN_PROGRESS:
      return "Pending";

    case TaskStatus.TODO:
      return "Pending";

    default:
      return status;
  }
}

function isOverdue(task: TaskListItem): boolean {
  return Boolean(
    task.dueDate &&
      task.status !== TaskStatus.DONE &&
      new Date(task.dueDate) < new Date()
  );
}

export function TasksClient({
  tasks,
  summary,
  goals,
}: TasksClientProps) {
  const [activeFilter, setActiveFilter] =
    useState<TaskFilter>("ALL");

  const [isTaskDialogOpen, setIsTaskDialogOpen] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState<TaskListItem | null>(null);

  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null);

  function openCreateDialog() {
    setEditingTask(null);
    setOpenMenuId(null);
    setIsTaskDialogOpen(true);
  }

  function openEditDialog(task: TaskListItem) {
    setEditingTask(task);
    setOpenMenuId(null);
    setIsTaskDialogOpen(true);
  }

  function closeDialog() {
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  }

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === "COMPLETED") {
      return task.status === TaskStatus.DONE;
    }

    if (activeFilter === "PENDING") {
      return task.status !== TaskStatus.DONE;
    }

    return true;
  });

  const pendingCount =
    summary.todoTasks + summary.inProgressTasks;

  const completedCount = summary.completedTasks;

  const tabs: {
    key: TaskFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "ALL",
      label: "All",
      count: summary.totalTasks,
    },
    {
      key: "PENDING",
      label: "Pending",
      count: pendingCount,
    },
    {
      key: "COMPLETED",
      label: "Completed",
      count: completedCount,
    },
  ];

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* ───────────────── Header ───────────────── */}
        <div className="px-6 pb-0 pt-6 sm:px-7">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.035em] text-slate-950">
                Tasks
              </h1>

              <p className="mt-1.5 text-sm text-slate-500">
                Stay on top of what needs to be done.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateDialog}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </button>
          </div>

          {/* ───────────────── Tabs ───────────────── */}
          <div className="mt-5 flex items-center gap-1 border-b border-slate-200">
            {tabs.map((tab) => {
              const isActive = activeFilter === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveFilter(tab.key);
                    setOpenMenuId(null);
                  }}
                  className={[
                    "relative flex items-center gap-1.5 px-3 pb-3 pt-1 text-xs transition-colors",
                    isActive
                      ? "font-semibold text-slate-900"
                      : "font-medium text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                >
                  <span>{tab.label}</span>

                  <span
                    className={[
                      "text-[10px]",
                      isActive
                        ? "text-slate-500"
                        : "text-slate-400",
                    ].join(" ")}
                  >
                    {tab.count}
                  </span>

                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-800" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ───────────────── Empty State ───────────────── */}
        {filteredTasks.length === 0 ? (
          <div className="flex min-h-[210px] items-center justify-center border-t border-slate-100 px-6 py-8">
            <div className="flex max-w-md flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                {activeFilter === "COMPLETED" ? (
                  <CheckCircle2 className="h-5 w-5 text-slate-400" />
                ) : (
                  <ListTodo className="h-5 w-5 text-slate-400" />
                )}
              </div>

              <h2 className="mt-4 text-sm font-semibold text-slate-900">
                {activeFilter === "COMPLETED"
                  ? "No completed tasks"
                  : activeFilter === "PENDING"
                    ? "No pending tasks"
                    : "No tasks yet"}
              </h2>

              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                {activeFilter === "COMPLETED"
                  ? "Completed tasks will appear here."
                  : activeFilter === "PENDING"
                    ? "You're all caught up. There are no pending tasks."
                    : "Start adding actionable work to keep your business moving."}
              </p>
            </div>
          </div>
        ) : (
          /* ───────────────── Task Table ───────────────── */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-t border-slate-100 bg-slate-50/60">
                <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <th className="w-[34%] px-6 py-3.5">
                    Task
                  </th>

                  <th className="px-4 py-3.5">
                    Category
                  </th>

                  <th className="px-4 py-3.5">
                    Due Date
                  </th>

                  <th className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1">
                      Priority
                      <ChevronDown className="h-3 w-3" />
                    </span>
                  </th>

                  <th className="px-4 py-3.5">
                    Status
                  </th>

                  <th className="px-4 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const overdue = isOverdue(task);

                  return (
                    <tr
                      key={task.id}
                      className="group text-xs text-slate-700 transition-colors hover:bg-slate-50/60"
                    >
                      {/* Task */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={[
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              task.status === TaskStatus.DONE
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-slate-300 bg-white",
                            ].join(" ")}
                          >
                            {task.status === TaskStatus.DONE && (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            )}
                          </span>

                          <div className="min-w-0">
                            <p
                              className={[
                                "truncate font-medium",
                                task.status === TaskStatus.DONE
                                  ? "text-slate-400 line-through"
                                  : "text-slate-900",
                              ].join(" ")}
                            >
                              {task.title}
                            </p>

                            {task.description && (
                              <p className="mt-0.5 max-w-[360px] truncate text-[10px] text-slate-400">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 text-slate-500">
                        —
                      </td>

                      {/* Due Date */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={
                            overdue
                              ? "font-medium text-red-600"
                              : "text-slate-600"
                          }
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3.5">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                            priorityClasses(task.priority),
                          ].join(" ")}
                        >
                          {priorityLabel(task.priority)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                            statusClasses(task.status),
                          ].join(" ")}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="relative px-4 py-3.5 text-right">
                        <button
                          type="button"
                          aria-label={`Actions for ${task.title}`}
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === task.id
                                ? null
                                : task.id
                            )
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenuId === task.id && (
                          <div className="absolute right-4 top-11 z-20 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                            <button
                              type="button"
                              onClick={() => openEditDialog(task)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-400" />
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TaskFormDialog
        open={isTaskDialogOpen}
        onClose={closeDialog}
        task={editingTask}
        goals={goals}
      />
    </>
  );
}