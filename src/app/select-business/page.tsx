
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, Plus } from "lucide-react";

import { switchBusinessAction } from "@/modules/business/actions";
import {
  getActiveBusinessIdFromCookie,
  getAvailableBusinesses,
} from "@/modules/business/tenant-resolution";

export default async function SelectBusinessPage() {
  const [businesses, activeBusinessId] = await Promise.all([
    getAvailableBusinesses(),
    getActiveBusinessIdFromCookie(),
  ]);

  if (businesses.length === 0) {
    redirect("/onboarding");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-4 py-12">
      <div className="w-full max-w-2xl">
        <header className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-text-primary"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173d34] text-white">
              K.
            </span>
            Karya.
          </Link>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
            Business workspace
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Select a business
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
            Choose which business workspace you want to open. Each workspace
            keeps its operational data separate.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-surface-raised p-3 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between px-2 py-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Your businesses
            </h2>
            <span className="text-xs text-text-muted">
              {businesses.length}{" "}
              {businesses.length === 1 ? "workspace" : "workspaces"}
            </span>
          </div>

          <div className="space-y-2">
            {businesses.map((business) => {
              const isActive = business.id === activeBusinessId;

              return (
                <form
                  key={business.id}
                  action={switchBusinessAction}
                >
                  <input
                    type="hidden"
                    name="businessId"
                    value={business.id}
                  />

                  <button
                    type="submit"
                    className={`group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                      isActive
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-border bg-surface-raised hover:border-border-strong hover:bg-surface-muted"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-surface-muted text-text-secondary"
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-text-primary">
                          {business.name}
                        </span>

                        {isActive && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Active
                          </span>
                        )}
                      </span>

                      <span className="mt-1 block text-xs text-text-secondary">
                        {business.industry}
                      </span>

                      <span className="mt-1 block truncate text-[11px] text-text-muted">
                        {business.slug}
                      </span>
                    </span>

                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                        isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "text-text-muted group-hover:bg-slate-200 group-hover:text-text-secondary"
                      }`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
        </section>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-dashed border-border-strong bg-surface-raised/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Setting up another business?
            </p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Create a separate workspace through the existing onboarding flow.
            </p>
          </div>

          <Link
            href="/onboarding"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#173d34] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#12342d]"
          >
            <Plus className="h-4 w-4" />
            Add business
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          Karya. · Local Business Operating System
        </p>
      </div>
    </main>
  );
}