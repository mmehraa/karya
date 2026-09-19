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
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Package className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-900">
          No Products in Inventory
        </h3>

        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
          Add products first, then record opening stock, production runs, or
          purchase restocks to begin tracking inventory.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-slate-900">
            Stock by Offering
          </h2>

          <p className="text-xs text-slate-500">
            Physical inventory, promotional allocation, and stock available
            for normal sales.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1260px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600">
              <th className="px-4 py-3.5">Offering</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Stock Health</th>

              <th className="px-4 py-3.5 text-right">
                Physical
              </th>

              <th className="px-4 py-3.5 text-right">
                Promotional
              </th>

              <th className="px-4 py-3.5 text-right">
                Available
              </th>

              <th className="px-4 py-3.5 text-right">
                Reorder Threshold
              </th>

              <th className="px-4 py-3.5 text-right">
                COGS
              </th>

              <th className="px-4 py-3.5 text-right">
                Stock Valuation
              </th>

              <th className="px-4 py-3.5 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr
                key={product.id}
                className="transition-colors hover:bg-slate-50/60"
              >
                {/* Offering */}
                <td className="px-4 py-4">
                  <div className="min-w-[190px]">
                    <p className="font-semibold text-slate-900">
                      {product.name}
                    </p>

                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-400">
                      {product.sku}
                    </p>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-4">
                  <span className="text-slate-600">
                    {product.category}
                  </span>
                </td>

                {/* Stock Health */}
                <td className="px-4 py-4">
                  {getStockBadge(product.stockStatus)}
                </td>

                {/* Physical Stock */}
                <td className="px-4 py-4 text-right">
                  <span className="font-semibold text-slate-900">
                    {product.currentStock}
                  </span>

                  <span className="ml-1 text-[10px] text-slate-400">
                    units
                  </span>
                </td>

                {/* Promotional Stock */}
                <td className="px-4 py-4 text-right">
                  {product.promotionalStock > 0 ? (
                    <span className="font-semibold text-violet-700">
                      {product.promotionalStock}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      0
                    </span>
                  )}

                  <span className="ml-1 text-[10px] text-slate-400">
                    units
                  </span>
                </td>

                {/* Available Stock */}
                <td className="px-4 py-4 text-right">
                  <span
                    className={
                      product.availableStock <= 0
                        ? "font-semibold text-red-600"
                        : "font-semibold text-emerald-700"
                    }
                  >
                    {product.availableStock}
                  </span>

                  <span className="ml-1 text-[10px] text-slate-400">
                    units
                  </span>
                </td>

                {/* Reorder Threshold */}
                <td className="px-4 py-4 text-right text-slate-600">
                  {product.reorderLevel}
                </td>

                {/* COGS */}
                <td className="px-4 py-4 text-right font-medium text-slate-700">
                  {product.cogs !== null ? (
                    formatINR(product.cogs)
                  ) : (
                    <span className="font-normal italic text-slate-400">
                      Not recorded
                    </span>
                  )}
                </td>

                {/* Stock Valuation */}
                <td className="px-4 py-4 text-right font-semibold text-slate-900">
                  {product.valuation !== null ? (
                    formatINR(product.valuation)
                  ) : (
                    <span className="font-normal italic text-slate-400">
                      Not recorded
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-4">
                  <div className="flex min-w-[170px] flex-col items-stretch gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenMovementModal(product.id)
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
                      Move Stock
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onOpenPromotionalModal(product.id)
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-violet-200 bg-violet-50/50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-50 hover:text-violet-800"
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
      <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-slate-500">
          <span>
            <strong className="font-semibold text-slate-700">
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