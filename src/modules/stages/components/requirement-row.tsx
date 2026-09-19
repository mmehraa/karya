"use client";

import { useState, useTransition } from "react";
import {
  RequirementStatus,
  RequirementType,
  EvaluationMode,
} from "@prisma/client";
import {
  CheckCircle2,
  Hourglass,
  AlertCircle,
  MinusCircle,
  Edit3,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { updateRequirementProgressAction } from "@/modules/stages/actions";
import type { StageRequirementItem } from "@/modules/stages/types";

interface RequirementRowProps {
  requirement: StageRequirementItem;
}

export function RequirementRow({ requirement }: RequirementRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<RequirementStatus>(requirement.status);
  const [notes, setNotes] = useState<string>(requirement.notes ?? "");
  const [blockerReason, setBlockerReason] = useState<string>(
    requirement.blockerReason ?? ""
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isManual = requirement.evalMode === EvaluationMode.MANUAL;

  const handleCancel = () => {
    setStatus(requirement.status);
    setNotes(requirement.notes ?? "");
    setBlockerReason(requirement.blockerReason ?? "");
    setErrorMessage(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    setErrorMessage(null);

    if (status === RequirementStatus.BLOCKED && !blockerReason.trim()) {
      setErrorMessage(
        "Please provide a reason why this requirement is blocked."
      );
      return;
    }

    startTransition(async () => {
      const response = await updateRequirementProgressAction({
        requirementId: requirement.id,
        status,
        notes: notes.trim() ? notes : null,
        blockerReason:
          status === RequirementStatus.BLOCKED ? blockerReason : null,
      });

      if (!response.success) {
        setErrorMessage(response.error || "Failed to update requirement");
      } else {
        setIsEditing(false);
      }
    });
  };

  return (
    <div className="p-5 transition-colors hover:bg-slate-50/80">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Icon & Description */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getStatusIcon(requirement.status)}</div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-900">
                {requirement.title}
              </h4>

              {getTypeBadge(requirement.type)}
              {getEvalBadge(requirement.evalMode)}
            </div>

            <p className="text-xs text-slate-600">
              {requirement.description}
            </p>

            {/* Display Blocker Reason if present */}
            {requirement.status === RequirementStatus.BLOCKED &&
              requirement.blockerReason && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Blocker: {requirement.blockerReason}</span>
                </div>
              )}

            {/* Display Notes if present */}
            {requirement.notes && (
              <p className="mt-1 text-xs italic text-slate-500">
                Note: {requirement.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right: Status Pill & Action Button */}
        <div className="flex items-center gap-3 self-end sm:self-start">
          {getStatusBadge(requirement.status)}

          {isManual ? (
            <button
              onClick={() => {
                if (isEditing) {
                  handleCancel();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              <Edit3 className="h-3.5 w-3.5 text-slate-500" />
              {isEditing ? "Close" : "Update"}
            </button>
          ) : (
            <span
              className="text-[11px] text-slate-400 italic"
              title="This requirement is evaluated automatically by system checks"
            >
              Automated
            </span>
          )}
        </div>
      </div>

      {/* Edit Form Drawer / Panel */}
      {isEditing && (
        <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Manage Requirement Status
            </span>

            <button
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as RequirementStatus)
                }
                disabled={isPending}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={RequirementStatus.NOT_STARTED}>
                  Not Started
                </option>
                <option value={RequirementStatus.IN_PROGRESS}>
                  In Progress
                </option>
                <option value={RequirementStatus.COMPLETED}>
                  Completed
                </option>
                <option value={RequirementStatus.BLOCKED}>
                  Blocked
                </option>
              </select>
            </div>

            {/* Blocker Reason */}
            {status === RequirementStatus.BLOCKED && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-red-700">
                  Blocker Reason *
                </label>

                <input
                  type="text"
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  placeholder="Why is this blocked?"
                  disabled={isPending}
                  className="w-full rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            )}
          </div>

          {/* Founder Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Founder Notes (Optional)
            </label>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context, external document links, or progress remarks..."
              rows={2}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Progress
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visual Badges and Icons
// ---------------------------------------------------------------------------

function getStatusIcon(status: RequirementStatus) {
  switch (status) {
    case RequirementStatus.COMPLETED:
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;

    case RequirementStatus.IN_PROGRESS:
      return <Hourglass className="h-5 w-5 text-blue-600" />;

    case RequirementStatus.BLOCKED:
      return <AlertCircle className="h-5 w-5 text-red-600" />;

    case RequirementStatus.NOT_STARTED:
    default:
      return <MinusCircle className="h-5 w-5 text-slate-300" />;
  }
}

function getStatusBadge(status: RequirementStatus) {
  switch (status) {
    case RequirementStatus.COMPLETED:
      return (
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          Completed
        </span>
      );

    case RequirementStatus.IN_PROGRESS:
      return (
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          In Progress
        </span>
      );

    case RequirementStatus.BLOCKED:
      return (
        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
          Blocked
        </span>
      );

    case RequirementStatus.NOT_STARTED:
    default:
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          Not Started
        </span>
      );
  }
}

function getTypeBadge(type: RequirementType) {
  switch (type) {
    case RequirementType.MANDATORY:
      return (
        <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
          Mandatory
        </span>
      );

    case RequirementType.RECOMMENDED:
      return (
        <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
          Recommended
        </span>
      );

    case RequirementType.OPTIONAL:
      return (
        <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Optional
        </span>
      );
  }
}

function getEvalBadge(mode: EvaluationMode) {
  switch (mode) {
    case EvaluationMode.SYSTEM_CHECK:
      return (
        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
          System Check
        </span>
      );

    case EvaluationMode.METRIC_THRESHOLD:
      return (
        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
          Metric Rule
        </span>
      );

    case EvaluationMode.MANUAL:
    default:
      return (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
          Manual
        </span>
      );
  }
}