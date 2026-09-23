"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Factory,
  Loader2,
  Package,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

import type { SerializedProduct } from "@/modules/products/types";

import type {
  ProductionBatchStatus,
  SerializedProductionBatch,
} from "@/modules/production-batches/types";

import {
  cancelProductionBatchAction,
  completeProductionBatchAction,
  createProductionBatchAction,
  deleteProductionBatchAction,
} from "@/modules/production-batches/actions";

import {
  getProductFormulationsAction,
} from "@/modules/product-formulations/actions";

import {
  getProductPackagingConfigurationsAction,
} from "@/modules/product-packaging/actions";

import type {
  SerializedProductFormulation,
} from "@/modules/product-formulations/types";

import type {
  SerializedProductPackagingConfiguration,
} from "@/modules/product-packaging/types";

import { formatINR } from "@/lib/formatters";

interface ProductionBatchesClientProps {
  initialBatches: SerializedProductionBatch[];
  products: SerializedProduct[];
}

type StatusFilter =
  | "ALL"
  | ProductionBatchStatus;

interface CreateFormState {
  productId: string;
  formulationId: string;
  packagingConfigurationId: string;
  batchNumber: string;
  plannedQuantity: string;
  notes: string;
}

interface CompleteFormState {
  batchId: string;
  producedQuantity: string;
  notes: string;
}

const EMPTY_CREATE_FORM: CreateFormState = {
  productId: "",
  formulationId: "",
  packagingConfigurationId: "",
  batchNumber: "",
  plannedQuantity: "",
  notes: "",
};

const EMPTY_COMPLETE_FORM: CompleteFormState = {
  batchId: "",
  producedQuantity: "",
  notes: "",
};

function formatDate(
  value: Date | string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(
  value: Date | string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(
  value: number | null,
) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(
  status: ProductionBatchStatus,
) {
  switch (status) {
    case "DRAFT":
      return "Draft";

    case "COMPLETED":
      return "Completed";

    case "CANCELLED":
      return "Cancelled";

    default:
      return status;
  }
}

function StatusBadge({
  status,
}: {
  status: ProductionBatchStatus;
}) {
  const config = {
    DRAFT: {
      icon: Clock3,
      className:
        "bg-amber-50 text-amber-700 ring-amber-200",
    },

    COMPLETED: {
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },

    CANCELLED: {
      icon: XCircle,
      className:
        "bg-slate-100 text-slate-500 ring-slate-200",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {statusLabel(status)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof Factory;
  tone?: "default" | "warning" | "success";
}) {
  const iconClass =
    tone === "warning"
      ? "bg-amber-50 text-amber-700"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {value}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function ProductionBatchesClient({
  initialBatches,
  products,
}: ProductionBatchesClientProps) {
  const [batches, setBatches] =
    useState<SerializedProductionBatch[]>(
      initialBatches,
    );

  const [selectedProductId, setSelectedProductId] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const [expandedBatchId, setExpandedBatchId] =
    useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  const [completeBatch, setCompleteBatch] =
    useState<SerializedProductionBatch | null>(
      null,
    );

  const [cancelBatch, setCancelBatch] =
    useState<SerializedProductionBatch | null>(
      null,
    );

  const [deleteBatch, setDeleteBatch] =
    useState<SerializedProductionBatch | null>(
      null,
    );

  const [createForm, setCreateForm] =
    useState<CreateFormState>(
      EMPTY_CREATE_FORM,
    );

  const [completeForm, setCompleteForm] =
    useState<CompleteFormState>(
      EMPTY_COMPLETE_FORM,
    );

  const [
    formulations,
    setFormulations,
  ] = useState<SerializedProductFormulation[]>(
    [],
  );

  const [
    packagingConfigurations,
    setPackagingConfigurations,
  ] = useState<
    SerializedProductPackagingConfiguration[]
  >([]);

  const [
    isLoadingConfigurations,
    setIsLoadingConfigurations,
  ] = useState(false);

  const [isPending, startTransition] =
    useTransition();

  const [error, setError] =
    useState<string | null>(null);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesProduct =
        selectedProductId === "ALL" ||
        batch.productId === selectedProductId;

      const matchesStatus =
        statusFilter === "ALL" ||
        batch.status === statusFilter;

      return (
        matchesProduct && matchesStatus
      );
    });
  }, [
    batches,
    selectedProductId,
    statusFilter,
  ]);

  const summary = useMemo(() => {
    const totalBatches = batches.length;

    const draftBatches = batches.filter(
      (batch) => batch.status === "DRAFT",
    ).length;

    const completedBatches = batches.filter(
      (batch) => batch.status === "COMPLETED",
    ).length;

    const totalUnitsProduced = batches.reduce(
      (sum, batch) =>
        sum + (batch.producedQuantity ?? 0),
      0,
    );

    const totalProductionCost = batches.reduce(
      (sum, batch) =>
        sum + (batch.totalCost ?? 0),
      0,
    );

    return {
      totalBatches,
      draftBatches,
      completedBatches,
      totalUnitsProduced,
      totalProductionCost,
    };
  }, [batches]);

  const activeFormulation = useMemo(
    () =>
      formulations.find(
        (item) => item.isActive,
      ) ?? null,
    [formulations],
  );

  const activePackaging = useMemo(
    () =>
      packagingConfigurations.find(
        (item) => item.isActive,
      ) ?? null,
    [packagingConfigurations],
  );

  const selectedFormulation =
    useMemo(
      () =>
        formulations.find(
          (item) =>
            item.id ===
            createForm.formulationId,
        ) ?? null,
      [
        formulations,
        createForm.formulationId,
      ],
    );

  const selectedPackaging =
    useMemo(
      () =>
        packagingConfigurations.find(
          (item) =>
            item.id ===
            createForm.packagingConfigurationId,
        ) ?? null,
      [
        packagingConfigurations,
        createForm.packagingConfigurationId,
      ],
    );

  const plannedQuantity = Number(
    createForm.plannedQuantity,
  );

  const estimatedRawMaterialCostPerUnit =
    selectedFormulation?.totalRawMaterialCost ??
    null;

  const estimatedPackagingCostPerUnit =
    selectedPackaging?.totalPackagingCost ??
    null;

  const estimatedUnitCost =
    estimatedRawMaterialCostPerUnit !== null &&
    estimatedPackagingCostPerUnit !== null
      ? estimatedRawMaterialCostPerUnit +
        estimatedPackagingCostPerUnit
      : null;

  const estimatedBatchCost =
    estimatedUnitCost !== null &&
    Number.isInteger(plannedQuantity) &&
    plannedQuantity > 0
      ? estimatedUnitCost * plannedQuantity
      : null;

  const loadConfigurationsForProduct =
    async (productId: string) => {
      if (!productId) {
        setFormulations([]);
        setPackagingConfigurations([]);

        setCreateForm((current) => ({
          ...current,
          formulationId: "",
          packagingConfigurationId: "",
        }));

        return;
      }

      setIsLoadingConfigurations(true);
      setError(null);

      try {
        const [
          formulationsResult,
          packagingResult,
        ] = await Promise.all([
          getProductFormulationsAction({
            productId,
          }),

          getProductPackagingConfigurationsAction(
            {
              productId,
            },
          ),
        ]);

        if (!formulationsResult.success) {
          throw new Error(
            formulationsResult.error ||
              "Unable to load product formulations.",
          );
        }

        if (!packagingResult.success) {
          throw new Error(
            packagingResult.error ||
              "Unable to load packaging configurations.",
          );
        }

        const loadedFormulations =
          formulationsResult.data ?? [];

        const loadedPackaging =
          packagingResult.data ?? [];

        setFormulations(
          loadedFormulations,
        );

        setPackagingConfigurations(
          loadedPackaging,
        );

        const nextActiveFormulation =
          loadedFormulations.find(
            (item) => item.isActive,
          );

        const nextActivePackaging =
          loadedPackaging.find(
            (item) => item.isActive,
          );

        setCreateForm((current) => ({
          ...current,
          formulationId:
            nextActiveFormulation?.id ??
            "",
          packagingConfigurationId:
            nextActivePackaging?.id ??
            "",
        }));
      } catch (loadError) {
        setFormulations([]);
        setPackagingConfigurations([]);

        setCreateForm((current) => ({
          ...current,
          formulationId: "",
          packagingConfigurationId: "",
        }));

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load product configuration.",
        );
      } finally {
        setIsLoadingConfigurations(false);
      }
    };

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    if (!createForm.productId) {
      setFormulations([]);
      setPackagingConfigurations([]);
      return;
    }

    void loadConfigurationsForProduct(
      createForm.productId,
    );
  }, [
    isCreateOpen,
    createForm.productId,
  ]);

  const resetCreateForm = () => {
    setCreateForm({
      ...EMPTY_CREATE_FORM,
      productId:
        products.length === 1
          ? products[0].id
          : "",
    });

    setFormulations([]);
    setPackagingConfigurations([]);
    setError(null);
  };

  const handleCreate = () => {
    setError(null);

    if (!createForm.productId) {
      setError("Please select a product.");
      return;
    }

    if (!createForm.formulationId) {
      setError(
        "Please select a formulation.",
      );
      return;
    }

    if (
      !createForm.packagingConfigurationId
    ) {
      setError(
        "Please select a packaging configuration.",
      );
      return;
    }

    if (!createForm.batchNumber.trim()) {
      setError(
        "Please enter a batch number.",
      );
      return;
    }

    const plannedQuantity = Number(
      createForm.plannedQuantity,
    );

    if (
      !Number.isInteger(plannedQuantity) ||
      plannedQuantity <= 0
    ) {
      setError(
        "Planned quantity must be a positive whole number.",
      );
      return;
    }

    startTransition(async () => {
      const result =
        await createProductionBatchAction({
          productId: createForm.productId,
          formulationId:
            createForm.formulationId,
          packagingConfigurationId:
            createForm.packagingConfigurationId,
          batchNumber:
            createForm.batchNumber.trim(),
          plannedQuantity,
          notes:
            createForm.notes.trim() ||
            undefined,
        });

      if (!result.success || !result.data) {
        setError(
          result.error ??
            "Failed to create production batch.",
        );
        return;
      }

      setBatches((current) => [
        result.data!,
        ...current,
      ]);

      setIsCreateOpen(false);
      resetCreateForm();
    });
  };

  const handleComplete = () => {
    if (!completeBatch) {
      return;
    }

    setError(null);

    const producedQuantity = Number(
      completeForm.producedQuantity,
    );

    if (
      !Number.isInteger(producedQuantity) ||
      producedQuantity <= 0
    ) {
      setError(
        "Produced quantity must be a positive whole number.",
      );
      return;
    }

    startTransition(async () => {
      const result =
        await completeProductionBatchAction({
          batchId: completeForm.batchId,
          producedQuantity,
          notes:
            completeForm.notes.trim() ||
            undefined,
        });

      if (!result.success || !result.data) {
        setError(
          result.error ??
            "Failed to complete production batch.",
        );
        return;
      }

      setBatches((current) =>
        current.map((batch) =>
          batch.id === result.data!.id
            ? result.data!
            : batch,
        ),
      );

      setCompleteBatch(null);

      setCompleteForm(
        EMPTY_COMPLETE_FORM,
      );
    });
  };

  const handleCancel = () => {
    if (!cancelBatch) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result =
        await cancelProductionBatchAction({
          batchId: cancelBatch.id,
        });

      if (!result.success || !result.data) {
        setError(
          result.error ??
            "Failed to cancel production batch.",
        );
        return;
      }

      setBatches((current) =>
        current.map((batch) =>
          batch.id === result.data!.id
            ? result.data!
            : batch,
        ),
      );

      setCancelBatch(null);
    });
  };

  const handleDelete = () => {
    if (!deleteBatch) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result =
        await deleteProductionBatchAction({
          batchId: deleteBatch.id,
        });

      if (!result.success) {
        setError(
          result.error ??
            "Failed to delete production batch.",
        );
        return;
      }

      setBatches((current) =>
        current.filter(
          (batch) => batch.id !== deleteBatch.id,
        ),
      );

      if (expandedBatchId === deleteBatch.id) {
        setExpandedBatchId(null);
      }

      setDeleteBatch(null);
    });
  };

  const openCompleteDialog = (
    batch: SerializedProductionBatch,
  ) => {
    setError(null);

    setCompleteBatch(batch);

    setCompleteForm({
      batchId: batch.id,
      producedQuantity:
        String(batch.plannedQuantity),
      notes: "",
    });
  };

  const handleProductChange = (
    productId: string,
  ) => {
    setCreateForm((current) => ({
      ...current,
      productId,
      formulationId: "",
      packagingConfigurationId: "",
    }));

    setFormulations([]);
    setPackagingConfigurations([]);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total batches"
          value={summary.totalBatches}
          description="All production batches"
          icon={Factory}
        />

        <SummaryCard
          label="Draft"
          value={summary.draftBatches}
          description="Awaiting production"
          icon={Clock3}
          tone={
            summary.draftBatches > 0
              ? "warning"
              : "default"
          }
        />

        <SummaryCard
          label="Completed"
          value={summary.completedBatches}
          description="Production runs completed"
          icon={CheckCircle2}
          tone="success"
        />

        <SummaryCard
          label="Units produced"
          value={formatNumber(
            summary.totalUnitsProduced,
          )}
          description="Finished units added"
          icon={Package}
        />

        <SummaryCard
          label="Production cost"
          value={formatINR(
            summary.totalProductionCost,
          )}
          description="Completed batch cost"
          icon={Factory}
        />
      </div>

      {/* Main workspace */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-950">
                  Production batches
                </h2>

                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {filteredBatches.length}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Plan production, complete batches,
                and track the exact historical
                production cost.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setIsCreateOpen(true);
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create batch
            </button>
          </div>

          {/* Filters */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <select
                value={selectedProductId}
                onChange={(event) =>
                  setSelectedProductId(
                    event.target.value,
                  )
                }
                className="h-9 min-w-[210px] appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="ALL">
                  All products
                </option>

                {products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as StatusFilter,
                  )
                }
                className="h-9 min-w-[170px] appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="ALL">
                  All statuses
                </option>

                <option value="DRAFT">
                  Draft
                </option>

                <option value="COMPLETED">
                  Completed
                </option>

                <option value="CANCELLED">
                  Cancelled
                </option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {error && !isCreateOpen && !completeBatch && !cancelBatch && !deleteBatch && (
          <div className="mx-5 mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {filteredBatches.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Factory className="h-5 w-5 text-slate-500" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-950">
              No production batches
            </h3>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              Create your first production batch
              to start tracking planned production,
              actual output, inventory consumption,
              and production cost.
            </p>

            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setIsCreateOpen(true);
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Create batch
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="w-10 px-5 py-3" />

                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Batch
                  </th>

                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Product
                  </th>

                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Planned
                  </th>

                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Produced
                  </th>

                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>

                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Cost / unit
                  </th>

                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Created
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredBatches.map(
                  (batch) => {
                    const isExpanded =
                      expandedBatchId ===
                      batch.id;

                    return (
                      <BatchRow
                        key={batch.id}
                        batch={batch}
                        isExpanded={isExpanded}
                        isPending={isPending}
                        onToggle={() =>
                          setExpandedBatchId(
                            isExpanded
                              ? null
                              : batch.id,
                          )
                        }
                        onComplete={() =>
                          openCompleteDialog(
                            batch,
                          )
                        }
                        onCancel={() =>
                          setCancelBatch(
                            batch,
                          )
                        }
                        onDelete={() =>
                          setDeleteBatch(
                            batch,
                          )
                        }
                      />
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create Batch Dialog */}
      {isCreateOpen && (
        <Modal
          title="Create production batch"
          description="Create a draft batch first. Inventory is only consumed when the batch is completed."
          onClose={() =>
            !isPending &&
            setIsCreateOpen(false)
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Product">
                <select
                  value={createForm.productId}
                  onChange={(event) =>
                    handleProductChange(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    Select product
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Batch number">
                <input
                  type="text"
                  value={createForm.batchNumber}
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        batchNumber:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="e.g. BATCH-001"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Formulation">
                <div className="relative">
                  <select
                    value={
                      createForm.formulationId
                    }
                    onChange={(event) =>
                      setCreateForm(
                        (current) => ({
                          ...current,
                          formulationId:
                            event.target.value,
                        }),
                      )
                    }
                    disabled={
                      !createForm.productId ||
                      isLoadingConfigurations
                    }
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 pr-10"
                  >
                    <option value="">
                      {isLoadingConfigurations
                        ? "Loading..."
                        : formulations.length === 0
                          ? "No formulations"
                          : "Select formulation"}
                    </option>

                    {formulations.map(
                      (formulation) => (
                        <option
                          key={formulation.id}
                          value={formulation.id}
                        >
                          {formulation.name} · v
                          {formulation.version}
                          {formulation.isActive
                            ? " · Active"
                            : ""}
                        </option>
                      ),
                    )}
                  </select>

                  {isLoadingConfigurations && (
                    <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>

                {selectedFormulation && (
                  <p className="mt-1.5 text-[11px] text-emerald-700">
                    {selectedFormulation.isActive
                      ? "Active formulation"
                      : "Historical formulation"}
                  </p>
                )}

                {!isLoadingConfigurations &&
                  createForm.productId &&
                  formulations.length === 0 && (
                    <p className="mt-1.5 text-[11px] text-amber-700">
                      This product has no formulation
                      configured yet.
                    </p>
                  )}
              </Field>

              <Field label="Packaging configuration">
                <div className="relative">
                  <select
                    value={
                      createForm.packagingConfigurationId
                    }
                    onChange={(event) =>
                      setCreateForm(
                        (current) => ({
                          ...current,
                          packagingConfigurationId:
                            event.target.value,
                        }),
                      )
                    }
                    disabled={
                      !createForm.productId ||
                      isLoadingConfigurations
                    }
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 pr-10"
                  >
                    <option value="">
                      {isLoadingConfigurations
                        ? "Loading..."
                        : packagingConfigurations.length ===
                            0
                          ? "No packaging configurations"
                          : "Select packaging"}
                    </option>

                    {packagingConfigurations.map(
                      (configuration) => (
                        <option
                          key={configuration.id}
                          value={configuration.id}
                        >
                          {configuration.name} · v
                          {configuration.version}
                          {configuration.isActive
                            ? " · Active"
                            : ""}
                        </option>
                      ),
                    )}
                  </select>

                  {isLoadingConfigurations && (
                    <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>

                {selectedPackaging && (
                  <p className="mt-1.5 text-[11px] text-emerald-700">
                    {selectedPackaging.isActive
                      ? "Active packaging configuration"
                      : "Historical packaging configuration"}
                  </p>
                )}

                {!isLoadingConfigurations &&
                  createForm.productId &&
                  packagingConfigurations.length ===
                    0 && (
                    <p className="mt-1.5 text-[11px] text-amber-700">
                      This product has no packaging
                      configuration yet.
                    </p>
                  )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Planned quantity">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    createForm.plannedQuantity
                  }
                  onChange={(event) =>
                    setCreateForm(
                      (current) => ({
                        ...current,
                        plannedQuantity:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="e.g. 20"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </Field>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Selected versions
                </p>

                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-slate-700">
                    Formulation:{" "}
                    {activeFormulation
                      ? `v${activeFormulation.version}`
                      : "Not configured"}
                  </p>

                  <p className="text-xs font-medium text-slate-700">
                    Packaging:{" "}
                    {activePackaging
                      ? `v${activePackaging.version}`
                      : "Not configured"}
                  </p>
                </div>
              </div>
            </div>

            <Field label="Notes">
              <textarea
                value={createForm.notes}
                onChange={(event) =>
                  setCreateForm(
                    (current) => ({
                      ...current,
                      notes: event.target.value,
                    }),
                  )
                }
                rows={2}
                placeholder="Optional production notes..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 resize-none"
              />
            </Field>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Estimated production cost
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Based on the selected formulation and packaging at
                    their current weighted-average costs.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Estimated batch
                  </p>

                  <p className="mt-1 text-base font-bold text-slate-950">
                    {estimatedBatchCost !== null
                      ? formatINR(estimatedBatchCost)
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-200 pt-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Raw material / unit
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    {estimatedRawMaterialCostPerUnit !== null
                      ? formatINR(
                          estimatedRawMaterialCostPerUnit,
                        )
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Packaging / unit
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    {estimatedPackagingCostPerUnit !== null
                      ? formatINR(
                          estimatedPackagingCostPerUnit,
                        )
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Cost / unit
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    {estimatedUnitCost !== null
                      ? formatINR(estimatedUnitCost)
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    Inventory is not consumed yet
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-amber-700">
                    Creating a batch only creates
                    a draft. The estimate above is a
                    planning preview. Final historical
                    cost is recorded when the batch is
                    completed using the actual produced
                    quantity and current inventory costs.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  setIsCreateOpen(false)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isPending ||
                  isLoadingConfigurations ||
                  !createForm.productId ||
                  !createForm.formulationId ||
                  !createForm.packagingConfigurationId ||
                  !createForm.batchNumber.trim() ||
                  Number(
                    createForm.plannedQuantity,
                  ) <= 0
                }
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Create draft
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Complete Batch Dialog */}
      {completeBatch && (
        <Modal
          title="Complete production batch"
          description={`Complete ${completeBatch.batchNumber} and record actual inventory consumption.`}
          onClose={() =>
            !isPending &&
            setCompleteBatch(null)
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                <span>{error}</span>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoItem
                  label="Product"
                  value={
                    completeBatch.productName
                  }
                />

                <InfoItem
                  label="Planned"
                  value={`${formatNumber(
                    completeBatch.plannedQuantity,
                  )} units`}
                />

                <InfoItem
                  label="Batch"
                  value={
                    completeBatch.batchNumber
                  }
                />
              </div>
            </div>

            <Field label="Produced quantity">
              <input
                type="number"
                min="1"
                step="1"
                value={
                  completeForm.producedQuantity
                }
                onChange={(event) =>
                  setCompleteForm(
                    (current) => ({
                      ...current,
                      producedQuantity:
                        event.target.value,
                    }),
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              />

              <p className="mt-1.5 text-[11px] text-slate-400">
                This is the actual quantity
                produced. The service will calculate
                exact raw-material and packaging
                consumption from this quantity.
              </p>
            </Field>

            <Field label="Completion notes">
              <textarea
                value={completeForm.notes}
                onChange={(event) =>
                  setCompleteForm(
                    (current) => ({
                      ...current,
                      notes: event.target.value,
                    }),
                  )
                }
                rows={2}
                placeholder="Optional completion notes..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 resize-none"
              />
            </Field>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    What completion will do
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-emerald-700">
                    Consume the required raw
                    materials and packaging, calculate
                    the actual batch cost, and add the
                    produced quantity to finished
                    product inventory.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  setCompleteBatch(null)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isPending ||
                  Number(
                    completeForm.producedQuantity,
                  ) <= 0
                }
                onClick={handleComplete}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Complete batch
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Batch Dialog */}
      {cancelBatch && (
        <Modal
          title="Cancel production batch"
          description={`Cancel ${cancelBatch.batchNumber}?`}
          onClose={() =>
            !isPending &&
            setCancelBatch(null)
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                <span>{error}</span>
              </div>
            )}

            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    This batch will be marked
                    cancelled.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    No inventory will be consumed by
                    cancelling a draft batch.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <InfoItem
                label="Batch"
                value={
                  cancelBatch.batchNumber
                }
              />

              <InfoItem
                label="Product"
                value={
                  cancelBatch.productName
                }
              />

              <InfoItem
                label="Planned quantity"
                value={`${formatNumber(
                  cancelBatch.plannedQuantity,
                )} units`}
              />

              <InfoItem
                label="Created"
                value={formatDate(
                  cancelBatch.createdAt,
                )}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  setCancelBatch(null)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Keep batch
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleCancel}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Cancel batch
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Batch Dialog */}
      {deleteBatch && (
        <Modal
          title="Delete cancelled batch"
          description={`Delete ${deleteBatch.batchNumber}?`}
          onClose={() =>
            !isPending &&
            setDeleteBatch(null)
          }
        >
          <div className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
              <div className="flex gap-3">
                <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Permanently delete this cancelled batch?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    This removes the cancelled batch from production
                    history. No inventory will be changed.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <InfoItem
                label="Batch"
                value={deleteBatch.batchNumber}
              />

              <InfoItem
                label="Product"
                value={deleteBatch.productName}
              />

              <InfoItem
                label="Status"
                value="Cancelled"
              />

              <InfoItem
                label="Created"
                value={formatDate(deleteBatch.createdAt)}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeleteBatch(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Keep batch
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}

                {isPending ? "Deleting..." : "Delete batch"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BatchRow({
  batch,
  isExpanded,
  isPending,
  onToggle,
  onComplete,
  onCancel,
  onDelete,
}: {
  batch: SerializedProductionBatch;
  isExpanded: boolean;
  isPending: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-100 transition hover:bg-slate-50/50">
        <td className="px-5 py-4 align-top">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={
              isExpanded
                ? "Collapse batch"
                : "Expand batch"
            }
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>

        <td className="px-3 py-4 align-top">
          <p className="text-sm font-semibold text-slate-900">
            {batch.batchNumber}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">
            {batch.formulationName} · v
            {batch.formulationVersion}
          </p>
        </td>

        <td className="px-3 py-4 align-top">
          <p className="text-sm font-medium text-slate-800">
            {batch.productName}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">
            {batch.productSku}
          </p>
        </td>

        <td className="px-3 py-4 align-top text-sm text-slate-600">
          {formatNumber(
            batch.plannedQuantity,
          )}
        </td>

        <td className="px-3 py-4 align-top text-sm font-medium text-slate-700">
          {formatNumber(
            batch.producedQuantity,
          )}
        </td>

        <td className="px-3 py-4 align-top">
          <StatusBadge status={batch.status} />
        </td>

        <td className="px-3 py-4 align-top">
          <p className="text-sm font-medium text-slate-800">
            {batch.costPerUnit !== null
              ? formatINR(
                  batch.costPerUnit,
                )
              : "—"}
          </p>

          {batch.totalCost !== null && (
            <p className="mt-0.5 text-[11px] text-slate-400">
              Total{" "}
              {formatINR(batch.totalCost)}
            </p>
          )}
        </td>

        <td className="px-3 py-4 align-top text-xs text-slate-500">
          {formatDate(batch.createdAt)}
        </td>

        <td className="px-5 py-4 align-top">
          <div className="flex justify-end gap-2">
            {batch.status === "DRAFT" && (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={onComplete}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  Complete
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={onCancel}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}

            {batch.status === "COMPLETED" && (
              <span className="text-[11px] font-medium text-emerald-700">
                Completed
              </span>
            )}

            {batch.status === "CANCELLED" && (
              <button
                type="button"
                disabled={isPending}
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-b border-slate-100 bg-slate-50/50">
          <td
            colSpan={9}
            className="px-5 py-3.5"
          >
            <BatchDetails batch={batch} />
          </td>
        </tr>
      )}
    </>
  );
}

function BatchDetails({
  batch,
}: {
  batch: SerializedProductionBatch;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Configuration
        </p>

        <div className="mt-3 space-y-3">
          <InfoItem
            label="Formulation"
            value={`${batch.formulationName} · v${batch.formulationVersion}`}
          />

          <InfoItem
            label="Packaging"
            value={`${batch.packagingConfigurationName} · v${batch.packagingConfigurationVersion}`}
          />

          <InfoItem
            label="Created"
            value={formatDateTime(
              batch.createdAt,
            )}
          />

          <InfoItem
            label="Completed"
            value={formatDateTime(
              batch.completedAt,
            )}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Cost breakdown
        </p>

        <div className="mt-3 space-y-3">
          <InfoItem
            label="Raw materials"
            value={
              batch.rawMaterialCost !== null
                ? formatINR(
                    batch.rawMaterialCost,
                  )
                : "—"
            }
          />

          <InfoItem
            label="Packaging"
            value={
              batch.packagingMaterialCost !==
              null
                ? formatINR(
                    batch.packagingMaterialCost,
                  )
                : "—"
            }
          />

          <InfoItem
            label="Total batch cost"
            value={
              batch.totalCost !== null
                ? formatINR(
                    batch.totalCost,
                  )
                : "—"
            }
          />

          <InfoItem
            label="Cost per unit"
            value={
              batch.costPerUnit !== null
                ? formatINR(
                    batch.costPerUnit,
                  )
                : "—"
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Consumption
        </p>

        {batch.rawMaterialConsumptions
          .length === 0 &&
        batch.packagingConsumptions.length ===
          0 ? (
          <p className="mt-3 text-xs text-slate-400">
            No inventory consumption recorded
            yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {batch.rawMaterialConsumptions.map(
              (item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      {item.rawMaterialName}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      {formatNumber(
                        item.quantity,
                      )}{" "}
                      {item.baseUnit.toLowerCase()}
                    </p>
                  </div>

                  <p className="text-xs font-semibold text-slate-700">
                    {formatINR(
                      item.totalCost,
                    )}
                  </p>
                </div>
              ),
            )}

            {batch.packagingConsumptions.map(
              (item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      {item.packagingMaterialName}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      {formatNumber(
                        item.quantity,
                      )}{" "}
                      pieces
                    </p>
                  </div>

                  <p className="text-xs font-semibold text-slate-700">
                    {formatINR(
                      item.totalCost,
                    )}
                  </p>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {batch.notes && (
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Notes
          </p>

          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
            {batch.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-950">
              {title}
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}