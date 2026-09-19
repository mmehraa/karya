"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Plus,
  Rocket,
  Target,
  Users,
} from "lucide-react";

import type {
  GoalListItem,
  GoalsSummary,
} from "../types";

import { GoalFormDialog } from "./goal-form-dialog";
import { GoalActionDialog } from "./goal-action-dialog";

interface GoalsClientProps {
  goals: GoalListItem[];
  summary: GoalsSummary;
}

type GoalFilter =
  | "ALL"
  | "ACTIVE"
  | "COMPLETED";

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getGoalIcon(category: string) {
  const normalized =
    category.toLowerCase();

  if (
    normalized.includes("customer") ||
    normalized.includes("sales")
  ) {
    return Users;
  }

  if (
    normalized.includes("launch") ||
    normalized.includes("milestone")
  ) {
    return Rocket;
  }

  return Target;
}

function getGoalStatus(goal: GoalListItem) {
  if (goal.isCompleted) {
    return {
      label: "Completed",
      className:
        "bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    };
  }

  if (new Date(goal.endDate) < new Date()) {
    return {
      label: "Overdue",
      className: "bg-red-50 text-red-700",
      icon: CircleAlert,
    };
  }

  return {
    label: "On track",
    className:
      "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  };
}

export function GoalsClient({
  goals,
  summary,
}: GoalsClientProps) {
  const [
    isGoalDialogOpen,
    setIsGoalDialogOpen,
  ] = useState(false);

  const [
    selectedGoal,
    setSelectedGoal,
  ] = useState<GoalListItem | null>(
    null
  );

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<GoalFilter>("ALL");

  const filteredGoals = useMemo(() => {
    switch (activeFilter) {
      case "ACTIVE":
        return goals.filter(
          (goal) => !goal.isCompleted
        );

      case "COMPLETED":
        return goals.filter(
          (goal) => goal.isCompleted
        );

      default:
        return goals;
    }
  }, [activeFilter, goals]);

  const tabs = [
    {
      id: "ALL" as const,
      label: "All Goals",
      count: summary.totalGoals,
    },
    {
      id: "ACTIVE" as const,
      label: "Active",
      count: summary.activeGoals,
    },
    {
      id: "COMPLETED" as const,
      label: "Completed",
      count: summary.completedGoals,
    },
  ];

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-6 sm:px-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">
                Goals
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Set goals, track progress and stay
                motivated.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsGoalDialogOpen(true)
              }
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-900"
            >
              <Plus className="h-4 w-4" />
              Add Goal
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex items-center gap-7 border-b border-slate-100">
            {tabs.map((tab) => {
              const isActive =
                activeFilter === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveFilter(tab.id)
                  }
                  className={[
                    "relative -mb-px flex items-center gap-2 pb-3 text-xs font-medium transition-colors",
                    isActive
                      ? "font-semibold text-slate-950"
                      : "text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                >
                  <span>{tab.label}</span>

                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      isActive
                        ? "bg-slate-100 text-slate-700"
                        : "text-slate-400",
                    ].join(" ")}
                  >
                    {tab.count}
                  </span>

                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-900" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        {filteredGoals.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
              <Target className="h-6 w-6 text-slate-400" />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-slate-950">
              {activeFilter === "ALL"
                ? "No goals yet"
                : activeFilter === "ACTIVE"
                  ? "No active goals"
                  : "No completed goals"}
            </h2>

            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
              {activeFilter === "ALL"
                ? "Start adding measurable objectives to track your business progress."
                : activeFilter === "ACTIVE"
                  ? "Active goals will appear here as you create them."
                  : "Completed goals will appear here once you reach their targets."}
            </p>

            {activeFilter === "ALL" && (
              <button
                type="button"
                onClick={() =>
                  setIsGoalDialogOpen(true)
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-900"
              >
                <Plus className="h-4 w-4" />
                Add Goal
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            {filteredGoals.map((goal) => {
              const Icon = getGoalIcon(
                goal.category
              );

              const status =
                getGoalStatus(goal);

              const StatusIcon =
                status.icon;

              const progress = Math.min(
                100,
                Math.max(
                  0,
                  goal.progressPercent
                )
              );

              return (
                <article
                  key={goal.id}
                  className="group min-h-[190px] rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  {/* Card top */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">
                      <Icon className="h-5 w-5 text-slate-500" />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedGoal(goal)
                      }
                      aria-label={`Open ${goal.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Goal name */}
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-slate-950">
                      {goal.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {goal.category}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        {progress}%
                      </span>

                      <span className="text-slate-400">
                        {formatValue(
                          goal.currentValue
                        )}{" "}
                        /{" "}
                        {formatValue(
                          goal.targetValue
                        )}{" "}
                        {goal.unit}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-800 transition-all"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        status.className,
                      ].join(" ")}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>

                    <span className="text-[10px] text-slate-400">
                      Target:{" "}
                      {formatDate(
                        goal.endDate
                      )}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <GoalFormDialog
        open={isGoalDialogOpen}
        onClose={() =>
          setIsGoalDialogOpen(false)
        }
      />

      <GoalActionDialog
        goal={selectedGoal}
        open={selectedGoal !== null}
        onClose={() =>
          setSelectedGoal(null)
        }
      />
    </>
  );
}