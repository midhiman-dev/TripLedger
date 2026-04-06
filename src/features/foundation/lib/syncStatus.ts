import { tripLedgerDb } from "../../../db/tripLedgerDb";

export type PersistedSyncMode = "synced" | "pending" | "conflict";

export type PersistedSyncStatus = {
  mode: PersistedSyncMode;
  pendingCount: number;
  conflictCount: number;
  lastSyncedAt: string | null;
};

export type SyncStatusTone = "synced" | "pending" | "offline" | "conflict";

export type SyncStatusViewModel = {
  tone: SyncStatusTone;
  label: string;
  detail: string;
  banner: string | null;
  meta: string;
};

export const defaultPersistedSyncStatus: PersistedSyncStatus = {
  mode: "synced",
  pendingCount: 0,
  conflictCount: 0,
  lastSyncedAt: null,
};

export const syncMetaKeys = {
  mode: "sync.mode",
  pendingCount: "sync.pendingCount",
  conflictCount: "sync.conflictCount",
  lastSyncedAt: "sync.lastSyncedAt",
} as const;

function toNonNegativeInt(value: string | undefined, fallback = 0) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatLastSyncedAt(lastSyncedAt: string | null) {
  if (!lastSyncedAt) {
    return "Not synced yet";
  }

  const timestamp = Date.parse(lastSyncedAt);
  if (Number.isNaN(timestamp)) {
    return "Sync time unavailable";
  }

  const minutesAgo = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

  if (minutesAgo < 1) {
    return "Synced just now";
  }

  if (minutesAgo === 1) {
    return "Synced 1 min ago";
  }

  if (minutesAgo < 60) {
    return `Synced ${minutesAgo} mins ago`;
  }

  const hoursAgo = Math.round(minutesAgo / 60);

  if (hoursAgo === 1) {
    return "Synced 1 hour ago";
  }

  if (hoursAgo < 24) {
    return `Synced ${hoursAgo} hours ago`;
  }

  const daysAgo = Math.round(hoursAgo / 24);
  return daysAgo === 1 ? "Synced 1 day ago" : `Synced ${daysAgo} days ago`;
}

export function getSyncStatusViewModel(
  isOnline: boolean,
  persisted: PersistedSyncStatus,
): SyncStatusViewModel {
  if (persisted.conflictCount > 0 || persisted.mode === "conflict") {
    const count = Math.max(1, persisted.conflictCount);
    return {
      tone: "conflict",
      label: count > 1 ? `Conflict (${count})` : "Conflict",
      detail:
        count > 1
          ? `${count} ledger conflicts need review before sync is safe across devices.`
          : "A ledger conflict needs review before sync is safe across devices.",
      banner:
        count > 1
          ? `${count} sync conflicts need review. No conflicting field will be overwritten silently.`
          : "1 sync conflict needs review. No conflicting field will be overwritten silently.",
      meta: `${count} conflict${count === 1 ? "" : "s"} waiting`,
    };
  }

  if (!isOnline) {
    return {
      tone: "offline",
      label: "Offline",
      detail: "This device is offline. Local changes stay on this device until signal returns.",
      banner: "You are offline. Local changes will sync when signal returns.",
      meta:
        persisted.pendingCount > 0
          ? `${persisted.pendingCount} local change${persisted.pendingCount === 1 ? "" : "s"} waiting`
          : "Local-first mode active",
    };
  }

  if (persisted.pendingCount > 0 || persisted.mode === "pending") {
    const count = Math.max(1, persisted.pendingCount);
    return {
      tone: "pending",
      label: `Pending (${count})`,
      detail:
        count > 1
          ? `${count} local changes are queued and will sync automatically.`
          : "1 local change is queued and will sync automatically.",
      banner:
        count > 1
          ? `${count} changes are queued for sync. Your local ledger is already saved.`
          : "1 change is queued for sync. Your local ledger is already saved.",
      meta: `${count} change${count === 1 ? "" : "s"} queued`,
    };
  }

  return {
    tone: "synced",
    label: "Synced",
    detail: "Your ledger is saved locally and matches the last completed cloud sync.",
    banner: null,
    meta: formatLastSyncedAt(persisted.lastSyncedAt),
  };
}

export async function readPersistedSyncStatus(): Promise<PersistedSyncStatus> {
  const records = await tripLedgerDb.appMeta.bulkGet([
    syncMetaKeys.mode,
    syncMetaKeys.pendingCount,
    syncMetaKeys.conflictCount,
    syncMetaKeys.lastSyncedAt,
  ]);

  const [modeRecord, pendingRecord, conflictRecord, lastSyncedAtRecord] = records;
  const mode = modeRecord?.value;

  return {
    mode:
      mode === "pending" || mode === "conflict" || mode === "synced"
        ? mode
        : defaultPersistedSyncStatus.mode,
    pendingCount: toNonNegativeInt(
      pendingRecord?.value,
      defaultPersistedSyncStatus.pendingCount,
    ),
    conflictCount: toNonNegativeInt(
      conflictRecord?.value,
      defaultPersistedSyncStatus.conflictCount,
    ),
    lastSyncedAt:
      lastSyncedAtRecord?.value || defaultPersistedSyncStatus.lastSyncedAt,
  };
}

export async function writePersistedSyncStatus(
  status: Partial<PersistedSyncStatus>,
): Promise<PersistedSyncStatus> {
  const nextStatus = {
    ...(await readPersistedSyncStatus()),
    ...status,
  };

  await tripLedgerDb.appMeta.bulkPut([
    { key: syncMetaKeys.mode, value: nextStatus.mode },
    { key: syncMetaKeys.pendingCount, value: String(nextStatus.pendingCount) },
    { key: syncMetaKeys.conflictCount, value: String(nextStatus.conflictCount) },
    {
      key: syncMetaKeys.lastSyncedAt,
      value: nextStatus.lastSyncedAt ?? "",
    },
  ]);

  return nextStatus;
}
