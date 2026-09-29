"use client";

import { InventoryTransactionType } from "@prisma/client";
import { formatINR } from "@/lib/formatters";
import type {
  SerializedInventoryTransaction,
  ProductStockSummary,
} from "@/modules/inventory/types";
import { History, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TransactionHistoryTableProps {
  transactions: SerializedInventoryTransaction[];
  products: ProductStockSummary[];
}

export function TransactionHistoryTable({
  transactions,
  products,
}: TransactionHistoryTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted text-text-secondary">
          <History className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-text-primary">
          No Inventory Transactions Recorded
        </h3>

        <p className="mt-1 text-xs text-text-secondary">
          The ledger is currently empty. Record production, restocks, or
          audits to populate the audit log.
        </p>
      </div>
    );
  }

  const productMap = new Map<string, ProductStockSummary>(
    products.map((product) => [product.id, product])
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-muted/75 text-[11px] font-semibold text-text-secondary">
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Offering</th>
              <th className="px-4 py-3">Event Type</th>
              <th className="px-4 py-3 text-right">Quantity Delta</th>
              <th className="px-4 py-3 text-right">
                Recorded Unit Cost
              </th>
              <th className="px-4 py-3">Reference / Batch</th>
              <th className="px-4 py-3">Audit Notes</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction) => {
              const product = productMap.get(transaction.productId);
              const isPositive = isDeltaPositive(
                transaction.type,
                transaction.notes
              );
              const sanitizedNotes = sanitizeNotes(transaction.notes);

              return (
                <tr
                  key={transaction.id}
                  className="transition-colors hover:bg-surface-muted/70"
                >
                  {/* Timestamp */}
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-text-secondary">
                    {new Date(transaction.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>

                  {/* Offering */}
                  <td className="px-4 py-3 font-semibold text-text-primary">
                    {product ? product.name : "Unknown Offering"}

                    <span className="block font-mono text-[10px] font-normal text-text-muted">
                      {product?.sku || transaction.productId}
                    </span>
                  </td>

                  {/* Event Type */}
                  <td className="px-4 py-3">
                    {getTypeBadge(transaction.type)}
                  </td>

                  {/* Quantity Delta */}
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        isPositive
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}

                      {isPositive
                        ? `+${transaction.quantity}`
                        : `-${transaction.quantity}`}
                    </span>
                  </td>

                  {/* Recorded Unit Cost */}
                  <td className="px-4 py-3 text-right font-medium text-text-secondary">
                    {transaction.unitCost !== null ? (
                      formatINR(transaction.unitCost)
                    ) : (
                      <span className="font-normal italic text-text-muted">
                        Not recorded
                      </span>
                    )}
                  </td>

                  {/* Reference ID */}
                  <td className="px-4 py-3 font-mono text-text-secondary">
                    {transaction.referenceId || (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>

                  {/* Sanitized Notes */}
                  <td className="max-w-xs truncate px-4 py-3 text-text-secondary">
                    {sanitizedNotes || (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sanitizeNotes(rawNotes: string | null): string | null {
  if (!rawNotes) {
    return null;
  }

  const cleaned = rawNotes
    .replace(/\[AUDIT_DIRECTION:(?:INCREASE|DECREASE)\]/g, "")
    .trim();

  return cleaned === "" ? null : cleaned;
}

function isDeltaPositive(
  type: InventoryTransactionType,
  notes: string | null
): boolean {
  if (type === InventoryTransactionType.MANUAL_AUDIT) {
    if (notes && notes.includes("[AUDIT_DIRECTION:DECREASE]")) {
      return false;
    }

    return true;
  }

  return (
    type === InventoryTransactionType.INITIAL_STOCK ||
    type === InventoryTransactionType.PRODUCTION_RUN ||
    type === InventoryTransactionType.PURCHASE_RESTOCK ||
    type === InventoryTransactionType.RETURN_RESTOCK
  );
}

function getTypeBadge(type: InventoryTransactionType) {
  switch (type) {
    case InventoryTransactionType.PURCHASE_RESTOCK:
      return (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
          Purchase Restock
        </span>
      );

    case InventoryTransactionType.PRODUCTION_RUN:
      return (
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
          Production Run
        </span>
      );

    case InventoryTransactionType.INITIAL_STOCK:
      return (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
          Initial Stock
        </span>
      );

    case InventoryTransactionType.RETURN_RESTOCK:
      return (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Return Restock
        </span>
      );

    case InventoryTransactionType.SALE:
      return (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
          Direct Sale
        </span>
      );

    case InventoryTransactionType.DAMAGED_WRITE_OFF:
      return (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
          Damaged Write-off
        </span>
      );

    case InventoryTransactionType.MANUAL_AUDIT:
      return (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          Manual Audit
        </span>
      );

    default:
      return (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
          {type}
        </span>
      );
  }
}