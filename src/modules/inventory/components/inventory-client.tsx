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
    <div className="space-y-6">
      {/* =========================================================
          OVERVIEW KPI CARDS
      ========================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Physical Units */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Units in Stock
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {kpis.totalUnitsInStock}
            </span>

            <span className="text-xs font-medium text-slate-500">
              physical units
            </span>
          </div>
        </div>

        {/* Promotional Stock */}
        <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Recorded Inventory Valuation
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Low Stock */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Low Stock Warnings
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                kpis.lowStockCount > 0
                  ? "text-amber-600"
                  : "text-slate-900"
              }`}
            >
              {kpis.lowStockCount}
            </span>

            <span className="text-xs font-medium text-slate-500">
              under reorder threshold
            </span>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Out of Stock
          </span>

          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                kpis.outOfStockCount > 0
                  ? "text-red-600"
                  : "text-slate-900"
              }`}
            >
              {kpis.outOfStockCount}
            </span>

            <span className="text-xs font-medium text-slate-500">
              zero physical inventory
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          TAB NAVIGATION + ACTION BAR
      ========================================================= */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Stock Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "stock"
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />

            Stock by Offering ({products.length})
          </button>

          {/* Ledger Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "ledger"
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
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