import {
  ArrowRight,
  Check,
  Circle,
  Lock,
  Milestone,
  ShieldCheck,
} from "lucide-react";
import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getStageWithRequirements } from "@/modules/stages/services";
import { RequirementRow } from "@/modules/stages/components/requirement-row";
import { StageAdvanceCard } from "@/modules/stages/components/stage-advance-card";
import { db } from "@/lib/db";

function formatStageName(name: string) {
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getProgressColor(progress: number) {
  if (progress >= 100) return "bg-emerald-600";
  if (progress > 0) return "bg-emerald-700";
  return "bg-slate-300";
}

export default async function StagesPage() {
  const { business, businessId } = await getDashboardContext();

  const [stageData, stages, transitions] = await Promise.all([
    getStageWithRequirements(business.currentStageId, businessId),

    db.stageDefinition.findMany({
      orderBy: {
        id: "asc",
      },
    }),

    db.stageTransition.findMany({
      where: {
        businessId,
      },
      include: {
        fromStage: true,
        toStage: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const metrics = stageData?.metrics;

  const requirements = stageData?.requirements ?? [];

  const currentStage = business.currentStage;

  const progress = metrics?.overallProgressPct ?? 0;

  const completedTotal = metrics?.completedTotal ?? 0;

  const totalRequirements = metrics?.totalRequirementsCount ?? 0;

  const mandatoryCount = metrics?.mandatoryCount ?? 0;

  const completedMandatory = metrics?.completedMandatory ?? 0;

  const blockerCount = metrics?.blockerCount ?? 0;

  const isReady = metrics?.isReadyToAdvance ?? false;

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5">
      {/* ============================================================
          PAGE HEADER
      ============================================================ */}

      <section className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Business Lifecycle
          </p>

          <h1 className="mt-1 text-[25px] font-semibold tracking-[-0.035em] text-slate-950">
            Stage &amp; Gates
          </h1>

          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Track your progress, complete key requirements, and move through
            the business lifecycle with transparent stage gates.
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />

          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
            Stage Governance Active
          </span>
        </div>
      </section>

      {/* ============================================================
          LIFECYCLE TIMELINE
      ============================================================ */}

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Business Lifecycle
          </p>

          <span className="text-[10px] font-medium text-slate-400">
            Stage {currentStage.id} of {stages.length}
          </span>
        </div>

        <div className="relative overflow-x-auto pb-1">
          <div
            className="absolute left-7 right-7 top-4 h-px bg-slate-200"
            aria-hidden="true"
          />

          <div className="relative flex min-w-[720px] justify-between gap-3">
            {stages.map((stage) => {
              const isCurrent = stage.id === currentStage.id;
              const isCompleted = stage.id < currentStage.id;
              const isLocked = stage.id > currentStage.id;

              return (
                <div
                  key={stage.id}
                  className="flex min-w-[72px] flex-1 flex-col items-center"
                >
                  <div
                    className={[
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                      isCurrent
                        ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                        : isCompleted
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-400",
                    ].join(" ")}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : isLocked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      stage.id
                    )}
                  </div>

                  <p
                    className={[
                      "mt-2 text-center text-[10px] font-medium leading-tight",
                      isCurrent
                        ? "font-semibold text-slate-950"
                        : isCompleted
                          ? "text-emerald-700"
                          : "text-slate-400",
                    ].join(" ")}
                  >
                    {formatStageName(stage.name)}
                  </p>

                  {isCurrent && (
                    <span className="mt-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          CURRENT STAGE HERO
      ============================================================ */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="grid min-h-[250px] grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
          {/* LEFT */}
          <div className="p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Stage {currentStage.id}
              </span>

              <span className="text-slate-300">•</span>

              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Current Stage
              </span>
            </div>

            <h2 className="mt-1 text-[27px] font-semibold tracking-[-0.04em] text-slate-950">
              {formatStageName(currentStage.name)}
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">
              {currentStage.description}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(
                    progress,
                  )}`}
                  style={{
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                  }}
                />
              </div>

              <span className="text-[11px] font-semibold text-slate-700">
                {progress}%
              </span>
            </div>

            <p className="mt-2 text-[10px] text-slate-400">
              {completedTotal} of {totalRequirements} requirements completed
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {completedMandatory} mandatory cleared
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {totalRequirements - completedTotal} remaining
              </span>

              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium",
                  isReady
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    isReady ? "bg-emerald-500" : "bg-red-500",
                  ].join(" ")}
                />

                {isReady ? "Ready to advance" : `${blockerCount} blockers`}
              </span>
            </div>
          </div>

          {/* RIGHT — ABSTRACT LANDSCAPE */}
          <div className="relative min-h-[230px] overflow-hidden bg-[#e9eee8] lg:min-h-0">
            <div className="absolute left-6 top-6 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
              Stage {currentStage.id}
            </div>

            <div className="absolute left-6 top-16 max-w-[210px]">
              <p className="text-[19px] font-medium leading-6 tracking-[-0.03em] text-slate-900">
                Small steps
                <br />
                today, a bigger
                <br />
                tomorrow.
              </p>

              <div className="mt-3 h-px w-8 bg-slate-700" />
            </div>

            <div className="absolute -bottom-20 left-[-10%] h-40 w-[120%] rounded-[50%] bg-[#c5d0c6]" />

            <div className="absolute -bottom-24 left-[20%] h-36 w-[75%] rounded-[50%] bg-[#aebeb0]" />

            <div className="absolute -bottom-28 left-[42%] h-32 w-[48%] rounded-[50%] bg-[#91a596]" />
          </div>
        </div>
      </section>

      {/* ============================================================
          REQUIREMENTS
      ============================================================ */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Requirements
            </h3>

            <p className="mt-0.5 text-[10px] text-slate-400">
              Mandatory gates determine stage readiness. Recommended and
              optional items do not block advancement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[9px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Mandatory ({mandatoryCount})
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Recommended
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Optional
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {requirements.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Circle className="mx-auto h-5 w-5 text-slate-300" />

              <p className="mt-2 text-xs text-slate-500">
                No requirements configured for this stage.
              </p>
            </div>
          ) : (
            requirements.map((requirement) => (
              <RequirementRow
                key={requirement.id}
                requirement={requirement}
              />
            ))
          )}
        </div>
      </section>

      {/* ============================================================
          STAGE GOVERNANCE
      ============================================================ */}

      <StageAdvanceCard
  currentStageId={currentStage.id}
  currentStageName={currentStage.name}
  isReadyToAdvance={isReady}
/>

      {/* ============================================================
          TRANSITION HISTORY
      ============================================================ */}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Milestone className="h-4 w-4 text-slate-500" />

            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Stage History
              </h3>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Founder-confirmed stage transitions are preserved as an
                immutable audit trail.
              </p>
            </div>
          </div>
        </div>

        {transitions.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-xs text-slate-400">
              No stage transitions have been recorded yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transitions.map((transition) => (
              <div
                key={transition.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Check className="h-3.5 w-3.5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-800">
                      <span>
                        Stage {transition.fromStageId} ·{" "}
                        {formatStageName(transition.fromStage.name)}
                      </span>

                      <ArrowRight className="h-3 w-3 text-slate-300" />

                      <span>
                        Stage {transition.toStageId} ·{" "}
                        {formatStageName(transition.toStage.name)}
                      </span>
                    </div>

                    <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
                      {transition.reason}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-[10px] font-medium text-slate-500">
                    {transition.triggeredBy}
                  </p>

                  <p className="mt-0.5 text-[9px] text-slate-400">
                    {transition.createdAt.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}