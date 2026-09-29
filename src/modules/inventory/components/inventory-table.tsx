"use client";

import {
  AlertTriangle,
  CheckCircle,
  Gift,
  Package,
  PlusCircle,
  XCircle,
} from "lucide-react";

import { formatINR } from "@/lib/formatters";
import type { ProductStockSummary } from "@/modules/inventory/types";

interface InventoryTableProps {
  products: ProductStockSummary[];
  onOpenMovementModal: (productId: string) => void;
  onOpenPromotionalModal: (productId: string) => void;
}

export function InventoryTable({
  products,
  onOpenMovementModal,
  onOpenPromotionalModal,
}: InventoryTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted text-text-secondary">
          <Package className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-text-primary">
          No Products in Inventory
        </h3>

        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-text-secondary">
          Add products first, then record opening stock, production runs, or
          purchase restocks to begin tracking inventory.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
      <div className="border-b border-border bg-surface-muted/50 px-3 py-3 sm:px-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-text-primary">
            Stock by Offering
          </h2>

          <p className="text-xs text-text-secondary">
            Physical inventory, promotional allocation, and stock available
            for normal sales.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-muted/70 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              <th className="px-3 py-3">Offering</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Stock Health</th>

              <th className="px-3 py-3 text-right">
                Physical
              </th>

              <th className="px-3 py-3 text-right">
                Promotional
              </th>

              <th className="px-3 py-3 text-right">
                Available
              </th>

              <th className="px-3 py-3 text-right">
                Reorder Threshold
              </th>

              <th className="px-3 py-3 text-right">
                COGS
              </th>

              <th className="px-3 py-3 text-right">
                Stock Valuation
              </th>

              <th className="px-3 py-3 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/70">
            {products.map((product) => (
              <tr
                key={product.id}
                className="transition-colors hover:bg-surface-muted/50"
              >
                {/* Offering */}
                <td className="px-3 py-3">
                  <div className="min-w-[160px]">
                    <p className="font-semibold text-text-primary">
                      {product.name}
                    </p>

                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-text-muted">
                      {product.sku}
                    </p>
                  </div>
                </td>

                {/* Category */}
                <td className="px-3 py-3">
                  <span className="text-text-secondary">
                    {product.category}
                  </span>
                </td>

                {/* Stock Health */}
                <td className="px-3 py-3">
                  {getStockBadge(product.stockStatus)}
                </td>

                {/* Physical Stock */}
                <td className="px-3 py-3 text-right">
                  <span className="font-semibold text-text-primary">
                    {product.currentStock}
                  </span>

                  <span className="ml-1 text-[10px] text-text-muted">
                    units
                  </span>
                </td>

                {/* Promotional Stock */}
                <td className="px-3 py-3 text-right">
                  {product.promotionalStock > 0 ? (
                    <span className="font-semibold text-violet-700">
                      {product.promotionalStock}
                    </span>
                  ) : (
                    <span className="text-text-muted">
                      0
                    </span>
                  )}

                  <span className="ml-1 text-[10px] text-text-muted">
                    units
                  </span>
                </td>

                {/* Available Stock */}
                <td className="px-3 py-3 text-right">
                  <span
                    className={
                      product.availableStock <= 0
                        ? "font-semibold text-red-600"
                        : "font-semibold text-emerald-700"
                    }
                  >
                    {product.availableStock}
                  </span>

                  <span className="ml-1 text-[10px] text-text-muted">
                    units
                  </span>
                </td>

                {/* Reorder Threshold */}
                <td className="px-3 py-3 text-right text-text-secondary">
                  {product.reorderLevel}
                </td>

                {/* COGS */}
                <td className="px-3 py-3 text-right font-medium text-text-secondary">
                  {product.cogs !== null ? (
                    formatINR(product.cogs)
                  ) : (
                    <span className="font-normal italic text-text-muted">
                      Not recorded
                    </span>
                  )}
                </td>

                {/* Stock Valuation */}
                <td className="px-3 py-3 text-right font-semibold text-text-primary">
                  {product.valuation !== null ? (
                    formatINR(product.valuation)
                  ) : (
                    <span className="font-normal italic text-text-muted">
                      Not recorded
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-3">
                  <div className="flex min-w-[150px] flex-col items-stretch gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenMovementModal(product.id)
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-surface-raised px-2.5 py-2 text-[11px] font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
                      Move Stock
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onOpenPromotionalModal(product.id)
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-50/60 px-2.5 py-2 text-[11px] font-semibold text-violet-800 shadow-sm transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      Promo Stock
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stock terminology */}
      <div className="border-t border-border bg-surface-muted/40 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] leading-4 text-text-secondary">
          <span>
            <strong className="font-semibold text-text-secondary">
              Physical
            </strong>{" "}
            = all units physically held
          </span>

          <span>
            <strong className="font-semibold text-violet-700">
              Promotional
            </strong>{" "}
            = units reserved for promotions
          </span>

          <span>
            <strong className="font-semibold text-emerald-700">
              Available
            </strong>{" "}
            = physical stock available for normal sales
          </span>
        </div>
      </div>
    </div>
  );
}

function getStockBadge(
  status: ProductStockSummary["stockStatus"],
) {
  switch (status) {
    case "OUT_OF_STOCK":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
          <XCircle className="h-3 w-3 text-red-600" />
          Out of Stock
        </span>
      );

    case "LOW_STOCK":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          Low Stock
        </span>
      );

    case "HEALTHY":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          <CheckCircle className="h-3 w-3 text-emerald-600" />
          Healthy
        </span>
      );
  }
}