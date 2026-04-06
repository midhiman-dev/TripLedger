import {
  tripLedgerDb,
  type CategoryRecord,
  type JoinRequestRecord,
  type TripRecord,
} from "../../../db/tripLedgerDb";
import { formatTripCode } from "../lib/tripCode";
import { validateJoinCode } from "../lib/joinCode";
import { getTripSnapshotByCode } from "./tripSnapshotService";
import { incrementPendingSync } from "./tripService";

export type JoinTripResult = {
  status: "queued" | "hydrated";
  trip: TripRecord | null;
  categories: CategoryRecord[];
  request: JoinRequestRecord;
};

export async function joinTripByCode(rawCode: string): Promise<JoinTripResult> {
  const validationError = validateJoinCode(rawCode);
  if (validationError) {
    throw new Error(validationError);
  }

  const tripCode = formatTripCode(rawCode);
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();
  const snapshot = await getTripSnapshotByCode(tripCode);
  const existingTrip = await tripLedgerDb.trips.where("tripCode").equals(tripCode).first();

  const request: JoinRequestRecord = {
    id: requestId,
    tripCode,
    requestedAt: timestamp,
    status: snapshot ? "hydrated" : "queued",
    snapshotAvailable: Boolean(snapshot),
  };

  await tripLedgerDb.transaction(
    "rw",
    [
      tripLedgerDb.joinRequests,
      tripLedgerDb.trips,
      tripLedgerDb.categories,
      tripLedgerDb.syncLog,
      tripLedgerDb.appMeta,
    ],
    async () => {
      await tripLedgerDb.joinRequests.put(request);

      if (snapshot && !existingTrip) {
        await tripLedgerDb.trips.put(snapshot.trip);
        await tripLedgerDb.categories.bulkPut(snapshot.categories);
      }

      await tripLedgerDb.syncLog.put({
        id: crypto.randomUUID(),
        action: "join",
        entityType: "joinRequest",
        recordId: requestId,
        timestamp,
        details: JSON.stringify({
          tripCode,
          status: request.status,
          snapshotAvailable: request.snapshotAvailable,
        }),
      });

      await incrementPendingSync();
    },
  );

  return {
    status: request.status,
    trip: snapshot?.trip ?? existingTrip ?? null,
    categories: snapshot?.categories ?? [],
    request,
  };
}
