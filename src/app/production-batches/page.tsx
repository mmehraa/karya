
import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getProductionBatches } from "@/modules/production-batches/services";
import { getActiveBusinessProducts } from "@/modules/products/services";
import { ProductionBatchesClient } from "@/modules/production-batches/components/production-batches-client";

export default async function ProductionBatchesPage() {
  const { businessId } = await getDashboardContext();

  const [batches, products] = await Promise.all([
    getProductionBatches(businessId),
    getActiveBusinessProducts(),
  ]);

  return (
    <main className="min-w-0 space-y-5 sm:space-y-6">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-2.5 py-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-accent"
              aria-hidden="true"
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
              Production workspace
            </p>
          </div>

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-text-primary sm:text-3xl">
            Production batches
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-secondary">
            Plan production, track batch history, monitor production costs,
            and convert approved batches into finished inventory.
          </p>
        </div>
      </header>

      <section aria-label="Production batch management" className="min-w-0">
        <ProductionBatchesClient
          initialBatches={batches}
          products={products}
        />
      </section>
    </main>
  );
}