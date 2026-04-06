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
  updateExpenseMock,
  deleteExpenseMock,
  restoreExpenseMock,
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
  updateExpenseMock: vi.fn(),
  deleteExpenseMock: vi.fn(),
  restoreExpenseMock: vi.fn(),
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
  updateExpense: updateExpenseMock,
  deleteExpense: deleteExpenseMock,
  restoreExpense: restoreExpenseMock,
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
    updateExpenseMock.mockReset();
    deleteExpenseMock.mockReset();
    restoreExpenseMock.mockReset();

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

  it("shows per-category spent versus budget health cues on the dashboard", async () => {
    getLatestActiveTripMock.mockResolvedValue(activeTrip);
    getTripCategoriesMock.mockResolvedValue([
      {
        ...hydratedCategories[0],
        id: "cat-fuel",
        name: "Fuel",
        budgetAmount: 12000,
      },
      {
        ...hydratedCategories[0],
        id: "cat-food",
        name: "Food",
        icon: "restaurant",
        color: "#ea580c",
        budgetAmount: 10000,
      },
      {
        ...hydratedCategories[0],
        id: "cat-stay",
        name: "Stay",
        icon: "hotel",
        color: "#1d4ed8",
        budgetAmount: 8000,
      },
    ]);
    getTripExpensesMock.mockResolvedValue([
      {
        id: "expense-fuel",
        tripId: "trip-join",
        categoryId: "cat-fuel",
        amount: 6000,
        currency: "INR",
        description: "Fuel stop",
        location: "",
        paidBy: "You",
        loggedAt: "2026-04-06T10:12:00.000Z",
        deviceId: "device-local",
        createdAt: "2026-04-06T10:12:00.000Z",
        updatedAt: "2026-04-06T10:12:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        syncStatus: "synced",
        conflictData: null,
        isDeleted: false,
      },
      {
        id: "expense-food",
        tripId: "trip-join",
        categoryId: "cat-food",
        amount: 8500,
        currency: "INR",
        description: "Food stop",
        location: "",
        paidBy: "You",
        loggedAt: "2026-04-06T10:13:00.000Z",
        deviceId: "device-local",
        createdAt: "2026-04-06T10:13:00.000Z",
        updatedAt: "2026-04-06T10:13:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        syncStatus: "synced",
        conflictData: null,
        isDeleted: false,
      },
      {
        id: "expense-stay",
        tripId: "trip-join",
        categoryId: "cat-stay",
        amount: 9200,
        currency: "INR",
        description: "Stay booking",
        location: "",
        paidBy: "You",
        loggedAt: "2026-04-06T10:14:00.000Z",
        deviceId: "device-local",
        createdAt: "2026-04-06T10:14:00.000Z",
        updatedAt: "2026-04-06T10:14:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        syncStatus: "synced",
        conflictData: null,
        isDeleted: false,
      },
    ]);

    await renderShell();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /himalayan mission/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /category budget health/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/fuel health/i)).toHaveTextContent(/50% used/i);
    expect(screen.getByLabelText(/food health/i)).toHaveTextContent(/85% used/i);
    expect(screen.getByLabelText(/stay health/i)).toHaveTextContent(/overspent by .*1,200/i);
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

  it("shows the new expense immediately at the top of recent activity with a local pending state", async () => {
    const user = userEvent.setup();
    getLatestActiveTripMock.mockResolvedValue(activeTrip);
    getTripCategoriesMock.mockResolvedValue(hydratedCategories);
    getTripExpensesMock.mockResolvedValue([
      {
        id: "expense-older",
        tripId: "trip-join",
        categoryId: "cat-fuel",
        amount: 900,
        currency: "INR",
        description: "Older fuel stop",
        location: "Kullu",
        paidBy: "You",
        loggedAt: "2026-04-06T08:12:00.000Z",
        deviceId: "device-local",
        createdAt: "2026-04-06T08:12:00.000Z",
        updatedAt: "2026-04-06T08:12:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        syncStatus: "synced",
        conflictData: null,
        isDeleted: false,
      },
    ]);
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

    expect(screen.getByLabelText(/total spent/i)).toHaveTextContent("900");
    expect(screen.getByLabelText(/remaining amount/i)).toHaveTextContent("49,100.00");
    expect(screen.getByLabelText(/overall trip progress/i)).toHaveTextContent("2%");

    await user.click(screen.getByRole("button", { name: /quick add expense/i }));
    await user.click(screen.getByRole("button", { name: /local_gas_station fuel/i }));
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

    const recentExpenseCards = screen.getAllByTestId("recent-expense-card");
    expect(recentExpenseCards[0]).toHaveTextContent(/fuel stop/i);
    expect(recentExpenseCards[0]).toHaveTextContent(/local pending/i);
    expect(recentExpenseCards[0]).toHaveTextContent(/logged on this device/i);
    expect(recentExpenseCards[1]).toHaveTextContent(/older fuel stop/i);
    expect(screen.getByLabelText(/total spent/i)).toHaveTextContent("2,150");
    expect(screen.getByLabelText(/remaining amount/i)).toHaveTextContent("47,850.00");
    expect(screen.getByLabelText(/overall trip progress/i)).toHaveTextContent("4%");
    expect(screen.getByText(/expense added locally/i)).toBeInTheDocument();
  });

  it("shows traveller attribution when a named payer logged the expense", async () => {
    getLatestActiveTripMock.mockResolvedValue(activeTrip);
    getTripCategoriesMock.mockResolvedValue(hydratedCategories);
    getTripExpensesMock.mockResolvedValue([
      {
        id: "expense-1",
        tripId: "trip-join",
        categoryId: "cat-fuel",
        amount: 450,
        currency: "INR",
        description: "Dinner stop",
        location: "Manali",
        paidBy: "Riya",
        loggedAt: "2026-04-06T10:12:00.000Z",
        deviceId: "device-remote-42",
        createdAt: "2026-04-06T10:12:00.000Z",
        updatedAt: "2026-04-06T10:12:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-remote-42" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-remote-42" },
        syncStatus: "synced",
        conflictData: null,
        isDeleted: false,
      },
    ]);

    await renderShell();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /himalayan mission/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/logged by riya/i)).toBeInTheDocument();
  });

  it("prefills an expense for editing and updates recent activity immediately after save", async () => {
    const user = userEvent.setup();
    getLatestActiveTripMock.mockResolvedValue(activeTrip);
    getTripCategoriesMock.mockResolvedValue(hydratedCategories);
    getTripExpensesMock.mockResolvedValue([
      {
        id: "expense-1",
        tripId: "trip-join",
        categoryId: "cat-fuel",
        amount: 450,
        currency: "INR",
        description: "Dinner stop",
        location: "Manali",
        paidBy: "Riya",
        loggedAt: "2026-04-06T10:12:00.000Z",
        deviceId: "device-local",
        createdAt: "2026-04-06T10:12:00.000Z",
        updatedAt: "2026-04-06T10:12:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        syncStatus: "synced",
        conflictData: null,
        isDeleted: false,
      },
    ]);
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
        lastSyncedAt: "2026-04-06T10:20:00.000Z",
      });
    updateExpenseMock.mockResolvedValue({
      id: "expense-1",
      tripId: "trip-join",
      categoryId: "cat-fuel",
      amount: 520,
      currency: "INR",
      description: "Dinner corrected",
      location: "Old Manali",
      paidBy: "Riya",
      loggedAt: "2026-04-06T10:12:00.000Z",
      deviceId: "device-local",
      createdAt: "2026-04-06T10:12:00.000Z",
      updatedAt: "2026-04-06T10:25:00.000Z",
      createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      updatedAtHlc: { wallClock: 2, logical: 0, nodeId: "device-local" },
      syncStatus: "pending",
      conflictData: null,
      isDeleted: false,
    });

    await renderShell();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /himalayan mission/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /edit dinner stop/i }));

    expect(screen.getByRole("heading", { name: /edit expense/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("450")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dinner stop")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Manali")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Riya")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/expense amount/i));
    await user.type(screen.getByLabelText(/expense amount/i), "520");
    await user.clear(screen.getByLabelText(/expense note/i));
    await user.type(screen.getByLabelText(/expense note/i), "Dinner corrected");
    await user.clear(screen.getByLabelText(/expense location/i));
    await user.type(screen.getByLabelText(/expense location/i), "Old Manali");
    await user.click(screen.getByRole("button", { name: /^Save Changes$/i }));

    await waitFor(() => {
      expect(updateExpenseMock).toHaveBeenCalledWith({
        expenseId: "expense-1",
        categoryId: "cat-fuel",
        amount: "520",
        description: "Dinner corrected",
        location: "Old Manali",
        paidBy: "Riya",
      });
    });

    const recentExpenseCards = screen.getAllByTestId("recent-expense-card");
    expect(recentExpenseCards[0]).toHaveTextContent(/dinner corrected/i);
    expect(recentExpenseCards[0]).toHaveTextContent(/old manali/i);
    expect(recentExpenseCards[0]).toHaveTextContent(/local pending/i);
    expect(recentExpenseCards[0]).toHaveTextContent(/logged by riya/i);
    expect(screen.getByText(/expense updated locally/i)).toBeInTheDocument();
  });

  it("deletes an expense from edit mode and restores it with undo", async () => {
    const user = userEvent.setup();
    getLatestActiveTripMock.mockResolvedValue(activeTrip);
    getTripCategoriesMock.mockResolvedValue(hydratedCategories);
    getTripExpensesMock.mockResolvedValue([
      {
        id: "expense-1",
        tripId: "trip-join",
        categoryId: "cat-fuel",
        amount: 450,
        currency: "INR",
        description: "Dinner stop",
        location: "Manali",
        paidBy: "Riya",
        loggedAt: "2026-04-06T10:12:00.000Z",
        deviceId: "device-local",
        createdAt: "2026-04-06T10:12:00.000Z",
        updatedAt: "2026-04-06T10:12:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        syncStatus: "synced",
        conflictData: null,
        isDeleted: false,
      },
    ]);
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
        lastSyncedAt: "2026-04-06T10:30:00.000Z",
      })
      .mockResolvedValueOnce({
        mode: "pending",
        pendingCount: 2,
        conflictCount: 0,
        lastSyncedAt: "2026-04-06T10:31:00.000Z",
      });
    deleteExpenseMock.mockResolvedValue({
      id: "expense-1",
      tripId: "trip-join",
      categoryId: "cat-fuel",
      amount: 450,
      currency: "INR",
      description: "Dinner stop",
      location: "Manali",
      paidBy: "Riya",
      loggedAt: "2026-04-06T10:12:00.000Z",
      deviceId: "device-local",
      createdAt: "2026-04-06T10:12:00.000Z",
      updatedAt: "2026-04-06T10:30:00.000Z",
      createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      updatedAtHlc: { wallClock: 2, logical: 0, nodeId: "device-local" },
      syncStatus: "pending",
      conflictData: null,
      isDeleted: true,
    });
    restoreExpenseMock.mockResolvedValue({
      id: "expense-1",
      tripId: "trip-join",
      categoryId: "cat-fuel",
      amount: 450,
      currency: "INR",
      description: "Dinner stop",
      location: "Manali",
      paidBy: "Riya",
      loggedAt: "2026-04-06T10:12:00.000Z",
      deviceId: "device-local",
      createdAt: "2026-04-06T10:12:00.000Z",
      updatedAt: "2026-04-06T10:31:00.000Z",
      createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      updatedAtHlc: { wallClock: 3, logical: 0, nodeId: "device-local" },
      syncStatus: "pending",
      conflictData: null,
      isDeleted: false,
    });

    await renderShell();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /himalayan mission/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /edit dinner stop/i }));
    await user.click(screen.getByRole("button", { name: /delete expense/i }));

    await waitFor(() => {
      expect(deleteExpenseMock).toHaveBeenCalledWith("expense-1");
    });

    expect(screen.queryByText(/dinner stop/i)).not.toBeInTheDocument();
    expect(screen.getByText(/expense deleted/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /undo/i }));

    await waitFor(() => {
      expect(restoreExpenseMock).toHaveBeenCalledWith("expense-1");
    });

    expect(screen.getByText(/dinner stop/i)).toBeInTheDocument();
    expect(screen.getByText(/expense restored locally/i)).toBeInTheDocument();
  });
});
