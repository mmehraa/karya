import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  getCashFlowCategorySummary,
  getCashFlowSummary,
  getCashTransactions,
} from "@/modules/cash-flow/services";
import { CashFlowClient } from "@/modules/cash-flow/components/cash-flow-client";

export default async function CashFlowPage() {
  const { businessId } =
    await getDashboardContext();

  const [
    transactions,
    summary,
    categorySummary,
  ] = await Promise.all([
    getCashTransactions(businessId),
    getCashFlowSummary(businessId),
    getCashFlowCategorySummary(
      businessId,
    ),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Finance Workspace
          </p>

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-text-primary sm:text-3xl">
            Cash flow
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-secondary">
            Track money coming into and leaving
            the business, with every movement tied
            back to its source where possible.
          </p>
        </div>
      </div>

      <CashFlowClient
        initialTransactions={transactions}
        initialSummary={summary}
        initialCategorySummary={
          categorySummary
        }
      />
    </div>
  );
}