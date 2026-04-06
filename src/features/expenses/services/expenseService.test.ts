import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  categoriesGetMock,
  expensesWhereEqualsMock,
  expensesPutMock,
  expensesGetMock,
  syncLogPutMock,
  appMetaGetMock,
  appMetaBulkPutMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  categoriesGetMock: vi.fn(),
  expensesWhereEqualsMock: vi.fn(),
  expensesPutMock: vi.fn(),
  expensesGetMock: vi.fn(),
  syncLogPutMock: vi.fn(),
  appMetaGetMock: vi.fn(),
  appMetaBulkPutMock: vi.fn(),
}));

vi.mock("../../../db/tripLedgerDb", () => ({
  tripLedgerDb: {
    categories: {
      get: categoriesGetMock,
    },
    expenses: {
      get: expensesGetMock,
      put: expensesPutMock,
      where: vi.fn(() => ({ equals: expensesWhereEqualsMock })),
    },
    syncLog: { put: syncLogPutMock },
    appMeta: { get: appMetaGetMock, bulkPut: appMetaBulkPutMock },
    transaction: transactionMock,
  },
}));

import { createExpense, deleteExpense, getTripExpenses, restoreExpense, updateExpense } from "./expenseService";

describe("expenseService", () => {
  beforeEach(() => {
    transactionMock.mockReset();
    categoriesGetMock.mockReset();
    expensesWhereEqualsMock.mockReset();
    expensesPutMock.mockReset();
    expensesGetMock.mockReset();
    syncLogPutMock.mockReset();
    appMetaGetMock.mockReset();
    appMetaBulkPutMock.mockReset();

    transactionMock.mockImplementation(async (_mode: string, ...args: unknown[]) => {
      const callback = args[args.length - 1] as () => Promise<void>;
      await callback();
    });
    appMetaGetMock.mockResolvedValue({ key: "sync.pendingCount", value: "1" });
    categoriesGetMock.mockResolvedValue({
      id: "cat-fuel",
      tripId: "trip-1",
      name: "Fuel",
      budgetAmount: 0,
      icon: "local_gas_station",
      color: "#865300",
      createdAt: "2026-04-06T09:00:00.000Z",
      updatedAt: "2026-04-06T09:00:00.000Z",
      createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      syncStatus: "pending",
      isDeleted: false,
    });
  });

  it("creates an expense locally with a client UUID and HLC timestamps", async () => {
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
      .mockReturnValueOnce("22222222-2222-2222-2222-222222222222");

    const expense = await createExpense({
      tripId: "trip-1",
      categoryId: "cat-fuel",
      amount: "1250",
      currency: "INR",
      description: "Fuel stop",
      location: "NH-44",
    });

    expect(expense.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(expense.createdAtHlc).toEqual(expect.objectContaining({ nodeId: "device-local" }));
    expect(expense.updatedAtHlc).toEqual(expense.createdAtHlc);
    expect(expensesPutMock).toHaveBeenCalledWith(expect.objectContaining({ id: "11111111-1111-1111-1111-111111111111", amount: 1250 }));
    expect(syncLogPutMock).toHaveBeenCalledWith(expect.objectContaining({ entityType: "expense", action: "create" }));
  });

  it("updates an expense locally and refreshes its updated HLC", async () => {
    expensesGetMock.mockResolvedValue({
      id: "expense-1",
      tripId: "trip-1",
      categoryId: "cat-fuel",
      amount: 1250,
      currency: "INR",
      description: "Fuel stop",
      location: "NH-44",
      paidBy: "You",
      loggedAt: "2026-04-06T10:12:00.000Z",
      deviceId: "device-local",
      createdAt: "2026-04-06T10:12:00.000Z",
      updatedAt: "2026-04-06T10:12:00.000Z",
      createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      syncStatus: "synced",
      conflictData: null,
      isDeleted: false,
    });
    vi.spyOn(crypto, "randomUUID").mockReturnValue("22222222-2222-2222-2222-222222222222");

    const expense = await updateExpense({
      expenseId: "expense-1",
      amount: "1400",
      description: "Fuel refill",
    });

    expect(expense.amount).toBe(1400);
    expect(expense.description).toBe("Fuel refill");
    expect(expense.updatedAtHlc).toEqual(expect.objectContaining({ nodeId: "device-local" }));
    expect(expensesPutMock).toHaveBeenCalledWith(expect.objectContaining({ id: "expense-1", amount: 1400 }));
    expect(syncLogPutMock).toHaveBeenCalledWith(expect.objectContaining({ entityType: "expense", action: "update" }));
  });

  it("soft deletes an expense and can restore it for undo", async () => {
    expensesGetMock
      .mockResolvedValueOnce({
        id: "expense-1",
        tripId: "trip-1",
        categoryId: "cat-fuel",
        amount: 1250,
        currency: "INR",
        description: "Fuel stop",
        location: "NH-44",
        paidBy: "You",
        loggedAt: "2026-04-06T10:12:00.000Z",
        deviceId: "device-local",
        createdAt: "2026-04-06T10:12:00.000Z",
        updatedAt: "2026-04-06T10:12:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        syncStatus: "synced",
        conflictData: null,
        isDeleted: false,
      })
      .mockResolvedValueOnce({
        id: "expense-1",
        tripId: "trip-1",
        categoryId: "cat-fuel",
        amount: 1250,
        currency: "INR",
        description: "Fuel stop",
        location: "NH-44",
        paidBy: "You",
        loggedAt: "2026-04-06T10:12:00.000Z",
        deviceId: "device-local",
        createdAt: "2026-04-06T10:12:00.000Z",
        updatedAt: "2026-04-06T10:13:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 2, logical: 0, nodeId: "device-local" },
        syncStatus: "pending",
        conflictData: null,
        isDeleted: true,
      });

    const deletedExpense = await deleteExpense("expense-1");
    const restoredExpense = await restoreExpense("expense-1");

    expect(deletedExpense.isDeleted).toBe(true);
    expect(restoredExpense.isDeleted).toBe(false);
    expect(syncLogPutMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ entityType: "expense", action: "delete" }));
    expect(syncLogPutMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ entityType: "expense", action: "update" }));
  });

  it("returns non-deleted expenses for a trip in reverse logged order", async () => {
    expensesWhereEqualsMock.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { id: "expense-older", tripId: "trip-1", loggedAt: "2026-04-06T09:00:00.000Z", isDeleted: false },
        { id: "expense-deleted", tripId: "trip-1", loggedAt: "2026-04-06T11:00:00.000Z", isDeleted: true },
        { id: "expense-newer", tripId: "trip-1", loggedAt: "2026-04-06T10:00:00.000Z", isDeleted: false },
      ]),
    });

    await expect(getTripExpenses("trip-1")).resolves.toEqual([
      expect.objectContaining({ id: "expense-newer" }),
      expect.objectContaining({ id: "expense-older" }),
    ]);
  });
});
