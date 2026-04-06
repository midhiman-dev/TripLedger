import Dexie, { type Table } from "dexie";

export type AppMetaRecord = {
  key: string;
  value: string;
};

export type HlcRecord = {
  wallClock: number;
  logical: number;
  nodeId: string;
};

export type TripRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  totalBudget: number;
  createdAt: string;
  updatedAt: string;
  createdAtHlc: HlcRecord;
  updatedAtHlc: HlcRecord;
  syncStatus: "pending" | "synced" | "conflict";
  isDeleted: boolean;
};

export type SyncLogRecord = {
  id: string;
  action: "create";
  entityType: "trip";
  recordId: string;
  timestamp: string;
  details: string;
};

class TripLedgerDb extends Dexie {
  appMeta!: Table<AppMetaRecord, string>;
  trips!: Table<TripRecord, string>;
  syncLog!: Table<SyncLogRecord, string>;

  constructor() {
    super("tripledger");
    this.version(1).stores({
      appMeta: "&key",
    });
    this.version(2).stores({
      appMeta: "&key",
      trips: "&id, createdAt, isDeleted",
      syncLog: "&id, recordId, timestamp",
    });
  }
}

export const tripLedgerDb = new TripLedgerDb();
