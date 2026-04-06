import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  tripsPutMock,
  categoriesBulkPutMock,
  syncLogPutMock,
  appMetaGetMock,
  appMetaBulkPutMock,
  tripsToArrayMock,
  categoriesWhereEqualsMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  tripsPutMock: vi.fn(),
  categoriesBulkPutMock: vi.fn(),
  syncLogPutMock: vi.fn(),
  appMetaGetMock: vi.fn(),
  appMetaBulkPutMock: vi.fn(),
  tripsToArrayMock: vi.fn(),
  categoriesWhereEqualsMock: vi.fn(),
}));

vi.mock("../../../db/tripLedgerDb", () => ({
  tripLedgerDb: {
    trips: {
      put: tripsPutMock,
      toArray: tripsToArrayMock,
    },
    categories: {
      bulkPut: categoriesBulkPutMock,
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
import { createTrip, getLatestActiveTrip, getTripCategories } from "./tripService";

describe("tripService", () => {
  beforeEach(() => {
    transactionMock.mockReset();
    tripsPutMock.mockReset();
    categoriesBulkPutMock.mockReset();
    syncLogPutMock.mockReset();
    appMetaGetMock.mockReset();
    appMetaBulkPutMock.mockReset();
    tripsToArrayMock.mockReset();
    categoriesWhereEqualsMock.mockReset();

    transactionMock.mockImplementation(async (_mode: string, ...args: unknown[]) => {
      const callback = args[args.length - 1] as () => Promise<void>;
      await callback();
    });
    appMetaGetMock.mockResolvedValue({ key: syncMetaKeys.pendingCount, value: "2" });
  });

  it("writes a trip locally, seeds default categories, and increments pending sync metadata", async () => {
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
      .mockReturnValueOnce("22222222-2222-2222-2222-222222222222")
      .mockReturnValueOnce("33333333-3333-3333-3333-333333333333")
      .mockReturnValueOnce("44444444-4444-4444-4444-444444444444")
      .mockReturnValueOnce("55555555-5555-5555-5555-555555555555")
      .mockReturnValueOnce("66666666-6666-6666-6666-666666666666")
      .mockReturnValueOnce("77777777-7777-7777-7777-777777777777")
      .mockReturnValueOnce("88888888-8888-8888-8888-888888888888");

    const trip = await createTrip({
      name: "  Goa Drive  ",
      startDate: "2026-06-03",
      endDate: "2026-06-08",
      totalBudget: "18000",
    });

    expect(trip.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(trip.name).toBe("Goa Drive");
    expect(trip.totalBudget).toBe(18000);
    expect(tripsPutMock).toHaveBeenCalledWith(expect.objectContaining({
      id: "11111111-1111-1111-1111-111111111111",
      syncStatus: "pending",
      baseCurrency: "INR",
    }));
    expect(categoriesBulkPutMock).toHaveBeenCalledTimes(1);
    expect(categoriesBulkPutMock.mock.calls[0][0]).toHaveLength(6);
    expect(categoriesBulkPutMock.mock.calls[0][0][0]).toEqual(
      expect.objectContaining({
        tripId: "11111111-1111-1111-1111-111111111111",
        name: "Fuel",
        budgetAmount: 0,
      }),
    );
    expect(syncLogPutMock).toHaveBeenCalledWith(expect.objectContaining({
      id: "22222222-2222-2222-2222-222222222222",
      action: "create",
      entityType: "trip",
      recordId: "11111111-1111-1111-1111-111111111111",
    }));
    expect(appMetaBulkPutMock).toHaveBeenCalledWith([
      { key: syncMetaKeys.mode, value: "pending" },
      { key: syncMetaKeys.pendingCount, value: "3" },
      { key: syncMetaKeys.conflictCount, value: "0" },
    ]);
  });

  it("returns the latest non-deleted trip", async () => {
    tripsToArrayMock.mockResolvedValue([
      {
        id: "trip-older",
        name: "Older",
        createdAt: "2026-04-01T09:00:00.000Z",
        isDeleted: false,
      },
      {
        id: "trip-deleted",
        name: "Deleted",
        createdAt: "2026-04-06T09:00:00.000Z",
        isDeleted: true,
      },
      {
        id: "trip-newer",
        name: "Newer",
        createdAt: "2026-04-05T09:00:00.000Z",
        isDeleted: false,
      },
    ]);

    await expect(getLatestActiveTrip()).resolves.toEqual(
      expect.objectContaining({ id: "trip-newer", name: "Newer" }),
    );
  });

  it("returns non-deleted categories for a trip in creation order", async () => {
    categoriesWhereEqualsMock.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          id: "cat-stay",
          tripId: "trip-1",
          name: "Stay",
          createdAt: "2026-04-06T10:00:00.000Z",
          isDeleted: false,
        },
        {
          id: "cat-fuel",
          tripId: "trip-1",
          name: "Fuel",
          createdAt: "2026-04-06T09:00:00.000Z",
          isDeleted: false,
        },
        {
          id: "cat-deleted",
          tripId: "trip-1",
          name: "Deleted",
          createdAt: "2026-04-06T08:00:00.000Z",
          isDeleted: true,
        },
      ]),
    });

    await expect(getTripCategories("trip-1")).resolves.toEqual([
      expect.objectContaining({ id: "cat-fuel", name: "Fuel" }),
      expect.objectContaining({ id: "cat-stay", name: "Stay" }),
    ]);
  });
});
