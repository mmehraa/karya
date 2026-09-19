import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  getGoalList,
  getGoalsSummary,
} from "@/modules/goals/services";
import { GoalsClient } from "@/modules/goals/components/goals-client";

export default async function GoalsPage() {
  const { businessId } = await getDashboardContext();

  const [goals, summary] = await Promise.all([
    getGoalList(businessId),
    getGoalsSummary(businessId),
  ]);

  return (
    <GoalsClient
      goals={goals}
      summary={summary}
    />
  );
}