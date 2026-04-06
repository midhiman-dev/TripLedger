import { tripLedgerDb, type TripRecord } from "../../../db/tripLedgerDb";
import { createHlc } from "../../foundation/lib/hlc";
import { syncMetaKeys } from "../../foundation/lib/syncStatus";
import { createDefaultCategories, getTripCategories } from "../../categories/services/categoryService";
import { parseTripBudget } from "../lib/tripDraft";
import { createTripCode } from "../lib/tripCode";

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

async function incrementPendingSync() {
  const currentPendingCount = toPendingCount(
    (await tripLedgerDb.appMeta.get(syncMetaKeys.pendingCount))?.value,
  );

  await tripLedgerDb.appMeta.bulkPut([
    { key: syncMetaKeys.mode, value: "pending" },
    {
      key: syncMetaKeys.pendingCount,
      value: String(currentPendingCount + 1),
    },
    { key: syncMetaKeys.conflictCount, value: "0" },
  ]);
}

export async function createTrip(input: CreateTripInput): Promise<TripRecord> {
  const timestamp = new Date().toISOString();
  const hlc = createHlc();
  const tripId = crypto.randomUUID();
  const syncLogId = crypto.randomUUID();
  const trip: TripRecord = {
    id: tripId,
    name: input.name.trim(),
    tripCode: createTripCode(),
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
  const categories = createDefaultCategories(tripId, timestamp);

  await tripLedgerDb.transaction(
    "rw",
    tripLedgerDb.trips,
    tripLedgerDb.categories,
    tripLedgerDb.syncLog,
    tripLedgerDb.appMeta,
    async () => {
      await tripLedgerDb.trips.put(trip);
      await tripLedgerDb.categories.bulkPut(categories);
      await tripLedgerDb.syncLog.put({
        id: syncLogId,
        action: "create",
        entityType: "trip",
        recordId: tripId,
        timestamp,
        details: JSON.stringify({
          entityType: "trip",
          fields: ["name", "tripCode", "startDate", "endDate", "totalBudget"],
          seededCategoryCount: categories.length,
        }),
      });
      await incrementPendingSync();
    },
  );

  return trip;
}

export async function ensureTripHasCode(trip: TripRecord): Promise<TripRecord> {
  if (trip.tripCode) {
    return trip;
  }

  const timestamp = new Date().toISOString();
  const nextTrip: TripRecord = {
    ...trip,
    tripCode: createTripCode(),
    updatedAt: timestamp,
    updatedAtHlc: createHlc(),
    syncStatus: "pending",
  };

  await tripLedgerDb.transaction(
    "rw",
    tripLedgerDb.trips,
    tripLedgerDb.syncLog,
    tripLedgerDb.appMeta,
    async () => {
      await tripLedgerDb.trips.put(nextTrip);
      await tripLedgerDb.syncLog.put({
        id: crypto.randomUUID(),
        action: "update",
        entityType: "trip",
        recordId: trip.id,
        timestamp,
        details: JSON.stringify({
          entityType: "trip",
          fields: ["tripCode"],
        }),
      });
      await incrementPendingSync();
    },
  );

  return nextTrip;
}

export async function getLatestActiveTrip(): Promise<TripRecord | null> {
  const trips = await tripLedgerDb.trips.toArray();
  const activeTrips = trips
    .filter((trip) => !trip.isDeleted)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const latestTrip = activeTrips[0] ?? null;
  if (!latestTrip) {
    return null;
  }

  return ensureTripHasCode(latestTrip);
}

export { getTripCategories };
