"use client";

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProductStatus } from "@prisma/client";
import { X, Loader2, AlertCircle, TrendingUp } from "lucide-react";
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

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: SerializedProduct | null;
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
  cogs: string;
  packagingCost: string;
  variableCost: string;
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
  cogs: "",
  packagingCost: "",
  variableCost: "",
};

function isValidProductStatus(val: string): val is ProductStatus {
  return Object.values(ProductStatus).includes(val as ProductStatus);
}

export function ProductFormDialog({
  isOpen,
  onClose,
  productToEdit,
}: ProductFormDialogProps) {
  const router = useRouter();
  const isEditMode = Boolean(productToEdit);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] =
    useState<FormState>(DEFAULT_FORM_STATE);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>(
    {},
  );
  const [generalError, setGeneralError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const initialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
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
          cogs:
            productToEdit.cogs !== null
              ? productToEdit.cogs.toString()
              : "",
          packagingCost:
            productToEdit.packagingCost !== null
              ? productToEdit.packagingCost.toString()
              : "",
          variableCost:
            productToEdit.variableCost !== null
              ? productToEdit.variableCost.toString()
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
    }
  }, [isOpen, productToEdit]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!isPending) {
          onClose();
        }
        return;
      }

      if (event.key === "Tab") {
        const dialogElement = dialogRef.current;

        if (!dialogElement) return;

        const focusableElements =
          dialogElement.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          );

        if (focusableElements.length === 0) return;

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
        } else {
          if (currentFocused === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onClose]);

  const liveEconomics = useMemo(() => {
    const parseMoney = (val: string): number | null => {
      const trimmed = val.trim();

      if (!trimmed) return null;

      const num = Number(trimmed);

      return Number.isNaN(num) ? null : num;
    };

    const sp = parseMoney(formData.sellingPrice);
    const cogs = parseMoney(formData.cogs);
    const pack = parseMoney(formData.packagingCost);
    const vc = parseMoney(formData.variableCost);

    let totalCost: number | null = null;
    let grossProfit: number | null = null;
    let grossMarginPct: number | null = null;

    if (cogs !== null && pack !== null && vc !== null) {
      totalCost = cogs + pack + vc;

      if (sp !== null) {
        grossProfit = sp - totalCost;

        if (sp > 0) {
          grossMarginPct = (grossProfit / sp) * 100;
        }
      }
    }

    return {
      totalCost,
      grossProfit,
      grossMarginPct,
    };
  }, [
    formData.sellingPrice,
    formData.cogs,
    formData.packagingCost,
    formData.variableCost,
  ]);

  if (!isOpen) return null;

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

    const parseMoneyInput = (val: string): number | null => {
      const trimmed = val.trim();

      return trimmed === "" ? null : Number(trimmed);
    };

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
      cogs: parseMoneyInput(formData.cogs),
      packagingCost: parseMoneyInput(formData.packagingCost),
      variableCost: parseMoneyInput(formData.variableCost),
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-dialog-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2
              id="product-dialog-title"
              className="text-lg font-bold tracking-tight text-slate-900"
            >
              {isEditMode
                ? "Edit Catalog Offering"
                : "Add New Offering"}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {isEditMode
                ? `Updating product details and cost model for SKU: ${productToEdit?.sku}`
                : "Register a core offering with baseline unit economics."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Product Name */}
              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="product-name"
                  className="block text-xs font-semibold text-slate-700"
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
                  className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.name
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
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
                    className="block text-xs font-semibold text-slate-700"
                  >
                    SKU *
                  </label>

                  <span className="text-[10px] text-slate-400">
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
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-xs uppercase text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.sku
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
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
                  className="block text-xs font-semibold text-slate-700"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="block text-xs font-semibold text-slate-700"
                >
                  Status
                </label>

                <select
                  id="product-status"
                  value={formData.status}
                  onChange={handleStatusChange}
                  disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Reorder Alert Threshold
                  </label>

                  <span className="text-[10px] text-slate-400">
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
                  className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.reorderLevel
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
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
                  className="block text-xs font-semibold text-slate-700"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="product-description"
                  className="block text-xs font-semibold text-slate-700"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Financial Inputs */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Unit Economics & Pricing (INR)
              </h3>

              <span className="text-[10px] text-slate-400">
                Leave blank if unrecorded
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Selling Price */}
              <div className="space-y-1">
                <label
                  htmlFor="product-sp"
                  className="block text-xs font-semibold text-slate-700"
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
                  className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.sellingPrice
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />

                {fieldErrors.sellingPrice && (
                  <p className="text-[11px] text-red-600">
                    {fieldErrors.sellingPrice}
                  </p>
                )}
              </div>

              {/* COGS */}
              <div className="space-y-1">
                <label
                  htmlFor="product-cogs"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Raw Material COGS (₹)
                </label>

                <input
                  id="product-cogs"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cogs}
                  onChange={(e) =>
                    handleChange("cogs", e.target.value)
                  }
                  placeholder="e.g., 180.00"
                  disabled={isPending}
                  className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.cogs
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />

                {fieldErrors.cogs && (
                  <p className="text-[11px] text-red-600">
                    {fieldErrors.cogs}
                  </p>
                )}
              </div>

              {/* Packaging Cost */}
              <div className="space-y-1">
                <label
                  htmlFor="product-pack"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Packaging Cost (₹)
                </label>

                <input
                  id="product-pack"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.packagingCost}
                  onChange={(e) =>
                    handleChange(
                      "packagingCost",
                      e.target.value,
                    )
                  }
                  placeholder="e.g., 45.00"
                  disabled={isPending}
                  className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.packagingCost
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />

                {fieldErrors.packagingCost && (
                  <p className="text-[11px] text-red-600">
                    {fieldErrors.packagingCost}
                  </p>
                )}
              </div>

              {/* Variable Cost */}
              <div className="space-y-1">
                <label
                  htmlFor="product-vc"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Direct Variable Handling (₹)
                </label>

                <input
                  id="product-vc"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.variableCost}
                  onChange={(e) =>
                    handleChange(
                      "variableCost",
                      e.target.value,
                    )
                  }
                  placeholder="e.g., 25.00"
                  disabled={isPending}
                  className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.variableCost
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />

                {fieldErrors.variableCost && (
                  <p className="text-[11px] text-red-600">
                    {fieldErrors.variableCost}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Live Derived Unit Economics Preview */}
          <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Live Unit Economics Preview
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Unit Cost
                </span>

                <span className="text-xs font-bold text-slate-900">
                  {liveEconomics.totalCost !== null
                    ? formatINR(liveEconomics.totalCost)
                    : "Not recorded"}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Gross Profit
                </span>

                <span
                  className={`text-xs font-bold ${
                    liveEconomics.grossProfit !== null &&
                    liveEconomics.grossProfit < 0
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }`}
                >
                  {liveEconomics.grossProfit !== null
                    ? formatINR(liveEconomics.grossProfit)
                    : "Not recorded"}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Gross Margin
                </span>

                <span
                  className={`text-xs font-bold ${
                    liveEconomics.grossMarginPct !== null &&
                    liveEconomics.grossMarginPct < 0
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }`}
                >
                  {liveEconomics.grossMarginPct !== null
                    ? `${liveEconomics.grossMarginPct.toFixed(1)}%`
                    : "Not recorded"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
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