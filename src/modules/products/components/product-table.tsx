
import type { ProductStatus } from "@prisma/client";
import {
  CheckCircle2,
  Package,
  Pencil,
  Settings2,
} from "lucide-react";

import { formatINR } from "@/lib/formatters";
import type { ProductEconomics } from "@/modules/product-economics/types";
import type { SerializedProduct } from "@/modules/products/types";

interface ProductTableProps {
  products: SerializedProduct[];
  productEconomics: Array<ProductEconomics | null>;
  onEditProduct: (product: SerializedProduct) => void;
  onConfigureProduct: (product: SerializedProduct) => void;
}

export function ProductTable({
  products,
  productEconomics,
  onEditProduct,
  onConfigureProduct,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center px-5 py-10">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Package className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-text-primary">
            No products registered
          </h3>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            No product offerings have been registered for this business yet.
            Use Add Product to create your first catalog entry.
          </p>
        </div>
      </div>
    );
  }

  const economicsByProductId = new Map(
    productEconomics
      .filter(
        (economics): economics is ProductEconomics =>
          economics !== null,
      )
      .map((economics) => [economics.productId, economics]),
  );

  return (
    <div className="w-full min-w-0">
      <table className="w-full table-fixed border-collapse text-left text-[11px] leading-4">
        <caption className="sr-only">
          Product catalog with pricing, unit economics, inventory and actions
        </caption>

        <colgroup>
          <col className="w-[14%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[6%]" />
          <col className="w-[5%]" />
          <col className="w-[5%]" />
          <col className="w-[12%]" />
        </colgroup>

        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th
              scope="colgroup"
              colSpan={4}
              className="border-r border-border px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-text-secondary sm:px-3"
            >
              Product
            </th>
            <th
              scope="colgroup"
              colSpan={1}
              className="border-r border-border px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-text-secondary"
            >
              Pricing
            </th>
            <th
              scope="colgroup"
              colSpan={5}
              className="border-r border-border px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-text-secondary"
            >
              Unit economics
            </th>
            <th
              scope="colgroup"
              colSpan={2}
              className="border-r border-border px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-text-secondary"
            >
              Inventory
            </th>
            <th
              scope="col"
              className="px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-text-secondary"
            >
              Actions
            </th>
          </tr>

          <tr className="border-b border-border bg-surface-raised">
            {[
              ["Name", "text-left"],
              ["SKU", "text-left"],
              ["Category", "text-left"],
              ["Status", "text-center border-r border-border"],
              ["Selling price", "text-right border-r border-border"],
              ["Raw material", "text-right"],
              ["Packaging", "text-right"],
              ["Pre-shipping cost", "text-right bg-surface-muted/40"],
              ["Contribution", "text-right bg-surface-muted/40"],
              ["Margin", "text-right border-r border-border bg-surface-muted/40"],
              ["Stock", "text-right"],
              ["Reorder", "text-right border-r border-border"],
              ["Actions", "text-center"],
            ].map(([label, className], index) => (
              <th
                key={`${label}-${index}`}
                scope="col"
                className={`px-1.5 py-2 text-[10px] font-semibold leading-3 text-text-secondary sm:px-2 ${className}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {products.map((product) => {
            const economics = economicsByProductId.get(product.id);

            return (
              <tr
                key={product.id}
                className="transition-colors hover:bg-surface-muted/40"
              >
                <td className="break-words px-2 py-2.5 sm:px-3">
                  <p
                    className="break-words text-[11px] font-semibold leading-4 text-text-primary"
                    title={product.name}
                  >
                    {product.name}
                  </p>
                  {product.description ? (
                    <p
                      title={product.description}
                      className="mt-0.5 line-clamp-2 break-words text-[10px] leading-3.5 text-text-muted"
                    >
                      {product.description}
                    </p>
                  ) : null}
                </td>

                <td className="break-all px-1.5 py-2.5 font-mono text-[10px] leading-3.5 text-text-secondary sm:px-2">
                  {product.sku}
                </td>

                <td className="break-words px-1.5 py-2.5 text-[10px] leading-3.5 text-text-secondary sm:px-2">
                  {product.category}
                </td>

                <td className="border-r border-border px-1 py-2.5 text-center">
                  {getStatusBadge(product.status)}
                </td>

                <td className="whitespace-nowrap border-r border-border px-1 py-2.5 text-right text-[10px] font-semibold tabular-nums text-text-primary sm:px-1.5">
                  {formatCurrencyCell(economics?.sellingPrice ?? null)}
                </td>

                <td className="whitespace-nowrap px-1 py-2.5 text-right text-[10px] tabular-nums text-text-secondary sm:px-1.5">
                  {formatCurrencyCell(
                    economics?.rawMaterialCostPerUnit ?? null,
                  )}
                </td>

                <td className="whitespace-nowrap px-1 py-2.5 text-right text-[10px] tabular-nums text-text-secondary sm:px-1.5">
                  {formatCurrencyCell(
                    economics?.packagingCostPerUnit ?? null,
                  )}
                </td>

                <td className="whitespace-nowrap bg-surface-muted/40 px-1 py-2.5 text-right text-[10px] font-semibold tabular-nums text-text-primary sm:px-1.5">
                  {formatCurrencyCell(
                    economics?.preShippingUnitCost ?? null,
                  )}
                </td>

                <td className="whitespace-nowrap bg-surface-muted/40 px-1 py-2.5 text-right text-[10px] font-semibold tabular-nums sm:px-1.5">
                  {formatProfitCell(
                    economics?.contributionProfitPerUnit ?? null,
                  )}
                </td>

                <td className="whitespace-nowrap border-r border-border bg-surface-muted/40 px-1 py-2.5 text-right text-[10px] font-semibold tabular-nums sm:px-1.5">
                  {formatMarginCell(
                    economics?.contributionMarginPct ?? null,
                  )}
                </td>

                <td className="px-1 py-2.5 text-right sm:px-1.5">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[11px] font-semibold tabular-nums text-text-primary">
                      {product.currentStock}
                    </span>
                    {getStockStatus(
                      product.currentStock,
                      product.reorderLevel,
                    )}
                  </div>
                </td>

                <td className="border-r border-border px-1 py-2.5 text-right text-[10px] tabular-nums text-text-secondary sm:px-1.5">
                  {product.reorderLevel}
                </td>

                <td className="px-1 py-2.5">
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onConfigureProduct(product)}
                      className="inline-flex min-h-7 items-center justify-center gap-1 rounded-md border border-border bg-surface-raised px-1.5 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      aria-label={`Configure ${product.name}`}
                    >
                      <Settings2 className="h-3 w-3" aria-hidden="true" />
                      Configure
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      className="inline-flex min-h-7 items-center justify-center gap-1 rounded-md border border-border bg-surface-raised px-1.5 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      aria-label={`Edit ${product.name}`}
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getStatusBadge(status: ProductStatus) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold text-success">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Active
        </span>
      );

    case "ARCHIVED":
      return (
        <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-1.5 py-0.5 text-[9px] font-semibold text-text-secondary">
          Archived
        </span>
      );

    case "DRAFT":
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-1.5 py-0.5 text-[9px] font-semibold text-warning">
          Draft
        </span>
      );
  }
}

function getStockStatus(stock: number, reorderLevel: number) {
  if (stock <= 0) {
    return (
      <span className="inline-flex max-w-full items-center gap-1 text-[9px] font-semibold leading-3 text-danger">
        <span className="h-1 w-1 shrink-0 rounded-full bg-danger" aria-hidden="true" />
        Out of stock
      </span>
    );
  }

  if (stock <= reorderLevel) {
    return (
      <span className="inline-flex max-w-full items-center gap-1 text-[9px] font-semibold leading-3 text-warning">
        <span className="h-1 w-1 shrink-0 rounded-full bg-warning" aria-hidden="true" />
        Low stock
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1 text-[9px] font-semibold leading-3 text-success">
      <span className="h-1 w-1 shrink-0 rounded-full bg-success" aria-hidden="true" />
      In stock
    </span>
  );
}

function formatCurrencyCell(value: number | null) {
  if (value === null) {
    return <span className="font-normal italic text-text-muted">—</span>;
  }

  return formatINR(value);
}

function formatProfitCell(value: number | null) {
  if (value === null) {
    return <span className="font-normal italic text-text-muted">—</span>;
  }

  return (
    <span className={value < 0 ? "text-warning" : "text-success"}>
      {formatINR(value)}
    </span>
  );
}

function formatMarginCell(value: number | null) {
  if (value === null) {
    return <span className="font-normal italic text-text-muted">—</span>;
  }

  return (
    <span className={value < 0 ? "text-warning" : "text-success"}>
      {value.toFixed(1)}%
    </span>
  );
}