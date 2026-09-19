"use client";

import { useState } from "react";
import { Mail, Phone, UserPlus, Users } from "lucide-react";
import type { SerializedCustomer } from "@/modules/customers/types";
import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerTable } from "./customer-table";

interface CustomerClientProps {
  customers: SerializedCustomer[];
}

export function CustomerClient({
  customers,
}: CustomerClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<SerializedCustomer | null>(null);

  const customersWithEmail = customers.filter(
    (customer) => customer.email
  ).length;

  const customersWithPhone = customers.filter(
    (customer) => customer.phone
  ).length;

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setIsDialogOpen(true);
  };

  const handleEditCustomer = (customer: SerializedCustomer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Total Customers
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {customers.length}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Customer records
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-2.5">
                <Users className="h-5 w-5 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Email Available
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {customersWithEmail}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Records with email
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-2.5">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Phone Available
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {customersWithPhone}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Records with phone
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-2.5">
                <Phone className="h-5 w-5 text-slate-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Directory */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Customer Directory
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Contact records used across your business operations.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddCustomer}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <UserPlus className="h-4 w-4" />
              Add Customer
            </button>
          </div>

          <CustomerTable
            customers={customers}
            onEdit={handleEditCustomer}
          />
        </div>
      </div>

      <CustomerFormDialog
        open={isDialogOpen}
        customer={editingCustomer}
        onClose={handleCloseDialog}
      />
    </>
  );
}