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
  tripCode: string;
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

export type CategoryRecord = {
  id: string;
  tripId: string;
  name: string;
  budgetAmount: number;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  createdAtHlc: HlcRecord;
  updatedAtHlc: HlcRecord;
  syncStatus: "pending" | "synced" | "conflict";
  isDeleted: boolean;
};

export type ExpenseRecord = {
  id: string;
  tripId: string;
  categoryId: string;
  amount: number;
  currency: string;
  description: string;
  location: string;
  paidBy: string;
  loggedAt: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  createdAtHlc: HlcRecord;
  updatedAtHlc: HlcRecord;
  syncStatus: "pending" | "synced" | "conflict";
  conflictData: string | null;
  isDeleted: boolean;
};

export type TripSnapshotRecord = {
  tripCode: string;
  trip: TripRecord;
  categories: CategoryRecord[];
  updatedAt: string;
};

export type JoinRequestRecord = {
  id: string;
  tripCode: string;
  requestedAt: string;
  status: "queued" | "hydrated";
  snapshotAvailable: boolean;
};

export type SyncLogRecord = {
  id: string;
  action: "create" | "update" | "delete" | "join";
  entityType: "trip" | "category" | "expense" | "joinRequest";
  recordId: string;
  timestamp: string;
  details: string;
};

class TripLedgerDb extends Dexie {
  appMeta!: Table<AppMetaRecord, string>;
  trips!: Table<TripRecord, string>;
  categories!: Table<CategoryRecord, string>;
  expenses!: Table<ExpenseRecord, string>;
  tripSnapshots!: Table<TripSnapshotRecord, string>;
  joinRequests!: Table<JoinRequestRecord, string>;
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
    this.version(3).stores({
      appMeta: "&key",
      trips: "&id, createdAt, isDeleted",
      categories: "&id, tripId, createdAt, isDeleted",
      syncLog: "&id, recordId, timestamp",
    });
    this.version(4).stores({
      appMeta: "&key",
      trips: "&id, tripCode, createdAt, isDeleted",
      categories: "&id, tripId, createdAt, isDeleted",
      syncLog: "&id, recordId, timestamp",
    });
    this.version(5).stores({
      appMeta: "&key",
      trips: "&id, tripCode, createdAt, isDeleted",
      categories: "&id, tripId, createdAt, isDeleted",
      tripSnapshots: "&tripCode, updatedAt",
      joinRequests: "&id, tripCode, requestedAt, status",
      syncLog: "&id, recordId, timestamp",
    });
    this.version(6).stores({
      appMeta: "&key",
      trips: "&id, tripCode, createdAt, isDeleted",
      categories: "&id, tripId, createdAt, isDeleted",
      expenses: "&id, tripId, categoryId, loggedAt, syncStatus, isDeleted",
      tripSnapshots: "&tripCode, updatedAt",
      joinRequests: "&id, tripCode, requestedAt, status",
      syncLog: "&id, recordId, timestamp",
    });
    this.version(7).stores({
      appMeta: "&key",
      trips: "&id, tripCode, createdAt, isDeleted",
      categories: "&id, tripId, createdAt, isDeleted",
      expenses: "&id, tripId, categoryId, loggedAt, syncStatus, isDeleted",
      tripSnapshots: "&tripCode, updatedAt",
      joinRequests: "&id, tripCode, requestedAt, status",
      syncLog: "&id, recordId, timestamp",
    });
  }
}

export const tripLedgerDb = new TripLedgerDb();
