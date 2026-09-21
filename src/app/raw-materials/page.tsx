import { getDashboardContext } from "@/modules/business/dashboard-context";
import { getRawMaterials } from "@/modules/raw-materials/services";
import { RawMaterialsClient } from "@/modules/raw-materials/components/raw-materials-client";

export default async function RawMaterialsPage() {
  const { businessId } = await getDashboardContext();

  const materials = await getRawMaterials(businessId);

  return (
    <div className="space-y-4">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Costing Workspace
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Raw Materials
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Track raw-material purchases, inventory value and
          weighted-average cost for accurate product costing.
        </p>
      </div>

      {/* =====================================================
          RAW MATERIAL WORKSPACE
      ===================================================== */}

      <RawMaterialsClient
        initialMaterials={materials}
      />
    </div>
  );
}