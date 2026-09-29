"use client";

import { useState } from "react";
import { Beaker, Boxes, ChevronRight } from "lucide-react";

import type { SerializedRawMaterial } from "@/modules/raw-materials/types";
import type { SerializedPackagingMaterial } from "@/modules/packaging-materials/types";

import { RawMaterialsClient } from "@/modules/raw-materials/components/raw-materials-client";
import { PackagingMaterialsClient } from "@/modules/packaging-materials/components/packaging-materials-client";

interface MaterialsClientProps {
  initialRawMaterials: SerializedRawMaterial[];
  initialPackagingMaterials: SerializedPackagingMaterial[];
}

type MaterialsTab = "RAW" | "PACKAGING";

export function MaterialsClient({
  initialRawMaterials,
  initialPackagingMaterials,
}: MaterialsClientProps) {
  const [activeTab, setActiveTab] = useState<MaterialsTab>("RAW");

  const isRaw = activeTab === "RAW";

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <section
        aria-label="Material categories"
        className="rounded-2xl border border-border bg-surface-raised p-2 shadow-sm"
      >
        <div
          role="tablist"
          aria-label="Choose material category"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          <button
            id="materials-tab-raw"
            type="button"
            role="tab"
            aria-selected={isRaw}
            aria-controls="materials-panel-raw"
            onClick={() => setActiveTab("RAW")}
            className={`group flex min-h-16 min-w-0 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              isRaw
                ? "border-accent/20 bg-accent/5 text-text-primary shadow-sm"
                : "border-transparent text-text-secondary hover:border-border hover:bg-surface-muted"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isRaw
                    ? "bg-accent/10 text-accent"
                    : "bg-surface-muted text-text-secondary"
                }`}
                aria-hidden="true"
              >
                <Beaker className="h-5 w-5" />
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  Raw materials
                </span>
                <span className="mt-0.5 block text-xs text-text-secondary">
                  Ingredients and production inputs
                </span>
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                  isRaw
                    ? "bg-accent/10 text-accent"
                    : "bg-surface-muted text-text-secondary"
                }`}
              >
                {initialRawMaterials.length}
              </span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  isRaw ? "rotate-90 text-accent" : "text-text-tertiary"
                }`}
                aria-hidden="true"
              />
            </span>
          </button>

          <button
            id="materials-tab-packaging"
            type="button"
            role="tab"
            aria-selected={!isRaw}
            aria-controls="materials-panel-packaging"
            onClick={() => setActiveTab("PACKAGING")}
            className={`group flex min-h-16 min-w-0 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              !isRaw
                ? "border-accent/20 bg-accent/5 text-text-primary shadow-sm"
                : "border-transparent text-text-secondary hover:border-border hover:bg-surface-muted"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  !isRaw
                    ? "bg-accent/10 text-accent"
                    : "bg-surface-muted text-text-secondary"
                }`}
                aria-hidden="true"
              >
                <Boxes className="h-5 w-5" />
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  Packaging materials
                </span>
                <span className="mt-0.5 block text-xs text-text-secondary">
                  Containers, labels, and packing supplies
                </span>
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                  !isRaw
                    ? "bg-accent/10 text-accent"
                    : "bg-surface-muted text-text-secondary"
                }`}
              >
                {initialPackagingMaterials.length}
              </span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  !isRaw ? "rotate-90 text-accent" : "text-text-tertiary"
                }`}
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </section>

      {isRaw ? (
        <div
          id="materials-panel-raw"
          role="tabpanel"
          aria-labelledby="materials-tab-raw"
          className="min-w-0"
        >
          <RawMaterialsClient initialMaterials={initialRawMaterials} />
        </div>
      ) : (
        <div
          id="materials-panel-packaging"
          role="tabpanel"
          aria-labelledby="materials-tab-packaging"
          className="min-w-0"
        >
          <PackagingMaterialsClient
            initialMaterials={initialPackagingMaterials}
          />
        </div>
      )}
    </div>
  );
}