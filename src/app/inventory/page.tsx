import { ShieldCheck } from "lucide-react";

import { getDashboardContext } from "@/modules/business/dashboard-context";

import {
  getInventoryOverview,
  getRecentInventoryTransactions,
} from "@/modules/inventory/services";

import { InventoryClient } from "@/modules/inventory/components/inventory-client";

export default async function InventoryPage() {
  const { businessId } = await getDashboardContext();

  const [overview, transactions] = await Promise.all([
    getInventoryOverview(businessId),
    getRecentInventoryTransactions(businessId, 50),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory & Stock Ledger
          </h1>

          <p className="text-sm text-slate-500">
            Physical stock tracking, promotional allocation, and append-only
            inventory audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Ledger Active
          </div>
        </div>
      </div>

      {/* Inventory Manager */}
      <InventoryClient
        products={overview.products}
        kpis={overview.kpis}
        transactions={transactions}
      />
    </div>
  );
}