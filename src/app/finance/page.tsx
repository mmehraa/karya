import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  getExpenses,
  getFinanceSummary,
  getExpenseCategorySummary,
} from "@/modules/finance/services";
import { getOrders } from "@/modules/orders/services";
import { FinanceClient } from "@/modules/finance/components/finance-client";

export default async function FinancePage() {
  const { businessId } = await getDashboardContext();

  const [
    expenses,
    summary,
    categorySummary,
    orders,
  ] = await Promise.all([
    getExpenses(businessId),
    getFinanceSummary(businessId),
    getExpenseCategorySummary(businessId),
    getOrders(businessId),
  ]);

  const paidOrders = orders.filter(
    (order) => order.paymentStatus === "PAID",
  );

  const totalRevenue = paidOrders.reduce(
    (total, order) => total + order.totalAmount,
    0,
  );

  const totalExpenses = expenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );

  const netProfit = totalRevenue - totalExpenses;

  return (
    <FinanceClient
      expenses={expenses}
      summary={summary}
      categorySummary={categorySummary}
      totalRevenue={totalRevenue}
      totalExpenses={totalExpenses}
      netProfit={netProfit}
      paidOrders={paidOrders}
    />
  );
}