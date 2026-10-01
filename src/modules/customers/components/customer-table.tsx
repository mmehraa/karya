"use client";

import { Mail, MapPin, Pencil, Phone, Users } from "lucide-react";
import type { SerializedCustomer } from "@/modules/customers/types";

interface CustomerTableProps {
  customers: SerializedCustomer[];
  onEdit: (customer: SerializedCustomer) => void;
}

export function CustomerTable({ customers, onEdit }: CustomerTableProps) {
  if (customers.length === 0) return (
    <div className="flex min-h-[260px] items-center justify-center px-6 py-12">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><Users className="h-6 w-6" aria-hidden="true"/></div>
        <h3 className="mt-4 text-sm font-semibold text-text-primary">No customers yet</h3>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-text-secondary">Customer records will appear here when you add them manually or begin recording orders.</p>
      </div>
    </div>
  );

  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left">
    <caption className="sr-only">Customer directory</caption>
    <thead><tr className="border-b border-border bg-surface-muted/70">
      {["Customer","Contact","Address","Added","Action"].map((h,i)=><th key={h} scope="col" className={`${i===4?"text-right":""} px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:px-6`}>{h}</th>)}
    </tr></thead>
    <tbody className="divide-y divide-border">{customers.map(customer=><tr key={customer.id} className="transition-colors hover:bg-surface-muted/50">
      <td className="px-4 py-4 sm:px-6"><p className="text-sm font-semibold text-text-primary">{customer.name}</p>{customer.notes?<p title={customer.notes} className="mt-1 max-w-[260px] truncate text-xs text-text-muted">{customer.notes}</p>:null}</td>
      <td className="px-4 py-4 sm:px-6"><div className="space-y-1.5 text-sm text-text-secondary">
        {customer.phone?<div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-text-muted"/><span>{customer.phone}</span></div>:null}
        {customer.email?<div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-text-muted"/><span className="max-w-[220px] truncate">{customer.email}</span></div>:null}
        {!customer.phone&&!customer.email?<span className="text-xs text-text-muted">No contact details</span>:null}
      </div></td>
      <td className="px-4 py-4 sm:px-6">{customer.addressLine1||customer.addressLine2||customer.city||customer.state||customer.postalCode||customer.country?<div className="flex items-start gap-2 text-sm text-text-secondary"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted"/><span className="max-w-[280px]">{[customer.addressLine1,customer.addressLine2, [customer.city,customer.state].filter(Boolean).join(", "),customer.postalCode,customer.country].filter(Boolean).join(", ")}</span></div>:<span className="text-xs text-text-muted">Not recorded</span>}</td>
      <td className="whitespace-nowrap px-4 py-4 text-sm text-text-secondary sm:px-6">{new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(customer.createdAt))}</td>
      <td className="px-4 py-4 text-right sm:px-6"><button type="button" onClick={()=>onEdit(customer)} aria-label={`Edit ${customer.name}`} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"><Pencil className="h-3.5 w-3.5" aria-hidden="true"/>Edit</button></td>
    </tr>)}</tbody>
  </table></div>;
}
