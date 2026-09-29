"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Factory,
  XCircle,
} from "lucide-react";

import { formatINR } from "@/lib/formatters";
import type { SerializedProductionBatch } from "@/modules/production-batches/types";

interface ProductProductionHistoryProps {
  products: Array<{
    id: string;
    name: string;
    sku: string;
  }>;
  productionBatchesByProductId: Record<
    string,
    SerializedProductionBatch[]
  >;
}

export function ProductProductionHistory({
  products,
  productionBatchesByProductId,
}: ProductProductionHistoryProps) {
  const [expandedProductId, setExpandedProductId] =
    useState<string | null>(null);

  const summaries = useMemo(() => {
    return products.map((product) => {
      const batches =
        productionBatchesByProductId[product.id] ?? [];

      const completedBatches = batches.filter(
        (batch) => batch.status === "COMPLETED",
      );

      const unitsProduced = completedBatches.reduce(
        (total, batch) =>
          total + (batch.producedQuantity ?? 0),
        0,
      );

      const totalProductionCost =
        completedBatches.reduce(
          (total, batch) =>
            total + (batch.totalCost ?? 0),
          0,
        );

      const latestCompletedBatch =
        completedBatches.length > 0
          ? completedBatches.reduce((latest, batch) => {
              if (!latest) {
                return batch;
              }

              const latestDate = latest.completedAt
                ? new Date(latest.completedAt).getTime()
                : 0;

              const batchDate = batch.completedAt
                ? new Date(batch.completedAt).getTime()
                : 0;

              return batchDate > latestDate
                ? batch
                : latest;
            }, null as SerializedProductionBatch | null)
          : null;

      return {
        product,
        batches,
        totalBatches: batches.length,
        completedBatches: completedBatches.length,
        unitsProduced,
        totalProductionCost,
        latestCostPerUnit:
          latestCompletedBatch?.costPerUnit ?? null,
        latestCompletedAt:
          latestCompletedBatch?.completedAt ?? null,
      };
    });
  }, [products, productionBatchesByProductId]);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-[-0.02em] text-text-primary">
            Production history
          </h2>

          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
            {summaries.reduce(
              (total, summary) =>
                total + summary.totalBatches,
              0,
            )}
          </span>
        </div>

        <p className="mt-1 text-xs text-text-secondary">
          Historical production runs, actual output, and recorded
          production costs by product.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {summaries.map((summary) => {
          const isExpanded =
            expandedProductId === summary.product.id;

          return (
            <div key={summary.product.id}>
              <button
                type="button"
                onClick={() =>
                  setExpandedProductId(
                    isExpanded
                      ? null
                      : summary.product.id,
                  )
                }
                className="w-full px-5 py-4 text-left transition-colors hover:bg-surface-muted/60"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-text-secondary">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-text-primary">
                        {summary.product.name}
                      </p>

                      <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                        {summary.product.sku}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 lg:min-w-[620px]">
                    <Metric
                      label="Batches"
                      value={summary.totalBatches}
                    />

                    <Metric
                      label="Completed"
                      value={summary.completedBatches}
                    />

                    <Metric
                      label="Units produced"
                      value={summary.unitsProduced}
                    />

                    <Metric
                      label="Latest cost / unit"
                      value={
                        summary.latestCostPerUnit !==
                        null
                          ? formatINR(
                              summary.latestCostPerUnit,
                            )
                          : "—"
                      }
                    />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <ProductionBatchList
                  batches={summary.batches}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-text-primary">
        {value}
      </p>
    </div>
  );
}

function ProductionBatchList({
  batches,
}: {
  batches: SerializedProductionBatch[];
}) {
  if (batches.length === 0) {
    return (
      <div className="border-t border-border bg-surface-muted/40 px-5 py-8 text-center">
        <Factory className="mx-auto h-5 w-5 text-text-muted" />

        <p className="mt-2 text-xs font-semibold text-text-secondary">
          No production batches yet
        </p>

        <p className="mt-1 text-[11px] text-text-muted">
          Production runs for this product will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-surface-muted/30 px-5 py-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Batch
              </th>

              <th className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Status
              </th>

              <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Planned
              </th>

              <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Produced
              </th>

              <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Raw material
              </th>

              <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Packaging
              </th>

              <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Total cost
              </th>

              <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Cost / unit
              </th>

              <th className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Configuration
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td className="px-3 py-3">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">
                      {batch.batchNumber}
                    </p>

                    <p className="mt-0.5 text-[10px] text-text-muted">
                      {formatDate(
                        batch.completedAt ??
                          batch.createdAt,
                      )}
                    </p>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <StatusBadge
                    status={batch.status}
                  />
                </td>

                <td className="px-3 py-3 text-right text-xs text-text-secondary">
                  {batch.plannedQuantity}
                </td>

                <td className="px-3 py-3 text-right text-xs font-semibold text-text-primary">
                  {batch.producedQuantity ?? "—"}
                </td>

                <td className="px-3 py-3 text-right text-xs text-text-secondary">
                  {batch.rawMaterialCost !== null
                    ? formatINR(
                        batch.rawMaterialCost,
                      )
                    : "—"}
                </td>

                <td className="px-3 py-3 text-right text-xs text-text-secondary">
                  {batch.packagingMaterialCost !==
                  null
                    ? formatINR(
                        batch.packagingMaterialCost,
                      )
                    : "—"}
                </td>

                <td className="px-3 py-3 text-right text-xs font-semibold text-text-primary">
                  {batch.totalCost !== null
                    ? formatINR(batch.totalCost)
                    : "—"}
                </td>

                <td className="px-3 py-3 text-right text-xs font-semibold text-text-primary">
                  {batch.costPerUnit !== null
                    ? formatINR(
                        batch.costPerUnit,
                      )
                    : "—"}
                </td>

                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <p className="text-[10px] text-text-secondary">
                      Formulation · v
                      {batch.formulationVersion}
                    </p>

                    <p className="text-[10px] text-text-secondary">
                      Packaging · v
                      {batch.packagingConfigurationVersion}
                    </p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: SerializedProductionBatch["status"];
}) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );

    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-[9px] font-semibold text-text-secondary">
          <XCircle className="h-3 w-3" />
          Cancelled
        </span>
      );

    case "DRAFT":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700">
          <Clock3 className="h-3 w-3" />
          Draft
        </span>
      );
  }
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}