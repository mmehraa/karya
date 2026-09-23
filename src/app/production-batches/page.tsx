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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Production Workspace
          </p>

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Production batches
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            Plan production, track batch history, monitor production costs, and
            convert approved batches into finished inventory.
          </p>
        </div>
      </div>

      <ProductionBatchesClient
        initialBatches={batches}
        products={products}
      />
    </div>
  );
}
