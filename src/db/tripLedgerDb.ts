import Dexie, { type Table } from "dexie";

export type AppMetaRecord = {
  key: string;
  value: string;
};

class TripLedgerDb extends Dexie {
  appMeta!: Table<AppMetaRecord, string>;

  constructor() {
    super("tripledger");
    this.version(1).stores({
      appMeta: "&key",
    });
  }
}

export const tripLedgerDb = new TripLedgerDb();
