import type { ReactNode } from "react";

import { getDashboardContext } from "@/modules/business/dashboard-context";
import { AppShell } from "@/components/layout/app-shell";
import {
  getContentList,
  getContentPlatformSummary,
  getMarketingSummary,
} from "@/modules/marketing/services";
import { MarketingClient } from "@/modules/marketing/components/marketing-client";

export default async function MarketingPage() {
  const { businessId } = await getDashboardContext();

  const [summary, contentList, platformSummary] = await Promise.all([
    getMarketingSummary(businessId),
    getContentList(businessId),
    getContentPlatformSummary(businessId),
  ]);

  return (
    <AppShell>
      <MarketingContent
        summary={summary}
        contentList={contentList}
        platformSummary={platformSummary}
      />
    </AppShell>
  );
}

interface MarketingContentProps {
  summary: Awaited<ReturnType<typeof getMarketingSummary>>;
  contentList: Awaited<ReturnType<typeof getContentList>>;
  platformSummary: Awaited<ReturnType<typeof getContentPlatformSummary>>;
}

function MarketingContent({
  summary,
  contentList,
  platformSummary,
}: MarketingContentProps) {
  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Marketing Workspace
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              Marketing
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
              Plan, track, publish, and measure your content.
            </p>
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              {summary.totalContent}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {summary.totalContent === 1
                ? "Content item"
                : "Content items"}
            </p>
          </div>
        </div>
      </section>

      <MarketingClient
        summary={summary}
        contentList={contentList}
        platformSummary={platformSummary}
      />
    </div>
  );
}