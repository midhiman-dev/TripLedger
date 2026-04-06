import { tripLedgerDb, type CategoryRecord, type TripRecord, type TripSnapshotRecord } from "../../../db/tripLedgerDb";

export function createTripSnapshotRecord(
  trip: TripRecord,
  categories: CategoryRecord[],
  updatedAt: string,
): TripSnapshotRecord {
  return {
    tripCode: trip.tripCode,
    trip,
    categories,
    updatedAt,
  };
}

export async function saveTripSnapshot(
  trip: TripRecord,
  categories: CategoryRecord[],
  updatedAt = new Date().toISOString(),
) {
  await tripLedgerDb.tripSnapshots.put(createTripSnapshotRecord(trip, categories, updatedAt));
}

export async function getTripSnapshotByCode(tripCode: string) {
  return tripLedgerDb.tripSnapshots.get(tripCode);
}

export async function refreshTripSnapshotFromDb(tripId: string, updatedAt = new Date().toISOString()) {
  const trip = await tripLedgerDb.trips.get(tripId);
  if (!trip || trip.isDeleted || !trip.tripCode) {
    return null;
  }

  const categories = (await tripLedgerDb.categories.where("tripId").equals(tripId).toArray())
    .filter((category) => !category.isDeleted)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  await saveTripSnapshot(trip, categories, updatedAt);
  return { trip, categories };
}
