import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";

import type {
  AnySheetDef,
  CellInput,
  ColumnKind,
  ExportMetadata,
} from "./types";

/** Excel stores numbers as IEEE doubles: ~15 significant digits. */
const MAX_EXACT_DIGITS = 15;

/** Excel's per-cell character limit. */
const MAX_CELL_TEXT_LENGTH = 32767;

const MAX_SHEET_NAME_LENGTH = 31;
const INVALID_SHEET_NAME_CHARS = /[\[\]:*?/\\]/;

const MIN_COLUMN_WIDTH = 10;
const MAX_COLUMN_WIDTH = 60;
const WIDTH_SAMPLE_ROWS = 200;

const NUMBER_FORMATS: Partial<Record<ColumnKind, string>> = {
  int: "#,##0",
  decimal: "#,##0.00##",
  money: "#,##0.00",
  quantity: "#,##0.000###",
  unitCost: "#,##0.00####",
  datetime: "yyyy-mm-dd hh:mm:ss",
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF005944" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
};

const RELATIONSHIPS: Array<[string, string]> = [
  ["Business ID (every sheet)", "Business › Business ID"],
  [
    "Product ID",
    "Products › Product ID (used by Formulations, Packaging Configs, Production Batches, Finished Goods Ledger, Order Items, Promotional Dispatches)",
  ],
  ["Formulation ID", "Formulations › Formulation ID (Formulation Items, Production Batches)"],
  [
    "Packaging Config ID",
    "Packaging Configs › Packaging Config ID (Packaging Config Items, Production Batches)",
  ],
  [
    "Raw Material ID",
    "Raw Materials › Raw Material ID (Formulation Items, Raw Material Purchases, Raw Material Ledger, Batch Raw Material Use)",
  ],
  [
    "Packaging Material ID",
    "Packaging Materials › Packaging Material ID (Packaging Config Items, Packaging Purchases, Packaging Ledger, Batch Packaging Use)",
  ],
  [
    "Purchase ID (ledger sheets)",
    "Raw Material Purchases / Packaging Purchases › Purchase ID",
  ],
  ["Batch ID", "Production Batches › Batch ID (Batch Raw Material Use, Batch Packaging Use)"],
  ["Customer ID", "Customers › Customer ID (Orders)"],
  ["Order ID", "Orders › Order ID (Order Items)"],
  [
    "Inventory Transaction ID / Expense ID",
    "Promotional Dispatches › Finished Goods Ledger / Expenses",
  ],
  ["Content Item ID", "Marketing Content › Content Item ID (Content Publications)"],
  ["Goal ID", "Goals › Goal ID (Tasks)"],
  [
    "Reference ID / Source Type + Source ID",
    "Free-form links to the originating record (e.g. an order, batch or purchase ID) as stored by the application",
  ],
];

function assertValidSheetNames(names: string[]) {
  const seen = new Set<string>();

  for (const name of names) {
    const key = name.toLowerCase();

    if (
      name.length === 0 ||
      name.length > MAX_SHEET_NAME_LENGTH ||
      INVALID_SHEET_NAME_CHARS.test(name) ||
      seen.has(key)
    ) {
      throw new Error(`Invalid or duplicate worksheet name: ${name}`);
    }

    seen.add(key);
  }
}

function toCellValue(
  value: CellInput,
): ExcelJS.CellValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (Prisma.Decimal.isDecimal(value)) {
    const decimal = new Prisma.Decimal(value);

    // Keep full precision as text when a double would round it.
    return decimal.precision() > MAX_EXACT_DIGITS
      ? decimal.toFixed()
      : decimal.toNumber();
  }

  if (typeof value === "string") {
    return value.length > MAX_CELL_TEXT_LENGTH
      ? value.slice(0, MAX_CELL_TEXT_LENGTH)
      : value;
  }

  return value;
}

function displayLength(value: ExcelJS.CellValue): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (value instanceof Date) {
    return 19;
  }

  return String(value).length;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle" };
}

function addDataSheet(
  workbook: ExcelJS.Workbook,
  definition: AnySheetDef,
) {
  const worksheet = workbook.addWorksheet(definition.name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const widths = definition.headers.map((header) => header.length);

  worksheet.columns = definition.headers.map((header, index) => {
    const numFmt = NUMBER_FORMATS[definition.kinds[index]];

    return {
      header,
      style: numFmt ? { numFmt } : {},
    };
  });

  let rowIndex = 0;

  definition.forEachRow((values) => {
    const cells = values.map(toCellValue);

    if (rowIndex < WIDTH_SAMPLE_ROWS) {
      cells.forEach((cell, index) => {
        widths[index] = Math.max(widths[index], displayLength(cell));
      });
    }

    worksheet.addRow(cells);
    rowIndex += 1;
  });

  worksheet.columns.forEach((column, index) => {
    column.width = Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(MIN_COLUMN_WIDTH, widths[index] + 2),
    );
  });

  styleHeaderRow(worksheet.getRow(1));

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: {
      row: Math.max(1, definition.rowCount + 1),
      column: definition.headers.length,
    },
  };
}

function addGuideSheet(
  workbook: ExcelJS.Workbook,
  sheets: AnySheetDef[],
  meta: ExportMetadata,
) {
  const worksheet = workbook.addWorksheet("Export Guide", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = [
    { header: "Topic", width: 42 },
    { header: "Details", width: 120 },
  ];

  const rows: Array<[string, string | Date]> = [
    ["Business Name", meta.businessName],
    ["Business ID", meta.businessId],
    ["Business Slug", meta.businessSlug],
    ["Exported At (UTC)", meta.exportedAt],
    ["Application", "Karya — Business Operating System"],
    [
      "Currency",
      meta.currencyCode
        ? `Monetary columns are in ${meta.currencyCode} unless the sheet has its own Currency Code column.`
        : "No currency is configured in Business Settings; monetary columns have no stated currency.",
    ],
    [
      "Dates and times",
      "All date/time cells are stored in UTC. Date-only fields (e.g. Purchase Date, Expense Date) may show a time component as recorded.",
    ],
    [
      "Scope",
      "Only records belonging to this business are included. App-wide stage definitions appear only as lookup columns.",
    ],
    [
      "Snapshot",
      "All sheets were read in a single database transaction, so they reflect the same point in time.",
    ],
    [
      "Column markers",
      "“(lookup)” columns are copied from a related record for readability. “[calculated]” columns are derived from other columns on the same row and are not stored in the database. All other columns are stored values.",
    ],
    [
      "Units",
      "Raw material quantities are in each material's base unit (GRAM, MILLILITER or PIECE) unless the column says purchase unit. Packaging quantities are in pieces. Finished goods quantities are in units.",
    ],
    [
      "Current vs historical values",
      "Product prices/costs, stock levels and material balances/weighted average costs are current stored values at export time. Historical costs are preserved in purchases, ledgers, batch consumption, batch cost snapshots and order item cost snapshots.",
    ],
    [
      "Precision",
      `Decimal values are exported as numbers. Any value with more than ${MAX_EXACT_DIGITS} significant digits is exported as exact text to avoid rounding.`,
    ],
    [
      "Limitations",
      `Text longer than ${MAX_CELL_TEXT_LENGTH} characters is truncated to Excel's cell limit. Uploaded files or images are not stored by the application and are not included.`,
    ],
    [
      "Sensitive data",
      "This workbook contains customer contact details and financial records. Review it before sharing.",
    ],
    ["", ""],
    ["KEY RELATIONSHIPS", ""],
    ...RELATIONSHIPS,
  ];

  worksheet.getColumn(1).alignment = { vertical: "top" };
  worksheet.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  for (const row of rows) {
    const added = worksheet.addRow(row);

    if (row[1] instanceof Date) {
      added.getCell(2).numFmt = NUMBER_FORMATS.datetime ?? "";
    }

    if (row[0] === "KEY RELATIONSHIPS") {
      added.font = { bold: true };
    }
  }

  styleHeaderRow(worksheet.getRow(1));

  const index = workbook.addWorksheet("Sheet Index", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  index.columns = [
    { header: "Worksheet", width: 26 },
    { header: "Source Model", width: 52 },
    { header: "Rows", width: 10, style: { numFmt: "#,##0" } },
    { header: "Description", width: 110 },
  ];

  for (const sheet of sheets) {
    index.addRow([
      sheet.name,
      sheet.source,
      sheet.rowCount,
      sheet.description,
    ]);
  }

  styleHeaderRow(index.getRow(1));
  index.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: sheets.length + 1, column: 4 },
  };
}

export async function buildExportWorkbook(
  sheets: AnySheetDef[],
  meta: ExportMetadata,
): Promise<Buffer> {
  assertValidSheetNames([
    "Export Guide",
    "Sheet Index",
    ...sheets.map((sheet) => sheet.name),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Karya";
  workbook.created = meta.exportedAt;

  addGuideSheet(workbook, sheets, meta);

  for (const sheet of sheets) {
    addDataSheet(workbook, sheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
}
