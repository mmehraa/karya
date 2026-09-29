
"use client";

import { useState } from "react";
import { Mail, Phone, UserPlus, Users } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import type { SerializedCustomer } from "@/modules/customers/types";
import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerTable } from "./customer-table";

interface CustomerClientProps {
  customers: SerializedCustomer[];
}

export function CustomerClient({ customers }: CustomerClientProps) {
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
        <section
          aria-label="Customer summary"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <StatCard
            title="Total Customers"
            value={customers.length}
            subtitle="Customer records"
            icon={<Users className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            title="Email Available"
            value={customersWithEmail}
            subtitle="Records with email"
            icon={<Mail className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            title="Phone Available"
            value={customersWithPhone}
            subtitle="Records with phone"
            icon={<Phone className="h-5 w-5" aria-hidden="true" />}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 border-b border-border px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-text-primary">
                Customer Directory
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Contact records used across your business operations.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddCustomer}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add Customer
            </button>
          </div>

          <CustomerTable
            customers={customers}
            onEdit={handleEditCustomer}
          />
        </section>
      </div>

      <CustomerFormDialog
        open={isDialogOpen}
        customer={editingCustomer}
        onClose={handleCloseDialog}
      />
    </>
  );
}