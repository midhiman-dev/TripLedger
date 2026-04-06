import { tripLedgerDb, type ExpenseRecord } from "../../../db/tripLedgerDb";
import { createHlc } from "../../foundation/lib/hlc";
import { incrementPendingSync } from "../../trips/services/tripService";

export type CreateExpenseInput = {
  tripId: string;
  categoryId: string;
  amount: string;
  currency: string;
  description?: string;
  location?: string;
  paidBy?: string;
};

export type UpdateExpenseInput = {
  expenseId: string;
  categoryId?: string;
  amount?: string;
  description?: string;
  location?: string;
  paidBy?: string;
  loggedAt?: string;
};

function parseExpenseAmount(rawAmount: string) {
  const normalized = rawAmount.replace(/,/g, "").trim();
  if (!normalized) {
    return Number.NaN;
  }

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : amount;
}

function normalizeText(value?: string) {
  return value?.trim() ?? "";
}

async function assertCategoryBelongsToTrip(categoryId: string, tripId: string) {
  const category = await tripLedgerDb.categories.get(categoryId);
  if (!category || category.isDeleted || category.tripId !== tripId) {
    throw new Error("Category not found for this trip");
  }

  return category;
}

async function persistExpenseMutation({
  expense,
  action,
  fields,
}: {
  expense: ExpenseRecord;
  action: "create" | "update" | "delete";
  fields: string[];
}) {
  const timestamp = expense.updatedAt;

  await tripLedgerDb.transaction(
    "rw",
    tripLedgerDb.expenses,
    tripLedgerDb.syncLog,
    tripLedgerDb.appMeta,
    async () => {
      await tripLedgerDb.expenses.put(expense);
      await tripLedgerDb.syncLog.put({
        id: crypto.randomUUID(),
        action,
        entityType: "expense",
        recordId: expense.id,
        timestamp,
        details: JSON.stringify({
          entityType: "expense",
          tripId: expense.tripId,
          fields,
        }),
      });
      await incrementPendingSync();
    },
  );
}

export async function getTripExpenses(tripId: string): Promise<ExpenseRecord[]> {
  const expenses = await tripLedgerDb.expenses.where("tripId").equals(tripId).toArray();

  return expenses
    .filter((expense) => !expense.isDeleted)
    .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseRecord> {
  const amount = parseExpenseAmount(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Expense amount must be greater than zero");
  }

  await assertCategoryBelongsToTrip(input.categoryId, input.tripId);

  const timestamp = new Date().toISOString();
  const hlc = createHlc();
  const expense: ExpenseRecord = {
    id: crypto.randomUUID(),
    tripId: input.tripId,
    categoryId: input.categoryId,
    amount,
    currency: input.currency,
    description: normalizeText(input.description),
    location: normalizeText(input.location),
    paidBy: normalizeText(input.paidBy) || "You",
    loggedAt: timestamp,
    deviceId: hlc.nodeId,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdAtHlc: hlc,
    updatedAtHlc: hlc,
    syncStatus: "pending",
    conflictData: null,
    isDeleted: false,
  };

  await persistExpenseMutation({
    expense,
    action: "create",
    fields: ["categoryId", "amount", "description", "location", "paidBy", "loggedAt"],
  });

  return expense;
}

export async function updateExpense(input: UpdateExpenseInput): Promise<ExpenseRecord> {
  const expense = await tripLedgerDb.expenses.get(input.expenseId);
  if (!expense || expense.isDeleted) {
    throw new Error("Expense not found");
  }

  const nextCategoryId = input.categoryId ?? expense.categoryId;
  await assertCategoryBelongsToTrip(nextCategoryId, expense.tripId);

  const nextAmount = input.amount === undefined ? expense.amount : parseExpenseAmount(input.amount);
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    throw new Error("Expense amount must be greater than zero");
  }

  const timestamp = new Date().toISOString();
  const nextExpense: ExpenseRecord = {
    ...expense,
    categoryId: nextCategoryId,
    amount: nextAmount,
    description: input.description === undefined ? expense.description : normalizeText(input.description),
    location: input.location === undefined ? expense.location : normalizeText(input.location),
    paidBy: input.paidBy === undefined ? expense.paidBy : normalizeText(input.paidBy) || "You",
    loggedAt: input.loggedAt ?? expense.loggedAt,
    updatedAt: timestamp,
    updatedAtHlc: createHlc(),
    syncStatus: "pending",
  };

  await persistExpenseMutation({
    expense: nextExpense,
    action: "update",
    fields: ["categoryId", "amount", "description", "location", "paidBy", "loggedAt"],
  });

  return nextExpense;
}

export async function deleteExpense(expenseId: string): Promise<ExpenseRecord> {
  const expense = await tripLedgerDb.expenses.get(expenseId);
  if (!expense || expense.isDeleted) {
    throw new Error("Expense not found");
  }

  const deletedExpense: ExpenseRecord = {
    ...expense,
    isDeleted: true,
    updatedAt: new Date().toISOString(),
    updatedAtHlc: createHlc(),
    syncStatus: "pending",
  };

  await persistExpenseMutation({
    expense: deletedExpense,
    action: "delete",
    fields: ["isDeleted"],
  });

  return deletedExpense;
}

export async function restoreExpense(expenseId: string): Promise<ExpenseRecord> {
  const expense = await tripLedgerDb.expenses.get(expenseId);
  if (!expense || !expense.isDeleted) {
    throw new Error("Expense not found for undo");
  }

  const restoredExpense: ExpenseRecord = {
    ...expense,
    isDeleted: false,
    updatedAt: new Date().toISOString(),
    updatedAtHlc: createHlc(),
    syncStatus: "pending",
  };

  await persistExpenseMutation({
    expense: restoredExpense,
    action: "update",
    fields: ["isDeleted"],
  });

  return restoredExpense;
}
