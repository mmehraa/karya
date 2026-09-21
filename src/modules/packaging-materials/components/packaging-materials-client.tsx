"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  Boxes,
  History,
  Loader2,
  MinusCircle,
  PackagePlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { formatDate, formatINR } from "@/lib/formatters";

import {
  createPackagingMaterialAction,
  deletePackagingMaterialConsumptionAction,
  deletePackagingMaterialPurchaseAction,
  getPackagingMaterialInventoryHistoryAction,
  getPackagingMaterialPurchasesAction,
  recordPackagingMaterialConsumptionAction,
  recordPackagingMaterialPurchaseAction,
} from "@/modules/packaging-materials/actions";

import {
  CreatePackagingMaterialSchema,
  RecordPackagingMaterialConsumptionSchema,
  RecordPackagingMaterialPurchaseSchema,
} from "@/modules/packaging-materials/validation";

import type {
  SerializedPackagingMaterial,
  SerializedPackagingMaterialInventoryTransaction,
  SerializedPackagingMaterialPurchase,
} from "@/modules/packaging-materials/types";

interface PackagingMaterialsClientProps {
  initialMaterials: SerializedPackagingMaterial[];
}

type PurchaseUnit =
  | "PIECE"
  | "PACK"
  | "BOX"
  | "BUNDLE"
  | "CARTON";

const PURCHASE_UNIT_LABELS: Record<
  PurchaseUnit,
  string
> = {
  PIECE: "pieces",
  PACK: "packs",
  BOX: "boxes",
  BUNDLE: "bundles",
  CARTON: "cartons",
};

function formatQuantity(value: number): string {
  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(value)} pcs`;
}

function formatUnitCost(value: number): string {
  return formatINR(value);
}

export function PackagingMaterialsClient({
  initialMaterials,
}: PackagingMaterialsClientProps) {
  const router = useRouter();

  const [
    isMaterialDialogOpen,
    setIsMaterialDialogOpen,
  ] = useState(false);

  const [purchaseMaterial, setPurchaseMaterial] =
    useState<SerializedPackagingMaterial | null>(
      null,
    );

  const [
    consumptionMaterial,
    setConsumptionMaterial,
  ] =
    useState<SerializedPackagingMaterial | null>(
      null,
    );

  const [historyMaterial, setHistoryMaterial] =
    useState<SerializedPackagingMaterial | null>(
      null,
    );

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
          label="Packaging materials"
          value={initialMaterials.length.toString()}
          description="Registered materials"
          icon={Boxes}
        />

        <SummaryCard
          label="Materials in stock"
          value={materialsWithStock.toString()}
          description="With available inventory"
          icon={PackagePlus}
        />

        <SummaryCard
          label="Inventory value"
          value={formatINR(totalInventoryValue)}
          description="Current packaging value"
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-950">
                Packaging-material inventory
              </h2>

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {initialMaterials.length}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Purchases update inventory value and weighted-average cost
              automatically.
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
            Add Packaging Material
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
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Material
                  </th>

                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Supplier
                  </th>

                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Current Stock
                  </th>

                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Avg. Cost
                  </th>

                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Inventory Value
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {initialMaterials.map(
                  (material) => (
                    <tr
                      key={material.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {material.name}
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            {material.category && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                {material.category}
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400">
                              Base: pieces
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-600">
                        {material.supplier ||
                          "Not recorded"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatQuantity(
                            material.currentQuantity,
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatUnitCost(
                            material.weightedAverageCost,
                          )}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          per piece
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="text-sm font-semibold text-slate-900">
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
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
                            disabled={
                              material.currentQuantity <=
                              0
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <MinusCircle className="h-3.5 w-3.5" />
                            Consume
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
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          ADD MATERIAL
      ===================================================== */}

      <AddPackagingMaterialDialog
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
          PURCHASE
      ===================================================== */}

      {purchaseMaterial && (
        <PurchasePackagingMaterialDialog
          material={purchaseMaterial}
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
          CONSUMPTION
      ===================================================== */}

      {consumptionMaterial && (
        <ConsumePackagingMaterialDialog
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
          HISTORY
      ===================================================== */}

      {historyMaterial && (
        <PackagingMaterialHistoryDialog
          material={historyMaterial}
          onClose={() =>
            setHistoryMaterial(null)
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Boxes;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {value}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <Boxes className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        No packaging materials yet
      </h3>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
        Add packaging such as boxes, pouches,
        flash cards, wrapping sheets, labels,
        and other packaging components.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Packaging Material
      </button>
    </div>
  );
}

/* =========================================================
   DIALOG SHELL
========================================================= */

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
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`my-8 w-full ${maxWidth} rounded-xl border border-slate-200 bg-white p-6 shadow-xl`}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              {title}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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

/* =========================================================
   ADD PACKAGING MATERIAL
========================================================= */

function AddPackagingMaterialDialog({
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
  const [name, setName] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [supplier, setSupplier] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("");
      setSupplier("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError(null);

    const parsed =
      CreatePackagingMaterialSchema.safeParse(
        {
          name,
          category:
            category.trim() === ""
              ? null
              : category,
          baseUnit: "PIECE",
          supplier:
            supplier.trim() === ""
              ? null
              : supplier,
          notes:
            notes.trim() === ""
              ? null
              : notes,
        },
      );

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          "Please check the form.",
      );
      return;
    }

    startTransition(async () => {
      const result =
        await createPackagingMaterialAction(
          parsed.data,
        );

      if (!result.success) {
        setError(
          result.error ??
            "Failed to create packaging material.",
        );
        return;
      }

      onSuccess();
    });
  };

  return (
    <DialogShell
      title="Add Packaging Material"
      description="Register packaging before recording purchases."
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <ErrorBox message={error} />
        )}

        <div className="space-y-1">
          <label
            htmlFor="packaging-material-name"
            className="block text-xs font-semibold text-slate-700"
          >
            Material Name *
          </label>

          <input
            id="packaging-material-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. Tamper-Proof Pouch"
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="packaging-material-category"
            className="block text-xs font-semibold text-slate-700"
          >
            Category
          </label>

          <input
            id="packaging-material-category"
            type="text"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            placeholder="e.g. Pouches, Boxes, Printing"
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="packaging-material-supplier"
            className="block text-xs font-semibold text-slate-700"
          >
            Supplier
          </label>

          <input
            id="packaging-material-supplier"
            type="text"
            value={supplier}
            onChange={(event) =>
              setSupplier(event.target.value)
            }
            placeholder="e.g. ABC Packaging"
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Base unit
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            Piece
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Karya stores packaging inventory in individual
            pieces. You can purchase by pack, box, bundle,
            or carton.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="packaging-material-notes"
            className="block text-xs font-semibold text-slate-700"
          >
            Notes
          </label>

          <textarea
            id="packaging-material-notes"
            rows={3}
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Optional notes..."
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              isPending ||
              name.trim().length < 2
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}

            {isPending
              ? "Adding..."
              : "Add Material"}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

/* =========================================================
   PURCHASE
========================================================= */

function PurchasePackagingMaterialDialog({
  material,
  onClose,
  isPending,
  startTransition,
  onSuccess,
}: {
  material: SerializedPackagingMaterial;
  onClose: () => void;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  onSuccess: () => void;
}) {
  const [purchaseDate, setPurchaseDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10),
    );

  const [quantity, setQuantity] =
    useState("");

  const [purchaseUnit, setPurchaseUnit] =
    useState<PurchaseUnit>("PIECE");

  const [
    unitsPerPurchaseUnit,
    setUnitsPerPurchaseUnit,
  ] = useState("1");

  const [totalAmount, setTotalAmount] =
    useState("");

  const [supplier, setSupplier] =
    useState(material.supplier ?? "");

  const [invoiceReference, setInvoiceReference] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const parsedQuantity =
    Number(quantity);

  const parsedUnitsPerPurchaseUnit =
    Number(unitsPerPurchaseUnit);

  const parsedAmount =
    Number(totalAmount);

  const totalPieces =
    Number.isFinite(
      parsedQuantity,
    ) &&
    parsedQuantity > 0 &&
    Number.isFinite(
      parsedUnitsPerPurchaseUnit,
    ) &&
    parsedUnitsPerPurchaseUnit > 0
      ? parsedQuantity *
        parsedUnitsPerPurchaseUnit
      : 0;

  const calculatedCostPerPiece =
    totalPieces > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0
      ? parsedAmount / totalPieces
      : 0;

  const handleSubmit = (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError(null);

    const parsed =
      RecordPackagingMaterialPurchaseSchema.safeParse(
        {
          packagingMaterialId:
            material.id,
          purchaseDate,
          quantity,
          purchaseUnit,
          unitsPerPurchaseUnit,
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
        parsed.error.issues[0]?.message ??
          "Please check the purchase details.",
      );
      return;
    }

    startTransition(async () => {
      const result =
        await recordPackagingMaterialPurchaseAction(
          parsed.data,
        );

      if (!result.success) {
        setError(
          result.error ??
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
      description="Record the quantity purchased and Karya will calculate the cost per piece."
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <ErrorBox message={error} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Purchase Date"
            htmlFor="packaging-purchase-date"
          >
            <input
              id="packaging-purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(event) =>
                setPurchaseDate(
                  event.target.value,
                )
              }
              disabled={isPending}
              className={inputClass}
            />
          </Field>

          <Field
            label="Purchase Unit"
            htmlFor="packaging-purchase-unit"
          >
            <select
              id="packaging-purchase-unit"
              value={purchaseUnit}
              onChange={(event) => {
                const nextUnit =
                  event.target.value as PurchaseUnit;

                setPurchaseUnit(
                  nextUnit,
                );

                if (
                  nextUnit === "PIECE"
                ) {
                  setUnitsPerPurchaseUnit(
                    "1",
                  );
                }
              }}
              disabled={isPending}
              className={inputClass}
            >
              {Object.entries(
                PURCHASE_UNIT_LABELS,
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ),
              )}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Quantity Purchased"
            htmlFor="packaging-purchase-quantity"
          >
            <input
              id="packaging-purchase-quantity"
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  event.target.value,
                )
              }
              placeholder="e.g. 5"
              disabled={isPending}
              className={inputClass}
            />
          </Field>

          <Field
            label={`Pieces per ${PURCHASE_UNIT_LABELS[purchaseUnit].replace(/s$/, "")}`}
            htmlFor="packaging-units-per-purchase-unit"
          >
            <input
              id="packaging-units-per-purchase-unit"
              type="number"
              min="0"
              step="0.001"
              value={
                unitsPerPurchaseUnit
              }
              onChange={(event) =>
                setUnitsPerPurchaseUnit(
                  event.target.value,
                )
              }
              disabled={
                isPending ||
                purchaseUnit ===
                  "PIECE"
              }
              className={inputClass}
            />
          </Field>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Total pieces received
              </p>

              <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                {totalPieces > 0
                  ? formatQuantity(
                      totalPieces,
                    )
                  : "—"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Cost per piece
              </p>

              <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-emerald-700">
                {calculatedCostPerPiece >
                0
                  ? formatINR(
                      calculatedCostPerPiece,
                    )
                  : "—"}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            Example: 5 boxes × 100 pieces per box =
            500 pieces. A ₹2,500 purchase would produce
            a ₹5.00 cost per piece.
          </p>
        </div>

        <Field
          label="Total Purchase Amount"
          htmlFor="packaging-purchase-amount"
        >
          <input
            id="packaging-purchase-amount"
            type="number"
            min="0"
            step="0.01"
            value={totalAmount}
            onChange={(event) =>
              setTotalAmount(
                event.target.value,
              )
            }
            placeholder="e.g. 2500"
            disabled={isPending}
            className={inputClass}
          />
        </Field>

        <Field
          label="Supplier"
          htmlFor="packaging-purchase-supplier"
        >
          <input
            id="packaging-purchase-supplier"
            type="text"
            value={supplier}
            onChange={(event) =>
              setSupplier(
                event.target.value,
              )
            }
            placeholder="Optional supplier"
            disabled={isPending}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Invoice Reference"
            htmlFor="packaging-purchase-invoice"
          >
            <input
              id="packaging-purchase-invoice"
              type="text"
              value={invoiceReference}
              onChange={(event) =>
                setInvoiceReference(
                  event.target.value,
                )
              }
              placeholder="Optional"
              disabled={isPending}
              className={inputClass}
            />
          </Field>

          <Field
            label="Notes"
            htmlFor="packaging-purchase-notes"
          >
            <input
              id="packaging-purchase-notes"
              type="text"
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              placeholder="Optional"
              disabled={isPending}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={secondaryButtonClass}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              isPending ||
              totalPieces <= 0 ||
              parsedAmount <= 0
            }
            className={primaryButtonClass}
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

/* =========================================================
   CONSUMPTION
========================================================= */

function ConsumePackagingMaterialDialog({
  material,
  onClose,
  onSuccess,
}: {
  material: SerializedPackagingMaterial;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [quantity, setQuantity] =
    useState("");

  const [referenceId, setReferenceId] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [isPending, startTransition] =
    useTransition();

  const parsedQuantity =
    Number(quantity);

  const hasValidQuantity =
    Number.isFinite(
      parsedQuantity,
    ) &&
    parsedQuantity > 0;

  const exceedsStock =
    hasValidQuantity &&
    parsedQuantity >
      material.currentQuantity;

  const estimatedCost =
    hasValidQuantity &&
    !exceedsStock
      ? parsedQuantity *
        material.weightedAverageCost
      : 0;

  const handleSubmit = (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError(null);

    const parsed =
      RecordPackagingMaterialConsumptionSchema.safeParse(
        {
          packagingMaterialId:
            material.id,
          quantity,
          referenceId:
            referenceId.trim() === ""
              ? null
              : referenceId,
          notes:
            notes.trim() === ""
              ? null
              : notes,
        },
      );

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          "Please check the consumption details.",
      );
      return;
    }

    startTransition(async () => {
      const result =
        await recordPackagingMaterialConsumptionAction(
          parsed.data,
        );

      if (!result.success) {
        setError(
          result.error ??
            "Failed to record consumption.",
        );
        return;
      }

      onSuccess();
    });
  };

  return (
    <DialogShell
      title={`Consume — ${material.name}`}
      description="Record packaging used by production or another business activity."
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <ErrorBox message={error} />
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className={mutedLabelClass}>
                Available stock
              </p>

              <p className="mt-1 text-lg font-semibold text-slate-950">
                {formatQuantity(
                  material.currentQuantity,
                )}
              </p>
            </div>

            <div>
              <p className={mutedLabelClass}>
                Avg. cost
              </p>

              <p className="mt-1 text-lg font-semibold text-slate-950">
                {formatINR(
                  material.weightedAverageCost,
                )}
              </p>
            </div>

            <div>
              <p className={mutedLabelClass}>
                Current value
              </p>

              <p className="mt-1 text-lg font-semibold text-slate-950">
                {formatINR(
                  material.currentValue,
                )}
              </p>
            </div>
          </div>
        </div>

        <Field
          label="Quantity Consumed"
          htmlFor="packaging-consumption-quantity"
        >
          <input
            id="packaging-consumption-quantity"
            type="number"
            min="0"
            step="0.001"
            value={quantity}
            onChange={(event) =>
              setQuantity(
                event.target.value,
              )
            }
            placeholder="e.g. 20"
            disabled={isPending}
            className={`${inputClass} ${
              exceedsStock
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />

          {exceedsStock && (
            <p className="mt-1 text-[11px] text-red-600">
              Quantity exceeds available stock.
            </p>
          )}
        </Field>

        {estimatedCost > 0 &&
          !exceedsStock && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Estimated inventory cost
              </p>

              <p className="mt-1 text-lg font-semibold text-emerald-900">
                {formatINR(
                  estimatedCost,
                )}
              </p>

              <p className="mt-1 text-[11px] text-emerald-700">
                Based on the current weighted-average cost.
              </p>
            </div>
          )}

        <Field
          label="Reference"
          htmlFor="packaging-consumption-reference"
        >
          <input
            id="packaging-consumption-reference"
            type="text"
            value={referenceId}
            onChange={(event) =>
              setReferenceId(
                event.target.value,
              )
            }
            placeholder="e.g. Production Batch #1"
            disabled={isPending}
            className={inputClass}
          />
        </Field>

        <Field
          label="Notes"
          htmlFor="packaging-consumption-notes"
        >
          <textarea
            id="packaging-consumption-notes"
            rows={2}
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            placeholder="Optional consumption notes..."
            disabled={isPending}
            className={inputClass}
          />
        </Field>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={secondaryButtonClass}
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
            className={primaryButtonClass}
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

/* =========================================================
   HISTORY
========================================================= */

function PackagingMaterialHistoryDialog({
  material,
  onClose,
}: {
  material: SerializedPackagingMaterial;
  onClose: () => void;
}) {
  const router = useRouter();

  const [history, setHistory] =
    useState<
      SerializedPackagingMaterialInventoryTransaction[]
    >([]);

  const [purchases, setPurchases] =
    useState<
      SerializedPackagingMaterialPurchase[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    purchaseToDelete,
    setPurchaseToDelete,
  ] =
    useState<
      SerializedPackagingMaterialPurchase | null
    >(null);

  const [
    consumptionToDelete,
    setConsumptionToDelete,
  ] =
    useState<
      SerializedPackagingMaterialInventoryTransaction | null
    >(null);

  const [isDeleting, startDeleteTransition] =
    useTransition();

  const [
    isDeletingConsumption,
    startDeleteConsumptionTransition,
  ] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      const [
        historyResult,
        purchasesResult,
      ] = await Promise.all([
        getPackagingMaterialInventoryHistoryAction(
          {
            id: material.id,
          },
        ),
        getPackagingMaterialPurchasesAction({
          id: material.id,
        }),
      ]);

      if (cancelled) {
        return;
      }

      if (!historyResult.success) {
        setError(
          historyResult.error ??
            "Failed to load inventory history.",
        );
        setLoading(false);
        return;
      }

      if (!purchasesResult.success) {
        setError(
          purchasesResult.error ??
            "Failed to load purchases.",
        );
        setLoading(false);
        return;
      }

      setHistory(
        (historyResult.data ??
          []) as SerializedPackagingMaterialInventoryTransaction[],
      );

      setPurchases(
        (purchasesResult.data ??
          []) as SerializedPackagingMaterialPurchase[],
      );

      setLoading(false);
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [material.id]);

  const purchaseById = useMemo(() => {
    const map = new Map<
      string,
      SerializedPackagingMaterialPurchase
    >();

    for (const purchase of purchases) {
      map.set(
        purchase.id,
        purchase,
      );
    }

    return map;
  }, [purchases]);

  const handleDeletePurchase = () => {
    if (!purchaseToDelete) {
      return;
    }

    setError(null);

    startDeleteTransition(async () => {
      const result =
        await deletePackagingMaterialPurchaseAction(
          {
            id: purchaseToDelete.id,
          },
        );

      if (!result.success) {
        setError(
          result.error ??
            "Failed to delete purchase.",
        );
        return;
      }

      setPurchaseToDelete(null);
      router.refresh();

      const nextPurchases =
        purchases.filter(
          (purchase) =>
            purchase.id !==
            purchaseToDelete.id,
        );

      setPurchases(
        nextPurchases,
      );

      setHistory((current) =>
        current.filter(
          (entry) =>
            entry.purchaseId !==
            purchaseToDelete.id,
        ),
      );
    });
  };

  const handleDeleteConsumption = () => {
    if (!consumptionToDelete) {
      return;
    }

    setError(null);

    startDeleteConsumptionTransition(
      async () => {
        const result =
          await deletePackagingMaterialConsumptionAction(
            {
              id: consumptionToDelete.id,
            },
          );

        if (!result.success) {
          setError(
            result.error ??
              "Failed to delete consumption.",
          );
          return;
        }

        setConsumptionToDelete(
          null,
        );

        router.refresh();

        setHistory((current) =>
          current.filter(
            (entry) =>
              entry.id !==
              consumptionToDelete.id,
          ),
        );
      },
    );
  };

  const typeLabel = (
    type: SerializedPackagingMaterialInventoryTransaction["type"],
  ) => {
    if (type === "PURCHASE") {
      return "Purchase";
    }

    if (type === "CONSUMPTION") {
      return "Consumption";
    }

    if (type === "ADJUSTMENT_IN") {
      return "Adjustment In";
    }

    return "Adjustment Out";
  };

  const typeClasses = (
    type: SerializedPackagingMaterialInventoryTransaction["type"],
  ) => {
    if (type === "PURCHASE") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (type === "CONSUMPTION") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-600";
  };

  return (
    <>
      <DialogShell
        title={`Inventory History — ${material.name}`}
        description="Every packaging inventory movement remains available for costing and audit history."
        onClose={onClose}
        maxWidth="max-w-5xl"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <ErrorBox message={error} />
        ) : history.length === 0 ? (
          <div className="py-12 text-center">
            <History className="mx-auto h-6 w-6 text-slate-300" />

            <p className="mt-3 text-sm font-semibold text-slate-800">
              No inventory movements recorded
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Purchases and packaging consumption will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] table-fixed">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Type
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Quantity
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Unit Cost
                    </th>

                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Value
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Reference
                    </th>

                    <th className="w-12 px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      <span className="sr-only">
                        Actions
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {history.map(
                    (entry) => {
                      const purchase =
                        entry.purchaseId
                          ? purchaseById.get(
                              entry.purchaseId,
                            )
                          : undefined;

                      const isPurchase =
                        entry.type ===
                        "PURCHASE";

                      const isOutgoing =
                        entry.type ===
                          "CONSUMPTION" ||
                        entry.type ===
                          "ADJUSTMENT_OUT";

                      const quantityLabel =
                        isPurchase &&
                        purchase
                          ? `${new Intl.NumberFormat(
                              "en-IN",
                              {
                                maximumFractionDigits: 3,
                              },
                            ).format(
                              purchase.quantity,
                            )} ${
                              PURCHASE_UNIT_LABELS[
                                purchase.purchaseUnit
                              ]
                            }`
                          : formatQuantity(
                              entry.quantity,
                            );

                      const signedValue =
                        isOutgoing
                          ? -entry.totalValue
                          : entry.totalValue;

                      return (
                        <tr
                          key={entry.id}
                        >
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {formatDate(
                              isPurchase &&
                                purchase
                                ? purchase.purchaseDate
                                : entry.createdAt,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${typeClasses(
                                entry.type,
                              )}`}
                            >
                              {typeLabel(
                                entry.type,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right text-xs font-medium text-slate-800">
                            {isOutgoing
                              ? "−"
                              : ""}
                            {quantityLabel}
                          </td>

                          <td className="px-4 py-3 text-right text-xs font-semibold text-slate-800">
                            {formatINR(
                              entry.unitCost,
                            )}
                          </td>

                          <td
                            className={`px-4 py-3 text-right text-xs font-semibold ${
                              signedValue <
                              0
                                ? "text-red-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {signedValue <
                            0
                              ? "−"
                              : "+"}

                            {formatINR(
                              Math.abs(
                                signedValue,
                              ),
                            )}
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-600">
                            {entry.referenceId ||
                              entry.notes ||
                              purchase?.invoiceReference ||
                              "—"}
                          </td>

                          <td className="px-3 py-3 text-right">
                            {isPurchase &&
                            purchase ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPurchaseToDelete(
                                    purchase,
                                  )
                                }
                                disabled={
                                  isDeleting ||
                                  isDeletingConsumption
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Delete purchase"
                                title="Delete purchase"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : entry.type ===
                              "CONSUMPTION" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setError(
                                    null,
                                  );

                                  setConsumptionToDelete(
                                    entry,
                                  );
                                }}
                                disabled={
                                  isDeleting ||
                                  isDeletingConsumption
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Delete consumption"
                                title="Delete consumption"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogShell>

      {/* ===================================================
          DELETE PURCHASE
      =================================================== */}

      {purchaseToDelete && (
        <DialogShell
          title="Delete Purchase?"
          description="This will remove the purchase and recalculate the packaging material's inventory valuation."
          onClose={() => {
            if (!isDeleting) {
              setPurchaseToDelete(
                null,
              );
            }
          }}
          maxWidth="max-w-md"
        >
          <div className="space-y-5">
            {error && (
              <ErrorBox
                message={error}
              />
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-900">
                {purchaseToDelete.quantity.toLocaleString(
                  "en-IN",
                )}{" "}
                {
                  PURCHASE_UNIT_LABELS[
                    purchaseToDelete
                      .purchaseUnit
                  ]
                }
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatDate(
                  purchaseToDelete.purchaseDate,
                )}
                {" · "}
                {formatINR(
                  purchaseToDelete.totalAmount,
                )}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {formatQuantity(
                  purchaseToDelete.baseQuantity,
                )} received
              </p>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              The purchase record and linked inventory
              entry will be permanently removed. Karya
              will recalculate stock, inventory value,
              and weighted-average cost from the
              remaining inventory ledger.
            </p>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() =>
                  setPurchaseToDelete(
                    null,
                  )
                }
                disabled={isDeleting}
                className={secondaryButtonClass}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeletePurchase
                }
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

      {/* ===================================================
          DELETE CONSUMPTION
      =================================================== */}

      {consumptionToDelete && (
        <DialogShell
          title="Delete Consumption?"
          description="This will remove the consumption movement and recalculate the material's inventory state."
          onClose={() => {
            if (
              !isDeletingConsumption
            ) {
              setConsumptionToDelete(
                null,
              );
            }
          }}
          maxWidth="max-w-md"
        >
          <div className="space-y-5">
            {error && (
              <ErrorBox
                message={error}
              />
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-900">
                {formatQuantity(
                  consumptionToDelete.quantity,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatDate(
                  consumptionToDelete.createdAt,
                )}
                {" · "}
                {formatINR(
                  consumptionToDelete.totalValue,
                )}
              </p>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              The consumption inventory entry will be
              permanently removed. Karya will recalculate
              stock, inventory value, and weighted-average
              cost from the remaining inventory ledger.
            </p>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() =>
                  setConsumptionToDelete(
                    null,
                  )
                }
                disabled={
                  isDeletingConsumption
                }
                className={secondaryButtonClass}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteConsumption
                }
                disabled={
                  isDeletingConsumption
                }
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
    </>
  );
}

/* =========================================================
   SHARED UI HELPERS
========================================================= */

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-50 disabled:text-slate-400";

const primaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50";

const mutedLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-slate-700"
      >
        {label}
      </label>

      {children}
    </div>
  );
}

function ErrorBox({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}