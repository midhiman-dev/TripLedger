const {
  transactionMock,
  joinRequestsPutMock,
  tripsFirstMock,
  tripsPutMock,
  categoriesBulkPutMock,
  syncLogPutMock,
  appMetaGetMock,
  appMetaBulkPutMock,
  getTripSnapshotByCodeMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  joinRequestsPutMock: vi.fn(),
  tripsFirstMock: vi.fn(),
  tripsPutMock: vi.fn(),
  categoriesBulkPutMock: vi.fn(),
  syncLogPutMock: vi.fn(),
  appMetaGetMock: vi.fn(),
  appMetaBulkPutMock: vi.fn(),
  getTripSnapshotByCodeMock: vi.fn(),
}));

vi.mock("../../../db/tripLedgerDb", () => ({
  tripLedgerDb: {
    joinRequests: { put: joinRequestsPutMock },
    trips: {
      put: tripsPutMock,
      where: vi.fn(() => ({ equals: vi.fn(() => ({ first: tripsFirstMock })) })),
    },
    categories: { bulkPut: categoriesBulkPutMock },
    syncLog: { put: syncLogPutMock },
    appMeta: { get: appMetaGetMock, bulkPut: appMetaBulkPutMock },
    transaction: transactionMock,
  },
}));

vi.mock("./tripSnapshotService", () => ({
  getTripSnapshotByCode: getTripSnapshotByCodeMock,
}));

import { joinTripByCode } from "./joinTripService";

describe("joinTripService", () => {
  beforeEach(() => {
    transactionMock.mockReset();
    joinRequestsPutMock.mockReset();
    tripsFirstMock.mockReset();
    tripsPutMock.mockReset();
    categoriesBulkPutMock.mockReset();
    syncLogPutMock.mockReset();
    appMetaGetMock.mockReset();
    appMetaBulkPutMock.mockReset();
    getTripSnapshotByCodeMock.mockReset();

    transactionMock.mockImplementation(async (_mode: string, ...args: unknown[]) => {
      const callback = args[args.length - 1] as () => Promise<void>;
      await callback();
    });
    appMetaGetMock.mockResolvedValue({ key: "sync.pendingCount", value: "0" });
    tripsFirstMock.mockResolvedValue(null);
  });

  it("queues an offline join request when no snapshot is available", async () => {
    getTripSnapshotByCodeMock.mockResolvedValue(null);
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222");

    const result = await joinTripByCode("hmp247");

    expect(result.status).toBe("queued");
    expect(result.trip).toBeNull();
    expect(joinRequestsPutMock).toHaveBeenCalledWith(expect.objectContaining({ tripCode: "HMP-247", status: "queued" }));
    expect(tripsPutMock).not.toHaveBeenCalled();
  });

  it("hydrates the trip locally when a snapshot is available", async () => {
    getTripSnapshotByCodeMock.mockResolvedValue({
      tripCode: "HMP-247",
      updatedAt: "2026-04-06T10:00:00.000Z",
      trip: {
        id: "trip-1",
        name: "Himalayan Mission",
        tripCode: "HMP-247",
        startDate: "2026-04-15",
        endDate: "2026-04-21",
        baseCurrency: "INR",
        totalBudget: 50000,
        createdAt: "2026-04-06T09:00:00.000Z",
        updatedAt: "2026-04-06T09:00:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        syncStatus: "pending",
        isDeleted: false,
      },
      categories: [
        {
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
        },
      ],
    });
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("33333333-3333-4333-8333-333333333333")
      .mockReturnValueOnce("44444444-4444-4444-8444-444444444444");

    const result = await joinTripByCode("hmp247");

    expect(result.status).toBe("hydrated");
    expect(result.trip).toEqual(expect.objectContaining({ tripCode: "HMP-247" }));
    expect(tripsPutMock).toHaveBeenCalledWith(expect.objectContaining({ tripCode: "HMP-247" }));
    expect(categoriesBulkPutMock).toHaveBeenCalled();
  });
});
