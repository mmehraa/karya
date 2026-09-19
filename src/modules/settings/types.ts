export interface SerializedBusinessSettings {
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
}

export interface SerializedBusinessProfile {
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
}

export interface SettingsPageData {
  profile: SerializedBusinessProfile;
  settings: SerializedBusinessSettings;
}