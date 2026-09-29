"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, Loader2, Package, RotateCcw, Send, X } from "lucide-react";

import { formatINR } from "@/lib/formatters";

import {
    allocatePromotionalStockAction,
    recordPromotionalDispatchAction,
    releasePromotionalStockAction,
} from "@/modules/inventory/actions";

import type {
    ProductStockSummary,
    PromotionalDispatchResult,
} from "@/modules/inventory/types";

type PromotionalAction = "ALLOCATE" | "RELEASE" | "DISPATCH";

interface PromotionalStockDialogProps {
    open: boolean;
    onClose: () => void;
    products: ProductStockSummary[];
    initialProductId?: string | null;
}

export function PromotionalStockDialog({
    open,
    onClose,
    products,
    initialProductId = null,
}: PromotionalStockDialogProps) {
    const [productId, setProductId] = useState(
        initialProductId ?? products[0]?.id ?? "",
    );

    const [action, setAction] =
        useState<PromotionalAction>("ALLOCATE");

    const [quantity, setQuantity] = useState("");

    const [recipient, setRecipient] = useState("");
    const [purpose, setPurpose] = useState("");
    const [referenceId, setReferenceId] = useState("");
    const [expenseDate, setExpenseDate] = useState(
        getTodayInputValue(),
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] =
        useState<string | null>(null);
    const [dispatchResult, setDispatchResult] =
        useState<PromotionalDispatchResult | null>(null);

    const product = useMemo(
        () => products.find((item) => item.id === productId) ?? null,
        [products, productId],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        setProductId(
            initialProductId ??
            products[0]?.id ??
            "",
        );

        setAction("ALLOCATE");
        setQuantity("");
        setRecipient("");
        setPurpose("");
        setReferenceId("");
        setExpenseDate(getTodayInputValue());
        setError(null);
        setSuccessMessage(null);
        setDispatchResult(null);
    }, [open, initialProductId, products]);

    useEffect(() => {
        if (!open) {
            return;
        }

        if (!productId && products[0]?.id) {
            setProductId(products[0].id);
        }
    }, [open, productId, products]);

    if (!open) {
        return null;
    }

    const parsedQuantity = Number(quantity);

    const quantityIsValid =
        Number.isInteger(parsedQuantity) &&
        parsedQuantity >= 1;

    const availableForAction =
        action === "ALLOCATE"
            ? product?.availableStock ?? 0
            : product?.promotionalStock ?? 0;

    const exceedsAvailable =
        quantityIsValid &&
        parsedQuantity > availableForAction;

    const estimatedDispatchCost =
        action === "DISPATCH" &&
            product?.cogs !== null &&
            product?.cogs !== undefined &&
            quantityIsValid
            ? product.cogs * parsedQuantity
            : null;

    const canSubmit =
        Boolean(product) &&
        quantityIsValid &&
        !exceedsAvailable &&
        !isSubmitting &&
        (action !== "DISPATCH" ||
            (recipient.trim().length >= 2 &&
                purpose.trim().length >= 2));

    async function handleSubmit() {
        if (!product || !quantityIsValid) {
            setError("Enter a valid quantity.");
            return;
        }

        if (exceedsAvailable) {
            setError(
                `Only ${availableForAction} unit${availableForAction === 1 ? "" : "s"
                } available for this action.`,
            );
            return;
        }

        if (
            action === "DISPATCH" &&
            recipient.trim().length < 2
        ) {
            setError("Recipient is required.");
            return;
        }

        if (
            action === "DISPATCH" &&
            purpose.trim().length < 2
        ) {
            setError("Purpose is required.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);
        setDispatchResult(null);

        try {
            if (action === "ALLOCATE") {
                const result =
                    await allocatePromotionalStockAction({
                        productId: product.id,
                        quantity: parsedQuantity,
                    });

                if (!result.success) {
                    setError(
                        result.error ??
                        "Failed to allocate promotional stock.",
                    );
                    return;
                }

                setSuccessMessage(
                    `${parsedQuantity} unit${parsedQuantity === 1 ? "" : "s"
                    } allocated to promotional stock.`,
                );

                setQuantity("");
                return;
            }

            if (action === "RELEASE") {
                const result =
                    await releasePromotionalStockAction({
                        productId: product.id,
                        quantity: parsedQuantity,
                    });

                if (!result.success) {
                    setError(
                        result.error ??
                        "Failed to release promotional stock.",
                    );
                    return;
                }

                setSuccessMessage(
                    `${parsedQuantity} unit${parsedQuantity === 1 ? "" : "s"
                    } released back to available stock.`,
                );

                setQuantity("");
                return;
            }

            const result =
                await recordPromotionalDispatchAction({
                    productId: product.id,
                    quantity: parsedQuantity,
                    recipient: recipient.trim(),
                    purpose: purpose.trim(),
                    referenceId:
                        referenceId.trim() || null,
                    expenseDate: expenseDate
                        ? new Date(`${expenseDate}T00:00:00`)
                        : undefined,
                });

            if (!result.success) {
                setError(
                    result.error ??
                    "Failed to record promotional dispatch.",
                );
                return;
            }

            if (!result.data) {
                setError(
                    "The promotional dispatch was recorded, but no result was returned.",
                );
                return;
            }

            setDispatchResult(result.data);

            setSuccessMessage(
                "Promotional dispatch recorded successfully.",
            );

            setQuantity("");
            setRecipient("");
            setPurpose("");
            setReferenceId("");
        } catch (submissionError) {
            setError(
                submissionError instanceof Error
                    ? submissionError.message
                    : "Something went wrong. Please try again.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleClose() {
        if (isSubmitting) {
            return;
        }

        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="promotional-stock-dialog-title"
                className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <Gift className="h-5 w-5" />
                        </div>

                        <div>
                            <h2
                                id="promotional-stock-dialog-title"
                                className="text-base font-semibold text-text-primary"
                            >
                                Promotional Stock
                            </h2>

                            <p className="mt-1 text-xs leading-5 text-text-secondary">
                                Reserve, release, or dispatch physical stock
                                for promotional use.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
                    {/* Product */}
                    <div>
                        <label
                            htmlFor="promotional-product"
                            className="mb-1.5 block text-xs font-semibold text-text-secondary"
                        >
                            Product
                        </label>

                        <select
                            id="promotional-product"
                            value={productId}
                            onChange={(event) => {
                                setProductId(event.target.value);
                                setError(null);
                                setSuccessMessage(null);
                                setDispatchResult(null);
                            }}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                        >
                            {products.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name} — {item.sku}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Stock summary */}
                    {product && (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            <StockSummary
                                label="Physical"
                                value={product.currentStock}
                                tone="neutral"
                            />

                            <StockSummary
                                label="Promotional"
                                value={product.promotionalStock}
                                tone="violet"
                            />

                            <StockSummary
                                label="Available"
                                value={product.availableStock}
                                tone="emerald"
                            />
                        </div>
                    )}

                    {/* Action */}
                    <div className="mt-5">
                        <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                            Action
                        </label>

                        <div className="grid grid-cols-3 gap-2">
                            <ActionButton
                                active={action === "ALLOCATE"}
                                onClick={() => {
                                    setAction("ALLOCATE");
                                    setQuantity("");
                                    setError(null);
                                    setSuccessMessage(null);
                                    setDispatchResult(null);
                                }}
                                icon={<Gift className="h-4 w-4" />}
                                label="Allocate"
                                disabled={isSubmitting}
                            />

                            <ActionButton
                                active={action === "RELEASE"}
                                onClick={() => {
                                    setAction("RELEASE");
                                    setQuantity("");
                                    setError(null);
                                    setSuccessMessage(null);
                                    setDispatchResult(null);
                                }}
                                icon={<RotateCcw className="h-4 w-4" />}
                                label="Release"
                                disabled={isSubmitting}
                            />

                            <ActionButton
                                active={action === "DISPATCH"}
                                onClick={() => {
                                    setAction("DISPATCH");
                                    setQuantity("");
                                    setError(null);
                                    setSuccessMessage(null);
                                    setDispatchResult(null);
                                }}
                                icon={<Send className="h-4 w-4" />}
                                label="Dispatch"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="mt-5">
                        <label
                            htmlFor="promotional-quantity"
                            className="mb-1.5 block text-xs font-semibold text-text-secondary"
                        >
                            Quantity
                        </label>

                        <input
                            id="promotional-quantity"
                            type="number"
                            min={1}
                            step={1}
                            value={quantity}
                            onChange={(event) => {
                                setQuantity(event.target.value);
                                setError(null);
                                setSuccessMessage(null);
                                setDispatchResult(null);
                            }}
                            disabled={isSubmitting}
                            placeholder="Enter units"
                            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                        />

                        <p className="mt-1.5 text-[11px] text-text-secondary">
                            {action === "ALLOCATE"
                                ? `${product?.availableStock ?? 0} unit${(product?.availableStock ?? 0) === 1
                                    ? ""
                                    : "s"
                                } currently available to allocate.`
                                : `${product?.promotionalStock ?? 0} unit${(product?.promotionalStock ?? 0) === 1
                                    ? ""
                                    : "s"
                                } currently reserved for promotion.`}
                        </p>

                        {exceedsAvailable && (
                            <p className="mt-1 text-[11px] font-medium text-red-600">
                                Quantity exceeds the available promotional
                                balance.
                            </p>
                        )}
                    </div>

                    {/* Dispatch fields */}
                    {action === "DISPATCH" && (
                        <div className="mt-5 space-y-4 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                            <div>
                                <p className="text-xs font-semibold text-violet-900">
                                    Promotional Dispatch Details
                                </p>

                                <p className="mt-1 text-[11px] leading-5 text-violet-700">
                                    Dispatching removes the units from physical
                                    inventory and records their product cost as a
                                    promotional expense.
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="promotional-recipient"
                                    className="mb-1.5 block text-xs font-semibold text-text-secondary"
                                >
                                    Recipient
                                </label>

                                <input
                                    id="promotional-recipient"
                                    type="text"
                                    value={recipient}
                                    onChange={(event) => {
                                        setRecipient(event.target.value);
                                        setError(null);
                                    }}
                                    disabled={isSubmitting}
                                    placeholder="e.g. Creator name, agency, or partner"
                                    className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="promotional-purpose"
                                    className="mb-1.5 block text-xs font-semibold text-text-secondary"
                                >
                                    Purpose
                                </label>

                                <input
                                    id="promotional-purpose"
                                    type="text"
                                    value={purpose}
                                    onChange={(event) => {
                                        setPurpose(event.target.value);
                                        setError(null);
                                    }}
                                    disabled={isSubmitting}
                                    placeholder="e.g. Barter collaboration"
                                    className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="promotional-reference"
                                        className="mb-1.5 block text-xs font-semibold text-text-secondary"
                                    >
                                        Reference
                                        <span className="ml-1 font-normal text-text-muted">
                                            optional
                                        </span>
                                    </label>

                                    <input
                                        id="promotional-reference"
                                        type="text"
                                        value={referenceId}
                                        onChange={(event) =>
                                            setReferenceId(event.target.value)
                                        }
                                        disabled={isSubmitting}
                                        placeholder="Campaign / collab ID"
                                        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="promotional-expense-date"
                                        className="mb-1.5 block text-xs font-semibold text-text-secondary"
                                    >
                                        Expense Date
                                    </label>

                                    <input
                                        id="promotional-expense-date"
                                        type="date"
                                        value={expenseDate}
                                        onChange={(event) =>
                                            setExpenseDate(event.target.value)
                                        }
                                        disabled={isSubmitting}
                                        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-surface-muted"
                                    />
                                </div>
                            </div>

                            {estimatedDispatchCost !== null && (
                                <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-surface-raised px-3.5 py-3">
                                    <div>
                                        <p className="text-[11px] font-semibold text-text-secondary">
                                            Estimated Promotional Expense
                                        </p>

                                        <p className="mt-0.5 text-[10px] text-text-secondary">
                                            Based on recorded product COGS
                                        </p>
                                    </div>

                                    <span className="text-sm font-bold text-violet-800">
                                        {formatINR(estimatedDispatchCost)}
                                    </span>
                                </div>
                            )}

                            {action === "DISPATCH" &&
                                product?.cogs === null && (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
                                        This product does not have recorded COGS.
                                        The dispatch can only be recorded if the
                                        server can determine a valid product cost.
                                    </p>
                                )}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium leading-5 text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {successMessage && (
                        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-medium leading-5 text-emerald-700">
                            {successMessage}
                        </div>
                    )}

                    {/* Dispatch result */}
                    {dispatchResult && (
                        <div className="mt-4 rounded-xl border border-border bg-surface-muted p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-text-primary">
                                    Dispatch Recorded
                                </p>

                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                    Promotional Expense
                                </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <ResultMetric
                                    label="Dispatched"
                                    value={`${dispatchResult.quantity}`}
                                />

                                <ResultMetric
                                    label="Unit Cost"
                                    value={formatINR(
                                        dispatchResult.unitCost,
                                    )}
                                />

                                <ResultMetric
                                    label="Expense"
                                    value={formatINR(
                                        dispatchResult.totalCost,
                                    )}
                                />

                                <ResultMetric
                                    label="Available"
                                    value={`${dispatchResult.availableStock}`}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-muted/50 px-6 py-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {dispatchResult ? "Done" : "Cancel"}
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Processing...
                            </>
                        ) : action === "ALLOCATE" ? (
                            "Allocate Stock"
                        ) : action === "RELEASE" ? (
                            "Release Stock"
                        ) : (
                            "Record Dispatch"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * ---------------------------------------------------------------------------
 * SMALL PRESENTATIONAL COMPONENTS
 * ---------------------------------------------------------------------------
 */

function StockSummary({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: "neutral" | "violet" | "emerald";
}) {
    const classes = {
        neutral: {
            wrapper: "border-border bg-surface-raised",
            label: "text-text-secondary",
            value: "text-text-primary",
        },
        violet: {
            wrapper: "border-violet-200 bg-violet-50/50",
            label: "text-violet-600",
            value: "text-violet-800",
        },
        emerald: {
            wrapper: "border-emerald-200 bg-emerald-50/50",
            label: "text-emerald-600",
            value: "text-emerald-800",
        },
    }[tone];

    return (
        <div
            className={`rounded-xl border p-3 ${classes.wrapper}`}
        >
            <p
                className={`text-[10px] font-semibold uppercase tracking-wider ${classes.label}`}
            >
                {label}
            </p>

            <p
                className={`mt-1 text-xl font-bold tracking-tight ${classes.value}`}
            >
                {value}
            </p>
        </div>
    );
}

function ActionButton({
    active,
    onClick,
    icon,
    label,
    disabled,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    disabled: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-border bg-surface-raised text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

function ResultMetric({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {label}
            </p>

            <p className="mt-1 text-xs font-bold text-text-primary">
                {value}
            </p>
        </div>
    );
}

function getTodayInputValue() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
        now.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}