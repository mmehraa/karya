import type { Goal } from "@prisma/client";

export interface SerializedGoal {
  id: string;
  businessId: string;
  name: string;
  category: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalListItem {
  id: string;
  name: string;
  category: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  progressPercent: number;
  createdAt: Date;
}

export interface GoalsSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  overdueGoals: number;
}