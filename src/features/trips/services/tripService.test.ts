import { beforeEach, describe, expect, it, vi } from "vitest";

const { transactionMock, tripsPutMock, syncLogPutMock, appMetaGetMock, appMetaBulkPutMock, tripsToArrayMock } =
  vi.hoisted(() => ({
    transactionMock: vi.fn(),
    tripsPutMock: vi.fn(),
    syncLogPutMock: vi.fn(),
    appMetaGetMock: vi.fn(),
    appMetaBulkPutMock: vi.fn(),
    tripsToArrayMock: vi.fn(),
  }));

vi.mock("../../../db/tripLedgerDb", () => ({
  tripLedgerDb: {
    trips: {
      put: tripsPutMock,
      toArray: tripsToArrayMock,
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
import { createTrip, getLatestActiveTrip } from "./tripService";

describe("tripService", () => {
  beforeEach(() => {
    transactionMock.mockReset();
    tripsPutMock.mockReset();
    syncLogPutMock.mockReset();
    appMetaGetMock.mockReset();
    appMetaBulkPutMock.mockReset();
    tripsToArrayMock.mockReset();

    transactionMock.mockImplementation(async (_mode: string, ...args: unknown[]) => {
      const callback = args[args.length - 1] as () => Promise<void>;
      await callback();
    });
    appMetaGetMock.mockResolvedValue({ key: syncMetaKeys.pendingCount, value: "2" });
  });

  it("writes a trip locally and increments pending sync metadata", async () => {
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
      .mockReturnValueOnce("22222222-2222-2222-2222-222222222222");

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
});
