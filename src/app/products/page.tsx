import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getProductEconomics } from "@/modules/product-economics/services";
import { getProductionBatches } from "@/modules/production-batches/services";
import { getActiveBusinessProducts } from "@/modules/products/services";
import { ProductCatalogClient } from "@/modules/products/components/product-catalog-client";

export default async function ProductsPage() {
  const [{ businessId }, products] = await Promise.all([
    getDashboardContext(),
    getActiveBusinessProducts(),
  ]);

  const [productEconomics, productionBatchResults] =
    await Promise.all([
      Promise.all(
        products.map((product) =>
          getProductEconomics(
            businessId,
            product.id,
          ),
        ),
      ),

      Promise.all(
        products.map(async (product) => {
          const batches =
            await getProductionBatches(
              businessId,
              product.id,
            );

          return {
            productId: product.id,
            batches,
          };
        }),
      ),
    ]);

  const productionBatchesByProductId =
    Object.fromEntries(
      productionBatchResults.map(
        ({ productId, batches }) => [
          productId,
          batches,
        ],
      ),
    );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Product Workspace
          </p>

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-text-primary sm:text-3xl">
            Product catalog
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-secondary">
            Manage your registered offerings, pricing, dynamic unit economics,
            inventory thresholds, and production history.
          </p>
        </div>
      </div>

      {/* Product Catalog */}
      <ProductCatalogClient
        initialProducts={products}
        initialProductEconomics={productEconomics}
        initialProductionBatchesByProductId={
          productionBatchesByProductId
        }
      />
    </div>
  );
}