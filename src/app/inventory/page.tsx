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
    <main className="min-w-0 space-y-5 sm:space-y-6">
      {/* Header */}
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Inventory workspace</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-text-primary sm:text-3xl">
            Inventory & Stock Ledger
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-secondary">
            Physical stock tracking, promotional allocation, and append-only
            inventory audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[11px] font-semibold text-text-secondary shadow-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            Ledger Active
          </div>
        </div>
      </header>

      {/* Inventory Manager */}
      <InventoryClient
        products={overview.products}
        kpis={overview.kpis}
        transactions={transactions}
      />
    </main>
  );
}