import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";
import type { PersistedSyncStatus } from "../lib/syncStatus";
import { useShellStore } from "../store/shellStore";
import { useTripStore } from "../../trips/store/tripStore";

const {
  appMetaPutMock,
  readPersistedSyncStatusMock,
  getLatestActiveTripMock,
  getTripCategoriesMock,
  createTripMock,
  joinTripByCodeMock,
  updateCategoryBudgetMock,
  getTripExpensesMock,
  createExpenseMock,
} = vi.hoisted(() => ({
  appMetaPutMock: vi.fn(),
  readPersistedSyncStatusMock: vi.fn<() => Promise<PersistedSyncStatus>>(),
  getLatestActiveTripMock: vi.fn(),
  getTripCategoriesMock: vi.fn(),
  createTripMock: vi.fn(),
  joinTripByCodeMock: vi.fn(),
  updateCategoryBudgetMock: vi.fn(),
  getTripExpensesMock: vi.fn(),
  createExpenseMock: vi.fn(),
}));

vi.mock("../../../db/tripLedgerDb", () => ({
  tripLedgerDb: {
    appMeta: {
      put: appMetaPutMock,
    },
  },
}));

vi.mock("../lib/syncStatus", async () => {
  const actual = await vi.importActual<typeof import("../lib/syncStatus")>("../lib/syncStatus");
  return {
    ...actual,
    readPersistedSyncStatus: readPersistedSyncStatusMock,
  };
});

vi.mock("../../trips/services/tripService", () => ({
  getLatestActiveTrip: getLatestActiveTripMock,
  getTripCategories: getTripCategoriesMock,
  createTrip: createTripMock,
}));

vi.mock("../../trips/services/joinTripService", () => ({
  joinTripByCode: joinTripByCodeMock,
}));

vi.mock("../../categories/services/categoryService", () => ({
  updateCategoryBudget: updateCategoryBudgetMock,
}));

vi.mock("../../expenses/services/expenseService", () => ({
  getTripExpenses: getTripExpensesMock,
  createExpense: createExpenseMock,
}));

const hydratedCategories = [
  {
    id: "cat-fuel",
    tripId: "trip-join",
    name: "Fuel",
    budgetAmount: 5000,
    icon: "local_gas_station",
    color: "#865300",
    createdAt: "2026-04-06T09:00:00.000Z",
    updatedAt: "2026-04-06T09:00:00.000Z",
    createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    syncStatus: "pending",
    isDeleted: false,
  },
];

const activeTrip = {
  id: "trip-join",
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
};

async function renderShell() {
  render(<AppShell />);
  await waitFor(() => {
    expect(getLatestActiveTripMock).toHaveBeenCalled();
  });
}

describe("AppShell", () => {
  beforeEach(() => {
    appMetaPutMock.mockReset();
    readPersistedSyncStatusMock.mockReset();
    getLatestActiveTripMock.mockReset();
    getTripCategoriesMock.mockReset();
    createTripMock.mockReset();
    joinTripByCodeMock.mockReset();
    updateCategoryBudgetMock.mockReset();
    getTripExpensesMock.mockReset();
    createExpenseMock.mockReset();

    readPersistedSyncStatusMock.mockResolvedValue({
      mode: "synced",
      pendingCount: 0,
      conflictCount: 0,
      lastSyncedAt: "2026-04-05T10:00:00.000Z",
    });
    getLatestActiveTripMock.mockResolvedValue(null);
    getTripCategoriesMock.mockResolvedValue([]);
    getTripExpensesMock.mockResolvedValue([]);

    useShellStore.setState({
      isOnline: true,
      isInstalled: false,
      canInstall: false,
      updateReady: false,
      appVersion: "0.1.0",
      deferredInstallPrompt: null,
      persistedSyncStatus: {
        mode: "synced",
        pendingCount: 0,
        conflictCount: 0,
        lastSyncedAt: "2026-04-05T10:00:00.000Z",
      },
    });

    useTripStore.getState().resetState();
  });

  it("renders the create-trip flow with a path to join by code", async () => {
    await renderShell();

    expect(screen.getByRole("heading", { name: /the journey begins/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter trip code/i })).toBeInTheDocument();
  });

  it("shows a recovery message when Dexie reports a missing object store during startup", async () => {
    getLatestActiveTripMock.mockRejectedValue({
      name: "NotFoundError",
      message: "Failed to execute 'objectStore' on 'IDBTransaction': The specified object store was not found.",
    });

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /local data needs a refresh/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/tripledger found an older offline database shape on this device/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh tripledger/i })).toBeInTheDocument();
  });

  it("queues an offline join when no snapshot is available yet", async () => {
    const user = userEvent.setup();
    readPersistedSyncStatusMock
      .mockResolvedValueOnce({
        mode: "synced",
        pendingCount: 0,
        conflictCount: 0,
        lastSyncedAt: "2026-04-05T10:00:00.000Z",
      })
      .mockResolvedValueOnce({
        mode: "pending",
        pendingCount: 1,
        conflictCount: 0,
        lastSyncedAt: "2026-04-05T10:00:00.000Z",
      });
    joinTripByCodeMock.mockResolvedValue({
      status: "queued",
      trip: null,
      categories: [],
      request: {
        id: "join-1",
        tripCode: "HMP-247",
        requestedAt: "2026-04-06T10:00:00.000Z",
        status: "queued",
        snapshotAvailable: false,
      },
    });

    await renderShell();

    await user.click(screen.getByRole("button", { name: /enter trip code/i }));
    await user.type(screen.getByLabelText(/trip code/i), "hmp247");
    await user.click(screen.getByRole("button", { name: /join with code/i }));

    await waitFor(() => {
      expect(joinTripByCodeMock).toHaveBeenCalledWith("HMP-247");
    });

    expect(screen.getByText(/you will be added when signal returns\./i)).toBeInTheDocument();
    expect(screen.getByText(/code hmp-247 was saved locally and queued for first sync\./i)).toBeInTheDocument();
  });

  it("hydrates the joined trip immediately when a snapshot is available", async () => {
    const user = userEvent.setup();
    readPersistedSyncStatusMock
      .mockResolvedValueOnce({
        mode: "synced",
        pendingCount: 0,
        conflictCount: 0,
        lastSyncedAt: "2026-04-05T10:00:00.000Z",
      })
      .mockResolvedValueOnce({
        mode: "pending",
        pendingCount: 1,
        conflictCount: 0,
        lastSyncedAt: "2026-04-05T10:00:00.000Z",
      });
    joinTripByCodeMock.mockResolvedValue({
      status: "hydrated",
      trip: activeTrip,
      categories: hydratedCategories,
      request: {
        id: "join-2",
        tripCode: "HMP-247",
        requestedAt: "2026-04-06T10:00:00.000Z",
        status: "hydrated",
        snapshotAvailable: true,
      },
    });

    await renderShell();

    await user.click(screen.getByRole("button", { name: /enter trip code/i }));
    await user.type(screen.getByLabelText(/trip code/i), "hmp247");
    await user.click(screen.getByRole("button", { name: /join with code/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /himalayan mission/i })).toBeInTheDocument();
    });

    expect(screen.getByText("HMP-247")).toBeInTheDocument();
    expect(screen.getByLabelText(/fuel budget/i)).toBeInTheDocument();
  });

  it("shows validation for incomplete trip codes", async () => {
    const user = userEvent.setup();

    await renderShell();

    await user.click(screen.getByRole("button", { name: /enter trip code/i }));
    await user.type(screen.getByLabelText(/trip code/i), "abc");
    await user.click(screen.getByRole("button", { name: /join with code/i }));

    expect(screen.getByText(/enter a 6-character trip code/i)).toBeInTheDocument();
    expect(joinTripByCodeMock).not.toHaveBeenCalled();
  });

  it("logs a quick-add expense locally from the summary view", async () => {
    const user = userEvent.setup();
    getLatestActiveTripMock.mockResolvedValue(activeTrip);
    getTripCategoriesMock.mockResolvedValue(hydratedCategories);
    getTripExpensesMock.mockResolvedValue([]);
    readPersistedSyncStatusMock
      .mockResolvedValueOnce({
        mode: "pending",
        pendingCount: 1,
        conflictCount: 0,
        lastSyncedAt: "2026-04-05T10:00:00.000Z",
      })
      .mockResolvedValueOnce({
        mode: "pending",
        pendingCount: 2,
        conflictCount: 0,
        lastSyncedAt: "2026-04-06T10:10:00.000Z",
      });
    createExpenseMock.mockResolvedValue({
      id: "expense-1",
      tripId: "trip-join",
      categoryId: "cat-fuel",
      amount: 1250,
      currency: "INR",
      description: "Fuel stop",
      location: "NH-44",
      paidBy: "You",
      loggedAt: "2026-04-06T10:12:00.000Z",
      deviceId: "device-local",
      createdAt: "2026-04-06T10:12:00.000Z",
      updatedAt: "2026-04-06T10:12:00.000Z",
      createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      syncStatus: "pending",
      conflictData: null,
      isDeleted: false,
    });

    await renderShell();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /himalayan mission/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /quick add expense/i }));
    await user.click(screen.getByRole("button", { name: /fuel/i }));
    await user.type(screen.getByLabelText(/expense amount/i), "1250");
    await user.click(screen.getByRole("button", { name: /^Add Expense$/i }));

    await waitFor(() => {
      expect(createExpenseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: "trip-join",
          categoryId: "cat-fuel",
          amount: "1250",
          currency: "INR",
        }),
      );
    });

    expect(screen.getByText(/expense added locally/i)).toBeInTheDocument();
    expect(screen.getByText(/fuel stop/i)).toBeInTheDocument();
  });
});
