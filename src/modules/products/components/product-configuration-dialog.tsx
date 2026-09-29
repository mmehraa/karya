"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Package,
  FlaskConical,
} from "lucide-react";

import {
  createProductFormulationAction,
  deleteProductFormulationAction,
  getProductFormulationsAction,
} from "@/modules/product-formulations/actions";

import {
  createProductPackagingConfigurationAction,
  deleteProductPackagingConfigurationAction,
  getProductPackagingConfigurationsAction,
} from "@/modules/product-packaging/actions";

import {
  getRawMaterialsAction,
} from "@/modules/raw-materials/actions";

import {
  getPackagingMaterialsAction,
} from "@/modules/packaging-materials/actions";

import type {
  SerializedProductFormulation,
} from "@/modules/product-formulations/types";

import type {
  SerializedProductPackagingConfiguration,
} from "@/modules/product-packaging/types";

import type {
  SerializedRawMaterial,
} from "@/modules/raw-materials/types";

import type {
  SerializedPackagingMaterial,
} from "@/modules/packaging-materials/types";

import type { SerializedProduct } from "@/modules/products/types";
import { formatINR } from "@/lib/formatters";

interface ProductConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: SerializedProduct | null;
}

type ConfigurationTab =
  | "formulation"
  | "packaging";

interface FormulationRow {
  rawMaterialId: string;
  quantity: string;
}

interface PackagingRow {
  packagingMaterialId: string;
  quantity: string;
}

type DeleteTarget =
  | {
      type: "formulation";
      id: string;
      version: number;
      name: string;
      isActive: boolean;
      remainingVersions: number;
    }
  | {
      type: "packaging";
      id: string;
      version: number;
      name: string;
      isActive: boolean;
      remainingVersions: number;
    }
  | null;

const EMPTY_FORMULATION_ROW: FormulationRow = {
  rawMaterialId: "",
  quantity: "",
};

const EMPTY_PACKAGING_ROW: PackagingRow = {
  packagingMaterialId: "",
  quantity: "",
};

function stripNewVersionSuffix(
  value: string
): string {
  return value
    .replace(
      /(?:\s+—\s+New Version)+$/g,
      ""
    )
    .trim();
}

export function ProductConfigurationDialog({
  isOpen,
  onClose,
  product,
}: ProductConfigurationDialogProps) {
  const [activeTab, setActiveTab] =
    useState<ConfigurationTab>("formulation");

  const [formulations, setFormulations] =
    useState<SerializedProductFormulation[]>(
      []
    );

  const [
    packagingConfigurations,
    setPackagingConfigurations,
  ] = useState<
    SerializedProductPackagingConfiguration[]
  >([]);

  const [rawMaterials, setRawMaterials] =
    useState<SerializedRawMaterial[]>([]);

  const [
    packagingMaterials,
    setPackagingMaterials,
  ] = useState<SerializedPackagingMaterial[]>(
    []
  );

  const [isLoading, setIsLoading] =
    useState(false);

  const [isPending, startTransition] =
    useTransition();

  const [formulationName, setFormulationName] =
    useState("Default Formulation");

  const [formulationNotes, setFormulationNotes] =
    useState("");

  const [formulationRows, setFormulationRows] =
    useState<FormulationRow[]>([
      { ...EMPTY_FORMULATION_ROW },
    ]);

  const [packagingName, setPackagingName] =
    useState("Default Packaging");

  const [packagingNotes, setPackagingNotes] =
    useState("");

  const [packagingRows, setPackagingRows] =
    useState<PackagingRow[]>([
      { ...EMPTY_PACKAGING_ROW },
    ]);

  const [error, setError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<DeleteTarget>(null);

  useEffect(() => {
    if (!isOpen || !product) {
      return;
    }

    let cancelled = false;

    const loadConfigurationData =
      async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        setDeleteTarget(null);
        setActiveTab("formulation");

        try {
          const [
            formulationsResult,
            packagingResult,
            rawMaterialsResult,
            packagingMaterialsResult,
          ] = await Promise.all([
            getProductFormulationsAction({
              productId: product.id,
            }),

            getProductPackagingConfigurationsAction(
              {
                productId: product.id,
              }
            ),

            getRawMaterialsAction(),

            getPackagingMaterialsAction(),
          ]);

          if (cancelled) {
            return;
          }

          if (!formulationsResult.success) {
            throw new Error(
              formulationsResult.error ||
                "Unable to load product formulations."
            );
          }

          if (!packagingResult.success) {
            throw new Error(
              packagingResult.error ||
                "Unable to load packaging configurations."
            );
          }

          if (!rawMaterialsResult.success) {
            throw new Error(
              rawMaterialsResult.error ||
                "Unable to load raw materials."
            );
          }

          if (
            !packagingMaterialsResult.success
          ) {
            throw new Error(
              packagingMaterialsResult.error ||
                "Unable to load packaging materials."
            );
          }

          const loadedFormulations =
            formulationsResult.data ?? [];

          const loadedPackaging =
            packagingResult.data ?? [];

          setFormulations(
            loadedFormulations
          );

          setPackagingConfigurations(
            loadedPackaging
          );

          setRawMaterials(
            (rawMaterialsResult.data as SerializedRawMaterial[]) ??
              []
          );

          setPackagingMaterials(
            (packagingMaterialsResult.data as SerializedPackagingMaterial[]) ??
              []
          );

          const activeFormulation =
            loadedFormulations.find(
              (item) => item.isActive
            );

          const activePackaging =
            loadedPackaging.find(
              (item) => item.isActive
            );

          if (activeFormulation) {
            setFormulationName(
              `${stripNewVersionSuffix(
                activeFormulation.name
              )} — New Version`
            );
          } else {
            setFormulationName(
              "Default Formulation"
            );
          }

          if (activePackaging) {
            setPackagingName(
              `${stripNewVersionSuffix(
                activePackaging.name
              )} — New Version`
            );
          } else {
            setPackagingName(
              "Default Packaging"
            );
          }

          setFormulationNotes("");
          setPackagingNotes("");

          setFormulationRows(
            activeFormulation
              ? activeFormulation.items.map(
                  (item) => ({
                    rawMaterialId:
                      item.rawMaterialId,
                    quantity:
                      item.quantity.toString(),
                  })
                )
              : [
                  {
                    ...EMPTY_FORMULATION_ROW,
                  },
                ]
          );

          setPackagingRows(
            activePackaging
              ? activePackaging.items.map(
                  (item) => ({
                    packagingMaterialId:
                      item.packagingMaterialId,
                    quantity:
                      item.quantity.toString(),
                  })
                )
              : [
                  {
                    ...EMPTY_PACKAGING_ROW,
                  },
                ]
          );
        } catch (loadError) {
          if (cancelled) {
            return;
          }

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load product configuration."
          );
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

    void loadConfigurationData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, product]);

  const activeFormulation = useMemo(
    () =>
      formulations.find(
        (formulation) =>
          formulation.isActive
      ) ?? null,
    [formulations]
  );

  const activePackaging = useMemo(
    () =>
      packagingConfigurations.find(
        (configuration) =>
          configuration.isActive
      ) ?? null,
    [packagingConfigurations]
  );

  const formulationPreviewCost =
    useMemo(() => {
      return formulationRows.reduce(
        (total, row) => {
          const material =
            rawMaterials.find(
              (item) =>
                item.id === row.rawMaterialId
            );

          const quantity = Number(
            row.quantity
          );

          if (
            !material ||
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            return total;
          }

          return (
            total +
            quantity *
              material.weightedAverageCost
          );
        },
        0
      );
    }, [formulationRows, rawMaterials]);

  const packagingPreviewCost =
    useMemo(() => {
      return packagingRows.reduce(
        (total, row) => {
          const material =
            packagingMaterials.find(
              (item) =>
                item.id ===
                row.packagingMaterialId
            );

          const quantity = Number(
            row.quantity
          );

          if (
            !material ||
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            return total;
          }

          return (
            total +
            quantity *
              material.weightedAverageCost
          );
        },
        0
      );
    }, [
      packagingRows,
      packagingMaterials,
    ]);

  if (!isOpen || !product) {
    return null;
  }

  const addFormulationRow = () => {
    setFormulationRows((current) => [
      ...current,
      { ...EMPTY_FORMULATION_ROW },
    ]);
  };

  const removeFormulationRow = (
    index: number
  ) => {
    setFormulationRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (_, rowIndex) =>
          rowIndex !== index
      );
    });
  };

  const updateFormulationRow = (
    index: number,
    field: keyof FormulationRow,
    value: string
  ) => {
    setFormulationRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const addPackagingRow = () => {
    setPackagingRows((current) => [
      ...current,
      { ...EMPTY_PACKAGING_ROW },
    ]);
  };

  const removePackagingRow = (
    index: number
  ) => {
    setPackagingRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (_, rowIndex) =>
          rowIndex !== index
      );
    });
  };

  const updatePackagingRow = (
    index: number,
    field: keyof PackagingRow,
    value: string
  ) => {
    setPackagingRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const handleCreateFormulation = () => {
    setError(null);
    setSuccessMessage(null);

    if (!formulationName.trim()) {
      setError(
        "Please enter a formulation name."
      );
      return;
    }

    const items = formulationRows
      .filter(
        (row) =>
          row.rawMaterialId &&
          row.quantity.trim()
      )
      .map((row) => ({
        rawMaterialId:
          row.rawMaterialId,
        quantity: Number(row.quantity),
        notes: null,
      }));

    if (items.length === 0) {
      setError(
        "Add at least one raw material to the formulation."
      );
      return;
    }

    const hasInvalidQuantity = items.some(
      (item) =>
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
    );

    if (hasInvalidQuantity) {
      setError(
        "Every formulation quantity must be greater than 0."
      );
      return;
    }

    const uniqueIds = new Set(
      items.map(
        (item) => item.rawMaterialId
      )
    );

    if (uniqueIds.size !== items.length) {
      setError(
        "A raw material can only appear once in a formulation."
      );
      return;
    }

    startTransition(async () => {
      const result =
        await createProductFormulationAction(
          {
            productId: product.id,
            name: formulationName.trim(),
            notes:
              formulationNotes.trim() ||
              null,
            items,
          }
        );

      if (!result.success) {
        setError(
          result.error ||
            "Unable to create formulation."
        );
        return;
      }

      setSuccessMessage(
        `Formulation version ${
          result.data?.version ?? ""
        } created successfully.`
      );

      if (result.data) {
        setFormulations((current) => [
          result.data!,
          ...current.map((item) => ({
            ...item,
            isActive: false,
          })),
        ]);
      }

      setFormulationName(
        `${stripNewVersionSuffix(
          result.data?.name ??
            formulationName.trim()
        )} — New Version`
      );

      setFormulationNotes("");

    });
  };

  const handleCreatePackaging = () => {
    setError(null);
    setSuccessMessage(null);

    if (!packagingName.trim()) {
      setError(
        "Please enter a packaging configuration name."
      );
      return;
    }

    const items = packagingRows
      .filter(
        (row) =>
          row.packagingMaterialId &&
          row.quantity.trim()
      )
      .map((row) => ({
        packagingMaterialId:
          row.packagingMaterialId,
        quantity: Number(row.quantity),
        notes: null,
      }));

    if (items.length === 0) {
      setError(
        "Add at least one packaging material to the configuration."
      );
      return;
    }

    const hasInvalidQuantity = items.some(
      (item) =>
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
    );

    if (hasInvalidQuantity) {
      setError(
        "Every packaging quantity must be greater than 0."
      );
      return;
    }

    const uniqueIds = new Set(
      items.map(
        (item) => item.packagingMaterialId
      )
    );

    if (uniqueIds.size !== items.length) {
      setError(
        "A packaging material can only appear once in a configuration."
      );
      return;
    }

    startTransition(async () => {
      const result =
        await createProductPackagingConfigurationAction(
          {
            productId: product.id,
            name: packagingName.trim(),
            notes:
              packagingNotes.trim() || null,
            items,
          }
        );

      if (!result.success) {
        setError(
          result.error ||
            "Unable to create packaging configuration."
        );
        return;
      }

      setSuccessMessage(
        `Packaging version ${
          result.data?.version ?? ""
        } created successfully.`
      );

      if (result.data) {
        setPackagingConfigurations(
          (current) => [
            result.data!,
            ...current.map((item) => ({
              ...item,
              isActive: false,
            })),
          ]
        );
      }

      setPackagingName(
        `${stripNewVersionSuffix(
          result.data?.name ??
            packagingName.trim()
        )} — New Version`
      );

      setPackagingNotes("");

    });
  };

  const handleDeleteFormulation = (
    version: SerializedProductFormulation
  ) => {
    setError(null);
    setSuccessMessage(null);

    setDeleteTarget({
      type: "formulation",
      id: version.id,
      version: version.version,
      name: version.name,
      isActive: version.isActive,
      remainingVersions:
        formulations.length - 1,
    });
  };

  const handleDeletePackaging = (
    configuration: SerializedProductPackagingConfiguration
  ) => {
    setError(null);
    setSuccessMessage(null);

    setDeleteTarget({
      type: "packaging",
      id: configuration.id,
      version: configuration.version,
      name: configuration.name,
      isActive: configuration.isActive,
      remainingVersions:
        packagingConfigurations.length - 1,
    });
  };

  const closeDeleteConfirmation = () => {
    if (isPending) {
      return;
    }

    setDeleteTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    const target = deleteTarget;

    startTransition(async () => {
      if (target.type === "formulation") {
        const result =
          await deleteProductFormulationAction({
            id: target.id,
          });

        if (!result.success) {
          setError(
            result.error ||
              "Unable to delete formulation version."
          );
          setDeleteTarget(null);
          return;
        }

        const remaining =
          formulations.filter(
            (item) => item.id !== target.id
          );

        const latestRemaining =
          [...remaining].sort(
            (a, b) =>
              b.version - a.version
          )[0] ?? null;

        setFormulations(
          remaining.map((item) => ({
            ...item,
            isActive:
              latestRemaining
                ? item.id ===
                  latestRemaining.id
                : false,
          }))
        );

        if (
          target.isActive &&
          latestRemaining
        ) {
          setFormulationName(
            `${stripNewVersionSuffix(
              latestRemaining.name
            )} — New Version`
          );

          setFormulationRows(
            latestRemaining.items.map(
              (item) => ({
                rawMaterialId:
                  item.rawMaterialId,
                quantity:
                  item.quantity.toString(),
              })
            )
          );
        } else if (
          target.isActive &&
          !latestRemaining
        ) {
          setFormulationName(
            "Default Formulation"
          );

          setFormulationRows([
            {
              ...EMPTY_FORMULATION_ROW,
            },
          ]);
        }

        setFormulationNotes("");

        setSuccessMessage(
          `Formulation version ${target.version} deleted successfully.`
        );
      } else {
        const result =
          await deleteProductPackagingConfigurationAction(
            {
              id: target.id,
            }
          );

        if (!result.success) {
          setError(
            result.error ||
              "Unable to delete packaging configuration."
          );
          setDeleteTarget(null);
          return;
        }

        const remaining =
          packagingConfigurations.filter(
            (item) => item.id !== target.id
          );

        const latestRemaining =
          [...remaining].sort(
            (a, b) =>
              b.version - a.version
          )[0] ?? null;

        setPackagingConfigurations(
          remaining.map((item) => ({
            ...item,
            isActive:
              latestRemaining
                ? item.id ===
                  latestRemaining.id
                : false,
          }))
        );

        if (
          target.isActive &&
          latestRemaining
        ) {
          setPackagingName(
            `${stripNewVersionSuffix(
              latestRemaining.name
            )} — New Version`
          );

          setPackagingRows(
            latestRemaining.items.map(
              (item) => ({
                packagingMaterialId:
                  item.packagingMaterialId,
                quantity:
                  item.quantity.toString(),
              })
            )
          );
        } else if (
          target.isActive &&
          !latestRemaining
        ) {
          setPackagingName(
            "Default Packaging"
          );

          setPackagingRows([
            {
              ...EMPTY_PACKAGING_ROW,
            },
          ]);
        }

        setPackagingNotes("");

        setSuccessMessage(
          `Packaging version ${target.version} deleted successfully.`
        );
      }

      setDeleteTarget(null);

    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/50 p-2 backdrop-blur-sm sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-configuration-title"
    >
      <div className="my-0 flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl sm:max-h-[calc(100dvh-1.5rem)]">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border px-4 py-3 sm:px-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Product Configuration
            </p>

            <h2
              id="product-configuration-title"
              className="mt-1 text-lg font-semibold tracking-[-0.025em] text-text-primary"
            >
              {product.name}
            </h2>

            <p className="mt-1 font-mono text-[10px] text-text-muted">
              {product.sku}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-2 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary disabled:opacity-50"
            aria-label="Close configuration"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 border-b border-border px-4 sm:px-5">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("formulation");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`border-b-2 py-2 text-xs font-semibold transition ${
                activeTab === "formulation"
                  ? "border-slate-950 text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />
                Formulation
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("packaging");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`border-b-2 py-2 text-xs font-semibold transition ${
                activeTab === "packaging"
                  ? "border-slate-950 text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Packaging
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading product configuration...
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
                  {successMessage}
                </div>
              )}

              {activeTab === "formulation" ? (
                <FormulationWorkspace
                  activeFormulation={
                    activeFormulation
                  }
                  formulations={formulations}
                  rawMaterials={rawMaterials}
                  formulationName={
                    formulationName
                  }
                  formulationNotes={
                    formulationNotes
                  }
                  formulationRows={
                    formulationRows
                  }
                  previewCost={
                    formulationPreviewCost
                  }
                  isPending={isPending}
                  onNameChange={
                    setFormulationName
                  }
                  onNotesChange={
                    setFormulationNotes
                  }
                  onAddRow={
                    addFormulationRow
                  }
                  onRemoveRow={
                    removeFormulationRow
                  }
                  onRowChange={
                    updateFormulationRow
                  }
                  onCreate={
                    handleCreateFormulation
                  }
                  onDelete={
                    handleDeleteFormulation
                  }
                />
              ) : (
                <PackagingWorkspace
                  activePackaging={
                    activePackaging
                  }
                  configurations={
                    packagingConfigurations
                  }
                  packagingMaterials={
                    packagingMaterials
                  }
                  packagingName={
                    packagingName
                  }
                  packagingNotes={
                    packagingNotes
                  }
                  packagingRows={
                    packagingRows
                  }
                  previewCost={
                    packagingPreviewCost
                  }
                  isPending={isPending}
                  onNameChange={
                    setPackagingName
                  }
                  onNotesChange={
                    setPackagingNotes
                  }
                  onAddRow={
                    addPackagingRow
                  }
                  onRemoveRow={
                    removePackagingRow
                  }
                  onRowChange={
                    updatePackagingRow
                  }
                  onCreate={
                    handleCreatePackaging
                  }
                  onDelete={
                    handleDeletePackaging
                  }
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
          <p className="text-[10px] leading-4 text-text-muted">
            Creating a new version does not consume
            inventory. Costs are always calculated from
            current inventory weighted-average costs.
          </p>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary shadow-sm transition hover:bg-surface-muted disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirmationDialog
          target={deleteTarget}
          isPending={isPending}
          onCancel={
            closeDeleteConfirmation
          }
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function FormulationWorkspace({
  activeFormulation,
  formulations,
  rawMaterials,
  formulationName,
  formulationNotes,
  formulationRows,
  previewCost,
  isPending,
  onNameChange,
  onNotesChange,
  onAddRow,
  onRemoveRow,
  onRowChange,
  onCreate,
  onDelete,
}: {
  activeFormulation:
    | SerializedProductFormulation
    | null;
  formulations: SerializedProductFormulation[];
  rawMaterials: SerializedRawMaterial[];
  formulationName: string;
  formulationNotes: string;
  formulationRows: FormulationRow[];
  previewCost: number;
  isPending: boolean;
  onNameChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onRowChange: (
    index: number,
    field: keyof FormulationRow,
    value: string
  ) => void;
  onCreate: () => void;
  onDelete: (
    version: SerializedProductFormulation
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Active configuration"
        title="Current formulation"
        description="The active formulation defines the raw materials required to make one finished product unit."
      />

      {activeFormulation ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface-muted/60 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-text-primary">
                {activeFormulation.name}
              </p>

              <p className="mt-0.5 text-[10px] text-text-muted">
                Version{" "}
                {activeFormulation.version}{" "}
                · Active
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Cost / unit
              </p>

              <p className="mt-0.5 text-sm font-bold text-text-primary">
                {formatINR(
                  activeFormulation.totalRawMaterialCost
                )}
              </p>
            </div>
          </div>

          <ConfigurationItemsTable
            headers={[
              "Raw material",
              "Quantity",
              "Current cost",
              "Line cost",
            ]}
            rows={activeFormulation.items.map(
              (item) => [
                item.rawMaterialName,
                `${formatNumber(
                  item.quantity
                )} ${item.baseUnit.toLowerCase()}`,
                formatINR(
                  item.weightedAverageCost
                ),
                formatINR(item.lineCost),
              ]
            )}
          />
        </div>
      ) : (
        <EmptyConfiguration
          title="No formulation configured"
          description="Create the first formulation for this product below."
        />
      )}

      <div className="border-t border-border pt-6">
        <SectionHeading
          eyebrow={
            activeFormulation
              ? "New version"
              : "First configuration"
          }
          title={
            activeFormulation
              ? "Create formulation version"
              : "Create formulation"
          }
          description="Saving creates a new version and makes it the active formulation."
        />

        <div className="mt-3 space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Formulation name"
              value={formulationName}
              onChange={onNameChange}
              placeholder="Default Formulation"
            />

            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Current calculated cost
              </span>

              <span className="mt-1 block text-sm font-bold text-text-primary">
                {formatINR(previewCost)}
              </span>
            </div>
          </div>

          <Field
            label="Notes"
            value={formulationNotes}
            onChange={onNotesChange}
            placeholder="Optional notes about this formulation"
          />

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_80px] gap-3 border-b border-border bg-surface-muted/60 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              <span>Raw material</span>
              <span>Qty / unit</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {formulationRows.map(
                (row, index) => {
                  const material =
                    rawMaterials.find(
                      (item) =>
                        item.id ===
                        row.rawMaterialId
                    );

                  return (
                    <div
                      key={`formulation-row-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_120px_80px] items-center gap-3 px-4 py-3"
                    >
                      <select
                        value={
                          row.rawMaterialId
                        }
                        onChange={(event) =>
                          onRowChange(
                            index,
                            "rawMaterialId",
                            event.target.value
                          )
                        }
                        className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-xs text-text-secondary outline-none transition focus:border-slate-400"
                      >
                        <option value="">
                          Select raw material
                        </option>

                        {rawMaterials.map(
                          (item) => (
                            <option
                              key={item.id}
                              value={item.id}
                            >
                              {item.name} ·{" "}
                              {formatINR(
                                item.weightedAverageCost
                              )}
                              /
                              {item.baseUnit.toLowerCase()}
                            </option>
                          )
                        )}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.000001"
                        value={row.quantity}
                        onChange={(event) =>
                          onRowChange(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        placeholder="0"
                        className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-xs text-text-secondary outline-none transition focus:border-slate-400"
                      />

                      <div className="flex items-center justify-end gap-2">
                        {material && (
                          <span className="text-[9px] text-text-muted">
                            {formatINR(
                              material.weightedAverageCost
                            )}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            onRemoveRow(index)
                          }
                          disabled={
                            formulationRows.length ===
                              1 ||
                            isPending
                          }
                          className="rounded-lg p-2 text-text-muted transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Remove raw material"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={onAddRow}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary transition hover:text-text-primary disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add raw material
              </button>
            </div>
          </div>

          {rawMaterials.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-700">
              No raw materials exist yet. Create raw
              materials from Materials before configuring
              this product.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCreate}
              disabled={
                isPending ||
                rawMaterials.length === 0
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}

              {activeFormulation
                ? "Create New Version"
                : "Create Formulation"}
            </button>
          </div>
        </div>
      </div>

      <VersionHistory
        title="Formulation history"
        versions={formulations.map(
          (formulation) => ({
            id: formulation.id,
            version: formulation.version,
            name: formulation.name,
            isActive: formulation.isActive,
            cost:
              formulation.totalRawMaterialCost,
          })
        )}
        onDelete={(version) => {
          const formulation =
            formulations.find(
              (item) =>
                item.id === version.id
            );

          if (formulation) {
            onDelete(formulation);
          }
        }}
        isPending={isPending}
      />
    </div>
  );
}

function PackagingWorkspace({
  activePackaging,
  configurations,
  packagingMaterials,
  packagingName,
  packagingNotes,
  packagingRows,
  previewCost,
  isPending,
  onNameChange,
  onNotesChange,
  onAddRow,
  onRemoveRow,
  onRowChange,
  onCreate,
  onDelete,
}: {
  activePackaging:
    | SerializedProductPackagingConfiguration
    | null;
  configurations:
    | SerializedProductPackagingConfiguration[];
  packagingMaterials: SerializedPackagingMaterial[];
  packagingName: string;
  packagingNotes: string;
  packagingRows: PackagingRow[];
  previewCost: number;
  isPending: boolean;
  onNameChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onRowChange: (
    index: number,
    field: keyof PackagingRow,
    value: string
  ) => void;
  onCreate: () => void;
  onDelete: (
    configuration: SerializedProductPackagingConfiguration
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Active configuration"
        title="Current packaging"
        description="The active packaging configuration defines the packaging materials required for one finished product unit."
      />

      {activePackaging ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface-muted/60 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-text-primary">
                {activePackaging.name}
              </p>

              <p className="mt-0.5 text-[10px] text-text-muted">
                Version{" "}
                {activePackaging.version}{" "}
                · Active
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                Cost / unit
              </p>

              <p className="mt-0.5 text-sm font-bold text-text-primary">
                {formatINR(
                  activePackaging.totalPackagingCost
                )}
              </p>
            </div>
          </div>

          <ConfigurationItemsTable
            headers={[
              "Packaging material",
              "Quantity",
              "Current cost",
              "Line cost",
            ]}
            rows={activePackaging.items.map(
              (item) => [
                item.packagingMaterialName,
                `${formatNumber(
                  item.quantity
                )} piece`,
                formatINR(
                  item.weightedAverageCost
                ),
                formatINR(item.lineCost),
              ]
            )}
          />
        </div>
      ) : (
        <EmptyConfiguration
          title="No packaging configured"
          description="Create the first packaging configuration for this product below."
        />
      )}

      <div className="border-t border-border pt-6">
        <SectionHeading
          eyebrow={
            activePackaging
              ? "New version"
              : "First configuration"
          }
          title={
            activePackaging
              ? "Create packaging version"
              : "Create packaging configuration"
          }
          description="Saving creates a new version and makes it the active packaging configuration."
        />

        <div className="mt-3 space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Packaging name"
              value={packagingName}
              onChange={onNameChange}
              placeholder="Default Packaging"
            />

            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Current calculated cost
              </span>

              <span className="mt-1 block text-sm font-bold text-text-primary">
                {formatINR(previewCost)}
              </span>
            </div>
          </div>

          <Field
            label="Notes"
            value={packagingNotes}
            onChange={onNotesChange}
            placeholder="Optional notes about this packaging"
          />

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_80px] gap-3 border-b border-border bg-surface-muted/60 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              <span>Packaging material</span>
              <span>Qty / unit</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {packagingRows.map(
                (row, index) => {
                  const material =
                    packagingMaterials.find(
                      (item) =>
                        item.id ===
                        row.packagingMaterialId
                    );

                  return (
                    <div
                      key={`packaging-row-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_120px_80px] items-center gap-3 px-4 py-3"
                    >
                      <select
                        value={
                          row.packagingMaterialId
                        }
                        onChange={(event) =>
                          onRowChange(
                            index,
                            "packagingMaterialId",
                            event.target.value
                          )
                        }
                        className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-xs text-text-secondary outline-none transition focus:border-slate-400"
                      >
                        <option value="">
                          Select packaging material
                        </option>

                        {packagingMaterials.map(
                          (item) => (
                            <option
                              key={item.id}
                              value={item.id}
                            >
                              {item.name} ·{" "}
                              {formatINR(
                                item.weightedAverageCost
                              )}
                              /piece
                            </option>
                          )
                        )}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.000001"
                        value={row.quantity}
                        onChange={(event) =>
                          onRowChange(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        placeholder="0"
                        className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-xs text-text-secondary outline-none transition focus:border-slate-400"
                      />

                      <div className="flex items-center justify-end gap-2">
                        {material && (
                          <span className="text-[9px] text-text-muted">
                            {formatINR(
                              material.weightedAverageCost
                            )}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            onRemoveRow(index)
                          }
                          disabled={
                            packagingRows.length ===
                              1 ||
                            isPending
                          }
                          className="rounded-lg p-2 text-text-muted transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Remove packaging material"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={onAddRow}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary transition hover:text-text-primary disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add packaging material
              </button>
            </div>
          </div>

          {packagingMaterials.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-700">
              No packaging materials exist yet. Create
              packaging materials from Materials before
              configuring this product.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCreate}
              disabled={
                isPending ||
                packagingMaterials.length === 0
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}

              {activePackaging
                ? "Create New Version"
                : "Create Packaging"}
            </button>
          </div>
        </div>
      </div>

      <VersionHistory
        title="Packaging history"
        versions={configurations.map(
          (configuration) => ({
            id: configuration.id,
            version: configuration.version,
            name: configuration.name,
            isActive:
              configuration.isActive,
            cost:
              configuration.totalPackagingCost,
          })
        )}
        onDelete={(version) => {
          const configuration =
            configurations.find(
              (item) =>
                item.id === version.id
            );

          if (configuration) {
            onDelete(configuration);
          }
        }}
        isPending={isPending}
      />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
        {eyebrow}
      </p>

      <h3 className="mt-1 text-sm font-semibold text-text-primary">
        {title}
      </h3>

      <p className="mt-1 max-w-2xl text-[11px] leading-5 text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function ConfigurationItemsTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-border">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map(
                (value, valueIndex) => (
                  <td
                    key={valueIndex}
                    className="px-4 py-3 text-[11px] text-text-secondary"
                  >
                    {value}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VersionHistory({
  title,
  versions,
  onDelete,
  isPending,
}: {
  title: string;
  versions: Array<{
    id: string;
    version: number;
    name: string;
    isActive: boolean;
    cost: number;
  }>;
  onDelete: (version: {
    id: string;
    version: number;
    name: string;
    isActive: boolean;
    cost: number;
  }) => void;
  isPending: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-primary">
          {title}
        </h3>

        <span className="text-[10px] text-text-muted">
          {versions.length}{" "}
          {versions.length === 1
            ? "version"
            : "versions"}
        </span>
      </div>

      {versions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-[10px] text-text-muted">
          No versions yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
            >
              <div>
                <p className="text-[11px] font-semibold text-text-primary">
                  Version {version.version}
                </p>

                <p className="mt-0.5 text-[10px] text-text-muted">
                  {version.name}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-text-secondary">
                  {formatINR(version.cost)}
                </span>

                {version.isActive && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                    Active
                  </span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onDelete(version)
                  }
                  disabled={isPending}
                  className="rounded-lg p-2 text-text-muted transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Delete version ${version.version}`}
                  title={`Delete version ${version.version}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteConfirmationDialog({
  target,
  isPending,
  onCancel,
  onConfirm,
}: {
  target: NonNullable<DeleteTarget>;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isFormulation =
    target.type === "formulation";

  const configurationType =
    isFormulation
      ? "formulation"
      : "packaging configuration";

  const willHaveNoVersions =
    target.remainingVersions === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface-raised shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-version-title"
        aria-describedby="delete-version-description"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-red-600">
              Delete version
            </p>

            <h3
              id="delete-version-title"
              className="mt-1 text-sm font-semibold text-text-primary"
            >
              Delete {configurationType}?
            </h3>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary disabled:opacity-50"
            aria-label="Close delete confirmation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
            <p className="text-xs font-semibold text-text-primary">
              Version {target.version}
            </p>

            <p className="mt-1 text-[10px] text-text-secondary">
              {target.name}
            </p>
          </div>

          <p
            id="delete-version-description"
            className="mt-4 text-xs leading-5 text-text-secondary"
          >
            This will permanently delete this{" "}
            {configurationType} version.
          </p>

          {target.isActive &&
            !willHaveNoVersions && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-700">
                This is the active version. After
                deletion, the latest remaining version
                will automatically become active.
              </div>
            )}

          {target.isActive &&
            willHaveNoVersions && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-700">
                This is the only version. After
                deletion, this product will have no{" "}
                {isFormulation
                  ? "formulation"
                  : "packaging configuration"}
                , and its corresponding economics will
                become unavailable until a new version
                is created.
              </div>
            )}

          {!target.isActive && (
            <div className="mt-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-[10px] leading-4 text-text-secondary">
              The active version will not be changed by
              deleting this inactive version.
            </div>
          )}

          <p className="mt-4 text-[10px] leading-4 text-text-muted">
            Versions already used by a production batch
            cannot be deleted because production history
            must remain intact.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}

            {isPending
              ? "Deleting..."
              : "Delete Version"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyConfiguration({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-muted/50 px-5 py-8 text-center">
      <p className="text-xs font-semibold text-text-secondary">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-md text-[10px] leading-4 text-text-muted">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold text-text-secondary">
        {label}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-surface-raised px-3 text-xs text-text-secondary outline-none transition placeholder:text-text-muted focus:border-slate-400"
      />
    </label>
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? value.toString()
    : value
        .toFixed(6)
        .replace(/\.?0+$/, "");
}