import { getDashboardContext } from "@/modules/business/dashboard-context";
import {
  getGoals,
} from "@/modules/goals/services";
import {
  getTaskList,
  getTasksSummary,
} from "@/modules/tasks/services";
import type { TaskGoalOption } from "@/modules/tasks/types";
import { TasksClient } from "@/modules/tasks/components/tasks-client";

export default async function TasksPage() {
  const { businessId } = await getDashboardContext();

  const [tasks, summary, goals] = await Promise.all([
    getTaskList(businessId),
    getTasksSummary(businessId),
    getGoals(businessId),
  ]);

  const goalOptions: TaskGoalOption[] = goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
  }));

  return (
    <TasksClient
      tasks={tasks}
      summary={summary}
      goals={goalOptions}
    />
  );
}