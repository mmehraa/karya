import type { Prisma } from "@prisma/client";

/**
 * Determines how a value is written into an Excel cell and which
 * number format is applied to the column.
 */
export type ColumnKind =
  | "id"
  | "text"
  | "enum"
  | "int"
  | "decimal"
  | "money"
  | "quantity"
  | "unitCost"
  | "boolean"
  | "datetime";

export type CellInput =
  | string
  | number
  | boolean
  | Date
  | Prisma.Decimal
  | null
  | undefined;

export interface ColumnDef<T> {
  header: string;
  kind: ColumnKind;
  value: (row: T) => CellInput;
  /** Value copied from a related record to make the sheet readable. */
  lookup?: boolean;
  /** Value derived from other exported columns, not stored in the database. */
  calculated?: boolean;
}

export interface SheetDef<T> {
  name: string;
  /** Prisma model (or models) the rows come from. */
  source: string;
  description: string;
  rows: T[];
  columns: ColumnDef<T>[];
}

/**
 * Type-erased sheet definition so sheets with different row types
 * can be stored in one array.
 */
export interface AnySheetDef {
  name: string;
  source: string;
  description: string;
  rowCount: number;
  headers: string[];
  kinds: ColumnKind[];
  forEachRow: (callback: (values: CellInput[]) => void) => void;
}

export interface ExportMetadata {
  businessId: string;
  businessName: string;
  businessSlug: string;
  currencyCode: string | null;
  exportedAt: Date;
}
