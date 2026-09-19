"use client";

import { useEffect, useState, useTransition } from "react";
import { X, UserPlus } from "lucide-react";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/modules/customers/actions";
import type { SerializedCustomer } from "@/modules/customers/types";

interface CustomerFormDialogProps {
  open: boolean;
  customer?: SerializedCustomer | null;
  onClose: () => void;
}

export function CustomerFormDialog({
  open,
  customer,
  onClose,
}: CustomerFormDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEditing = Boolean(customer);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(customer?.name ?? "");
    setEmail(customer?.email ?? "");
    setPhone(customer?.phone ?? "");
    setCity(customer?.city ?? "");
    setState(customer?.state ?? "");
    setNotes(customer?.notes ?? "");
    setError(null);
  }, [open, customer]);

  useEffect(() => {
    if (!open || isPending) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isPending, onClose]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const payload = {
      name,
      email,
      phone,
      city,
      state,
      notes,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateCustomerAction({
            id: customer!.id,
            ...payload,
          })
        : await createCustomerAction(payload);

      if (!result.success) {
        setError(result.error ?? "Unable to save customer.");
        return;
      }

      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-dialog-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <UserPlus className="h-5 w-5" />
            </div>

            <div>
              <h2
                id="customer-form-dialog-title"
                className="text-base font-semibold text-slate-900"
              >
                {isEditing ? "Edit Customer" : "Add Customer"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {isEditing
                  ? "Update the customer's record."
                  : "Create a customer record for future orders and relationship history."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            {/* Name */}
            <div>
              <label
                htmlFor="customer-name"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Customer Name
              </label>

              <input
                id="customer-name"
                type="text"
                maxLength={120}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isPending}
                placeholder="e.g. Priya Sharma"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              />
            </div>

            {/* Contact */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="customer-email"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Email
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="customer-email"
                  type="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isPending}
                  placeholder="customer@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-phone"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Phone
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="customer-phone"
                  type="tel"
                  maxLength={30}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isPending}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="customer-city"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  City
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="customer-city"
                  type="text"
                  maxLength={100}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  disabled={isPending}
                  placeholder="e.g. Dehradun"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-state"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  State
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="customer-state"
                  type="text"
                  maxLength={100}
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  disabled={isPending}
                  placeholder="e.g. Uttarakhand"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="customer-notes"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Notes
                <span className="ml-1 font-normal text-slate-400">
                  (optional)
                </span>
              </label>

              <textarea
                id="customer-notes"
                maxLength={500}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isPending}
                placeholder="Add any relevant customer context..."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              />
            </div>

            {/* Error */}
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
              >
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}