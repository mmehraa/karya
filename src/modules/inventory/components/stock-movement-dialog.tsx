"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryTransactionType } from "@prisma/client";
import { X, PackagePlus } from "lucide-react";
import { recordStockMovementAction } from "@/modules/inventory/actions";
import type { ProductStockSummary } from "@/modules/inventory/types";

interface StockMovementDialogProps {
  open: boolean;
  onClose: () => void;
  products: ProductStockSummary[];
}

type MovementType = InventoryTransactionType;

const movementOptions: Array<{
  value: MovementType;
  label: string;
  description: string;
}> = [
  {
    value: "INITIAL_STOCK",
    label: "Initial Stock",
    description: "Adds opening inventory.",
  },
  {
    value: "PRODUCTION_RUN",
    label: "Production Run",
    description: "Adds units produced.",
  },
  {
    value: "PURCHASE_RESTOCK",
    label: "Purchase Restock",
    description: "Adds inventory purchased from a supplier.",
  },
  {
    value: "RETURN_RESTOCK",
    label: "Return Restock",
    description: "Adds units returned to available inventory.",
  },
  {
    value: "SALE",
    label: "Direct Sale",
    description: "Deducts units sold.",
  },
  {
    value: "DAMAGED_WRITE_OFF",
    label: "Damaged Write-off",
    description: "Deducts units that are no longer sellable.",
  },
  {
    value: "MANUAL_AUDIT",
    label: "Manual Audit",
    description: "Adjusts stock to reconcile a physical count.",
  },
];

export function StockMovementDialog({
  open,
  onClose,
  products,
}: StockMovementDialogProps) {
  const router = useRouter();

  const [productId, setProductId] = useState("");
  const [type, setType] = useState<MovementType>("PURCHASE_RESTOCK");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [auditDirection, setAuditDirection] = useState<
    "INCREASE" | "DECREASE"
  >("INCREASE");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [products, productId]
  );

  const isAudit = type === "MANUAL_AUDIT";

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);

    if (!productId && products.length > 0) {
      setProductId(products[0].id);
    }
  }, [open, productId, products]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuantity("");
    setUnitCost("");
    setReferenceId("");
    setNotes("");
    setAuditDirection("INCREASE");
    setError(null);
  }, [open, type]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isSubmitting, onClose]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);

    if (!productId) {
      setError("Select an offering.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    const parsedUnitCost =
      unitCost.trim() === "" ? undefined : Number(unitCost);

    if (
      parsedUnitCost !== undefined &&
      (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0)
    ) {
      setError("Unit cost must be a valid non-negative number.");
      return;
    }

    if (isAudit && selectedProduct) {
      const resultingStock =
        auditDirection === "INCREASE"
          ? selectedProduct.currentStock + parsedQuantity
          : selectedProduct.currentStock - parsedQuantity;

      if (resultingStock < 0) {
        setError(
          `This adjustment would reduce stock below zero. Current stock is ${selectedProduct.currentStock}.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    const result = await recordStockMovementAction({
      productId,
      type,
      quantity: parsedQuantity,
      unitCost: parsedUnitCost,
      auditDirection: isAudit ? auditDirection : undefined,
      referenceId: referenceId.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Unable to record inventory movement.");
      return;
    }

    router.refresh();
    onClose();
  };

  const selectedOption = movementOptions.find(
    (option) => option.value === type
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-movement-dialog-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <PackagePlus className="h-5 w-5" />
            </div>

            <div>
              <h2
                id="stock-movement-dialog-title"
                className="text-base font-semibold text-slate-900"
              >
                Record Stock Movement
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Every movement creates an inventory ledger entry and updates
                the current stock balance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            {/* Product */}
            <div>
              <label
                htmlFor="inventory-product"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Offering
              </label>

              <select
                id="inventory-product"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.sku} — Current stock:{" "}
                    {product.currentStock}
                  </option>
                ))}
              </select>
            </div>

            {/* Movement Type */}
            <div>
              <label
                htmlFor="inventory-movement-type"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Event Type
              </label>

              <select
                id="inventory-movement-type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as MovementType)
                }
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              >
                {movementOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <p className="mt-1.5 text-[11px] text-slate-500">
                {selectedOption?.description}
              </p>
            </div>

            {/* Audit Direction */}
            {isAudit && (
              <div>
                <label
                  htmlFor="inventory-audit-direction"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Audit Direction
                </label>

                <select
                  id="inventory-audit-direction"
                  value={auditDirection}
                  onChange={(event) =>
                    setAuditDirection(
                      event.target.value as "INCREASE" | "DECREASE"
                    )
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                >
                  <option value="INCREASE">Increase Stock</option>
                  <option value="DECREASE">Decrease Stock</option>
                </select>

                {selectedProduct && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Current stock:{" "}
                    <span className="font-semibold text-slate-700">
                      {selectedProduct.currentStock}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Quantity + Unit Cost */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="inventory-quantity"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Quantity
                </label>

                <input
                  id="inventory-quantity"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 25"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label
                  htmlFor="inventory-unit-cost"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Unit Cost
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="inventory-unit-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 150.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Reference */}
            <div>
              <label
                htmlFor="inventory-reference"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Reference / Batch
                <span className="ml-1 font-normal text-slate-400">
                  (optional)
                </span>
              </label>

              <input
                id="inventory-reference"
                type="text"
                maxLength={255}
                value={referenceId}
                onChange={(event) => setReferenceId(event.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. PO-001 or BATCH-2026-01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              />
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="inventory-notes"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Notes
                <span className="ml-1 font-normal text-slate-400">
                  (optional)
                </span>
              </label>

              <textarea
                id="inventory-notes"
                maxLength={500}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isSubmitting}
                placeholder="Add any relevant operational context..."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
              >
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || products.length === 0}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Recording..." : "Record Movement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}