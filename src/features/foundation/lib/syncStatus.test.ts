import { beforeEach, describe, expect, it, vi } from "vitest";

const { bulkGetMock, bulkPutMock } = vi.hoisted(() => ({
  bulkGetMock: vi.fn(),
  bulkPutMock: vi.fn(),
}));

vi.mock("../../../db/tripLedgerDb", () => ({
  tripLedgerDb: {
    appMeta: {
      bulkGet: bulkGetMock,
      bulkPut: bulkPutMock,
    },
  },
}));

import {
  getSyncStatusViewModel,
  readPersistedSyncStatus,
  writePersistedSyncStatus,
} from "./syncStatus";

describe("syncStatus", () => {
  beforeEach(() => {
    bulkGetMock.mockReset();
    bulkPutMock.mockReset();
  });

  it("derives pending state from queued local changes", () => {
    const viewModel = getSyncStatusViewModel(true, {
      mode: "pending",
      pendingCount: 2,
      conflictCount: 0,
      lastSyncedAt: null,
    });

    expect(viewModel.tone).toBe("pending");
    expect(viewModel.label).toBe("Pending (2)");
    expect(viewModel.banner).toMatch(/2 changes are queued for sync/i);
  });

  it("keeps conflict as the highest-priority sync state", () => {
    const viewModel = getSyncStatusViewModel(false, {
      mode: "conflict",
      pendingCount: 5,
      conflictCount: 2,
      lastSyncedAt: null,
    });

    expect(viewModel.tone).toBe("conflict");
    expect(viewModel.label).toBe("Conflict (2)");
  });

  it("reads persisted sync metadata from dexie appMeta", async () => {
    bulkGetMock.mockResolvedValue([
      { key: "sync.mode", value: "pending" },
      { key: "sync.pendingCount", value: "4" },
      { key: "sync.conflictCount", value: "1" },
      { key: "sync.lastSyncedAt", value: "2026-04-05T09:00:00.000Z" },
    ]);

    await expect(readPersistedSyncStatus()).resolves.toEqual({
      mode: "pending",
      pendingCount: 4,
      conflictCount: 1,
      lastSyncedAt: "2026-04-05T09:00:00.000Z",
    });
  });

  it("writes merged sync metadata back to dexie appMeta", async () => {
    bulkGetMock.mockResolvedValue([
      { key: "sync.mode", value: "pending" },
      { key: "sync.pendingCount", value: "2" },
      { key: "sync.conflictCount", value: "0" },
      { key: "sync.lastSyncedAt", value: "" },
    ]);

    await expect(
      writePersistedSyncStatus({
        mode: "synced",
        pendingCount: 0,
        lastSyncedAt: "2026-04-05T11:00:00.000Z",
      }),
    ).resolves.toEqual({
      mode: "synced",
      pendingCount: 0,
      conflictCount: 0,
      lastSyncedAt: "2026-04-05T11:00:00.000Z",
    });

    expect(bulkPutMock).toHaveBeenCalledWith([
      { key: "sync.mode", value: "synced" },
      { key: "sync.pendingCount", value: "0" },
      { key: "sync.conflictCount", value: "0" },
      { key: "sync.lastSyncedAt", value: "2026-04-05T11:00:00.000Z" },
    ]);
  });
});
