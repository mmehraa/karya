"use client";

import { Mail, MapPin, Pencil, Phone, Users } from "lucide-react";
import type { SerializedCustomer } from "@/modules/customers/types";

interface CustomerTableProps {
  customers: SerializedCustomer[];
  onEdit: (customer: SerializedCustomer) => void;
}

export function CustomerTable({
  customers,
  onEdit,
}: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <div className="flex min-h-[260px] items-center justify-center px-6 py-10">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
            <Users className="h-6 w-6 text-slate-400" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-slate-900">
            No customers yet
          </h3>

          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-slate-500">
            Customer records will appear here when you add them manually or
            begin recording orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Customer
            </th>

            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Contact
            </th>

            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Location
            </th>

            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Added
            </th>

            <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="transition-colors hover:bg-slate-50/60"
            >
              <td className="px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {customer.name}
                  </p>

                  {customer.notes && (
                    <p className="mt-1 max-w-[260px] truncate text-xs text-slate-400">
                      {customer.notes}
                    </p>
                  )}
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="space-y-1.5 text-xs text-slate-500">
                  {customer.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{customer.phone}</span>
                    </div>
                  ) : null}

                  {customer.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="max-w-[220px] truncate">
                        {customer.email}
                      </span>
                    </div>
                  ) : null}

                  {!customer.phone && !customer.email && (
                    <span className="text-slate-400">No contact details</span>
                  )}
                </div>
              </td>

              <td className="px-6 py-4">
                {customer.city || customer.state ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />

                    <span>
                      {[customer.city, customer.state]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    Not recorded
                  </span>
                )}
              </td>

              <td className="px-6 py-4 text-xs text-slate-500">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(customer.createdAt))}
              </td>

              <td className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(customer)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Pencil className="h-3.5 w-3.5" />
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