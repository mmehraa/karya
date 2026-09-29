"use client";

import { useState } from "react";
import { History, Layers, Plus } from "lucide-react";

import { formatINR } from "@/lib/formatters";

import type {
  InventoryKPIs,
  ProductStockSummary,
  SerializedInventoryTransaction,
} from "@/modules/inventory/types";

import { InventoryTable } from "@/modules/inventory/components/inventory-table";
import { PromotionalStockDialog } from "@/modules/inventory/components/promotional-stock-dialog";
import { StockMovementDialog } from "@/modules/inventory/components/stock-movement-dialog";
import { TransactionHistoryTable } from "@/modules/inventory/components/transaction-history-table";

interface InventoryClientProps {
  products: ProductStockSummary[];
  kpis: InventoryKPIs;
  transactions: SerializedInventoryTransaction[];
}

export function InventoryClient({
  products,
  kpis,
  transactions,
}: InventoryClientProps) {
  const [activeTab, setActiveTab] =
    useState<"stock" | "ledger">("stock");

  const [isDialogOpen, setIsDialogOpen] =
    useState(false);

  const [
    isPromotionalDialogOpen,
    setIsPromotionalDialogOpen,
  ] = useState(false);

  const [
    promotionalProductId,
    setPromotionalProductId,
  ] = useState<string | null>(null);

  const handleOpenGeneral = () => {
    setIsDialogOpen(true);
  };

  const handleOpenForProduct = () => {
    setIsDialogOpen(true);
  };

  const handleOpenPromotionalForProduct = (
    productId: string,
  ) => {
    setPromotionalProductId(productId);
    setIsPromotionalDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleClosePromotionalDialog = () => {
    setIsPromotionalDialogOpen(false);
    setPromotionalProductId(null);
  };

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* =========================================================
          OVERVIEW KPI CARDS
      ========================================================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Physical Units */}
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Total Units in Stock
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-primary">
              {kpis.totalUnitsInStock}
            </span>

            <span className="text-xs font-medium text-text-secondary">
              physical units
            </span>
          </div>
        </div>

        {/* Promotional Stock */}
        <div className="rounded-2xl border border-violet-200/70 bg-violet-50/50 p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="block text-xs font-semibold uppercase tracking-wider text-violet-600">
            Promotional Stock
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-violet-800">
              {kpis.totalPromotionalUnits}
            </span>

            <span className="text-xs font-medium text-violet-600">
              reserved units
            </span>
          </div>
        </div>

        {/* Available Stock */}
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Available for Sale
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-800">
              {kpis.totalAvailableUnits}
            </span>

            <span className="text-xs font-medium text-emerald-600">
              sellable units
            </span>
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Recorded Inventory Valuation
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-primary">
              {kpis.totalValuation !== null
                ? formatINR(kpis.totalValuation)
                : "Not recorded"}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          STOCK HEALTH SUMMARY
      ========================================================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Low Stock */}
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Low Stock Warnings
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                kpis.lowStockCount > 0
                  ? "text-amber-600"
                  : "text-text-primary"
              }`}
            >
              {kpis.lowStockCount}
            </span>

            <span className="text-xs font-medium text-text-secondary">
              under reorder threshold
            </span>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm transition-shadow hover:shadow-md">
          <span className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Out of Stock
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                kpis.outOfStockCount > 0
                  ? "text-red-600"
                  : "text-text-primary"
              }`}
            >
              {kpis.outOfStockCount}
            </span>

            <span className="text-xs font-medium text-text-secondary">
              zero physical inventory
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          TAB NAVIGATION + ACTION BAR
      ========================================================= */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2">
          {/* Stock Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              activeTab === "stock"
                ? "bg-slate-950 text-white shadow-sm"
                : "border border-border bg-surface-raised text-text-secondary hover:bg-surface-muted"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />

            Stock by Offering ({products.length})
          </button>

          {/* Ledger Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              activeTab === "ledger"
                ? "bg-slate-950 text-white shadow-sm"
                : "border border-border bg-surface-raised text-text-secondary hover:bg-surface-muted"
            }`}
          >
            <History className="h-3.5 w-3.5" />

            Audit Ledger ({transactions.length})
          </button>
        </div>

        {/* Record Movement */}
        <button
          type="button"
          onClick={handleOpenGeneral}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />

          Record Stock Movement
        </button>
      </div>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}
      {activeTab === "stock" ? (
        <InventoryTable
          products={products}
          onOpenMovementModal={handleOpenForProduct}
          onOpenPromotionalModal={
            handleOpenPromotionalForProduct
          }
        />
      ) : (
        <TransactionHistoryTable
          transactions={transactions}
          products={products}
        />
      )}

      {/* =========================================================
          NORMAL STOCK MOVEMENT DIALOG
      ========================================================= */}
      <StockMovementDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        products={products}
      />

      {/* =========================================================
          PROMOTIONAL STOCK DIALOG
      ========================================================= */}
      <PromotionalStockDialog
        open={isPromotionalDialogOpen}
        onClose={handleClosePromotionalDialog}
        products={products}
        initialProductId={promotionalProductId}
      />
    </div>
  );
}