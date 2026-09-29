
"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";
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

  const inputClassName =
    "w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring/30 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70";

  const labelClassName =
    "mb-1.5 block text-sm font-medium text-text-primary";

  const optionalClassName =
    "ml-1 font-normal text-text-muted";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-4"
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
        aria-describedby="customer-form-dialog-description"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-[var(--shadow-overlay)] sm:max-h-[calc(100dvh-2rem)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <h2
                id="customer-form-dialog-title"
                className="text-base font-semibold text-text-primary"
              >
                {isEditing ? "Edit Customer" : "Add Customer"}
              </h2>

              <p
                id="customer-form-dialog-description"
                className="mt-1 text-sm leading-5 text-text-secondary"
              >
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
            className="shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div>
              <label htmlFor="customer-name" className={labelClassName}>
                Customer Name
              </label>
              <input
                id="customer-name"
                name="name"
                type="text"
                maxLength={120}
                required
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isPending}
                placeholder="e.g. Priya Sharma"
                className={inputClassName}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="customer-email" className={labelClassName}>
                  Email
                  <span className={optionalClassName}>(optional)</span>
                </label>
                <input
                  id="customer-email"
                  name="email"
                  type="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isPending}
                  placeholder="customer@example.com"
                  className={inputClassName}
                />
              </div>

              <div>
                <label htmlFor="customer-phone" className={labelClassName}>
                  Phone
                  <span className={optionalClassName}>(optional)</span>
                </label>
                <input
                  id="customer-phone"
                  name="phone"
                  type="tel"
                  maxLength={30}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isPending}
                  placeholder="+91 98765 43210"
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="customer-city" className={labelClassName}>
                  City
                  <span className={optionalClassName}>(optional)</span>
                </label>
                <input
                  id="customer-city"
                  name="city"
                  type="text"
                  maxLength={100}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  disabled={isPending}
                  placeholder="e.g. Dehradun"
                  className={inputClassName}
                />
              </div>

              <div>
                <label htmlFor="customer-state" className={labelClassName}>
                  State
                  <span className={optionalClassName}>(optional)</span>
                </label>
                <input
                  id="customer-state"
                  name="state"
                  type="text"
                  maxLength={100}
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  disabled={isPending}
                  placeholder="e.g. Uttarakhand"
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="customer-notes" className={labelClassName}>
                Notes
                <span className={optionalClassName}>(optional)</span>
              </label>
              <textarea
                id="customer-notes"
                name="notes"
                maxLength={500}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isPending}
                placeholder="Add any relevant customer context..."
                className={`${inputClassName} min-h-24 resize-y`}
              />
              <p className="mt-1 text-right text-xs text-text-muted">
                {notes.length}/500
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
              >
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface-muted/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="min-h-10 rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="min-h-10 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
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