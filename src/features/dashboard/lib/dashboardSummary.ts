import type { CategoryRecord, ExpenseRecord, TripRecord } from "../../../db/tripLedgerDb";

export type DashboardHealthTone = "healthy" | "watch" | "critical";

export type DashboardSummary = {
  totalBudget: number;
  totalSpent: number;
  remainingAmount: number;
  progressPercent: number;
  spentRatio: number;
  healthTone: DashboardHealthTone;
  healthLabel: string;
  budgetedCategoryCount: number;
  totalCategoryCount: number;
};

function clampProgressPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= 100) {
    return 100;
  }

  return Math.round(value);
}

function getHealthTone(spentRatio: number): DashboardHealthTone {
  if (spentRatio < 0.7) {
    return "healthy";
  }

  if (spentRatio <= 0.9) {
    return "watch";
  }

  return "critical";
}

export function buildDashboardSummary(
  trip: TripRecord,
  categories: CategoryRecord[],
  expenses: ExpenseRecord[],
): DashboardSummary {
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalBudget = trip.totalBudget;
  const remainingAmount = Math.round((totalBudget - totalSpent) * 100) / 100;
  const spentRatio = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const progressPercent = clampProgressPercent(spentRatio * 100);
  const healthTone = getHealthTone(spentRatio);
  const budgetedCategoryCount = categories.filter((category) => category.budgetAmount > 0).length;

  return {
    totalBudget,
    totalSpent,
    remainingAmount,
    progressPercent,
    spentRatio,
    healthTone,
    healthLabel:
      remainingAmount >= 0
        ? `${progressPercent}% used`
        : `${Math.round(Math.abs(spentRatio * 100 - 100))}% over budget`,
    budgetedCategoryCount,
    totalCategoryCount: categories.length,
  };
}
