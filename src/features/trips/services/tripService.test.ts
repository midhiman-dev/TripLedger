import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  tripsPutMock,
  categoriesBulkPutMock,
  tripSnapshotsPutMock,
  syncLogPutMock,
  appMetaGetMock,
  appMetaBulkPutMock,
  tripsToArrayMock,
  categoriesWhereEqualsMock,
  tripsGetMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  tripsPutMock: vi.fn(),
  categoriesBulkPutMock: vi.fn(),
  tripSnapshotsPutMock: vi.fn(),
  syncLogPutMock: vi.fn(),
  appMetaGetMock: vi.fn(),
  appMetaBulkPutMock: vi.fn(),
  tripsToArrayMock: vi.fn(),
  categoriesWhereEqualsMock: vi.fn(),
  tripsGetMock: vi.fn(),
}));

vi.mock("../../../db/tripLedgerDb", () => ({
  tripLedgerDb: {
    trips: {
      put: tripsPutMock,
      get: tripsGetMock,
      toArray: tripsToArrayMock,
    },
    categories: {
      bulkPut: categoriesBulkPutMock,
      where: vi.fn(() => ({
        equals: categoriesWhereEqualsMock,
      })),
    },
    tripSnapshots: {
      put: tripSnapshotsPutMock,
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

vi.mock("../lib/tripCode", () => ({
  createTripCode: vi.fn()
    .mockReturnValueOnce("AAA-111")
    .mockReturnValueOnce("BBB-222"),
}));

import { createTrip, ensureTripHasCode, getLatestActiveTrip, getTripCategories } from "./tripService";

describe("tripService", () => {
  beforeEach(() => {
    transactionMock.mockReset();
    tripsPutMock.mockReset();
    categoriesBulkPutMock.mockReset();
    tripSnapshotsPutMock.mockReset();
    syncLogPutMock.mockReset();
    appMetaGetMock.mockReset();
    appMetaBulkPutMock.mockReset();
    tripsToArrayMock.mockReset();
    categoriesWhereEqualsMock.mockReset();
    tripsGetMock.mockReset();

    transactionMock.mockImplementation(async (_mode: string, ...args: unknown[]) => {
      const callback = args[args.length - 1] as () => Promise<void>;
      await callback();
    });
    appMetaGetMock.mockResolvedValue({ key: "sync.pendingCount", value: "2" });
    tripsGetMock.mockResolvedValue({
      id: "trip-legacy",
      name: "Legacy",
      tripCode: "BBB-222",
      startDate: "2026-06-03",
      endDate: "2026-06-08",
      baseCurrency: "INR",
      totalBudget: 18000,
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
      createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      syncStatus: "pending",
      isDeleted: false,
    });
  });

  it("writes a trip locally, seeds default categories, and stores a snapshot", async () => {
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

    expect(trip.tripCode).toBe("AAA-111");
    expect(tripSnapshotsPutMock).toHaveBeenCalledWith(
      expect.objectContaining({ tripCode: "AAA-111" }),
    );
  });

  it("backfills a trip code for older local trips and refreshes its snapshot", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("99999999-9999-9999-9999-999999999999");
    categoriesWhereEqualsMock.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });

    const trip = await ensureTripHasCode({
      id: "trip-legacy",
      name: "Legacy",
      tripCode: "",
      startDate: "2026-06-03",
      endDate: "2026-06-08",
      baseCurrency: "INR",
      totalBudget: 18000,
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
      createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      syncStatus: "synced",
      isDeleted: false,
    });

    expect(trip.tripCode).toBe("BBB-222");
    expect(tripsPutMock).toHaveBeenCalledWith(expect.objectContaining({ tripCode: "BBB-222" }));
    expect(tripSnapshotsPutMock).toHaveBeenCalledWith(expect.objectContaining({ tripCode: "BBB-222" }));
  });

  it("returns the latest non-deleted trip", async () => {
    tripsToArrayMock.mockResolvedValue([
      { id: "trip-older", name: "Older", tripCode: "OLD-111", createdAt: "2026-04-01T09:00:00.000Z", isDeleted: false },
      { id: "trip-deleted", name: "Deleted", tripCode: "DEL-111", createdAt: "2026-04-06T09:00:00.000Z", isDeleted: true },
      { id: "trip-newer", name: "Newer", tripCode: "NEW-111", createdAt: "2026-04-05T09:00:00.000Z", isDeleted: false },
    ]);

    await expect(getLatestActiveTrip()).resolves.toEqual(
      expect.objectContaining({ id: "trip-newer", name: "Newer", tripCode: "NEW-111" }),
    );
  });

  it("returns non-deleted categories for a trip in creation order", async () => {
    categoriesWhereEqualsMock.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { id: "cat-stay", tripId: "trip-1", name: "Stay", createdAt: "2026-04-06T10:00:00.000Z", isDeleted: false },
        { id: "cat-fuel", tripId: "trip-1", name: "Fuel", createdAt: "2026-04-06T09:00:00.000Z", isDeleted: false },
        { id: "cat-deleted", tripId: "trip-1", name: "Deleted", createdAt: "2026-04-06T08:00:00.000Z", isDeleted: true },
      ]),
    });

    await expect(getTripCategories("trip-1")).resolves.toEqual([
      expect.objectContaining({ id: "cat-fuel", name: "Fuel" }),
      expect.objectContaining({ id: "cat-stay", name: "Stay" }),
    ]);
  });
});
