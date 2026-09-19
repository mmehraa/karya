import { format } from "date-fns";

/**
 * Format any numeric value as Indian Rupee (INR) currency.
 * Safely handles null, undefined, or zero values.
 */
export function formatINR(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined || value === "") {
    return "Not entered";
  }

  const numericValue =
    typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    return "Invalid amount";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numericValue);
}

/**
 * Format percentage figures cleanly.
 */
export function formatPercentage(
  value: number | null | undefined
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0%";
  }

  return `${value.toFixed(1)}%`;
}

/**
 * Format dates consistently across the application.
 */
export function formatDate(
  date: Date | string | null | undefined
): string {
  if (!date) return "N/A";

  const parsedDate = typeof date === "string" ? new Date(date) : date;

  return format(parsedDate, "dd MMM yyyy");
}