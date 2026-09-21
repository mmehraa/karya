"use client";

import {
  useState,
} from "react";

import {
  Beaker,
  Boxes,
} from "lucide-react";

import type { SerializedRawMaterial } from "@/modules/raw-materials/types";
import type { SerializedPackagingMaterial } from "@/modules/packaging-materials/types";

import { RawMaterialsClient } from "@/modules/raw-materials/components/raw-materials-client";

import { PackagingMaterialsClient } from "@/modules/packaging-materials/components/packaging-materials-client";

interface MaterialsClientProps {
  initialRawMaterials: SerializedRawMaterial[];
  initialPackagingMaterials: SerializedPackagingMaterial[];
}

type MaterialsTab =
  | "RAW"
  | "PACKAGING";

export function MaterialsClient({
  initialRawMaterials,
  initialPackagingMaterials,
}: MaterialsClientProps) {
  const [activeTab, setActiveTab] =
    useState<MaterialsTab>("RAW");

  return (
    <div className="space-y-5">
      {/* =====================================================
          MATERIAL TYPE TABS
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveTab("RAW")
            }
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === "RAW"
                ? "bg-emerald-50 text-emerald-900 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Beaker
              className={`h-4 w-4 ${
                activeTab === "RAW"
                  ? "text-emerald-700"
                  : "text-slate-400"
              }`}
            />

            <span>
              Raw Materials
            </span>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                activeTab === "RAW"
                  ? "bg-white text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {initialRawMaterials.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("PACKAGING")
            }
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === "PACKAGING"
                ? "bg-emerald-50 text-emerald-900 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Boxes
              className={`h-4 w-4 ${
                activeTab === "PACKAGING"
                  ? "text-emerald-700"
                  : "text-slate-400"
              }`}
            />

            <span>
              Packaging Materials
            </span>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                activeTab === "PACKAGING"
                  ? "bg-white text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {initialPackagingMaterials.length}
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================
          ACTIVE MATERIAL WORKSPACE
      ===================================================== */}

      {activeTab === "RAW" ? (
        <RawMaterialsClient
          initialMaterials={
            initialRawMaterials
          }
        />
      ) : (
        <PackagingMaterialsClient
          initialMaterials={
            initialPackagingMaterials
          }
        />
      )}
    </div>
  );
}