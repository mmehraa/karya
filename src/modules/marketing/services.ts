import { Prisma } from "@prisma/client";
import type {
  ContentPlatform,
  ContentStatus,
  ContentType,
} from "@prisma/client";
import { db } from "@/lib/db";
import type {
  CreateContentInput,
  CreatePublicationInput,
  UpdateContentInput,
  UpdatePublicationInput,
} from "./validation";
import type {
  ContentListItem,
  ContentPlatformSummary,
  MarketingSummary,
  SerializedContentItem,
  SerializedContentPublication,
} from "./types";

function serializePublication(publication: {
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
}): SerializedContentPublication {
  return {
    id: publication.id,
    businessId: publication.businessId,
    contentItemId: publication.contentItemId,
    platform: publication.platform,
    plannedDate: publication.plannedDate,
    publishedDate: publication.publishedDate,
    url: publication.url,
    views: publication.views,
    reach: publication.reach,
    likes: publication.likes,
    comments: publication.comments,
    shares: publication.shares,
    saves: publication.saves,
    websiteClicks: publication.websiteClicks,
    createdAt: publication.createdAt,
    updatedAt: publication.updatedAt,
  };
}

function serializeContentItem(contentItem: {
  id: string;
  businessId: string;
  title: string;
  contentType: ContentType;
  status: ContentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  publications: Array<{
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
  }>;
}): SerializedContentItem {
  return {
    id: contentItem.id,
    businessId: contentItem.businessId,
    title: contentItem.title,
    contentType: contentItem.contentType,
    status: contentItem.status,
    notes: contentItem.notes,
    publications: contentItem.publications.map(serializePublication),
    createdAt: contentItem.createdAt,
    updatedAt: contentItem.updatedAt,
  };
}

export async function getContentItems(
  businessId: string
): Promise<SerializedContentItem[]> {
  const contentItems = await db.contentItem.findMany({
    where: {
      businessId,
    },
    include: {
      publications: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return contentItems.map(serializeContentItem);
}

export async function getContentItemById(
  businessId: string,
  contentItemId: string
): Promise<SerializedContentItem | null> {
  const contentItem = await db.contentItem.findFirst({
    where: {
      id: contentItemId,
      businessId,
    },
    include: {
      publications: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return contentItem ? serializeContentItem(contentItem) : null;
}

export async function getContentList(
  businessId: string
): Promise<ContentListItem[]> {
  const contentItems = await db.contentItem.findMany({
    where: {
      businessId,
    },
    include: {
      publications: {
        select: {
          platform: true,
          plannedDate: true,
          publishedDate: true,
        },
        orderBy: {
          plannedDate: "asc",
        },
      },
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return contentItems.map((contentItem) => {
    const publications = contentItem.publications;

    const plannedDates = publications
      .map((publication) => publication.plannedDate)
      .filter((date): date is Date => date !== null);

    const publishedDates = publications
      .map((publication) => publication.publishedDate)
      .filter((date): date is Date => date !== null);

    return {
      id: contentItem.id,
      title: contentItem.title,
      contentType: contentItem.contentType,
      status: contentItem.status,
      publicationCount: publications.length,
      platforms: [
        ...new Set(
          publications.map((publication) => publication.platform)
        ),
      ],
      plannedDate:
        plannedDates.length > 0 ? plannedDates[0] : null,
      publishedDate:
        publishedDates.length > 0 ? publishedDates[0] : null,
      createdAt: contentItem.createdAt,
    };
  });
}

export async function createContentItem(
  businessId: string,
  input: CreateContentInput
): Promise<SerializedContentItem> {
  const contentItem = await db.contentItem.create({
    data: {
      businessId,
      title: input.title,
      contentType: input.contentType,
      status: input.status,
      notes: input.notes ?? null,
    },
    include: {
      publications: true,
    },
  });

  return serializeContentItem(contentItem);
}

export async function updateContentItem(
  businessId: string,
  input: UpdateContentInput
): Promise<SerializedContentItem> {
  const existing = await db.contentItem.findFirst({
    where: {
      id: input.id,
      businessId,
    },
  });

  if (!existing) {
    throw new Error("Content item not found.");
  }

  const data: Prisma.ContentItemUpdateInput = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (input.contentType !== undefined) {
    data.contentType = input.contentType;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  const updated = await db.contentItem.update({
    where: {
      id: input.id,
    },
    data,
    include: {
      publications: true,
    },
  });

  return serializeContentItem(updated);
}

export async function createContentPublication(
  businessId: string,
  input: CreatePublicationInput
): Promise<SerializedContentPublication> {
  const contentItem = await db.contentItem.findFirst({
    where: {
      id: input.contentItemId,
      businessId,
    },
  });

  if (!contentItem) {
    throw new Error("Content item not found.");
  }

  const publication = await db.contentPublication.create({
    data: {
      businessId,
      contentItemId: input.contentItemId,
      platform: input.platform,
      plannedDate: input.plannedDate ?? null,
      publishedDate: input.publishedDate ?? null,
      url: input.url ?? null,
      views: input.views ?? 0,
      reach: input.reach ?? 0,
      likes: input.likes ?? 0,
      comments: input.comments ?? 0,
      shares: input.shares ?? 0,
      saves: input.saves ?? 0,
      websiteClicks: input.websiteClicks ?? 0,
    },
  });

  return serializePublication(publication);
}

export async function updateContentPublication(
  businessId: string,
  input: UpdatePublicationInput
): Promise<SerializedContentPublication> {
  const existing = await db.contentPublication.findFirst({
    where: {
      id: input.id,
      businessId,
    },
  });

  if (!existing) {
    throw new Error("Content publication not found.");
  }

  const data: Prisma.ContentPublicationUpdateInput = {};

  if (input.platform !== undefined) {
    data.platform = input.platform;
  }

  if (input.plannedDate !== undefined) {
    data.plannedDate = input.plannedDate;
  }

  if (input.publishedDate !== undefined) {
    data.publishedDate = input.publishedDate;
  }

  if (input.url !== undefined) {
    data.url = input.url;
  }

  if (input.views !== undefined) {
    data.views = input.views;
  }

  if (input.reach !== undefined) {
    data.reach = input.reach;
  }

  if (input.likes !== undefined) {
    data.likes = input.likes;
  }

  if (input.comments !== undefined) {
    data.comments = input.comments;
  }

  if (input.shares !== undefined) {
    data.shares = input.shares;
  }

  if (input.saves !== undefined) {
    data.saves = input.saves;
  }

  if (input.websiteClicks !== undefined) {
    data.websiteClicks = input.websiteClicks;
  }

  const updated = await db.contentPublication.update({
    where: {
      id: input.id,
    },
    data,
  });

  return serializePublication(updated);
}

export async function getMarketingSummary(
  businessId: string
): Promise<MarketingSummary> {
  const [totalContent, groupedContent, totalPublications] =
    await Promise.all([
      db.contentItem.count({
        where: {
          businessId,
        },
      }),

      db.contentItem.groupBy({
        by: ["status"],
        where: {
          businessId,
        },
        _count: {
          _all: true,
        },
      }),

      db.contentPublication.count({
        where: {
          businessId,
        },
      }),
    ]);

  const counts = new Map(
    groupedContent.map((row) => [
      row.status,
      row._count._all,
    ])
  );

  return {
    totalContent,
    ideas: counts.get("IDEA") ?? 0,
    inProduction:
      (counts.get("SCRIPT") ?? 0) +
      (counts.get("SHOT") ?? 0) +
      (counts.get("EDITING") ?? 0),
    ready: counts.get("READY") ?? 0,
    scheduled: counts.get("SCHEDULED") ?? 0,
    published: counts.get("PUBLISHED") ?? 0,
    totalPublications,
  };
}

export async function getContentPlatformSummary(
  businessId: string
): Promise<ContentPlatformSummary[]> {
  const grouped = await db.contentPublication.groupBy({
    by: ["platform"],
    where: {
      businessId,
    },
    _count: {
      _all: true,
    },
    _sum: {
      views: true,
      reach: true,
      likes: true,
      comments: true,
      shares: true,
      saves: true,
      websiteClicks: true,
    },
  });

  const publishedCounts = await Promise.all(
    grouped.map(async (row) => {
      const publishedCount = await db.contentPublication.count({
        where: {
          businessId,
          platform: row.platform,
          publishedDate: {
            not: null,
          },
        },
      });

      return {
        platform: row.platform,
        publishedCount,
      };
    })
  );

  const publishedMap = new Map(
    publishedCounts.map((row) => [
      row.platform,
      row.publishedCount,
    ])
  );

  return grouped.map((row) => ({
    platform: row.platform,
    publicationCount: row._count._all,
    publishedCount: publishedMap.get(row.platform) ?? 0,
    views: row._sum.views ?? 0,
    reach: row._sum.reach ?? 0,
    likes: row._sum.likes ?? 0,
    comments: row._sum.comments ?? 0,
    shares: row._sum.shares ?? 0,
    saves: row._sum.saves ?? 0,
    websiteClicks: row._sum.websiteClicks ?? 0,
  }));
}