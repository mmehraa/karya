import { getDashboardContext } from "@/modules/business/dashboard-context";

import { getRawMaterials } from "@/modules/raw-materials/services";
import { getPackagingMaterials } from "@/modules/packaging-materials/services";

import { MaterialsClient } from "@/modules/materials/components/materials-client";

export default async function MaterialsPage() {
  const { businessId } = await getDashboardContext();

  const [rawMaterials, packagingMaterials] =
    await Promise.all([
      getRawMaterials(businessId),
      getPackagingMaterials(businessId),
    ]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Costing Workspace
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Materials
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Manage raw materials and packaging materials,
          track inventory value, and maintain accurate
          weighted-average costs.
        </p>
      </div>

      <MaterialsClient
        initialRawMaterials={rawMaterials}
        initialPackagingMaterials={
          packagingMaterials
        }
      />
    </div>
  );
}