"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  Globe2,
  Mail,
  PackageSearch,
  Phone,
  ReceiptText,
  Users,
  Plug,
  CreditCard,
  Download,
} from "lucide-react";

import {
  updateBusinessProfileAction,
  updateBusinessSettingsAction,
} from "../actions";

import type {
  SerializedBusinessProfile,
  SerializedBusinessSettings,
} from "../types";

interface SettingsFormProps {
  profile: SerializedBusinessProfile;
  settings: SerializedBusinessSettings;
}

type SettingsSection =
  | "profile"
  | "preferences"
  | "orders"
  | "inventory"
  | "support"
  | "backup"
  | "export";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function SettingsForm({
  profile,
  settings,
}: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");

  const [form, setForm] = useState({
    name: profile.name,
    tagline: profile.tagline ?? "",
    description: profile.description ?? "",
    industry: profile.industry,
    constitution: profile.constitution ?? "",
    countryCode: profile.countryCode ?? "",

    currencyCode: settings.currencyCode,
    currencySymbol: settings.currencySymbol,
    fiscalYearStart: String(settings.fiscalYearStart),
    orderPrefix: settings.orderPrefix,
    nextOrderNumber: String(settings.nextOrderNumber),
    supportEmail: settings.supportEmail ?? "",
    supportPhone: settings.supportPhone ?? "",
    lowStockThreshold: String(settings.lowStockThreshold),
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess(false);
    setError(null);
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const profileResult =
        await updateBusinessProfileAction({
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          industry: form.industry,
          constitution: form.constitution,
          countryCode: form.countryCode,
        });

      if (!profileResult.success) {
        setError(
          profileResult.error ??
            "Unable to update business profile.",
        );

        return;
      }

      const settingsResult =
        await updateBusinessSettingsAction({
          currencyCode: form.currencyCode,
          currencySymbol: form.currencySymbol,
          fiscalYearStart: form.fiscalYearStart,
          orderPrefix: form.orderPrefix,
          nextOrderNumber: form.nextOrderNumber,
          supportEmail: form.supportEmail,
          supportPhone: form.supportPhone,
          lowStockThreshold: form.lowStockThreshold,
        });

      if (!settingsResult.success) {
        setError(
          settingsResult.error ??
            "Unable to update business settings.",
        );

        return;
      }

      setSuccess(true);
    });
  }

  return (
    <form
      id="settings-form"
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
    >
      {/* Workspace Header */}
      <div className="border-b border-border px-6 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h1 className="text-[21px] font-semibold tracking-[-0.03em] text-text-primary">
              Business Settings
            </h1>

            <p className="mt-1 text-xs text-text-secondary">
              Manage your business details and preferences.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[#005944] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#004b39] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              "Saving..."
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {(error || success) && (
        <div className="border-b border-border px-6 py-3 sm:px-7">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {success && !error && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Settings saved successfully.
            </div>
          )}
        </div>
      )}

      <div className="grid min-h-[520px] md:grid-cols-[185px_minmax(0,1fr)]">
        {/* Settings Navigation */}
        <aside className="border-b border-border bg-[#fafaf8] md:border-b-0 md:border-r">
          <nav className="p-3">
            <SettingsNavItem
              label="Business Profile"
              icon={Building2}
              active={activeSection === "profile"}
              onClick={() => setActiveSection("profile")}
            />

            <SettingsNavItem
              label="Team"
              icon={Users}
              disabled
              badge="Soon"
            />

            <SettingsNavItem
              label="Preferences"
              icon={Globe2}
              active={activeSection === "preferences"}
              onClick={() => setActiveSection("preferences")}
            />

            <SettingsNavItem
              label="Integrations"
              icon={Plug}
              disabled
              badge="Soon"
            />

            <SettingsNavItem
              label="Billing"
              icon={CreditCard}
              disabled
              badge="Soon"
            />

            <div className="my-3 border-t border-border" />

            <SettingsNavItem
              label="Order Settings"
              icon={ReceiptText}
              active={activeSection === "orders"}
              onClick={() => setActiveSection("orders")}
            />

            <SettingsNavItem
              label="Inventory Alerts"
              icon={PackageSearch}
              active={activeSection === "inventory"}
              onClick={() => setActiveSection("inventory")}
            />

            <SettingsNavItem
              label="Support & Contact"
              icon={Mail}
              active={activeSection === "support"}
              onClick={() => setActiveSection("support")}
            />

            <SettingsNavItem
              label="Local Data Backup"
              icon={FileJson}
              active={activeSection === "backup"}
              onClick={() => setActiveSection("backup")}
            />

            <SettingsNavItem
              label="Export Business Data"
              icon={FileSpreadsheet}
              active={activeSection === "export"}
              onClick={() => setActiveSection("export")}
            />
          </nav>
        </aside>

        {/* Main Settings Panel */}
        <div className="min-w-0 bg-surface-raised">
          {activeSection === "profile" && (
            <BusinessProfileSection
              profile={profile}
              form={form}
              updateField={updateField}
            />
          )}

          {activeSection === "preferences" && (
            <PreferencesSection
              form={form}
              updateField={updateField}
            />
          )}

          {activeSection === "orders" && (
            <OrderSettingsSection
              form={form}
              updateField={updateField}
            />
          )}

          {activeSection === "inventory" && (
            <InventorySection
              form={form}
              updateField={updateField}
            />
          )}

          {activeSection === "support" && (
            <SupportSection
              form={form}
              updateField={updateField}
            />
          )}

          {activeSection === "backup" && (
            <BackupSection />
          )}

          {activeSection === "export" && (
            <ExcelExportSection />
          )}
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

interface SettingsNavItemProps {
  label: string;
  icon: typeof Building2;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  onClick?: () => void;
}

function SettingsNavItem({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  badge,
  onClick,
}: SettingsNavItemProps) {
  if (disabled) {
    return (
      <div className="mb-1 flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-text-muted">
        <Icon className="h-3.5 w-3.5 shrink-0" />

        <span className="min-w-0 flex-1">
          {label}
        </span>

        {badge && (
          <span className="text-[8px] font-semibold uppercase tracking-wide text-text-muted">
            {badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition",
        active
          ? "bg-surface-raised text-text-primary shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-slate-200"
          : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-3.5 w-3.5 shrink-0",
          active
            ? "text-text-secondary"
            : "text-text-muted",
        ].join(" ")}
      />

      <span className="min-w-0 flex-1">
        {label}
      </span>

      {active && (
        <ChevronRight className="h-3 w-3 text-text-muted" />
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Business Profile                                                           */
/* -------------------------------------------------------------------------- */

interface FormState {
  name: string;
  tagline: string;
  description: string;
  industry: string;
  constitution: string;
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
  fiscalYearStart: string;
  orderPrefix: string;
  nextOrderNumber: string;
  supportEmail: string;
  supportPhone: string;
  lowStockThreshold: string;
}

interface SectionProps {
  form: FormState;
  updateField: (
    field: keyof FormState,
    value: string,
  ) => void;
}

interface BusinessProfileSectionProps extends SectionProps {
  profile: SerializedBusinessProfile;
}

function BusinessProfileSection({
  profile,
  form,
  updateField,
}: BusinessProfileSectionProps) {
  return (
    <section>
      <SectionHeader
        icon={<Building2 className="h-4 w-4" />}
        title="Business Profile"
        description="Update your business information."
      />

      <div className="grid gap-x-5 gap-y-5 px-6 py-6 sm:px-7 md:grid-cols-2">
        <Field
          label="Business Name"
          value={form.name}
          onChange={(value) =>
            updateField("name", value)
          }
          required
        />

        <Field
          label="Tagline"
          value={form.tagline}
          onChange={(value) =>
            updateField("tagline", value)
          }
        />

        <div>
          <label className={labelClass}>
            Industry
          </label>

          <select
            value={form.industry}
            onChange={(event) =>
              updateField(
                "industry",
                event.target.value,
              )
            }
            required
            className={selectClass}
          >
            <option value="D2C / E-commerce">
              D2C / E-commerce
            </option>
            <option value="Retail">Retail</option>
            <option value="Services">Services</option>
            <option value="Manufacturing">
              Manufacturing
            </option>
            <option value="Food & Beverage">
              Food & Beverage
            </option>
            <option value="Technology">
              Technology
            </option>
            <option value="Other">Other</option>
          </select>
        </div>

        <Field
          label="Constitution"
          value={form.constitution}
          onChange={(value) =>
            updateField("constitution", value)
          }
          placeholder="e.g. Proprietorship"
        />

        <Field
          label="Country Code"
          value={form.countryCode}
          onChange={(value) =>
            updateField("countryCode", value)
          }
          placeholder="e.g. IN"
        />

        <div className="md:col-span-2">
          <label className={labelClass}>
            Description
          </label>

          <textarea
            value={form.description}
            onChange={(event) =>
              updateField(
                "description",
                event.target.value,
              )
            }
            rows={4}
            maxLength={1000}
            className={textareaClass}
            placeholder="Describe the business..."
          />
        </div>

        <div className="md:col-span-2 rounded-lg border border-border bg-surface-muted px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            Business Slug
          </p>

          <p className="mt-1 font-mono text-xs text-text-secondary">
            {profile.slug}
          </p>

          <p className="mt-1 text-[10px] leading-4 text-text-muted">
            Used for tenant identification and cannot
            be changed here.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Preferences                                                                */
/* -------------------------------------------------------------------------- */

function PreferencesSection({
  form,
  updateField,
}: SectionProps) {
  return (
    <section>
      <SectionHeader
        icon={<Globe2 className="h-4 w-4" />}
        title="Preferences"
        description="Currency and financial-year configuration."
      />

      <div className="grid gap-5 px-6 py-6 sm:px-7 md:grid-cols-3">
        <Field
          label="Currency Code"
          value={form.currencyCode}
          onChange={(value) =>
            updateField("currencyCode", value)
          }
          required
        />

        <Field
          label="Currency Symbol"
          value={form.currencySymbol}
          onChange={(value) =>
            updateField("currencySymbol", value)
          }
          required
        />

        <div>
          <label className={labelClass}>
            Financial Year Starts
          </label>

          <select
            value={form.fiscalYearStart}
            onChange={(event) =>
              updateField(
                "fiscalYearStart",
                event.target.value,
              )
            }
            className={selectClass}
          >
            {MONTHS.map((month, index) => (
              <option
                key={month}
                value={String(index + 1)}
              >
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

function OrderSettingsSection({
  form,
  updateField,
}: SectionProps) {
  return (
    <section>
      <SectionHeader
        icon={<ReceiptText className="h-4 w-4" />}
        title="Order Settings"
        description="Controls used when new orders are created."
      />

      <div className="grid gap-5 px-6 py-6 sm:px-7 md:grid-cols-2">
        <Field
          label="Order Prefix"
          value={form.orderPrefix}
          onChange={(value) =>
            updateField("orderPrefix", value)
          }
          required
        />

        <Field
          label="Next Order Number"
          type="number"
          value={form.nextOrderNumber}
          onChange={(value) =>
            updateField(
              "nextOrderNumber",
              value,
            )
          }
          required
        />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Inventory                                                                  */
/* -------------------------------------------------------------------------- */

function InventorySection({
  form,
  updateField,
}: SectionProps) {
  return (
    <section>
      <SectionHeader
        icon={<PackageSearch className="h-4 w-4" />}
        title="Inventory Alerts"
        description="Configure the default low-stock operational threshold."
      />

      <div className="px-6 py-6 sm:px-7">
        <div className="max-w-sm">
          <Field
            label="Low Stock Threshold"
            type="number"
            value={form.lowStockThreshold}
            onChange={(value) =>
              updateField(
                "lowStockThreshold",
                value,
              )
            }
            required
          />

          <p className="mt-2 text-[10px] leading-4 text-text-muted">
            Individual product reorder levels remain
            stored on each product.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Support                                                                    */
/* -------------------------------------------------------------------------- */

function SupportSection({
  form,
  updateField,
}: SectionProps) {
  return (
    <section>
      <SectionHeader
        icon={<Mail className="h-4 w-4" />}
        title="Support & Contact"
        description="Business contact information used by the BOS."
      />

      <div className="grid gap-5 px-6 py-6 sm:px-7 md:grid-cols-2">
        <Field
          label="Support Email"
          type="email"
          value={form.supportEmail}
          onChange={(value) =>
            updateField(
              "supportEmail",
              value,
            )
          }
          icon={<Mail className="h-3.5 w-3.5" />}
        />

        <Field
          label="Support Phone"
          type="tel"
          value={form.supportPhone}
          onChange={(value) =>
            updateField(
              "supportPhone",
              value,
            )
          }
          icon={<Phone className="h-3.5 w-3.5" />}
        />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Backup                                                                     */
/* -------------------------------------------------------------------------- */

function BackupSection() {
  return (
    <section>
      <SectionHeader
        icon={<FileJson className="h-4 w-4" />}
        title="Local Data Backup"
        description="Create a local JSON snapshot of your business data."
      />

      <div className="px-6 py-6 sm:px-7">
        <div className="rounded-xl border border-border bg-surface-muted p-5">
          <p className="text-sm font-semibold text-text-primary">
            Business data export
          </p>

          <p className="mt-1 max-w-xl text-xs leading-5 text-text-secondary">
            Includes business configuration and operational
            records. The export is generated locally from
            the currently selected business.
          </p>

          <a
            href="/api/backup"
            download
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-xs font-semibold text-text-secondary shadow-sm transition hover:bg-surface-muted"
          >
            <Download className="h-3.5 w-3.5" />
            Download JSON Backup
          </a>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Excel Export                                                               */
/* -------------------------------------------------------------------------- */

const EXPORT_FALLBACK_FILENAME = "karya-export.xlsx";

function getDownloadFilename(
  contentDisposition: string | null,
) {
  const match = contentDisposition?.match(
    /filename="([^"]+)"/,
  );

  return match?.[1] ?? EXPORT_FALLBACK_FILENAME;
}

async function getExportErrorMessage(
  response: Response,
) {
  try {
    const body = (await response.json()) as {
      error?: string;
    };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Fall through to the generic message.
  }

  return "Unable to generate the Excel export.";
}

function ExcelExportSection() {
  const [isExporting, setIsExporting] =
    useState(false);
  const [exportError, setExportError] =
    useState<string | null>(null);
  const [exportedFile, setExportedFile] =
    useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    setExportedFile(null);

    try {
      const response = await fetch(
        "/api/export/excel",
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        setExportError(
          await getExportErrorMessage(response),
        );

        return;
      }

      const filename = getDownloadFilename(
        response.headers.get("Content-Disposition"),
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setExportedFile(filename);
    } catch {
      setExportError(
        "Unable to reach the server. Please check your connection and try again.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section>
      <SectionHeader
        icon={<FileSpreadsheet className="h-4 w-4" />}
        title="Export Business Data"
        description="Download all business records as an Excel workbook."
      />

      <div className="space-y-4 px-6 py-6 sm:px-7">
        <div className="rounded-xl border border-border bg-surface-muted p-5">
          <p className="text-sm font-semibold text-text-primary">
            Excel workbook export
          </p>

          <p className="mt-1 max-w-xl text-xs leading-5 text-text-secondary">
            Downloads every record stored for the
            currently selected business — products,
            formulations, materials, inventory ledgers,
            production, customers, orders, expenses,
            cash flow, marketing, goals and more — as a
            single .xlsx workbook with one worksheet per
            record type and an export guide.
          </p>

          <div className="mt-4 flex max-w-xl items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

            <span>
              The workbook contains sensitive financial
              and customer information. Review it before
              sharing it with anyone.
            </span>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-xs font-semibold text-text-secondary shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting
              ? "Generating workbook..."
              : "Export Excel Workbook"}
          </button>
        </div>

        {exportError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
            {exportError}
          </div>
        )}

        {exportedFile && !exportError && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Workbook downloaded: {exportedFile}
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                  */
/* -------------------------------------------------------------------------- */

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function SectionHeader({
  icon,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="border-b border-border px-6 py-5 sm:px-7">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-text-secondary">
          {icon}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            {title}
          </h2>

          <p className="mt-0.5 text-[11px] text-text-secondary">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

const labelClass =
  "block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-xs text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const selectClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-xs text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const textareaClass =
  "mt-1.5 w-full resize-none rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-xs leading-5 text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: ReactNode;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  icon,
}: FieldProps) {
  return (
    <div>
      <label className={labelClass}>
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-[28px] -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}

        <input
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={`${inputClass} ${
            icon ? "pl-8" : ""
          }`}
        />
      </div>
    </div>
  );
}