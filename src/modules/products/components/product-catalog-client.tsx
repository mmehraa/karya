"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Package,
  Plus,
} from "lucide-react";

import type { SerializedProduct } from "@/modules/products/types";
import { ProductTable } from "@/modules/products/components/product-table";
import { ProductFormDialog } from "@/modules/products/components/product-form-dialog";

interface ProductCatalogClientProps {
  initialProducts: SerializedProduct[];
}

export function ProductCatalogClient({
  initialProducts,
}: ProductCatalogClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<SerializedProduct | null>(null);

  const summary = useMemo(() => {
    const totalProducts = initialProducts.length;

    const completeUnitEconomics = initialProducts.filter(
      (product) =>
        product.sellingPrice !== null &&
        product.cogs !== null &&
        product.packagingCost !== null &&
        product.variableCost !== null,
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
  }, [initialProducts]);

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (product: SerializedProduct) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Catalog products"
          value={summary.totalProducts}
          description="Registered offerings"
          icon={Package}
        />

        <SummaryCard
          label="Unit economics"
          value={summary.completeUnitEconomics}
          description="Complete cost inputs"
          icon={BarChart3}
        />

        <SummaryCard
          label="Out of stock"
          value={summary.outOfStock}
          description="Products with no stock"
          icon={AlertTriangle}
          tone={summary.outOfStock > 0 ? "warning" : "default"}
        />

        <SummaryCard
          label="Low stock"
          value={summary.lowStock}
          description="Below reorder level"
          icon={AlertTriangle}
          tone={summary.lowStock > 0 ? "warning" : "default"}
        />
      </div>

      {/* Catalog */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-950">
                Product catalog
              </h2>

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {initialProducts.length}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Pricing and unit economics are maintained here. Inventory values
              are display-only.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </button>
        </div>

        <ProductTable
          products={initialProducts}
          onEditProduct={handleOpenEdit}
        />
      </section>

      <ProductFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        productToEdit={selectedProduct}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof Package;
  tone?: "default" | "warning";
}) {
  const iconClasses =
    tone === "warning"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-50 text-slate-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {value}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClasses}`}
        >
          {tone === "warning" && value === 0 ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
      </div>
    </div>
  );
}