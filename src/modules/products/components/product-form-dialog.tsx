"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProductStatus } from "@prisma/client";
import {
  X,
  Loader2,
  AlertCircle,
  TrendingUp,
  Calculator,
} from "lucide-react";

import {
  createProductAction,
  updateProductAction,
} from "@/modules/products/actions";
import {
  CreateProductSchema,
  UpdateProductSchema,
} from "@/modules/products/validation";
import { formatINR } from "@/lib/formatters";
import type { SerializedProduct } from "@/modules/products/types";
import type { ProductEconomics } from "@/modules/product-economics/types";

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: SerializedProduct | null;
  productEconomics?: ProductEconomics | null;
}

interface FormState {
  name: string;
  sku: string;
  category: string;
  description: string;
  supplier: string;
  status: ProductStatus;
  reorderLevel: string;
  sellingPrice: string;
}

const DEFAULT_FORM_STATE: FormState = {
  name: "",
  sku: "",
  category: "Skincare",
  description: "",
  supplier: "",
  status: ProductStatus.DRAFT,
  reorderLevel: "20",
  sellingPrice: "",
};

function isValidProductStatus(val: string): val is ProductStatus {
  return Object.values(ProductStatus).includes(val as ProductStatus);
}

function parseMoneyInput(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export function ProductFormDialog({
  isOpen,
  onClose,
  productToEdit,
  productEconomics,
}: ProductFormDialogProps) {
  const router = useRouter();
  const isEditMode = Boolean(productToEdit);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] =
    useState<FormState>(DEFAULT_FORM_STATE);

  const [fieldErrors, setFieldErrors] =
    useState<Record<string, string>>({});

  const [generalError, setGeneralError] =
    useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const initialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        sku: productToEdit.sku.toUpperCase(),
        category: productToEdit.category || "Skincare",
        description: productToEdit.description || "",
        supplier: productToEdit.supplier || "",
        status: productToEdit.status,
        reorderLevel: productToEdit.reorderLevel.toString(),
        sellingPrice:
          productToEdit.sellingPrice !== null
            ? productToEdit.sellingPrice.toString()
            : "",
      });
    } else {
      setFormData(DEFAULT_FORM_STATE);
    }

    setFieldErrors({});
    setGeneralError(null);

    const timer = setTimeout(() => {
      initialInputRef.current?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, productToEdit]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!isPending) {
          onClose();
        }

        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialogElement = dialogRef.current;

      if (!dialogElement) {
        return;
      }

      const focusableElements =
        dialogElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[focusableElements.length - 1];

      const currentFocused = document.activeElement;

      if (
        !currentFocused ||
        !dialogElement.contains(currentFocused)
      ) {
        event.preventDefault();

        if (event.shiftKey) {
          lastElement.focus();
        } else {
          firstElement.focus();
        }

        return;
      }

      if (event.shiftKey) {
        if (currentFocused === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (currentFocused === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onClose]);

  const economics = productEconomics ?? null;

  const liveEconomics = useMemo(() => {
    if (!economics) {
      return {
        rawMaterialCost: null,
        packagingCost: null,
        preShippingCost: null,
        sellingPrice: parseMoneyInput(formData.sellingPrice),
        contributionProfit: null,
        contributionMarginPct: null,
      };
    }

    const rawMaterialCost = economics.rawMaterialCostPerUnit;
    const packagingCost = economics.packagingCostPerUnit;

    const preShippingCost =
      rawMaterialCost !== null && packagingCost !== null
        ? rawMaterialCost + packagingCost
        : null;

    const sellingPrice = parseMoneyInput(formData.sellingPrice);

    const contributionProfit =
      preShippingCost !== null &&
      sellingPrice !== null &&
      sellingPrice > 0
        ? sellingPrice - preShippingCost
        : null;

    const contributionMarginPct =
      contributionProfit !== null &&
      sellingPrice !== null &&
      sellingPrice > 0
        ? (contributionProfit / sellingPrice) * 100
        : null;

    return {
      rawMaterialCost,
      packagingCost,
      preShippingCost,
      sellingPrice,
      contributionProfit,
      contributionMarginPct,
    };
  }, [economics, formData.sellingPrice]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (
    field: keyof FormState,
    value: string | ProductStatus,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    setGeneralError(null);
  };

  const handleStatusChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const raw = e.target.value;

    if (isValidProductStatus(raw)) {
      handleChange("status", raw);
    }
  };

  const handleSkuChange = (val: string) => {
    handleChange("sku", val.toUpperCase().trim());
  };

  const handleBackdropClick = (
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (e.target === e.currentTarget && !isPending) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setFieldErrors({});
    setGeneralError(null);

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      category: formData.category.trim() || "Skincare",
      description:
        formData.description.trim() === ""
          ? null
          : formData.description.trim(),
      supplier:
        formData.supplier.trim() === ""
          ? null
          : formData.supplier.trim(),
      status: formData.status,
      reorderLevel:
        formData.reorderLevel.trim() === ""
          ? 20
          : Number(formData.reorderLevel),
      sellingPrice: parseMoneyInput(formData.sellingPrice),

      /*
       * Legacy product-cost fields are intentionally no longer
       * editable from this UI.
       *
       * Product economics are now calculated dynamically from:
       *
       *   Active Formulation
       *        +
       *   Active Packaging Configuration
       *
       * These legacy fields remain temporarily for backwards
       * compatibility and will be removed during Phase 6 cleanup.
       */
      cogs: null,
      packagingCost: null,
      variableCost: null,
    };

    if (productToEdit) {
      const parsed = UpdateProductSchema.safeParse({
        id: productToEdit.id,
        ...payload,
      });

      if (!parsed.success) {
        const formattedErrors: Record<string, string> = {};

        parsed.error.issues.forEach((err) => {
          const pathKey = err.path[0]?.toString();

          if (pathKey && !formattedErrors[pathKey]) {
            formattedErrors[pathKey] = err.message;
          }
        });

        setFieldErrors(formattedErrors);
        return;
      }

      startTransition(async () => {
        const res = await updateProductAction(parsed.data);

        if (!res.success) {
          setGeneralError(
            res.error || "Failed to update product.",
          );
        } else {
          onClose();
          router.refresh();
        }
      });
    } else {
      const parsed = CreateProductSchema.safeParse(payload);

      if (!parsed.success) {
        const formattedErrors: Record<string, string> = {};

        parsed.error.issues.forEach((err) => {
          const pathKey = err.path[0]?.toString();

          if (pathKey && !formattedErrors[pathKey]) {
            formattedErrors[pathKey] = err.message;
          }
        });

        setFieldErrors(formattedErrors);
        return;
      }

      startTransition(async () => {
        const res = await createProductAction(parsed.data);

        if (!res.success) {
          setGeneralError(
            res.error || "Failed to create product.",
          );
        } else {
          onClose();
          router.refresh();
        }
      });
    }
  };

  const hasEconomics = economics !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-dialog-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/50 p-2 backdrop-blur-sm sm:p-3"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="my-0 max-h-[calc(100dvh-1rem)] w-full max-w-4xl space-y-3 overflow-y-auto rounded-xl border border-border bg-surface-raised p-4 shadow-xl sm:max-h-[calc(100dvh-1.5rem)] sm:p-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <h2
              id="product-dialog-title"
              className="text-lg font-bold tracking-tight text-text-primary"
            >
              {isEditMode
                ? "Edit Catalog Offering"
                : "Add New Offering"}
            </h2>

            <p className="mt-0.5 text-xs text-text-secondary">
              {isEditMode
                ? `Updating product details for SKU: ${productToEdit?.sku}`
                : "Register a core offering with pricing and product details."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-muted hover:text-text-secondary disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {generalError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Product Name */}
              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="product-name"
                  className="block text-xs font-semibold text-text-secondary"
                >
                  Product Name *
                </label>

                <input
                  id="product-name"
                  ref={initialInputRef}
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    handleChange("name", e.target.value)
                  }
                  placeholder="e.g., Brightening Face Pack"
                  disabled={isPending}
                  className={`w-full rounded-lg border px-3 py-2 text-xs text-text-primary shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.name
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-border-strong focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />

                {fieldErrors.name && (
                  <p className="text-[11px] text-red-600">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* SKU */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="product-sku"
                    className="block text-xs font-semibold text-text-secondary"
                  >
                    SKU *
                  </label>

                  <span className="text-[10px] text-text-muted">
                    Uppercase only
                  </span>
                </div>

                <input
                  id="product-sku"
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    handleSkuChange(e.target.value)
                  }
                  placeholder="e.g., PR-BFP-100"
                  disabled={isPending}
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-xs uppercase text-text-primary shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.sku
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-border-strong focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />

                {fieldErrors.sku && (
                  <p className="text-[11px] text-red-600">
                    {fieldErrors.sku}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label
                  htmlFor="product-category"
                  className="block text-xs font-semibold text-text-secondary"
                >
                  Category
                </label>

                <input
                  id="product-category"
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    handleChange("category", e.target.value)
                  }
                  placeholder="Skincare"
                  disabled={isPending}
                  className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                {fieldErrors.category && (
                  <p className="text-[11px] text-red-600">
                    {fieldErrors.category}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label
                  htmlFor="product-status"
                  className="block text-xs font-semibold text-text-secondary"
                >
                  Status
                </label>

                <select
                  id="product-status"
                  value={formData.status}
                  onChange={handleStatusChange}
                  disabled={isPending}
                  className="w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-xs font-medium text-text-primary shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={ProductStatus.DRAFT}>
                    Draft
                  </option>

                  <option value={ProductStatus.ACTIVE}>
                    Active
                  </option>

                  <option value={ProductStatus.ARCHIVED}>
                    Archived
                  </option>
                </select>
              </div>

              {/* Reorder Level */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="product-reorder"
                    className="block text-xs font-semibold text-text-secondary"
                  >
                    Reorder Alert Threshold
                  </label>

                  <span className="text-[10px] text-text-muted">
                    Stock cache trigger
                  </span>
                </div>

                <input
                  id="product-reorder"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.reorderLevel}
                  onChange={(e) =>
                    handleChange(
                      "reorderLevel",
                      e.target.value,
                    )
                  }
                  disabled={isPending}
                  className={`w-full rounded-lg border px-3 py-2 text-xs text-text-primary shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.reorderLevel
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-border-strong focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />

                {fieldErrors.reorderLevel && (
                  <p className="text-[11px] text-red-600">
                    {fieldErrors.reorderLevel}
                  </p>
                )}
              </div>

              {/* Supplier */}
              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="product-supplier"
                  className="block text-xs font-semibold text-text-secondary"
                >
                  Supplier / Vendor (Optional)
                </label>

                <input
                  id="product-supplier"
                  type="text"
                  value={formData.supplier}
                  onChange={(e) =>
                    handleChange("supplier", e.target.value)
                  }
                  placeholder="e.g., Supplier name"
                  disabled={isPending}
                  className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="product-description"
                  className="block text-xs font-semibold text-text-secondary"
                >
                  Product Description (Optional)
                </label>

                <textarea
                  id="product-description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    handleChange(
                      "description",
                      e.target.value,
                    )
                  }
                  placeholder="Key specifications, formulation details, or packaging volume..."
                  disabled={isPending}
                  className="w-full rounded-lg border border-border-strong px-3 py-2 text-xs text-text-primary shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3 border-t border-border pt-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Pricing
              </h3>

              <p className="mt-1 text-[11px] leading-5 text-text-muted">
                Selling price is the only product-level pricing input.
                Product costs are calculated automatically from your
                formulation and packaging configuration.
              </p>
            </div>

            <div className="max-w-sm space-y-1">
              <label
                htmlFor="product-sp"
                className="block text-xs font-semibold text-text-secondary"
              >
                Target Selling Price (₹)
              </label>

              <input
                id="product-sp"
                type="number"
                min="0"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) =>
                  handleChange(
                    "sellingPrice",
                    e.target.value,
                  )
                }
                placeholder="e.g., 650.00"
                disabled={isPending}
                className={`w-full rounded-lg border px-3 py-2 text-xs text-text-primary shadow-sm focus:outline-none focus:ring-1 ${
                  fieldErrors.sellingPrice
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-border-strong focus:border-blue-500 focus:ring-blue-500"
                }`}
              />

              {fieldErrors.sellingPrice && (
                <p className="text-[11px] text-red-600">
                  {fieldErrors.sellingPrice}
                </p>
              )}
            </div>
          </div>

          {/* Dynamic Product Economics */}
          <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-3">
            <div className="flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-blue-600 shadow-sm">
                <Calculator className="h-4 w-4" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />

                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Product Economics
                  </h3>
                </div>

                <p className="mt-1 text-[11px] leading-5 text-text-secondary">
                  Costs are calculated automatically from the active
                  formulation and active packaging configuration.
                </p>
              </div>
            </div>

            {!hasEconomics ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                  <div>
                    <p className="text-xs font-semibold text-amber-800">
                      Product economics not available yet
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-amber-700">
                      Save the product first, then configure its active
                      formulation and packaging. The economics will be
                      calculated automatically from current inventory
                      costs.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <EconomicsValue
                    label="Raw material"
                    value={liveEconomics.rawMaterialCost}
                    missingReason={
                      economics.rawMaterialComponent.missingReason
                    }
                  />

                  <EconomicsValue
                    label="Packaging"
                    value={liveEconomics.packagingCost}
                    missingReason={
                      economics.packagingComponent.missingReason
                    }
                  />

                  <EconomicsValue
                    label="Pre-shipping cost"
                    value={liveEconomics.preShippingCost}
                    emphasis
                    missingReason={
                      economics.preShippingUnitCost === null
                        ? economics.incompleteReason
                        : null
                    }
                  />

                  <EconomicsValue
                    label="Selling price"
                    value={liveEconomics.sellingPrice}
                    missingReason={
                      liveEconomics.sellingPrice === null
                        ? "Selling price not set"
                        : null
                    }
                  />

                  <EconomicsValue
                    label="Contribution profit"
                    value={liveEconomics.contributionProfit}
                    emphasis
                    tone={
                      liveEconomics.contributionProfit === null
                        ? "neutral"
                        : liveEconomics.contributionProfit < 0
                          ? "negative"
                          : "positive"
                    }
                    missingReason={
                      liveEconomics.contributionProfit === null
                        ? liveEconomics.preShippingCost === null
                          ? economics.incompleteReason
                          : "Enter a selling price above ₹0"
                        : null
                    }
                  />

                  <EconomicsValue
                    label="Contribution margin"
                    value={liveEconomics.contributionMarginPct}
                    suffix="%"
                    emphasis
                    tone={
                      liveEconomics.contributionMarginPct === null
                        ? "neutral"
                        : liveEconomics.contributionMarginPct < 0
                          ? "negative"
                          : "positive"
                    }
                    missingReason={
                      liveEconomics.contributionMarginPct === null
                        ? liveEconomics.preShippingCost === null
                          ? economics.incompleteReason
                          : "Enter a selling price above ₹0"
                        : null
                    }
                  />
                </div>

                <div className="border-t border-border pt-3">
                  <div className="grid gap-2 text-[10px] text-text-secondary sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-text-secondary">
                        Formulation:
                      </span>{" "}
                      {economics.activeFormulationVersion !== null
                        ? `Version ${economics.activeFormulationVersion}`
                        : "Not configured"}
                    </div>

                    <div>
                      <span className="font-semibold text-text-secondary">
                        Packaging:
                      </span>{" "}
                      {economics.activePackagingConfigurationVersion !==
                      null
                        ? `Version ${economics.activePackagingConfigurationVersion}`
                        : "Not configured"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-muted disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}

              {isPending
                ? isEditMode
                  ? "Saving Changes..."
                  : "Creating Offering..."
                : isEditMode
                  ? "Save Changes"
                  : "Register Offering"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EconomicsValue({
  label,
  value,
  suffix,
  emphasis = false,
  tone = "neutral",
  missingReason,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  emphasis?: boolean;
  tone?: "neutral" | "positive" | "negative";
  missingReason?: string | null;
}) {
  const valueClass =
    tone === "negative"
      ? "text-amber-700"
      : tone === "positive"
        ? "text-emerald-700"
        : "text-text-primary";

  return (
    <div className="rounded-lg border border-border bg-surface-raised px-2.5 py-2">
      <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </span>

      <span
        className={`mt-1 block ${
          emphasis ? "text-sm" : "text-xs"
        } font-bold ${valueClass}`}
      >
        {value !== null
          ? suffix === "%"
            ? `${value.toFixed(1)}%`
            : formatINR(value)
          : "Not ready"}
      </span>

      {value === null && missingReason && (
        <span className="mt-1 block text-[9px] leading-4 text-text-muted">
          {missingReason}
        </span>
      )}
    </div>
  );
}