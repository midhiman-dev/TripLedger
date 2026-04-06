import { tripLedgerDb, type TripRecord } from "../../../db/tripLedgerDb";
import { createHlc } from "../../foundation/lib/hlc";
import { syncMetaKeys } from "../../foundation/lib/syncStatus";
import { parseTripBudget } from "../lib/tripDraft";

export type CreateTripInput = {
  name: string;
  startDate: string;
  endDate: string;
  totalBudget: string;
};

const defaultCurrency = "INR";

function toPendingCount(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function createTrip(input: CreateTripInput): Promise<TripRecord> {
  const timestamp = new Date().toISOString();
  const hlc = createHlc();
  const tripId = crypto.randomUUID();
  const syncLogId = crypto.randomUUID();
  const trip: TripRecord = {
    id: tripId,
    name: input.name.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    baseCurrency: defaultCurrency,
    totalBudget: parseTripBudget(input.totalBudget),
    createdAt: timestamp,
    updatedAt: timestamp,
    createdAtHlc: hlc,
    updatedAtHlc: hlc,
    syncStatus: "pending",
    isDeleted: false,
  };

  await tripLedgerDb.transaction(
    "rw",
    tripLedgerDb.trips,
    tripLedgerDb.syncLog,
    tripLedgerDb.appMeta,
    async () => {
      const currentPendingCount = toPendingCount(
        (await tripLedgerDb.appMeta.get(syncMetaKeys.pendingCount))?.value,
      );

      await tripLedgerDb.trips.put(trip);
      await tripLedgerDb.syncLog.put({
        id: syncLogId,
        action: "create",
        entityType: "trip",
        recordId: tripId,
        timestamp,
        details: JSON.stringify({
          entityType: "trip",
          fields: ["name", "startDate", "endDate", "totalBudget"],
        }),
      });
      await tripLedgerDb.appMeta.bulkPut([
        { key: syncMetaKeys.mode, value: "pending" },
        {
          key: syncMetaKeys.pendingCount,
          value: String(currentPendingCount + 1),
        },
        { key: syncMetaKeys.conflictCount, value: "0" },
      ]);
    },
  );

  return trip;
}

export async function getLatestActiveTrip(): Promise<TripRecord | null> {
  const trips = await tripLedgerDb.trips.toArray();
  const activeTrips = trips
    .filter((trip) => !trip.isDeleted)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return activeTrips[0] ?? null;
}
