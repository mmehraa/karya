import type { ProductStatus } from "@prisma/client";
import { formatINR } from "@/lib/formatters";
import type { SerializedProduct } from "@/modules/products/types";
import {
  CheckCircle2,
  Package,
  Pencil,
  TriangleAlert,
} from "lucide-react";

interface ProductTableProps {
  products: SerializedProduct[];
  onEditProduct: (product: SerializedProduct) => void;
}

export function ProductTable({
  products,
  onEditProduct,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <Package className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-900">
          No products registered
        </h3>

        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
          No product offerings have been registered for this business yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            <th
              colSpan={4}
              className="border-r border-slate-100 px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              Product
            </th>

            <th
              colSpan={1}
              className="border-r border-slate-100 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              Pricing
            </th>

            <th
              colSpan={6}
              className="border-r border-slate-100 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              Unit economics
            </th>

            <th
              colSpan={2}
              className="border-r border-slate-100 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              Inventory
            </th>

            <th className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Actions
            </th>
          </tr>

          <tr className="border-b border-slate-100 bg-white">
            <th className="px-5 py-3 text-[10px] font-semibold text-slate-600">
              Name
            </th>

            <th className="px-4 py-3 text-[10px] font-semibold text-slate-600">
              SKU
            </th>

            <th className="px-4 py-3 text-[10px] font-semibold text-slate-600">
              Category
            </th>

            <th className="border-r border-slate-100 px-4 py-3 text-[10px] font-semibold text-slate-600">
              Status
            </th>

            <th className="border-r border-slate-100 px-4 py-3 text-right text-[10px] font-semibold text-slate-600">
              Selling price
            </th>

            <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-600">
              COGS
            </th>

            <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-600">
              Packaging
            </th>

            <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-600">
              Variable
            </th>

            <th className="bg-slate-50/50 px-4 py-3 text-right text-[10px] font-bold text-slate-700">
              Unit cost
            </th>

            <th className="bg-slate-50/50 px-4 py-3 text-right text-[10px] font-bold text-slate-700">
              Gross profit
            </th>

            <th className="border-r border-slate-100 bg-slate-50/50 px-4 py-3 text-right text-[10px] font-bold text-slate-700">
              Margin
            </th>

            <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-600">
              Stock
            </th>

            <th className="border-r border-slate-100 px-4 py-3 text-right text-[10px] font-semibold text-slate-600">
              Reorder
            </th>

            <th className="px-4 py-3 text-center text-[10px] font-semibold text-slate-600">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr
              key={product.id}
              className="group transition-colors hover:bg-slate-50/50"
            >
              <td className="px-5 py-4">
                <div className="min-w-[210px]">
                  <p className="text-xs font-semibold text-slate-900">
                    {product.name}
                  </p>

                  {product.description && (
                    <p className="mt-1 max-w-[250px] truncate text-[10px] leading-4 text-slate-400">
                      {product.description}
                    </p>
                  )}
                </div>
              </td>

              <td className="px-4 py-4">
                <span className="font-mono text-[10px] text-slate-500">
                  {product.sku}
                </span>
              </td>

              <td className="px-4 py-4 text-[11px] text-slate-500">
                {product.category}
              </td>

              <td className="border-r border-slate-100 px-4 py-4">
                {getStatusBadge(product.status)}
              </td>

              <td className="border-r border-slate-100 px-4 py-4 text-right text-xs font-semibold text-slate-900">
                {formatCurrencyCell(product.sellingPrice)}
              </td>

              <td className="px-4 py-4 text-right text-[11px] text-slate-600">
                {formatCurrencyCell(product.cogs)}
              </td>

              <td className="px-4 py-4 text-right text-[11px] text-slate-600">
                {formatCurrencyCell(product.packagingCost)}
              </td>

              <td className="px-4 py-4 text-right text-[11px] text-slate-600">
                {formatCurrencyCell(product.variableCost)}
              </td>

              <td className="bg-slate-50/40 px-4 py-4 text-right text-[11px] font-semibold text-slate-900">
                {formatCurrencyCell(product.totalUnitCost)}
              </td>

              <td className="bg-slate-50/40 px-4 py-4 text-right text-[11px] font-semibold">
                {formatProfitCell(product.unitGrossProfit)}
              </td>

              <td className="border-r border-slate-100 bg-slate-50/40 px-4 py-4 text-right text-[11px] font-semibold">
                {formatMarginCell(product.unitGrossMarginPct)}
              </td>

              <td className="px-4 py-4 text-right">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-semibold text-slate-800">
                    {product.currentStock}
                  </span>

                  {getStockStatus(product.currentStock, product.reorderLevel)}
                </div>
              </td>

              <td className="border-r border-slate-100 px-4 py-4 text-right text-[11px] text-slate-500">
                {product.reorderLevel}
              </td>

              <td className="px-4 py-4 text-center">
                <button
                  type="button"
                  onClick={() => onEditProduct(product)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                  aria-label={`Edit ${product.name}`}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getStatusBadge(status: ProductStatus) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      );

    case "ARCHIVED":
      return (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
          Archived
        </span>
      );

    case "DRAFT":
    default:
      return (
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
          Draft
        </span>
      );
  }
}

function getStockStatus(
  stock: number,
  reorderLevel: number,
) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Out of stock
      </span>
    );
  }

  if (stock <= reorderLevel) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Low stock
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      In stock
    </span>
  );
}

function formatCurrencyCell(val: number | null) {
  if (val === null) {
    return (
      <span className="font-normal italic text-slate-400">
        Not recorded
      </span>
    );
  }

  return formatINR(val);
}

function formatProfitCell(val: number | null) {
  if (val === null) {
    return (
      <span className="font-normal italic text-slate-400">
        Not recorded
      </span>
    );
  }

  return (
    <span
      className={
        val < 0
          ? "text-amber-700"
          : "text-emerald-700"
      }
    >
      {formatINR(val)}
    </span>
  );
}

function formatMarginCell(val: number | null) {
  if (val === null) {
    return (
      <span className="font-normal italic text-slate-400">
        Not recorded
      </span>
    );
  }

  return (
    <span
      className={
        val < 0
          ? "text-amber-700"
          : "text-emerald-700"
      }
    >
      {val.toFixed(1)}%
    </span>
  );
}