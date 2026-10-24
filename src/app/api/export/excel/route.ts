import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getBusinessExportData } from "@/modules/data-export/services";
import { buildExportSheets } from "@/modules/data-export/sheets";
import { buildExportWorkbook } from "@/modules/data-export/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function toSafeFilenamePart(value: string): string {
  const safe = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return safe || "business";
}

export async function GET() {
  let businessId: string;

  try {
    ({ businessId } = await getDashboardContext());
  } catch {
    return NextResponse.json(
      {
        error: "Select a business before exporting.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const data = await getBusinessExportData(businessId);

    if (!data.business) {
      return NextResponse.json(
        {
          error: "Business not found.",
        },
        {
          status: 404,
        },
      );
    }

    const exportedAt = new Date();
    const currencyCode = data.settings?.currencyCode ?? null;

    const workbook = await buildExportWorkbook(
      buildExportSheets(data, currencyCode),
      {
        businessId,
        businessName: data.business.name,
        businessSlug: data.business.slug,
        currencyCode,
        exportedAt,
      },
    );

    const filename = `karya-export-${toSafeFilenamePart(
      data.business.slug,
    )}-${exportedAt.toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(workbook), {
      status: 200,
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(workbook.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // Log only the error class/code: messages can contain record values.
    console.error(
      "Excel export failed",
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : error instanceof Error
          ? error.name
          : "UnknownError",
    );

    return NextResponse.json(
      {
        error: "Unable to generate the Excel export. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}
