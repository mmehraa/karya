import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import type {
  CreateGoalInput,
  UpdateGoalInput,
} from "./validation";

import type {
  GoalListItem,
  GoalsSummary,
  SerializedGoal,
} from "./types";

function decimalToNumber(
  value: Prisma.Decimal | null
): number {
  return value ? Number(value.toString()) : 0;
}

function serializeGoal(goal: {
  id: string;
  businessId: string;
  name: string;
  category: string;
  targetValue: Prisma.Decimal;
  currentValue: Prisma.Decimal;
  unit: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SerializedGoal {
  return {
    id: goal.id,
    businessId: goal.businessId,
    name: goal.name,
    category: goal.category,
    targetValue: decimalToNumber(goal.targetValue),
    currentValue: decimalToNumber(goal.currentValue),
    unit: goal.unit,
    startDate: goal.startDate,
    endDate: goal.endDate,
    isCompleted: goal.isCompleted,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

function calculateProgress(
  currentValue: number,
  targetValue: number
): number {
  if (targetValue <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((currentValue / targetValue) * 100)
  );
}

export async function getGoals(
  businessId: string
): Promise<SerializedGoal[]> {
  const goals = await db.goal.findMany({
    where: {
      businessId,
    },
    orderBy: [
      {
        isCompleted: "asc",
      },
      {
        endDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return goals.map(serializeGoal);
}

export async function getGoalById(
  businessId: string,
  goalId: string
): Promise<SerializedGoal | null> {
  const goal = await db.goal.findFirst({
    where: {
      id: goalId,
      businessId,
    },
  });

  return goal ? serializeGoal(goal) : null;
}

export async function getGoalList(
  businessId: string
): Promise<GoalListItem[]> {
  const goals = await db.goal.findMany({
    where: {
      businessId,
    },
    orderBy: [
      {
        isCompleted: "asc",
      },
      {
        endDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return goals.map((goal) => {
    const currentValue = decimalToNumber(
      goal.currentValue
    );

    const targetValue = decimalToNumber(
      goal.targetValue
    );

    return {
      id: goal.id,
      name: goal.name,
      category: goal.category,
      targetValue,
      currentValue,
      unit: goal.unit,
      startDate: goal.startDate,
      endDate: goal.endDate,
      isCompleted: goal.isCompleted,
      progressPercent: calculateProgress(
        currentValue,
        targetValue
      ),
      createdAt: goal.createdAt,
    };
  });
}

export async function createGoal(
  businessId: string,
  input: CreateGoalInput
): Promise<SerializedGoal> {
  if (input.currentValue > input.targetValue) {
    throw new Error(
      "Current value cannot exceed the target value."
    );
  }

  const shouldComplete =
    input.isCompleted ||
    input.currentValue >= input.targetValue;

  const goal = await db.goal.create({
    data: {
      businessId,
      name: input.name,
      category: input.category,
      targetValue: input.targetValue,
      currentValue: input.currentValue,
      unit: input.unit,
      startDate: input.startDate,
      endDate: input.endDate,
      isCompleted: shouldComplete,
    },
  });

  return serializeGoal(goal);
}

export async function updateGoal(
  businessId: string,
  input: UpdateGoalInput
): Promise<SerializedGoal> {
  const existing = await db.goal.findFirst({
    where: {
      id: input.id,
      businessId,
    },
  });

  if (!existing) {
    throw new Error("Goal not found.");
  }

  const nextTarget =
    input.targetValue !== undefined
      ? input.targetValue
      : decimalToNumber(existing.targetValue);

  const nextCurrent =
    input.currentValue !== undefined
      ? input.currentValue
      : decimalToNumber(existing.currentValue);

  const nextStartDate =
    input.startDate !== undefined
      ? input.startDate
      : existing.startDate;

  const nextEndDate =
    input.endDate !== undefined
      ? input.endDate
      : existing.endDate;

  if (nextCurrent > nextTarget) {
    throw new Error(
      "Current value cannot exceed the target value."
    );
  }

  if (nextEndDate < nextStartDate) {
    throw new Error(
      "End date cannot be before the start date."
    );
  }

  const shouldComplete =
    input.isCompleted ??
    (nextCurrent >= nextTarget);

  const data: Prisma.GoalUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.category !== undefined) {
    data.category = input.category;
  }

  if (input.targetValue !== undefined) {
    data.targetValue = input.targetValue;
  }

  if (input.currentValue !== undefined) {
    data.currentValue = input.currentValue;
  }

  if (input.unit !== undefined) {
    data.unit = input.unit;
  }

  if (input.startDate !== undefined) {
    data.startDate = input.startDate;
  }

  if (input.endDate !== undefined) {
    data.endDate = input.endDate;
  }

  data.isCompleted = shouldComplete;

  const updated = await db.goal.update({
    where: {
      id: input.id,
    },
    data,
  });

  return serializeGoal(updated);
}

export async function deleteGoal(
  businessId: string,
  goalId: string
): Promise<void> {
  const existing = await db.goal.findFirst({
    where: {
      id: goalId,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error("Goal not found.");
  }

  await db.goal.delete({
    where: {
      id: existing.id,
    },
  });
}

export async function getGoalsSummary(
  businessId: string
): Promise<GoalsSummary> {
  const now = new Date();

  const [
    totalGoals,
    activeGoals,
    completedGoals,
    overdueGoals,
  ] = await Promise.all([
    db.goal.count({
      where: {
        businessId,
      },
    }),

    db.goal.count({
      where: {
        businessId,
        isCompleted: false,
      },
    }),

    db.goal.count({
      where: {
        businessId,
        isCompleted: true,
      },
    }),

    db.goal.count({
      where: {
        businessId,
        isCompleted: false,
        endDate: {
          lt: now,
        },
      },
    }),
  ]);

  return {
    totalGoals,
    activeGoals,
    completedGoals,
    overdueGoals,
  };
}