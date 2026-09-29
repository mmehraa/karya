
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
      <div className="flex min-h-[260px] items-center justify-center px-6 py-12">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-text-primary">
            No customers yet
          </h3>

          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-text-secondary">
            Customer records will appear here when you add them manually or
            begin recording orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <caption className="sr-only">Customer directory</caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted/70">
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:px-6"
            >
              Customer
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:px-6"
            >
              Contact
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:px-6"
            >
              Location
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:px-6"
            >
              Added
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary sm:px-6"
            >
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="transition-colors hover:bg-surface-muted/50"
            >
              <td className="px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {customer.name}
                  </p>

                  {customer.notes ? (
                    <p
                      title={customer.notes}
                      className="mt-1 max-w-[260px] truncate text-xs text-text-muted"
                    >
                      {customer.notes}
                    </p>
                  ) : null}
                </div>
              </td>

              <td className="px-4 py-4 sm:px-6">
                <div className="space-y-1.5 text-sm text-text-secondary">
                  {customer.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone
                        className="h-3.5 w-3.5 shrink-0 text-text-muted"
                        aria-hidden="true"
                      />
                      <span>{customer.phone}</span>
                    </div>
                  ) : null}

                  {customer.email ? (
                    <div className="flex items-center gap-2">
                      <Mail
                        className="h-3.5 w-3.5 shrink-0 text-text-muted"
                        aria-hidden="true"
                      />
                      <span
                        title={customer.email}
                        className="max-w-[220px] truncate"
                      >
                        {customer.email}
                      </span>
                    </div>
                  ) : null}

                  {!customer.phone && !customer.email ? (
                    <span className="text-xs text-text-muted">
                      No contact details
                    </span>
                  ) : null}
                </div>
              </td>

              <td className="px-4 py-4 sm:px-6">
                {customer.city || customer.state ? (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <MapPin
                      className="h-3.5 w-3.5 shrink-0 text-text-muted"
                      aria-hidden="true"
                    />
                    <span>
                      {[customer.city, customer.state]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-text-muted">
                    Not recorded
                  </span>
                )}
              </td>

              <td className="whitespace-nowrap px-4 py-4 text-sm text-text-secondary sm:px-6">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(customer.createdAt))}
              </td>

              <td className="px-4 py-4 text-right sm:px-6">
                <button
                  type="button"
                  onClick={() => onEdit(customer)}
                  aria-label={`Edit ${customer.name}`}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
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