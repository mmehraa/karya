"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceBusinessStageAction } from "@/modules/stages/actions";
import { ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

interface StageAdvanceCardProps {
  currentStageId: number;
  currentStageName: string;
  isReadyToAdvance: boolean;
}

export function StageAdvanceCard({
  currentStageId,
  currentStageName,
  isReadyToAdvance,
}: StageAdvanceCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isReadyToAdvance) {
    return null;
  }

  const nextStageId = currentStageId + 1;
  const isReasonValid = reason.trim().length >= 10 && reason.trim().length <= 500;

  const handleAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isReasonValid) {
      setError("Please provide an audit rationale of at least 10 characters.");
      return;
    }

    startTransition(async () => {
      const response = await advanceBusinessStageAction({
        expectedCurrentStageId: currentStageId,
        reason: reason.trim(),
        triggeredBy: "Founder",
      });

      if (!response.success) {
        setError(response.error || "An unexpected error occurred while advancing the stage.");
      } else {
        setReason("");
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Gate Unlocked
          </div>

          <h3 className="text-lg font-bold tracking-tight text-text-primary">
            Confirm Stage Advancement
          </h3>

          <p className="text-xs text-text-secondary max-w-xl">
            All mandatory gate criteria for Stage {currentStageId} ({currentStageName}) are satisfied.
            Advancing will officially transition the business to Stage {nextStageId} and record an immutable audit entry.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-right text-xs shadow-sm">
          <span className="block text-text-muted font-medium uppercase tracking-wider text-[10px]">
            Target Transition
          </span>
          <span className="font-bold text-text-primary">
            Stage {currentStageId} → Stage {nextStageId}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAdvance} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="advancement-reason"
              className="text-xs font-semibold text-text-secondary"
            >
              Advancement Audit Rationale *
            </label>
            <span className="text-[11px] text-text-muted">
              {reason.trim().length} / 500 (min 10 chars)
            </span>
          </div>

          <textarea
            id="advancement-reason"
            rows={2}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            disabled={isPending}
            placeholder="Record the operational rationale and verification notes for advancing this stage..."
            className="w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-xs text-text-primary shadow-sm placeholder:text-text-muted focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="submit"
            disabled={!isReasonValid || isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Advancing Stage...</span>
              </>
            ) : (
              <>
                <span>Confirm & Advance to Stage {nextStageId}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}