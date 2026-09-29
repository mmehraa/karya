
"use client";

import { useState, type FormEvent } from "react";
import {
  ChevronDown,
  CircleDollarSign,
  Plus,
  Wallet,
} from "lucide-react";
import {
  saveInvestorMarketAssumptionAction,
  saveInvestorVerifiedCashBalanceAction,
} from "../actions";

type MarketFormState = {
  market: "TAM" | "SAM" | "SOM";
  value: string;
  currencyCode: string;
  marketDefinition: string;
  geography: string;
  methodology: string;
  sourceType: "USER_PROVIDED" | "EXTERNAL_RESEARCH";
  sourceName: string;
  sourceUrl: string;
  asOfDate: string;
  notes: string;
};

type CashFormState = {
  amount: string;
  currencyCode: string;
  asOfDate: string;
  sourceDescription: string;
  notes: string;
};

function today(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const initialMarketForm = (): MarketFormState => ({
  market: "TAM",
  value: "",
  currencyCode: "INR",
  marketDefinition: "",
  geography: "India",
  methodology: "",
  sourceType: "USER_PROVIDED",
  sourceName: "",
  sourceUrl: "",
  asOfDate: today(),
  notes: "",
});

const initialCashForm = (): CashFormState => ({
  amount: "",
  currencyCode: "INR",
  asOfDate: today(),
  sourceDescription: "",
  notes: "",
});

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-emerald-500 focus:bg-surface-raised focus:ring-2 focus:ring-emerald-50";

const labelClass = "block text-xs font-medium text-text-secondary";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50";

function StatusMessage({
  message,
  error,
}: {
  message: string;
  error: boolean;
}) {
  if (!message) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className={`rounded-lg border px-3 py-2 text-xs ${
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message}
    </p>
  );
}

export default function InvestorMetricsInputs() {
  const [marketForm, setMarketForm] =
    useState<MarketFormState>(initialMarketForm);
  const [cashForm, setCashForm] =
    useState<CashFormState>(initialCashForm);

  const [marketSaving, setMarketSaving] = useState(false);
  const [cashSaving, setCashSaving] = useState(false);
  const [marketMessage, setMarketMessage] = useState("");
  const [cashMessage, setCashMessage] = useState("");
  const [marketError, setMarketError] = useState(false);
  const [cashError, setCashError] = useState(false);

  function updateMarket<K extends keyof MarketFormState>(
    key: K,
    value: MarketFormState[K],
  ) {
    setMarketForm((current) => ({ ...current, [key]: value }));
  }

  function updateCash<K extends keyof CashFormState>(
    key: K,
    value: CashFormState[K],
  ) {
    setCashForm((current) => ({ ...current, [key]: value }));
  }

  async function submitMarket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMarketSaving(true);
    setMarketMessage("");
    setMarketError(false);

    try {
      const result = await saveInvestorMarketAssumptionAction({
        ...marketForm,
        value: Number(marketForm.value),
      });

      if (!result.success) {
        setMarketError(true);
        setMarketMessage(
          result.error ?? "Could not save market assumption.",
        );
        return;
      }

      setMarketMessage("Market assumption saved successfully.");
      setMarketForm(initialMarketForm());
    } catch {
      setMarketError(true);
      setMarketMessage("Something went wrong while saving.");
    } finally {
      setMarketSaving(false);
    }
  }

  async function submitCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCashSaving(true);
    setCashMessage("");
    setCashError(false);

    try {
      const result = await saveInvestorVerifiedCashBalanceAction({
        ...cashForm,
        amount: Number(cashForm.amount),
      });

      if (!result.success) {
        setCashError(true);
        setCashMessage(
          result.error ?? "Could not save cash balance.",
        );
        return;
      }

      setCashMessage("Verified cash balance saved successfully.");
      setCashForm(initialCashForm());
    } catch {
      setCashError(true);
      setCashMessage("Something went wrong while saving.");
    } finally {
      setCashSaving(false);
    }
  }

  return (
    <section className="rounded-[22px] border border-border bg-surface-raised p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <CircleDollarSign className="h-5 w-5 text-emerald-700" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.035em] text-text-primary">
              Investor data inputs
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Add or update documented assumptions and your verified cash
              position when needed.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {/* Market assumptions */}
        <details className="group min-w-0 rounded-2xl border border-border bg-surface-muted/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 transition hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-text-secondary shadow-sm ring-1 ring-slate-200">
                <CircleDollarSign className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">
                  Market size assumptions
                </h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Record TAM, SAM, or SOM with supporting methodology.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-slate-700">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add assumption</span>
              <span className="sm:hidden">Add</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </span>
          </summary>

          <div className="border-t border-border p-4 sm:p-5">
            <form onSubmit={submitMarket} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Market type
                  <select
                    className={inputClass}
                    value={marketForm.market}
                    onChange={(event) =>
                      updateMarket(
                        "market",
                        event.target.value as MarketFormState["market"],
                      )
                    }
                  >
                    <option value="TAM">TAM — Total Addressable Market</option>
                    <option value="SAM">SAM — Serviceable Available Market</option>
                    <option value="SOM">SOM — Serviceable Obtainable Market</option>
                  </select>
                </label>

                <label className={labelClass}>
                  Market value
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={marketForm.value}
                    onChange={(event) =>
                      updateMarket("value", event.target.value)
                    }
                    placeholder="e.g. 500000000"
                  />
                </label>

                <label className={labelClass}>
                  Currency code
                  <input
                    className={inputClass}
                    required
                    maxLength={3}
                    value={marketForm.currencyCode}
                    onChange={(event) =>
                      updateMarket(
                        "currencyCode",
                        event.target.value.toUpperCase(),
                      )
                    }
                    placeholder="INR"
                  />
                </label>

                <label className={labelClass}>
                  Geography
                  <input
                    className={inputClass}
                    required
                    value={marketForm.geography}
                    onChange={(event) =>
                      updateMarket("geography", event.target.value)
                    }
                    placeholder="e.g. India"
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Market definition
                  <textarea
                    className={inputClass}
                    required
                    rows={2}
                    value={marketForm.marketDefinition}
                    onChange={(event) =>
                      updateMarket("marketDefinition", event.target.value)
                    }
                    placeholder="Define the customers, products, and market included."
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Methodology
                  <textarea
                    className={inputClass}
                    required
                    rows={3}
                    value={marketForm.methodology}
                    onChange={(event) =>
                      updateMarket("methodology", event.target.value)
                    }
                    placeholder="Explain how this estimate was calculated."
                  />
                </label>

                <label className={labelClass}>
                  Source type
                  <select
                    className={inputClass}
                    value={marketForm.sourceType}
                    onChange={(event) =>
                      updateMarket(
                        "sourceType",
                        event.target.value as MarketFormState["sourceType"],
                      )
                    }
                  >
                    <option value="USER_PROVIDED">
                      Founder-provided estimate
                    </option>
                    <option value="EXTERNAL_RESEARCH">
                      External research
                    </option>
                  </select>
                </label>

                <label className={labelClass}>
                  As of date
                  <input
                    className={inputClass}
                    type="date"
                    required
                    value={marketForm.asOfDate}
                    onChange={(event) =>
                      updateMarket("asOfDate", event.target.value)
                    }
                  />
                </label>

                <label className={labelClass}>
                  Source name
                  <input
                    className={inputClass}
                    value={marketForm.sourceName}
                    onChange={(event) =>
                      updateMarket("sourceName", event.target.value)
                    }
                    placeholder="Report, publication, or source"
                    required={marketForm.sourceType === "EXTERNAL_RESEARCH"}
                  />
                </label>

                <label className={labelClass}>
                  Source URL
                  <input
                    className={inputClass}
                    type="url"
                    value={marketForm.sourceUrl}
                    onChange={(event) =>
                      updateMarket("sourceUrl", event.target.value)
                    }
                    placeholder="https://..."
                    required={marketForm.sourceType === "EXTERNAL_RESEARCH"}
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Notes <span className="font-normal text-text-muted">(optional)</span>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={marketForm.notes}
                    onChange={(event) =>
                      updateMarket("notes", event.target.value)
                    }
                    placeholder="Additional context or limitations"
                  />
                </label>
              </div>

              <StatusMessage message={marketMessage} error={marketError} />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-[10px] leading-4 text-text-secondary">
                  External research requires a source name and URL.
                </p>
                <button
                  className={buttonClass}
                  type="submit"
                  disabled={marketSaving}
                >
                  {marketSaving ? "Saving..." : "Save market assumption"}
                </button>
              </div>
            </form>
          </div>
        </details>

        {/* Verified cash balance */}
        <details className="group min-w-0 rounded-2xl border border-border bg-surface-muted/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 transition hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-text-secondary shadow-sm ring-1 ring-slate-200">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">
                  Verified cash balance
                </h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Record a manually checked cash position for runway.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-slate-700">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Update balance</span>
              <span className="sm:hidden">Update</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </span>
          </summary>

          <div className="border-t border-border p-4 sm:p-5">
            <form onSubmit={submitCash} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Cash balance
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={cashForm.amount}
                    onChange={(event) =>
                      updateCash("amount", event.target.value)
                    }
                    placeholder="e.g. 250000"
                  />
                </label>

                <label className={labelClass}>
                  Currency code
                  <input
                    className={inputClass}
                    required
                    maxLength={3}
                    value={cashForm.currencyCode}
                    onChange={(event) =>
                      updateCash(
                        "currencyCode",
                        event.target.value.toUpperCase(),
                      )
                    }
                    placeholder="INR"
                  />
                </label>

                <label className={labelClass}>
                  Balance as of
                  <input
                    className={inputClass}
                    type="date"
                    required
                    value={cashForm.asOfDate}
                    onChange={(event) =>
                      updateCash("asOfDate", event.target.value)
                    }
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Source description
                  <textarea
                    className={inputClass}
                    required
                    rows={3}
                    value={cashForm.sourceDescription}
                    onChange={(event) =>
                      updateCash("sourceDescription", event.target.value)
                    }
                    placeholder="e.g. Checked against business bank account statement"
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Notes <span className="font-normal text-text-muted">(optional)</span>
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={cashForm.notes}
                    onChange={(event) =>
                      updateCash("notes", event.target.value)
                    }
                    placeholder="Additional reconciliation notes or caveats"
                  />
                </label>
              </div>

              <StatusMessage message={cashMessage} error={cashError} />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-[10px] leading-4 text-text-secondary">
                  Manually recorded; not independently bank-reconciled.
                </p>
                <button
                  className={buttonClass}
                  type="submit"
                  disabled={cashSaving}
                >
                  {cashSaving ? "Saving..." : "Save verified cash balance"}
                </button>
              </div>
            </form>
          </div>
        </details>
      </div>
    </section>
  );
}