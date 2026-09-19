"use client";

import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Lightbulb,
  PlayCircle,
  Plus,
  Send,
} from "lucide-react";

import type {
  ContentListItem,
  ContentPlatformSummary,
  MarketingSummary,
} from "../types";

import { ContentFormDialog } from "./content-form-dialog";

interface MarketingClientProps {
  summary: MarketingSummary;
  contentList: ContentListItem[];
  platformSummary: ContentPlatformSummary[];
}

export function MarketingClient({
  summary,
  contentList,
  platformSummary,
}: MarketingClientProps) {
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);

  const stats = [
    {
      label: "Total content",
      value: summary.totalContent,
      description: "Content items in workspace",
      icon: FileText,
    },
    {
      label: "Ideas",
      value: summary.ideas,
      description: "Ideas awaiting production",
      icon: Lightbulb,
    },
    {
      label: "In production",
      value: summary.inProduction,
      description: "Content currently being prepared",
      icon: PlayCircle,
    },
    {
      label: "Ready",
      value: summary.ready,
      description: "Ready to publish",
      icon: FileText,
    },
    {
      label: "Scheduled",
      value: summary.scheduled,
      description: "Planned for publication",
      icon: CalendarDays,
    },
    {
      label: "Published",
      value: summary.published,
      description: "Published content",
      icon: Send,
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Workspace Action */}
        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Marketing Snapshot
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Monitor content production and publication activity.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsContentDialogOpen(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-900"
            >
              <Plus className="h-4 w-4" />
              Add Content
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        {stat.label}
                      </p>

                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                        {stat.value}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {stat.description}
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Content Calendar */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
                  <CalendarDays className="h-4 w-4 text-slate-600" />
                </div>

                <h2 className="text-sm font-semibold text-slate-950">
                  Content Calendar
                </h2>

                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {contentList.length}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Track content from idea through publication.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsContentDialogOpen(true)}
              className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-emerald-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-900 sm:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Content
            </button>
          </div>

          {contentList.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
                <CalendarDays className="h-6 w-6 text-slate-400" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-950">
                No content yet
              </h3>

              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                Your content pieces will appear here once you start adding
                them to the marketing system.
              </p>

              <button
                type="button"
                onClick={() => setIsContentDialogOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-900"
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Content
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-5 py-3 sm:px-6">Content</th>
                    <th className="px-5 py-3 sm:px-6">Type</th>
                    <th className="px-5 py-3 sm:px-6">Status</th>
                    <th className="px-5 py-3 sm:px-6">Platforms</th>
                    <th className="px-5 py-3 sm:px-6">Planned</th>
                    <th className="px-5 py-3 sm:px-6">Published</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {contentList.map((content) => (
                    <tr
                      key={content.id}
                      className="text-xs text-slate-700 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4 font-medium text-slate-950 sm:px-6">
                        {content.title}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {content.contentType.replace("_", " ")}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {content.status.replace("_", " ")}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {content.platforms.length > 0
                          ? content.platforms.join(", ")
                          : "—"}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {content.plannedDate
                          ? content.plannedDate.toLocaleDateString("en-IN")
                          : "—"}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {content.publishedDate
                          ? content.publishedDate.toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Platform Performance */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
                <BarChart3 className="h-4 w-4 text-slate-600" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Platform Performance
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Manually recorded performance metrics by platform.
                </p>
              </div>
            </div>
          </div>

          {platformSummary.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-950">
                No platform data yet
              </h3>

              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                Platform performance will appear after content publications
                and their metrics are recorded.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-5 py-3 sm:px-6">Platform</th>
                    <th className="px-5 py-3 sm:px-6">Publications</th>
                    <th className="px-5 py-3 sm:px-6">Published</th>
                    <th className="px-5 py-3 sm:px-6">Views</th>
                    <th className="px-5 py-3 sm:px-6">Reach</th>
                    <th className="px-5 py-3 sm:px-6">Likes</th>
                    <th className="px-5 py-3 sm:px-6">Comments</th>
                    <th className="px-5 py-3 sm:px-6">Shares</th>
                    <th className="px-5 py-3 sm:px-6">Saves</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {platformSummary.map((platform) => (
                    <tr
                      key={platform.platform}
                      className="text-xs text-slate-700 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4 font-medium text-slate-950 sm:px-6">
                        {platform.platform}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {platform.publicationCount}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {platform.publishedCount}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {platform.views}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {platform.reach}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {platform.likes}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {platform.comments}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {platform.shares}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        {platform.saves}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ContentFormDialog
        open={isContentDialogOpen}
        onClose={() => setIsContentDialogOpen(false)}
      />
    </>
  );
}