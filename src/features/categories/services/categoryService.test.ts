import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  categoriesGetMock,
  categoriesPutMock,
  categoriesWhereEqualsMock,
  syncLogPutMock,
  appMetaGetMock,
  appMetaBulkPutMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  categoriesGetMock: vi.fn(),
  categoriesPutMock: vi.fn(),
  categoriesWhereEqualsMock: vi.fn(),
  syncLogPutMock: vi.fn(),
  appMetaGetMock: vi.fn(),
  appMetaBulkPutMock: vi.fn(),
}));

vi.mock("../../../db/tripLedgerDb", () => ({
  tripLedgerDb: {
    categories: {
      get: categoriesGetMock,
      put: categoriesPutMock,
      where: vi.fn(() => ({
        equals: categoriesWhereEqualsMock,
      })),
    },
    syncLog: {
      put: syncLogPutMock,
    },
    appMeta: {
      get: appMetaGetMock,
      bulkPut: appMetaBulkPutMock,
    },
    transaction: transactionMock,
  },
}));

import { syncMetaKeys } from "../../foundation/lib/syncStatus";
import { defaultCategoryDefinitions } from "../lib/defaultCategories";
import {
  createDefaultCategories,
  getTripCategories,
  updateCategoryBudget,
} from "./categoryService";

describe("categoryService", () => {
  beforeEach(() => {
    transactionMock.mockReset();
    categoriesGetMock.mockReset();
    categoriesPutMock.mockReset();
    categoriesWhereEqualsMock.mockReset();
    syncLogPutMock.mockReset();
    appMetaGetMock.mockReset();
    appMetaBulkPutMock.mockReset();

    transactionMock.mockImplementation(async (_mode: string, ...args: unknown[]) => {
      const callback = args[args.length - 1] as () => Promise<void>;
      await callback();
    });
    appMetaGetMock.mockResolvedValue({ key: syncMetaKeys.pendingCount, value: "1" });
  });

  it("creates the default category list for a trip", () => {
    const categories = createDefaultCategories("trip-1", "2026-04-06T09:00:00.000Z");

    expect(categories).toHaveLength(defaultCategoryDefinitions.length);
    expect(categories[0]).toEqual(
      expect.objectContaining({
        tripId: "trip-1",
        name: "Fuel",
        budgetAmount: 0,
        syncStatus: "pending",
      }),
    );
  });

  it("updates a category budget locally and increments pending sync metadata", async () => {
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
    vi.spyOn(crypto, "randomUUID").mockReturnValue("99999999-9999-9999-9999-999999999999");

    const category = await updateCategoryBudget({
      categoryId: "cat-fuel",
      budgetAmount: "8500",
    });

    expect(category.budgetAmount).toBe(8500);
    expect(categoriesPutMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cat-fuel", budgetAmount: 8500 }),
    );
    expect(syncLogPutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "99999999-9999-9999-9999-999999999999",
        action: "update",
        entityType: "category",
        recordId: "cat-fuel",
      }),
    );
    expect(appMetaBulkPutMock).toHaveBeenCalledWith([
      { key: syncMetaKeys.mode, value: "pending" },
      { key: syncMetaKeys.pendingCount, value: "2" },
      { key: syncMetaKeys.conflictCount, value: "0" },
    ]);
  });

  it("returns non-deleted categories for a trip", async () => {
    categoriesWhereEqualsMock.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { id: "cat-food", name: "Food", tripId: "trip-1", createdAt: "2026-04-06T10:00:00.000Z", isDeleted: false },
        { id: "cat-deleted", name: "Deleted", tripId: "trip-1", createdAt: "2026-04-06T09:00:00.000Z", isDeleted: true },
      ]),
    });

    await expect(getTripCategories("trip-1")).resolves.toEqual([
      expect.objectContaining({ id: "cat-food", name: "Food" }),
    ]);
  });
});
