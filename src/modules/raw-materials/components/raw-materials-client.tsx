"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  AlertCircle,
  Beaker,
  Boxes,
  History,
  Loader2,
  PackagePlus,
  Plus,
  MinusCircle,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { formatINR, formatDate } from "@/lib/formatters";

import {
  createRawMaterialAction,
  deleteRawMaterialAction,
  getRawMaterialPurchasesAction,
  getRawMaterialInventoryHistoryAction,
  recordRawMaterialPurchaseAction,
  recordRawMaterialConsumptionAction,
  recordRawMaterialWastageAction,
  deleteRawMaterialPurchaseAction,
  deleteRawMaterialConsumptionAction,
  deleteRawMaterialWastageAction,
} from "@/modules/raw-materials/actions";

import {
  CreateRawMaterialSchema,
  RecordRawMaterialPurchaseSchema,
  RecordRawMaterialWastageSchema,
} from "@/modules/raw-materials/validation";

import type {
  SerializedRawMaterial,
  SerializedRawMaterialPurchase,
} from "@/modules/raw-materials/types";

type RawMaterialInventoryHistoryItem = {
  id: string;
   type:
    | "PURCHASE"
    | "CONSUMPTION"
    | "WASTAGE"
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT";
  quantity: number;
  unitCost: number;
  totalValue: number;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
  purchaseId: string | null;
  purchaseQuantity: number | null;
  purchaseUnit: PurchaseUnit | null;
  purchaseDate: Date | null;
};

interface RawMaterialsClientProps {
  initialMaterials: SerializedRawMaterial[];
}

type BaseUnit = "GRAM" | "MILLILITER" | "PIECE";

type PurchaseUnit =
  | "GRAM"
  | "KILOGRAM"
  | "MILLILITER"
  | "LITER"
  | "PIECE";

const BASE_UNIT_LABELS: Record<BaseUnit, string> = {
  GRAM: "grams (g)",
  MILLILITER: "milliliters (ml)",
  PIECE: "pieces",
};

const PURCHASE_UNIT_LABELS: Record<PurchaseUnit, string> = {
  GRAM: "grams (g)",
  KILOGRAM: "kilograms (kg)",
  MILLILITER: "milliliters (ml)",
  LITER: "liters (L)",
  PIECE: "pieces",
};

function getPurchaseUnits(
  baseUnit: BaseUnit,
): PurchaseUnit[] {
  if (baseUnit === "GRAM") {
    return ["GRAM", "KILOGRAM"];
  }

  if (baseUnit === "MILLILITER") {
    return ["MILLILITER", "LITER"];
  }

  return ["PIECE"];
}

function formatQuantity(
  value: number,
  unit: BaseUnit,
): string {
  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(value)} ${unit === "GRAM"
    ? "g"
    : unit === "MILLILITER"
      ? "ml"
      : "pcs"}`;
}

export function RawMaterialsClient({
  initialMaterials,
}: RawMaterialsClientProps) {
  const router = useRouter();

  const [isMaterialDialogOpen, setIsMaterialDialogOpen] =
    useState(false);

  const [purchaseMaterial, setPurchaseMaterial] =
    useState<SerializedRawMaterial | null>(null);

  const [consumptionMaterial, setConsumptionMaterial] =
    useState<SerializedRawMaterial | null>(null);

  const [wastageMaterial, setWastageMaterial] =
    useState<SerializedRawMaterial | null>(null);

  const [historyMaterial, setHistoryMaterial] =
    useState<SerializedRawMaterial | null>(null);

  const [materialToDelete, setMaterialToDelete] =
    useState<SerializedRawMaterial | null>(null);
  const [deleteMaterialError, setDeleteMaterialError] =
    useState<string | null>(null);
  const [isDeletingMaterial, startDeleteMaterialTransition] =
    useTransition();

  const [isPending, startTransition] =
    useTransition();

  const totalInventoryValue = useMemo(
    () =>
      initialMaterials.reduce(
        (total, material) =>
          total + material.currentValue,
        0,
      ),
    [initialMaterials],
  );

  const materialsWithStock = useMemo(
    () =>
      initialMaterials.filter(
        (material) =>
          material.currentQuantity > 0,
      ).length,
    [initialMaterials],
  );

  return (
    <div className="space-y-6">
      {/* =====================================================
          SUMMARY
      ===================================================== */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Raw materials"
          value={initialMaterials.length.toString()}
          description="Registered materials"
          icon={Beaker}
        />

        <SummaryCard
          label="Materials in stock"
          value={materialsWithStock.toString()}
          description="With available inventory"
          icon={Boxes}
        />

        <SummaryCard
          label="Inventory value"
          value={formatINR(totalInventoryValue)}
          description="Current raw-material value"
          icon={PackagePlus}
        />

        <SummaryCard
          label="Costing method"
          value="Weighted Avg."
          description="Purchase-cost valuation"
          icon={History}
        />
      </div>

      {/* =====================================================
          MATERIAL TABLE
      ===================================================== */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-text-primary">
                Raw-material inventory
              </h2>

              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                {initialMaterials.length}
              </span>
            </div>

            <p className="mt-1 text-xs text-text-secondary">
              Purchases update inventory value and weighted-average unit
              cost automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsMaterialDialogOpen(true)
            }
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Raw Material
          </button>
        </div>

        {initialMaterials.length === 0 ? (
          <EmptyState
            onAdd={() =>
              setIsMaterialDialogOpen(true)
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-surface-muted/70 text-left">
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    Material
                  </th>

                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    Supplier
                  </th>

                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    Current Stock
                  </th>

                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    Avg. Cost
                  </th>

                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    Inventory Value
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {initialMaterials.map((material) => (
                  <tr
                    key={material.id}
                    className="transition-colors hover:bg-surface-muted/60"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {material.name}
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          {material.category && (
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                              {material.category}
                            </span>
                          )}

                          <span className="text-[10px] text-text-muted">
                            Base:{" "}
                            {BASE_UNIT_LABELS[
                              material.baseUnit
                            ]}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-xs text-text-secondary">
                      {material.supplier ||
                        "Not recorded"}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-semibold text-text-primary">
                        {formatQuantity(
                          material.currentQuantity,
                          material.baseUnit,
                        )}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-semibold text-text-primary">
                        {formatINR(
                          material.weightedAverageCost,
                        )}
                      </p>

                      <p className="mt-0.5 text-[10px] text-text-muted">
                        per{" "}
                        {material.baseUnit ===
                        "GRAM"
                          ? "g"
                          : material.baseUnit ===
                              "MILLILITER"
                            ? "ml"
                            : "piece"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-semibold text-text-primary">
                        {formatINR(
                          material.currentValue,
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setHistoryMaterial(
                              material,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary shadow-sm hover:bg-surface-muted"
                        >
                          <History className="h-3.5 w-3.5" />
                          History
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setConsumptionMaterial(
                              material,
                            )
                          }
                          disabled={material.currentQuantity <= 0}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MinusCircle className="h-3.5 w-3.5" />
                          Consume
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setWastageMaterial(material)
                          }
                          disabled={material.currentQuantity <= 0}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MinusCircle className="h-3.5 w-3.5" />
                          Wastage
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPurchaseMaterial(
                              material,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Purchase
                        </button>
                        <button
                          type="button"
                          title="Delete raw material"
                          aria-label={`Delete ${material.name}`}
                          disabled={isDeletingMaterial}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-muted shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            setDeleteMaterialError(null);
                            setMaterialToDelete(material);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          ADD MATERIAL DIALOG
      ===================================================== */}
      <AddRawMaterialDialog
        open={isMaterialDialogOpen}
        onClose={() =>
          setIsMaterialDialogOpen(false)
        }
        isPending={isPending}
        startTransition={startTransition}
        onSuccess={() => {
          setIsMaterialDialogOpen(false);
          router.refresh();
        }}
      />

      {/* =====================================================
          PURCHASE DIALOG
      ===================================================== */}
      {purchaseMaterial && (
        <PurchaseDialog
          material={purchaseMaterial}
          open={true}
          onClose={() =>
            setPurchaseMaterial(null)
          }
          isPending={isPending}
          startTransition={startTransition}
          onSuccess={() => {
            setPurchaseMaterial(null);
            router.refresh();
          }}
        />
      )}

      {/* =====================================================
          CONSUMPTION DIALOG
      ===================================================== */}
      {consumptionMaterial && (
        <ConsumptionDialog
          material={consumptionMaterial}
          onClose={() =>
            setConsumptionMaterial(null)
          }
          onSuccess={() => {
            setConsumptionMaterial(null);
            router.refresh();
          }}
        />
      )}

      {/* =====================================================
          WASTAGE DIALOG
      ===================================================== */}
      {wastageMaterial && (
        <WastageRawMaterialDialog
          material={wastageMaterial}
          onClose={() =>
            setWastageMaterial(null)
          }
          onSuccess={() => {
            setWastageMaterial(null);
            router.refresh();
          }}
        />
      )}

      {/* =====================================================
          HISTORY DIALOG
      ===================================================== */}
      {historyMaterial && (
        <PurchaseHistoryDialog
          material={historyMaterial}
          onClose={() =>
            setHistoryMaterial(null)
          }
        />
      )}

      {materialToDelete && (
        <DialogShell
          title="Delete Material?"
          description="This will permanently remove the material and its associated records."
          onClose={() => {
            if (!isDeletingMaterial) {
              setMaterialToDelete(null);
              setDeleteMaterialError(null);
            }
          }}
          maxWidth="max-w-md"
        >
          <div className="space-y-5">
            {deleteMaterialError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{deleteMaterialError}</span>
              </div>
            )}
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-sm font-semibold text-text-primary">
                {materialToDelete.name}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Current stock: {formatQuantity(materialToDelete.currentQuantity, materialToDelete.baseUnit)}
                {" · "}{formatINR(materialToDelete.currentValue)} inventory value
              </p>
            </div>
            <p className="text-xs leading-5 text-text-secondary">
              The material, its purchase and inventory records, and linked cash transactions will be permanently deleted. This action cannot be undone. Materials used in formulations or production cannot be deleted.
            </p>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => {
                  setMaterialToDelete(null);
                  setDeleteMaterialError(null);
                }}
                disabled={isDeletingMaterial}
                className="rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:opacity-50"
              >Cancel</button>
              <button
                type="button"
                disabled={isDeletingMaterial}
                onClick={() => {
                  if (!materialToDelete) return;
                  const materialId = materialToDelete.id;
                  startDeleteMaterialTransition(async () => {
                    const result = await deleteRawMaterialAction({ id: materialId });
                    if (!result.success) {
                      setDeleteMaterialError(result.error ?? "Unable to delete raw material.");
                      return;
                    }
                    setMaterialToDelete(null);
                    setDeleteMaterialError(null);
                    router.refresh();
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingMaterial && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isDeletingMaterial ? "Deleting..." : "Delete Material"}
              </button>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Beaker;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em] text-text-primary">
            {value}
          </p>

          <p className="mt-0.5 text-[11px] text-text-muted">
            {description}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-text-secondary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <Beaker className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-text-primary">
        No raw materials yet
      </h3>

      <p className="mt-1 max-w-md text-xs leading-5 text-text-secondary">
        Add your first raw material to start tracking purchases,
        inventory value, and actual material costs.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Raw Material
      </button>
    </div>
  );
}

function DialogShell({
  title,
  description,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`my-8 w-full ${maxWidth} rounded-xl border border-border bg-surface-raised p-6 shadow-xl`}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-text-primary">
              {title}
            </h2>

            <p className="mt-0.5 text-xs text-text-secondary">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-muted hover:text-text-secondary"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="pt-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function AddRawMaterialDialog({
  open,
  onClose,
  isPending,
  startTransition,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [baseUnit, setBaseUnit] =
    useState<BaseUnit>("GRAM");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("");
      setBaseUnit("GRAM");
      setSupplier("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    setError(null);

    const parsed =
      CreateRawMaterialSchema.safeParse({
        name,
        category:
          category.trim() === ""
            ? null
            : category,
        baseUnit,
        supplier:
          supplier.trim() === ""
            ? null
            : supplier,
        notes:
          notes.trim() === ""
            ? null
            : notes,
      });

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ||
          "Please check the form.",
      );
      return;
    }

    startTransition(async () => {
      const result =
        await createRawMaterialAction(
          parsed.data,
        );

      if (!result.success) {
        setError(
          result.error ||
            "Failed to create raw material.",
        );
        return;
      }

      onSuccess();
    });
  };

  return (
    <DialogShell
      title="Add Raw Material"
      description="Register a material before recording purchases."
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label
            htmlFor="raw-material-name"
            className="block text-xs font-semibold text-text-secondary"
          >
            Material Name *
          </label>

          <input
            id="raw-material-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. Milk Powder"
            disabled={isPending}
            className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="raw-material-category"
              className="block text-xs font-semibold text-text-secondary"
            >
              Category
            </label>

            <input
              id="raw-material-category"
              type="text"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              placeholder="e.g. Powder"
              disabled={isPending}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="raw-material-base-unit"
              className="block text-xs font-semibold text-text-secondary"
            >
              Base Unit *
            </label>

            <select
              id="raw-material-base-unit"
              value={baseUnit}
              onChange={(event) =>
                setBaseUnit(
                  event.target.value as BaseUnit,
                )
              }
              disabled={isPending}
              className="w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-xs font-medium text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="GRAM">
                Grams (g)
              </option>

              <option value="MILLILITER">
                Milliliters (ml)
              </option>

              <option value="PIECE">
                Pieces
              </option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="raw-material-supplier"
            className="block text-xs font-semibold text-text-secondary"
          >
            Supplier / Vendor
          </label>

          <input
            id="raw-material-supplier"
            type="text"
            value={supplier}
            onChange={(event) =>
              setSupplier(event.target.value)
            }
            placeholder="e.g. Supplier name"
            disabled={isPending}
            className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="raw-material-notes"
            className="block text-xs font-semibold text-text-secondary"
          >
            Notes
          </label>

          <textarea
            id="raw-material-notes"
            rows={3}
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Optional material notes..."
            disabled={isPending}
            className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}

            {isPending
              ? "Creating..."
              : "Create Material"}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function PurchaseDialog({
  material,
  open,
  onClose,
  isPending,
  startTransition,
  onSuccess,
}: {
  material: SerializedRawMaterial;
  open: boolean;
  onClose: () => void;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  onSuccess: () => void;
}) {
  const availableUnits = useMemo(
    () =>
      getPurchaseUnits(
        material.baseUnit,
      ),
    [material.baseUnit],
  );

  const [purchaseDate, setPurchaseDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10),
    );

  const [quantity, setQuantity] =
    useState("");

  const [purchaseUnit, setPurchaseUnit] =
    useState<PurchaseUnit>(
      availableUnits[0],
    );

  const [totalAmount, setTotalAmount] =
    useState("");

  const [supplier, setSupplier] =
    useState(material.supplier || "");

  const [invoiceReference, setInvoiceReference] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPurchaseDate(
        new Date()
          .toISOString()
          .slice(0, 10),
      );

      setQuantity("");

      setPurchaseUnit(
        availableUnits[0],
      );

      setTotalAmount("");

      setSupplier(
        material.supplier || "",
      );

      setInvoiceReference("");
      setNotes("");
      setError(null);
    }
  }, [
    open,
    material,
    availableUnits,
  ]);

  if (!open) return null;

  const numericQuantity =
    Number(quantity);

  const numericAmount =
    Number(totalAmount);

  const conversionPreview =
    purchaseUnit === "KILOGRAM"
      ? numericQuantity * 1000
      : purchaseUnit === "LITER"
        ? numericQuantity * 1000
        : numericQuantity;

  const previewCost =
    numericQuantity > 0 &&
    numericAmount > 0
      ? numericAmount /
        conversionPreview
      : null;

  const handleSubmit = (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    setError(null);

    const parsed =
      RecordRawMaterialPurchaseSchema.safeParse(
        {
          rawMaterialId: material.id,
          purchaseDate,
          quantity,
          purchaseUnit,
          totalAmount,
          supplier:
            supplier.trim() === ""
              ? null
              : supplier,
          invoiceReference:
            invoiceReference.trim() === ""
              ? null
              : invoiceReference,
          notes:
            notes.trim() === ""
              ? null
              : notes,
        },
      );

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ||
          "Please check the purchase details.",
      );
      return;
    }

    startTransition(async () => {
      const result =
        await recordRawMaterialPurchaseAction(
          parsed.data,
        );

      if (!result.success) {
        setError(
          result.error ||
            "Failed to record purchase.",
        );
        return;
      }

      onSuccess();
    });
  };

  return (
    <DialogShell
      title={`Record Purchase — ${material.name}`}
      description={`Base unit: ${BASE_UNIT_LABELS[material.baseUnit]}`}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="purchase-date"
              className="block text-xs font-semibold text-text-secondary"
            >
              Purchase Date *
            </label>

            <input
              id="purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(event) =>
                setPurchaseDate(
                  event.target.value,
                )
              }
              disabled={isPending}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="purchase-unit"
              className="block text-xs font-semibold text-text-secondary"
            >
              Purchase Unit *
            </label>

            <select
              id="purchase-unit"
              value={purchaseUnit}
              onChange={(event) =>
                setPurchaseUnit(
                  event.target.value as PurchaseUnit,
                )
              }
              disabled={isPending}
              className="w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-xs font-medium text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              {availableUnits.map((unit) => (
                <option
                  key={unit}
                  value={unit}
                >
                  {PURCHASE_UNIT_LABELS[unit]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="purchase-quantity"
              className="block text-xs font-semibold text-text-secondary"
            >
              Quantity *
            </label>

            <input
              id="purchase-quantity"
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  event.target.value,
                )
              }
              placeholder="e.g. 1"
              disabled={isPending}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="purchase-amount"
              className="block text-xs font-semibold text-text-secondary"
            >
              Total Purchase Amount (₹) *
            </label>

            <input
              id="purchase-amount"
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(event) =>
                setTotalAmount(
                  event.target.value,
                )
              }
              placeholder="e.g. 300"
              disabled={isPending}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Cost Preview */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Purchase Cost Preview
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] text-text-secondary">
                Converted Quantity
              </p>

              <p className="mt-1 text-sm font-semibold text-text-primary">
                {numericQuantity > 0
                  ? `${conversionPreview.toLocaleString(
                      "en-IN",
                    )} ${
                      material.baseUnit ===
                      "GRAM"
                        ? "g"
                        : material.baseUnit ===
                            "MILLILITER"
                          ? "ml"
                          : "pcs"
                    }`
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary">
                Purchase Cost
              </p>

              <p className="mt-1 text-sm font-semibold text-text-primary">
                {numericAmount > 0
                  ? formatINR(
                      numericAmount,
                    )
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary">
                Cost per Base Unit
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {previewCost !== null
                  ? formatINR(
                      previewCost,
                    )
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="purchase-supplier"
              className="block text-xs font-semibold text-text-secondary"
            >
              Supplier / Vendor
            </label>

            <input
              id="purchase-supplier"
              type="text"
              value={supplier}
              onChange={(event) =>
                setSupplier(
                  event.target.value,
                )
              }
              placeholder="Supplier name"
              disabled={isPending}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="purchase-invoice"
              className="block text-xs font-semibold text-text-secondary"
            >
              Invoice Reference
            </label>

            <input
              id="purchase-invoice"
              type="text"
              value={invoiceReference}
              onChange={(event) =>
                setInvoiceReference(
                  event.target.value,
                )
              }
              placeholder="Optional invoice / bill number"
              disabled={isPending}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="purchase-notes"
            className="block text-xs font-semibold text-text-secondary"
          >
            Notes
          </label>

          <textarea
            id="purchase-notes"
            rows={2}
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Optional purchase notes..."
            disabled={isPending}
            className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}

            {isPending
              ? "Recording..."
              : "Record Purchase"}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}


function ConsumptionDialog({
  material,
  onClose,
  onSuccess,
}: {
  material: SerializedRawMaterial;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const numericQuantity = Number(quantity);
  const hasValidQuantity =
    Number.isFinite(numericQuantity) &&
    numericQuantity > 0;

  const exceedsStock =
    hasValidQuantity &&
    numericQuantity > material.currentQuantity;

  const estimatedCost =
    hasValidQuantity && !exceedsStock
      ? numericQuantity * material.weightedAverageCost
      : null;

  const remainingQuantity =
    hasValidQuantity && !exceedsStock
      ? material.currentQuantity - numericQuantity
      : null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidQuantity) {
      setError("Consumption quantity must be greater than zero.");
      return;
    }

    if (exceedsStock) {
      setError(
        `Insufficient stock. Available quantity is ${formatQuantity(
          material.currentQuantity,
          material.baseUnit,
        )}.`,
      );
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await recordRawMaterialConsumptionAction({
        rawMaterialId: material.id,
        quantity: numericQuantity,
        referenceId:
          referenceId.trim() === ""
            ? null
            : referenceId.trim(),
        notes:
          notes.trim() === ""
            ? null
            : notes.trim(),
      });

      if (!result.success) {
        setError(
          result.error ||
            "Failed to record material consumption.",
        );
        return;
      }

      onSuccess();
    });
  };

  const unitLabel =
    material.baseUnit === "GRAM"
      ? "g"
      : material.baseUnit === "MILLILITER"
        ? "ml"
        : "pcs";

  return (
    <DialogShell
      title={`Consume ${material.name}`}
      description="Record material used for production, formulation, sampling, or another business activity."
      onClose={isPending ? () => {} : onClose}
      maxWidth="max-w-lg"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] text-text-secondary">
                Available Stock
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatQuantity(
                  material.currentQuantity,
                  material.baseUnit,
                )}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary">
                Current Avg. Cost
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatINR(material.weightedAverageCost)}
                <span className="ml-1 text-[10px] font-normal text-text-muted">
                  / {unitLabel}
                </span>
              </p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary">
                Inventory Value
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatINR(material.currentValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="consumption-quantity"
            className="block text-xs font-semibold text-text-secondary"
          >
            Quantity Consumed *
          </label>

          <div className="relative">
            <input
              id="consumption-quantity"
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value);
                setError(null);
              }}
              placeholder={`e.g. 400`}
              disabled={isPending}
              autoFocus
              className="w-full rounded-lg border border-border-strong px-3 py-2 pr-12 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />

            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-text-muted">
              {unitLabel}
            </span>
          </div>

          <p className="text-[10px] text-text-muted">
            Consumption must be recorded in the material's base unit.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Consumption Cost Preview
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] text-text-secondary">
                Quantity
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {hasValidQuantity
                  ? `${numericQuantity.toLocaleString(
                      "en-IN",
                      { maximumFractionDigits: 3 },
                    )} ${unitLabel}`
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary">
                Consumption Cost
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {estimatedCost !== null
                  ? formatINR(estimatedCost)
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary">
                Remaining Stock
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {remainingQuantity !== null
                  ? `${remainingQuantity.toLocaleString(
                      "en-IN",
                      { maximumFractionDigits: 3 },
                    )} ${unitLabel}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="consumption-reference"
            className="block text-xs font-semibold text-text-secondary"
          >
            Reference
          </label>

          <input
            id="consumption-reference"
            type="text"
            value={referenceId}
            onChange={(event) =>
              setReferenceId(event.target.value)
            }
            placeholder="e.g. Production Batch #1"
            disabled={isPending}
            className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="consumption-notes"
            className="block text-xs font-semibold text-text-secondary"
          >
            Notes
          </label>

          <textarea
            id="consumption-notes"
            rows={2}
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Optional consumption notes..."
            disabled={isPending}
            className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              isPending ||
              !hasValidQuantity ||
              exceedsStock
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}

            {isPending
              ? "Recording..."
              : "Record Consumption"}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function WastageRawMaterialDialog({
  material,
  onClose,
  onSuccess,
}: {
  material: SerializedRawMaterial;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] =
    useState<
      | "PRODUCTION_WASTAGE"
      | "SPILLAGE"
      | "DAMAGED_MATERIAL"
      | "FAILED_BATCH"
      | "SAMPLING_TESTING"
      | "EXPIRED_MATERIAL"
      | "OTHER"
    >("PRODUCTION_WASTAGE");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsedQuantity = Number(quantity);

  const hasValidQuantity =
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0;

  const exceedsStock =
    hasValidQuantity &&
    parsedQuantity > material.currentQuantity;

  const estimatedCost =
    hasValidQuantity && !exceedsStock
      ? parsedQuantity * material.weightedAverageCost
      : 0;

  const remainingStock =
    hasValidQuantity && !exceedsStock
      ? material.currentQuantity - parsedQuantity
      : material.currentQuantity;

  const unitLabel =
    material.baseUnit === "GRAM"
      ? "g"
      : material.baseUnit === "MILLILITER"
        ? "ml"
        : "pcs";

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError(null);

    const parsed =
      RecordRawMaterialWastageSchema.safeParse({
        rawMaterialId: material.id,
        quantity,
        reason,
        notes:
          notes.trim() === ""
            ? null
            : notes.trim(),
      });

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          "Please check the wastage details.",
      );
      return;
    }

    startTransition(async () => {
      const result =
        await recordRawMaterialWastageAction(
          parsed.data,
        );

      if (!result.success) {
        setError(
          result.error ??
            "Failed to record wastage.",
        );
        return;
      }

      onSuccess();
    });
  };

  return (
    <DialogShell
      title={`Record Wastage — ${material.name}`}
      description="Remove damaged, lost, expired, or otherwise wasted raw material from inventory."
      onClose={isPending ? () => {} : onClose}
      maxWidth="max-w-lg"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] text-text-secondary">
                Available Stock
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatQuantity(
                  material.currentQuantity,
                  material.baseUnit,
                )}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary">
                Current Avg. Cost
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatINR(material.weightedAverageCost)}
                <span className="ml-1 text-[10px] font-normal text-text-muted">
                  / {unitLabel}
                </span>
              </p>
            </div>

            <div>
              <p className="text-[10px] text-text-secondary">
                Inventory Value
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatINR(material.currentValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="raw-material-wastage-quantity"
            className="block text-xs font-semibold text-text-secondary"
          >
            Quantity Wasted *
          </label>

          <div className="relative">
            <input
              id="raw-material-wastage-quantity"
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value);
                setError(null);
              }}
              placeholder="e.g. 10"
              disabled={isPending}
              autoFocus
              className={`w-full rounded-lg border border-border-strong px-3 py-2 pr-12 text-xs text-text-primary shadow-sm focus:outline-none focus:ring-1 ${
                exceedsStock
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "focus:border-emerald-600 focus:ring-emerald-600"
              }`}
            />

            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-text-muted">
              {unitLabel}
            </span>
          </div>

          {exceedsStock && (
            <p className="text-[11px] text-red-600">
              Quantity exceeds available stock.
            </p>
          )}

          <p className="text-[10px] text-text-muted">
            Wastage must be recorded in the material's base unit.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="raw-material-wastage-reason"
            className="block text-xs font-semibold text-text-secondary"
          >
            Reason *
          </label>

          <select
            id="raw-material-wastage-reason"
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value as typeof reason,
              )
            }
            disabled={isPending}
            className="w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-xs font-medium text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="PRODUCTION_WASTAGE">
              Production Wastage
            </option>
            <option value="SPILLAGE">
              Spillage
            </option>
            <option value="DAMAGED_MATERIAL">
              Damaged Material
            </option>
            <option value="FAILED_BATCH">
              Failed Batch
            </option>
            <option value="SAMPLING_TESTING">
              Sampling / Testing
            </option>
            <option value="EXPIRED_MATERIAL">
              Expired Material
            </option>
            <option value="OTHER">
              Other
            </option>
          </select>
        </div>

        {estimatedCost > 0 &&
          !exceedsStock && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">
                    Wastage Value
                  </p>
                  <p className="mt-1 text-lg font-semibold text-red-900">
                    {formatINR(estimatedCost)}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">
                    Remaining Stock
                  </p>
                  <p className="mt-1 text-lg font-semibold text-red-900">
                    {formatQuantity(
                      remainingStock,
                      material.baseUnit,
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-2 text-[11px] text-red-700">
                This will be recorded as a material-wastage
                expense, but it will not create a new cash
                outflow.
              </p>
            </div>
          )}

        <div className="space-y-1">
          <label
            htmlFor="raw-material-wastage-notes"
            className="block text-xs font-semibold text-text-secondary"
          >
            Notes
          </label>

          <textarea
            id="raw-material-wastage-notes"
            rows={3}
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Optional wastage notes..."
            disabled={isPending}
            className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              isPending ||
              !hasValidQuantity ||
              exceedsStock
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}

            {isPending
              ? "Recording..."
              : "Record Wastage"}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function PurchaseHistoryDialog({
  material,
  onClose,
}: {
  material: SerializedRawMaterial;
  onClose: () => void;
}) {
  const router = useRouter();

  const [history, setHistory] =
    useState<RawMaterialInventoryHistoryItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [purchaseToDelete, setPurchaseToDelete] =
    useState<SerializedRawMaterialPurchase | null>(null);

  const [consumptionToDelete, setConsumptionToDelete] =
    useState<RawMaterialInventoryHistoryItem | null>(null);

  const [wastageToDelete, setWastageToDelete] =
    useState<RawMaterialInventoryHistoryItem | null>(null);

  const [isDeleting, startDeleteTransition] =
    useTransition();

  const [isDeletingConsumption, startDeleteConsumptionTransition] =
    useTransition();

  const [isDeletingWastage, startDeleteWastageTransition] =
    useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      const result =
        await getRawMaterialInventoryHistoryAction({
          id: material.id,
        });

      if (cancelled) return;

      if (!result.success) {
        setError(
          result.error ||
            "Failed to load inventory history.",
        );
        setLoading(false);
        return;
      }

      setHistory(result.data || []);
      setLoading(false);
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [material.id]);

  const handleDeletePurchase = () => {
    if (!purchaseToDelete) return;

    setError(null);

    startDeleteTransition(async () => {
      const result = await deleteRawMaterialPurchaseAction({
        id: purchaseToDelete.id,
      });

      if (!result.success) {
        setError(
          result.error ||
            "Failed to delete purchase.",
        );
        return;
      }

      setHistory((current) =>
        current.filter(
          (entry) =>
            entry.purchaseId !== purchaseToDelete.id,
        ),
      );

      setPurchaseToDelete(null);
      router.refresh();
    });
  };

  const handleDeleteConsumption = () => {
    if (!consumptionToDelete) return;

    setError(null);

    startDeleteConsumptionTransition(async () => {
      const result = await deleteRawMaterialConsumptionAction({
        id: consumptionToDelete.id,
      });

      if (!result.success) {
        setError(
          result.error ||
            "Failed to delete consumption.",
        );
        return;
      }

      setHistory((current) =>
        current.filter(
          (entry) => entry.id !== consumptionToDelete.id,
        ),
      );

      setConsumptionToDelete(null);
      router.refresh();
    });
  };

  const handleDeleteWastage = () => {
    if (!wastageToDelete) return;

    setError(null);

    startDeleteWastageTransition(async () => {
      const result = await deleteRawMaterialWastageAction({
        id: wastageToDelete.id,
      });

      if (!result.success) {
        setError(
          result.error ||
            "Failed to delete wastage.",
        );
        return;
      }

      setWastageToDelete(null);
      router.refresh();

      setHistory((current) =>
        current.filter(
          (entry) => entry.id !== wastageToDelete.id,
        ),
      );
    });
  };

  const typeLabel = (type: RawMaterialInventoryHistoryItem["type"]) => {
    if (type === "PURCHASE") return "Purchase";
    if (type === "CONSUMPTION") return "Consumption";
    if (type === "WASTAGE") return "Wastage";
    if (type === "ADJUSTMENT_IN") return "Adjustment In";
    return "Adjustment Out";
  };

  const typeClasses = (type: RawMaterialInventoryHistoryItem["type"]) => {
    if (type === "PURCHASE") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (type === "CONSUMPTION") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (type === "WASTAGE") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-border bg-surface-muted text-text-secondary";
  };

  return (
    <>
      <DialogShell
        title={`Inventory History — ${material.name}`}
        description="Every inventory movement remains available for costing and audit history."
        onClose={onClose}
        maxWidth="max-w-4xl"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center">
            <History className="mx-auto h-6 w-6 text-text-muted" />

            <p className="mt-3 text-sm font-semibold text-text-primary">
              No inventory movements recorded
            </p>

            <p className="mt-1 text-xs text-text-secondary">
              Purchases, consumption, and wastage will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                      Type
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                      Quantity
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                      Unit Cost
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                      Value
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                      Reference
                    </th>

                    <th className="w-12 px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {history.map((entry) => {
                    const isPurchase = entry.type === "PURCHASE";

                    const quantityLabel = isPurchase
                      ? `${entry.purchaseQuantity?.toLocaleString(
                          "en-IN",
                        )} ${
                          entry.purchaseUnit
                            ? PURCHASE_UNIT_LABELS[
                                entry.purchaseUnit
                              ]
                            : ""
                        }`
                      : formatQuantity(
                          entry.quantity,
                          material.baseUnit,
                        );

                    const signedValue =
                      entry.type === "CONSUMPTION" ||
                      entry.type === "WASTAGE" ||
                      entry.type === "ADJUSTMENT_OUT"
                        ? -entry.totalValue
                        : entry.totalValue;

                    return (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 text-xs text-text-secondary">
                          {formatDate(
                            isPurchase && entry.purchaseDate
                              ? entry.purchaseDate
                              : entry.createdAt,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${typeClasses(
                              entry.type,
                            )}`}
                          >
                            {typeLabel(entry.type)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right text-xs font-medium text-text-primary">
                          {entry.type === "CONSUMPTION" ||
                          entry.type === "WASTAGE" ||
                          entry.type === "ADJUSTMENT_OUT"
                            ? "−"
                            : ""}
                          {quantityLabel}
                        </td>

                        <td className="px-4 py-3 text-right text-xs font-semibold text-text-primary">
                          {formatINR(entry.unitCost)}
                        </td>

                        <td
                          className={`px-4 py-3 text-right text-xs font-semibold ${
                            signedValue < 0
                              ? "text-red-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {signedValue < 0 ? "−" : "+"}
                          {formatINR(Math.abs(signedValue))}
                        </td>

                        <td className="px-4 py-3 text-xs text-text-secondary">
                          {entry.referenceId ||
                            entry.notes ||
                            "—"}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {isPurchase && entry.purchaseId ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const result =
                                  await getRawMaterialPurchasesAction({
                                    id: material.id,
                                  });

                                if (!result.success) {
                                  setError(
                                    result.error ||
                                      "Failed to load purchase.",
                                  );
                                  return;
                                }

                                const purchase =
                                  result.data?.find(
                                    (item) =>
                                      item.id ===
                                      entry.purchaseId,
                                  );

                                if (purchase) {
                                  setPurchaseToDelete(
                                    purchase,
                                  );
                                }
                              }}
                              disabled={
                                isDeleting ||
                                isDeletingConsumption ||
                                isDeletingWastage
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-muted shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Delete purchase"
                              title="Delete purchase"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : entry.type === "CONSUMPTION" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setConsumptionToDelete(entry);
                              }}
                              disabled={
                                isDeleting ||
                                isDeletingConsumption ||
                                isDeletingWastage
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-muted shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Delete consumption"
                              title="Delete consumption"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : entry.type === "WASTAGE" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setWastageToDelete(entry);
                              }}
                              disabled={
                                isDeleting ||
                                isDeletingConsumption ||
                                isDeletingWastage
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-muted shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Delete wastage"
                              title="Delete wastage"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>
        )}
      </DialogShell>

      {purchaseToDelete && (
        <DialogShell
          title="Delete Purchase?"
          description="This will remove the purchase and recalculate the material's inventory valuation."
          onClose={() => {
            if (!isDeleting) {
              setPurchaseToDelete(null);
            }
          }}
          maxWidth="max-w-md"
        >
          <div className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-xs font-semibold text-text-primary">
                {purchaseToDelete.quantity.toLocaleString(
                  "en-IN",
                )}{" "}
                {PURCHASE_UNIT_LABELS[
                  purchaseToDelete.purchaseUnit
                ]}
              </p>

              <p className="mt-1 text-xs text-text-secondary">
                {formatDate(purchaseToDelete.purchaseDate)}
                {" · "}
                {formatINR(purchaseToDelete.totalAmount)}
              </p>
            </div>

            <p className="text-xs leading-5 text-text-secondary">
              The purchase record and its linked inventory entry will be
              permanently removed. The material's stock, inventory value,
              and weighted-average cost will be recalculated from the
              remaining purchases.
            </p>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
                disabled={isDeleting}
                className="rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeletePurchase}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isDeleting
                  ? "Deleting..."
                  : "Delete Purchase"}
              </button>
            </div>
          </div>
        </DialogShell>
      )}

      {consumptionToDelete && (
        <DialogShell
          title="Delete Consumption?"
          description="This will remove the consumption movement and recalculate the material's inventory state."
          onClose={() => {
            if (!isDeletingConsumption) {
              setConsumptionToDelete(null);
            }
          }}
          maxWidth="max-w-md"
        >
          <div className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-xs font-semibold text-text-primary">
                {formatQuantity(
                  consumptionToDelete.quantity,
                  material.baseUnit,
                )}
              </p>

              <p className="mt-1 text-xs text-text-secondary">
                {formatDate(consumptionToDelete.createdAt)}
                {" · "}
                {formatINR(consumptionToDelete.totalValue)}
              </p>
            </div>

            <p className="text-xs leading-5 text-text-secondary">
              The consumption inventory entry will be permanently removed.
              Karya will recalculate the material's stock, inventory value,
              and weighted-average cost from the remaining inventory ledger.
            </p>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setConsumptionToDelete(null)}
                disabled={isDeletingConsumption}
                className="rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConsumption}
                disabled={isDeletingConsumption}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingConsumption && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isDeletingConsumption
                  ? "Deleting..."
                  : "Delete Consumption"}
              </button>
            </div>
          </div>
        </DialogShell>
      )}

      {wastageToDelete && (
        <DialogShell
          title="Delete Wastage?"
          description="This will remove the wastage movement and its linked material-wastage expense."
          onClose={() => {
            if (!isDeletingWastage) {
              setWastageToDelete(null);
            }
          }}
          maxWidth="max-w-md"
        >
          <div className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-xs font-semibold text-text-primary">
                {formatQuantity(
                  wastageToDelete.quantity,
                  material.baseUnit,
                )}
              </p>

              <p className="mt-1 text-xs text-text-secondary">
                {formatDate(wastageToDelete.createdAt)}
                {" · "}
                {formatINR(wastageToDelete.totalValue)}
              </p>

              {wastageToDelete.notes && (
                <p className="mt-1 text-[11px] text-text-muted">
                  {wastageToDelete.notes}
                </p>
              )}
            </div>

            <p className="text-xs leading-5 text-text-secondary">
              The wastage inventory entry and its linked
              material-wastage expense will be permanently
              removed. Karya will recalculate stock,
              inventory value, and weighted-average cost
              from the remaining inventory ledger.
            </p>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() =>
                  setWastageToDelete(null)
                }
                disabled={isDeletingWastage}
                className="rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteWastage}
                disabled={isDeletingWastage}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingWastage && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}

                {isDeletingWastage
                  ? "Deleting..."
                  : "Delete Wastage"}
              </button>
            </div>
          </div>
        </DialogShell>
      )}
    </>
  );
}
