
"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Package,
  Plus,
} from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import type { ProductEconomics } from "@/modules/product-economics/types";
import type { SerializedProductionBatch } from "@/modules/production-batches/types";
import type { SerializedProduct } from "@/modules/products/types";

import { ProductTable } from "@/modules/products/components/product-table";
import { ProductFormDialog } from "@/modules/products/components/product-form-dialog";
import { ProductConfigurationDialog } from "@/modules/products/components/product-configuration-dialog";
import { ProductProductionHistory } from "@/modules/products/components/product-production-history";

interface ProductCatalogClientProps {
  initialProducts: SerializedProduct[];
  initialProductEconomics: Array<ProductEconomics | null>;
  initialProductionBatchesByProductId: Record<
    string,
    SerializedProductionBatch[]
  >;
}

export function ProductCatalogClient({
  initialProducts,
  initialProductEconomics,
  initialProductionBatchesByProductId,
}: ProductCatalogClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<SerializedProduct | null>(null);
  const [configurationProduct, setConfigurationProduct] =
    useState<SerializedProduct | null>(null);

  const selectedProductEconomics = useMemo(() => {
    if (!selectedProduct) {
      return null;
    }

    return (
      initialProductEconomics.find(
        (economics) => economics?.productId === selectedProduct.id,
      ) ?? null
    );
  }, [selectedProduct, initialProductEconomics]);

  const summary = useMemo(() => {
    const totalProducts = initialProducts.length;

    const completeUnitEconomics = initialProductEconomics.filter(
      (economics) => economics?.isComplete === true,
    ).length;

    const outOfStock = initialProducts.filter(
      (product) => product.currentStock <= 0,
    ).length;

    const lowStock = initialProducts.filter(
      (product) =>
        product.currentStock > 0 &&
        product.currentStock <= product.reorderLevel,
    ).length;

    return {
      totalProducts,
      completeUnitEconomics,
      outOfStock,
      lowStock,
    };
  }, [initialProducts, initialProductEconomics]);

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (product: SerializedProduct) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleOpenConfiguration = (product: SerializedProduct) => {
    setConfigurationProduct(product);
    setIsConfigurationOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleCloseConfiguration = () => {
    setIsConfigurationOpen(false);
    setConfigurationProduct(null);
  };

  return (
    <div className="space-y-6">
      <section
        aria-label="Product catalog summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="Catalog products"
          value={summary.totalProducts}
          subtitle="Registered offerings"
          icon={<Package className="h-5 w-5" aria-hidden="true" />}
        />

        <StatCard
          title="Unit economics"
          value={summary.completeUnitEconomics}
          subtitle="Products with complete costing"
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
        />

        <StatCard
          title="Out of stock"
          value={summary.outOfStock}
          subtitle="Products with no stock"
          icon={
            <AlertTriangle
              className="h-5 w-5"
              aria-hidden="true"
            />
          }
        />

        <StatCard
          title="Low stock"
          value={summary.lowStock}
          subtitle="Below reorder level"
          icon={
            <AlertTriangle
              className="h-5 w-5"
              aria-hidden="true"
            />
          }
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 border-b border-border px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-text-primary">
                Product catalog
              </h2>

              <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-text-secondary">
                {initialProducts.length}
              </span>
            </div>

            <p className="mt-1.5 max-w-2xl text-sm leading-5 text-text-secondary">
              Selling price is maintained here. Product costs are calculated
              dynamically from active formulation and packaging configuration.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Product
          </button>
        </div>

        <ProductTable
          products={initialProducts}
          productEconomics={initialProductEconomics}
          onEditProduct={handleOpenEdit}
          onConfigureProduct={handleOpenConfiguration}
        />
      </section>

      <ProductProductionHistory
        products={initialProducts.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
        }))}
        productionBatchesByProductId={
          initialProductionBatchesByProductId
        }
      />

      <ProductFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        productToEdit={selectedProduct}
        productEconomics={selectedProductEconomics}
      />

      <ProductConfigurationDialog
        isOpen={isConfigurationOpen}
        onClose={handleCloseConfiguration}
        product={configurationProduct}
      />
    </div>
  );
}