import type {
  ContentPlatform,
  ContentStatus,
  ContentType,
} from "@prisma/client";

export interface SerializedContentPublication {
  id: string;
  businessId: string;
  contentItemId: string;
  platform: ContentPlatform;
  plannedDate: Date | null;
  publishedDate: Date | null;
  url: string | null;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  websiteClicks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedContentItem {
  id: string;
  businessId: string;
  title: string;
  contentType: ContentType;
  status: ContentStatus;
  notes: string | null;
  publications: SerializedContentPublication[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentListItem {
  id: string;
  title: string;
  contentType: ContentType;
  status: ContentStatus;
  publicationCount: number;
  platforms: ContentPlatform[];
  plannedDate: Date | null;
  publishedDate: Date | null;
  createdAt: Date;
}

export interface MarketingSummary {
  totalContent: number;
  ideas: number;
  inProduction: number;
  ready: number;
  scheduled: number;
  published: number;
  totalPublications: number;
}

export interface ContentPlatformSummary {
  platform: ContentPlatform;
  publicationCount: number;
  publishedCount: number;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  websiteClicks: number;
}