"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";
import { createCustomerAction, updateCustomerAction } from "@/modules/customers/actions";
import type { SerializedCustomer } from "@/modules/customers/types";

interface CustomerFormDialogProps {
  open: boolean;
  customer?: SerializedCustomer | null;
  onClose: () => void;
}

export function CustomerFormDialog({ open, customer, onClose }: CustomerFormDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(customer);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? "");
    setEmail(customer?.email ?? "");
    setPhone(customer?.phone ?? "");
    setAddressLine1(customer?.addressLine1 ?? "");
    setAddressLine2(customer?.addressLine2 ?? "");
    setCity(customer?.city ?? "");
    setState(customer?.state ?? "");
    setPostalCode(customer?.postalCode ?? "");
    setCountry(customer?.country ?? "India");
    setNotes(customer?.notes ?? "");
    setError(null);
  }, [open, customer]);

  useEffect(() => {
    if (!open || isPending) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isPending, onClose]);

  if (!open) return null;

  const inputClassName = "w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring/30 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70";
  const labelClassName = "mb-1.5 block text-sm font-medium text-text-primary";
  const optionalClassName = "ml-1 font-normal text-text-muted";
  const field = (id: string, label: string, value: string, setValue: (v: string) => void, placeholder: string, maxLength = 100) => (
    <div>
      <label htmlFor={id} className={labelClassName}>{label}<span className={optionalClassName}>(optional)</span></label>
      <input id={id} name={id} type="text" maxLength={maxLength} value={value}
        onChange={(e) => setValue(e.target.value)} disabled={isPending}
        placeholder={placeholder} className={inputClassName} />
    </div>
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const payload = { name, email, phone, addressLine1, addressLine2, city, state, postalCode, country, notes };
    startTransition(async () => {
      const result = isEditing
        ? await updateCustomerAction({ id: customer!.id, ...payload })
        : await createCustomerAction(payload);
      if (!result.success) { setError(result.error ?? "Unable to save customer."); return; }
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="customer-form-dialog-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-[var(--shadow-overlay)] sm:max-h-[calc(100dvh-2rem)]"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><UserPlus className="h-5 w-5" aria-hidden="true" /></div>
            <div>
              <h2 id="customer-form-dialog-title" className="text-base font-semibold text-text-primary">{isEditing ? "Edit Customer" : "Add Customer"}</h2>
              <p className="mt-1 text-sm text-text-secondary">{isEditing ? "Update the customer's record." : "Create a customer record for future orders and relationship history."}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} aria-label="Close dialog" className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            {field("customer-name", "Customer Name", name, setName, "e.g. Priya Sharma", 120)}
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="customer-email" className={labelClassName}>Email<span className={optionalClassName}>(optional)</span></label><input id="customer-email" type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={isPending} placeholder="customer@example.com" className={inputClassName}/></div>
              <div><label htmlFor="customer-phone" className={labelClassName}>Phone<span className={optionalClassName}>(optional)</span></label><input id="customer-phone" type="tel" maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} disabled={isPending} placeholder="+91 98765 43210" className={inputClassName}/></div>
            </div>
            <div className="border-t border-border pt-4"><h3 className="mb-3 text-sm font-semibold text-text-primary">Address</h3>
              <div className="space-y-4">
                {field("customer-address-line-1", "Address Line 1", addressLine1, setAddressLine1, "House no., street, locality", 200)}
                {field("customer-address-line-2", "Address Line 2", addressLine2, setAddressLine2, "Apartment, landmark, area", 200)}
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("customer-city", "City", city, setCity, "e.g. Dehradun")}
                  {field("customer-state", "State", state, setState, "e.g. Uttarakhand")}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("customer-postal-code", "PIN Code", postalCode, setPostalCode, "e.g. 248001", 20)}
                  {field("customer-country", "Country", country, setCountry, "India", 100)}
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="customer-notes" className={labelClassName}>Notes<span className={optionalClassName}>(optional)</span></label>
              <textarea id="customer-notes" maxLength={500} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} disabled={isPending} placeholder="Add any relevant customer context..." className={`${inputClassName} min-h-24 resize-y`}/>
              <p className="mt-1 text-right text-xs text-text-muted">{notes.length}/500</p>
            </div>
            {error ? <div role="alert" aria-live="assertive" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">{error}</div> : null}
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface-muted/50 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} disabled={isPending} className="min-h-10 rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-sm font-semibold text-text-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="min-h-10 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">{isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Customer"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
