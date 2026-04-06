import { tripLedgerDb, type CategoryRecord } from "../../../db/tripLedgerDb";
import { createHlc } from "../../foundation/lib/hlc";
import { incrementPendingSync } from "../../trips/services/tripService";
import { refreshTripSnapshotFromDb } from "../../trips/services/tripSnapshotService";
import { defaultCategoryDefinitions } from "../lib/defaultCategories";

function parseBudgetAmount(rawBudget: string) {
  const normalized = rawBudget.trim();
  if (!normalized) {
    return Number.NaN;
  }

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : amount;
}

function isMissingObjectStoreError(error: unknown) {
  const candidate = error as {
    name?: string;
    message?: string;
    inner?: { name?: string; message?: string };
  };

  const names = [candidate?.name, candidate?.inner?.name].filter(
    (value): value is string => typeof value === "string",
  );
  const messages = [candidate?.message, candidate?.inner?.message].filter(
    (value): value is string => typeof value === "string",
  );

  return (
    names.includes("NotFoundError") &&
    messages.some((message) => message.toLowerCase().includes("object store was not found"))
  );
}

export function createDefaultCategories(tripId: string, timestamp: string) {
  return defaultCategoryDefinitions.map((category) => {
    const hlc = createHlc();
    return {
      id: crypto.randomUUID(),
      tripId,
      name: category.name,
      budgetAmount: 0,
      icon: category.icon,
      color: category.color,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdAtHlc: hlc,
      updatedAtHlc: hlc,
      syncStatus: "pending" as const,
      isDeleted: false,
    } satisfies CategoryRecord;
  });
}

export async function getTripCategories(tripId: string): Promise<CategoryRecord[]> {
  const categories = await tripLedgerDb.categories.where("tripId").equals(tripId).toArray();

  return categories
    .filter((category) => !category.isDeleted)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function updateCategoryBudget(input: {
  categoryId: string;
  budgetAmount: string;
}): Promise<CategoryRecord> {
  const category = await tripLedgerDb.categories.get(input.categoryId);
  if (!category || category.isDeleted) {
    throw new Error("Category not found");
  }

  const budgetAmount = parseBudgetAmount(input.budgetAmount);
  if (!Number.isFinite(budgetAmount) || budgetAmount < 0) {
    throw new Error("Budget amount must be zero or greater");
  }

  const timestamp = new Date().toISOString();
  const nextCategory: CategoryRecord = {
    ...category,
    budgetAmount,
    updatedAt: timestamp,
    updatedAtHlc: createHlc(),
    syncStatus: "pending",
  };

  await tripLedgerDb.transaction(
    "rw",
    tripLedgerDb.categories,
    tripLedgerDb.syncLog,
    tripLedgerDb.appMeta,
    async () => {
      await tripLedgerDb.categories.put(nextCategory);
      await tripLedgerDb.syncLog.put({
        id: crypto.randomUUID(),
        action: "update",
        entityType: "category",
        recordId: category.id,
        timestamp,
        details: JSON.stringify({
          entityType: "category",
          fields: ["budgetAmount"],
          tripId: category.tripId,
        }),
      });
      await incrementPendingSync();
    },
  );

  try {
    await refreshTripSnapshotFromDb(category.tripId, timestamp);
  } catch (error) {
    if (!isMissingObjectStoreError(error)) {
      throw error;
    }
  }

  return nextCategory;
}
