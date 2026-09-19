import { getActiveBusinessProducts } from "@/modules/products/services";
import { ProductCatalogClient } from "@/modules/products/components/product-catalog-client";

export default async function ProductsPage() {
  const products = await getActiveBusinessProducts();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Product Workspace
          </p>

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Product catalog
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            Manage your registered offerings, pricing, unit economics, and
            inventory thresholds.
          </p>
        </div>
      </div>

      {/* Product Catalog */}
      <ProductCatalogClient initialProducts={products} />
    </div>
  );
}