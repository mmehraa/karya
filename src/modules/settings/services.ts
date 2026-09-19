import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import type {
  SerializedBusinessProfile,
  SerializedBusinessSettings,
  SettingsPageData,
} from "./types";

import type {
  UpdateBusinessProfileInput,
  UpdateBusinessSettingsInput,
} from "./validation";

function serializeProfile(
  business: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    description: string | null;
    industry: string;
    constitution: string | null;
    countryCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
): SerializedBusinessProfile {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    tagline: business.tagline,
    description: business.description,
    industry: business.industry,
    constitution: business.constitution,
    countryCode: business.countryCode,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  };
}

function serializeSettings(
  settings: {
    businessId: string;
    currencyCode: string;
    currencySymbol: string;
    fiscalYearStart: number;
    orderPrefix: string;
    nextOrderNumber: number;
    supportEmail: string | null;
    supportPhone: string | null;
    lowStockThreshold: number;
    updatedAt: Date;
  },
): SerializedBusinessSettings {
  return {
    businessId: settings.businessId,
    currencyCode: settings.currencyCode,
    currencySymbol: settings.currencySymbol,
    fiscalYearStart: settings.fiscalYearStart,
    orderPrefix: settings.orderPrefix,
    nextOrderNumber: settings.nextOrderNumber,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    lowStockThreshold: settings.lowStockThreshold,
    updatedAt: settings.updatedAt,
  };
}

export async function getSettingsPageData(
  businessId: string,
): Promise<SettingsPageData> {
  const business =
    await db.business.findUnique({
      where: {
        id: businessId,
      },
      include: {
        settings: true,
      },
    });

  if (!business) {
    throw new Error("Business not found.");
  }

  if (!business.settings) {
    throw new Error(
      "Business settings have not been initialized.",
    );
  }

  return {
    profile: serializeProfile(business),
    settings: serializeSettings(
      business.settings,
    ),
  };
}

export async function updateBusinessProfile(
  businessId: string,
  input: UpdateBusinessProfileInput,
) {
  const business =
    await db.business.findUnique({
      where: {
        id: businessId,
      },
      select: {
        id: true,
      },
    });

  if (!business) {
    throw new Error("Business not found.");
  }

  const updated =
    await db.business.update({
      where: {
        id: businessId,
      },
      data: {
        name: input.name,
        tagline: input.tagline,
        description: input.description,
        industry: input.industry,
        constitution: input.constitution,
        countryCode: input.countryCode,
      },
    });

  return serializeProfile(updated);
}

export async function updateBusinessSettings(
  businessId: string,
  input: UpdateBusinessSettingsInput,
) {
  const business =
    await db.business.findUnique({
      where: {
        id: businessId,
      },
      select: {
        id: true,
      },
    });

  if (!business) {
    throw new Error("Business not found.");
  }

  const updated =
    await db.businessSettings.upsert({
      where: {
        businessId,
      },
      create: {
        businessId,
        currencyCode: input.currencyCode,
        currencySymbol: input.currencySymbol,
        fiscalYearStart:
          input.fiscalYearStart,
        orderPrefix: input.orderPrefix,
        nextOrderNumber:
          input.nextOrderNumber,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        lowStockThreshold:
          input.lowStockThreshold,
      },
      update: {
        currencyCode: input.currencyCode,
        currencySymbol: input.currencySymbol,
        fiscalYearStart:
          input.fiscalYearStart,
        orderPrefix: input.orderPrefix,
        nextOrderNumber:
          input.nextOrderNumber,
        supportEmail: input.supportEmail,
        supportPhone: input.supportPhone,
        lowStockThreshold:
          input.lowStockThreshold,
      },
    });

  return serializeSettings(updated);
}

export function isPrismaKnownError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof
    Prisma.PrismaClientKnownRequestError
  );
}