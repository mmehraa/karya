import {
  RequirementStatus,
  RequirementType,
  EvaluationMode,
} from "@prisma/client";

export interface StageRequirementItem {
  id: string;
  stageId: number;
  code: string;
  title: string;
  description: string;
  type: RequirementType;
  evalMode: EvaluationMode;
  evalRuleKey: string | null;
  evalConfig: unknown;
  orderIndex: number;
  status: RequirementStatus;
  blockerReason: string | null;
  notes: string | null;
  completedAt: Date | null;
}