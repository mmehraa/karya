"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBusinessAction } from "@/modules/business/actions";

const industries = [
  "D2C / E-commerce",
  "Retail",
  "Manufacturing",
  "Professional Services",
  "Technology / SaaS",
  "Food & Beverage",
  "Healthcare",
  "Education",
  "Other",
];

const constitutions = [
  "Proprietorship",
  "Partnership",
  "Limited Liability Partnership (LLP)",
  "Private Limited Company",
  "Public Limited Company",
  "One Person Company (OPC)",
  "Other",
];

const countries = [
  {
    name: "India",
    code: "IN",
    currencyCode: "INR",
    currencySymbol: "₹",
    currencyName: "Indian Rupee",
  },
  {
    name: "United States",
    code: "US",
    currencyCode: "USD",
    currencySymbol: "$",
    currencyName: "US Dollar",
  },
  {
    name: "United Kingdom",
    code: "GB",
    currencyCode: "GBP",
    currencySymbol: "£",
    currencyName: "British Pound",
  },
  {
    name: "European Union",
    code: "EU",
    currencyCode: "EUR",
    currencySymbol: "€",
    currencyName: "Euro",
  },
  {
    name: "United Arab Emirates",
    code: "AE",
    currencyCode: "AED",
    currencySymbol: "د.إ",
    currencyName: "UAE Dirham",
  },
  {
    name: "Australia",
    code: "AU",
    currencyCode: "AUD",
    currencySymbol: "A$",
    currencyName: "Australian Dollar",
  },
  {
    name: "Canada",
    code: "CA",
    currencyCode: "CAD",
    currencySymbol: "C$",
    currencyName: "Canadian Dollar",
  },
  {
    name: "Singapore",
    code: "SG",
    currencyCode: "SGD",
    currencySymbol: "S$",
    currencyName: "Singapore Dollar",
  },
];

const founderStages = [
  {
    id: 0,
    name: "Idea",
    description:
      "You are exploring the business idea and have not yet established the business.",
  },
  {
    id: 1,
    name: "Pre-launch",
    description:
      "The business is being prepared for launch, including products, operations, branding, or distribution.",
  },
  {
    id: 2,
    name: "Launch",
    description:
      "The business is launching or has recently started selling to customers.",
  },
  {
    id: 3,
    name: "Validation",
    description:
      "You have initial customers or sales and are testing whether the business model is working.",
  },
  {
    id: 4,
    name: "Growth",
    description:
      "The business has demonstrated traction and is actively working to increase revenue and customer acquisition.",
  },
  {
    id: 5,
    name: "Scale",
    description:
      "The business has established operations and is building systems, teams, and processes for larger scale.",
  },
  {
    id: 6,
    name: "Funding",
    description:
      "The business is preparing for, pursuing, or managing external funding and investor requirements.",
  },
  {
    id: 7,
    name: "Expansion",
    description:
      "The business is expanding into new markets, geographies, channels, products, or business lines.",
  },
  {
    id: 8,
    name: "Mature / Enterprise",
    description:
      "The business has established operations, structured management, and mature business processes.",
  },
];

type OnboardingProduct = {
  name: string;
  description: string;
  sku: string;
  sellingPrice: string;
  cogs: string;
  packagingCost: string;
  variableCost: string;
};

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEmptyProduct(): OnboardingProduct {
  return {
    name: "",
    description: "",
    sku: "",
    sellingPrice: "",
    cogs: "",
    packagingCost: "",
    variableCost: "",
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(1);

  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [constitution, setConstitution] = useState("");

  const [countryCode, setCountryCode] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [currencyName, setCurrencyName] = useState("");

  const [founderStageAssessmentId, setFounderStageAssessmentId] = useState<
    number | null
  >(null);

  const [products, setProducts] = useState<OnboardingProduct[]>([]);

  const [error, setError] = useState("");

  function handleStepOneContinue() {
    setError("");

    if (!businessName.trim()) {
      setError("Please enter your business name.");
      return;
    }

    if (!industry) {
      setError("Please select your industry.");
      return;
    }

    const slug = createSlug(businessName);

    if (!slug) {
      setError("Please enter a valid business name.");
      return;
    }

    setStep(2);
  }

  function handleCountryChange(value: string) {
    setError("");

    const selectedCountry = countries.find(
      (country) => country.code === value,
    );

    if (!selectedCountry) {
      setCountryCode("");
      setCurrencyCode("");
      setCurrencySymbol("");
      setCurrencyName("");
      return;
    }

    setCountryCode(selectedCountry.code);
    setCurrencyCode(selectedCountry.currencyCode);
    setCurrencySymbol(selectedCountry.currencySymbol);
    setCurrencyName(selectedCountry.currencyName);
  }

  function handleStepTwoContinue() {
    setError("");

    if (!countryCode) {
      setError("Please select your country.");
      return;
    }

    if (!currencyCode || !currencySymbol) {
      setError("Please select a valid currency.");
      return;
    }

    setStep(3);
  }

  function handleStepThreeContinue() {
    setError("");

    if (founderStageAssessmentId === null) {
      setError(
        "Please select the stage that best describes your business.",
      );
      return;
    }

    setStep(4);
  }

  function updateProduct(
    index: number,
    field: keyof OnboardingProduct,
    value: string,
  ) {
    setProducts((currentProducts) =>
      currentProducts.map((product, productIndex) =>
        productIndex === index
          ? {
              ...product,
              [field]: value,
            }
          : product,
      ),
    );
  }

  function addProduct() {
    setError("");

    setProducts((currentProducts) => [
      ...currentProducts,
      createEmptyProduct(),
    ]);
  }

  function removeProduct(index: number) {
    setProducts((currentProducts) =>
      currentProducts.filter((_, productIndex) => productIndex !== index),
    );
  }

  function handleStepFourContinue() {
    setError("");

    const incompleteProductIndex = products.findIndex(
      (product) => !product.name.trim(),
    );

    if (incompleteProductIndex !== -1) {
      setError(
        `Please enter a name for product/service ${
          incompleteProductIndex + 1
        }.`,
      );
      return;
    }

    setStep(5);
  }

  function handleCompleteSetup() {
    setError("");

    if (!businessName.trim()) {
      setError("Business name is missing.");
      return;
    }

    if (!industry) {
      setError("Industry is missing.");
      return;
    }

    if (!countryCode || !currencyCode || !currencySymbol) {
      setError("Country and currency information is incomplete.");
      return;
    }

    if (founderStageAssessmentId === null) {
      setError("Founder assessment is missing.");
      return;
    }

    const slug = createSlug(businessName);

    if (!slug) {
      setError("Could not generate a valid business identifier.");
      return;
    }

    startTransition(async () => {
      const result = await createBusinessAction({
        name: businessName,
        slug,
        tagline,
        description,
        industry,
        constitution,
        countryCode,
        currencyCode,
        currencySymbol,
        founderStageAssessmentId,
        products,
      });

      if (!result.success) {
        setError(result.error ?? "We couldn't create the business. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  /*
   * STEP 5 — REVIEW & CREATE
   */
  if (step === 5) {
    const selectedStage = founderStages.find(
      (stage) => stage.id === founderStageAssessmentId,
    );

    const selectedCountry = countries.find(
      (country) => country.code === countryCode,
    );

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-600">
              Business Setup
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Tell us about your business
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review your information before creating the business.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Step 5 of 5
              </span>

              <span className="text-xs font-medium text-slate-500">
                Review &amp; Complete
              </span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-blue-600"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Review your setup
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Check the information below before creating your business.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Business
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {businessName}
                </p>

                {tagline && (
                  <p className="mt-1 text-sm text-slate-500">
                    {tagline}
                  </p>
                )}

                {description && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Industry
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {industry}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Business type
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {constitution || "Not specified"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Country
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedCountry?.name ?? "Not specified"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Currency
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {currencyName} ({currencyCode})
                  </p>

                  <p className="mt-1 text-lg font-semibold text-slate-700">
                    {currencySymbol}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Founder assessment
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  Stage {selectedStage?.id}: {selectedStage?.name}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {selectedStage?.description}
                </p>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  This assessment is stored separately from the BOS official
                  stage. The BOS will determine official stage readiness using
                  its own requirements.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Products / Services
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {products.length === 0
                        ? "None added"
                        : `${products.length} ${
                            products.length === 1 ? "item" : "items"
                          } added`}
                    </p>
                  </div>
                </div>

                {products.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {products.map((product, index) => (
                      <div
                        key={`${product.name}-${index}`}
                        className="rounded-lg bg-slate-50 p-3"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {product.name}
                        </p>

                        {product.description && (
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {product.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {product.sku && (
                            <span>SKU: {product.sku}</span>
                          )}

                          {product.sellingPrice && (
                            <span>
                              Price: {currencySymbol}
                              {product.sellingPrice}
                            </span>
                          )}

                          {product.cogs && (
                            <span>
                              COGS: {currencySymbol}
                              {product.cogs}
                            </span>
                          )}

                          {product.packagingCost && (
                            <span>
                              Packaging: {currencySymbol}
                              {product.packagingCost}
                            </span>
                          )}

                          {product.variableCost && (
                            <span>
                              Variable cost: {currencySymbol}
                              {product.variableCost}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError("");
                  setStep(4);
                }}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleCompleteSetup}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isPending ? "Creating Business..." : "Complete Setup"}
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Your business and onboarding information will be saved together.
          </p>
        </div>
      </main>
    );
  }

  /*
   * STEP 4 — PRODUCTS / SERVICES
   */
  if (step === 4) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-600">
              Business Setup
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Tell us about your business
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Your business information is being held temporarily. Nothing
              has been created in the database yet.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Step 4 of 5
              </span>

              <span className="text-xs font-medium text-slate-500">
                Products &amp; Services
              </span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-blue-600"
                style={{ width: "80%" }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                What do you sell or provide?
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Adding products or services is optional. You can add them now
                or create them later from the Products section.
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Don&apos;t know the economics yet?
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                That&apos;s okay. Selling price, COGS, packaging cost, and
                variable cost can all be left blank and added later.
              </p>
            </div>

            {products.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No products or services added yet.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  You can skip this step and add them later.
                </p>
              </div>
            )}

            <div className="space-y-5">
              {products.map((product, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      Product / Service {index + 1}
                    </h3>

                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      className="text-xs font-semibold text-red-600 transition hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor={`product-name-${index}`}
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
                      >
                        Name
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <input
                        id={`product-name-${index}`}
                        type="text"
                        value={product.name}
                        onChange={(event) =>
                          updateProduct(
                            index,
                            "name",
                            event.target.value,
                          )
                        }
                        placeholder="e.g. Moisturising Face Pack"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`product-description-${index}`}
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
                      >
                        Description
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          Optional
                        </span>
                      </label>

                      <textarea
                        id={`product-description-${index}`}
                        value={product.description}
                        onChange={(event) =>
                          updateProduct(
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                        rows={3}
                        placeholder="Brief description of the product or service."
                        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`product-sku-${index}`}
                        className="mb-1.5 block text-sm font-semibold text-slate-700"
                      >
                        SKU / Code
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          Optional
                        </span>
                      </label>

                      <input
                        id={`product-sku-${index}`}
                        type="text"
                        value={product.sku}
                        onChange={(event) =>
                          updateProduct(index, "sku", event.target.value)
                        }
                        placeholder="e.g. PR-MFP-001"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Commercial information
                      </p>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`product-price-${index}`}
                            className="mb-1.5 block text-sm font-semibold text-slate-700"
                          >
                            Selling price
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              Optional
                            </span>
                          </label>

                          <div className="flex">
                            <span className="flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                              {currencySymbol}
                            </span>

                            <input
                              id={`product-price-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.sellingPrice}
                              onChange={(event) =>
                                updateProduct(
                                  index,
                                  "sellingPrice",
                                  event.target.value,
                                )
                              }
                              placeholder="0.00"
                              className="w-full rounded-r-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor={`product-cogs-${index}`}
                            className="mb-1.5 block text-sm font-semibold text-slate-700"
                          >
                            COGS
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              Optional
                            </span>
                          </label>

                          <div className="flex">
                            <span className="flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                              {currencySymbol}
                            </span>

                            <input
                              id={`product-cogs-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.cogs}
                              onChange={(event) =>
                                updateProduct(
                                  index,
                                  "cogs",
                                  event.target.value,
                                )
                              }
                              placeholder="0.00"
                              className="w-full rounded-r-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor={`product-packaging-${index}`}
                            className="mb-1.5 block text-sm font-semibold text-slate-700"
                          >
                            Packaging cost
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              Optional
                            </span>
                          </label>

                          <div className="flex">
                            <span className="flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                              {currencySymbol}
                            </span>

                            <input
                              id={`product-packaging-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.packagingCost}
                              onChange={(event) =>
                                updateProduct(
                                  index,
                                  "packagingCost",
                                  event.target.value,
                                )
                              }
                              placeholder="0.00"
                              className="w-full rounded-r-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor={`product-variable-cost-${index}`}
                            className="mb-1.5 block text-sm font-semibold text-slate-700"
                          >
                            Other variable cost
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              Optional
                            </span>
                          </label>

                          <div className="flex">
                            <span className="flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                              {currencySymbol}
                            </span>

                            <input
                              id={`product-variable-cost-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.variableCost}
                              onChange={(event) =>
                                updateProduct(
                                  index,
                                  "variableCost",
                                  event.target.value,
                                )
                              }
                              placeholder="0.00"
                              className="w-full rounded-r-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addProduct}
              className="mt-5 w-full rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              + Add product / service
            </button>

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(3);
                }}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleStepFourContinue}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Products can also be added or changed later.
          </p>
        </div>
      </main>
    );
  }

  /*
   * STEP 3 — FOUNDER ASSESSMENT
   */
  if (step === 3) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-600">
              Business Setup
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Tell us about your business
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Your country and currency settings have been saved temporarily.
              Nothing has been created in the database yet.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Step 3 of 5
              </span>

              <span className="text-xs font-medium text-slate-500">
                Founder Assessment
              </span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-blue-600"
                style={{ width: "60%" }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Where is your business today?
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Select the stage that best describes where you believe your
                business currently stands.
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                This is your assessment — not the BOS&apos;s final
                determination.
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                The BOS will separately evaluate your actual business data and
                stage requirements. Your assessment is recorded for context.
              </p>
            </div>

            <div className="space-y-3">
              {founderStages.map((stage) => {
                const selected = founderStageAssessmentId === stage.id;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => {
                      setFounderStageAssessmentId(stage.id);
                      setError("");
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          selected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {stage.id}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-sm font-bold text-slate-900">
                            {stage.name}
                          </h3>

                          <div
                            className={`h-4 w-4 rounded-full border-2 ${
                              selected
                                ? "border-blue-600 bg-blue-600"
                                : "border-slate-300 bg-white"
                            }`}
                          />
                        </div>

                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(2);
                }}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleStepThreeContinue}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Your business will only be created after you complete onboarding.
          </p>
        </div>
      </main>
    );
  }

  /*
   * STEP 2 — COUNTRY & CURRENCY
   */
  if (step === 2) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-600">
              Business Setup
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Tell us about your business
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Your business identity has been saved temporarily. Nothing has
              been created in the database yet.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Step 2 of 5
              </span>

              <span className="text-xs font-medium text-slate-500">
                Country &amp; Currency
              </span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-blue-600"
                style={{ width: "40%" }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Country &amp; currency
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                We&apos;ll use these settings for financial and commercial
                information throughout the BOS.
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {businessName}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {industry}
                {constitution ? ` · ${constitution}` : ""}
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="country"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Country
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <select
                  id="country"
                  value={countryCode}
                  onChange={(event) =>
                    handleCountryChange(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select your country</option>

                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {countryCode && (
                <div>
                  <label
                    htmlFor="currency"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Currency
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {currencyName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Currency code: {currencyCode}
                        </p>
                      </div>

                      <div className="text-2xl font-semibold text-slate-900">
                        {currencySymbol}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleStepTwoContinue}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Your business will only be created after you complete onboarding.
          </p>
        </div>
      </main>
    );
  }

  /*
   * STEP 1 — BUSINESS IDENTITY
   */
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-600">
            Business Setup
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Tell us about your business
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Start with the basics. You can add products, financial data,
            customers, and operational information later.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Step 1 of 5
            </span>

            <span className="text-xs font-medium text-slate-500">
              Business Identity
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-blue-600"
              style={{ width: "20%" }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Business identity
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These details help the BOS understand what business it is
              managing.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="businessName"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Business name
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="e.g. Pahad Rituals"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="tagline"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Tagline
                <span className="ml-1 text-xs font-normal text-slate-400">
                  Optional
                </span>
              </label>

              <input
                id="tagline"
                type="text"
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder="A short statement that represents your business"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                What does your business do?
                <span className="ml-1 text-xs font-normal text-slate-400">
                  Optional
                </span>
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Briefly describe what your business sells or provides."
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="industry"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Industry
                <span className="ml-1 text-red-500">*</span>
              </label>

              <select
                id="industry"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select an industry</option>

                {industries.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="constitution"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Business type / constitution
                <span className="ml-1 text-xs font-normal text-slate-400">
                  Optional
                </span>
              </label>

              <select
                id="constitution"
                value={constitution}
                onChange={(event) => setConstitution(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select business type</option>

                {constitutions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={handleStepOneContinue}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          You can add or change business information later from your business
          settings.
        </p>
      </div>
    </main>
  );
}