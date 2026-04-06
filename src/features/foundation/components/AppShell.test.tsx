import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  updateCategoryBudgetMock,
} = vi.hoisted(() => ({
  appMetaPutMock: vi.fn(),
  readPersistedSyncStatusMock: vi.fn<() => Promise<PersistedSyncStatus>>(),
  getLatestActiveTripMock: vi.fn(),
  getTripCategoriesMock: vi.fn(),
  createTripMock: vi.fn(),
  updateCategoryBudgetMock: vi.fn(),
}));

vi.mock("../../../db/tripLedgerDb", () => ({
  tripLedgerDb: {
    appMeta: {
      put: appMetaPutMock,
    },
  },
}));

vi.mock("../lib/syncStatus", async () => {
  const actual = await vi.importActual<typeof import("../lib/syncStatus")>(
    "../lib/syncStatus",
  );

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

vi.mock("../../categories/services/categoryService", () => ({
  updateCategoryBudget: updateCategoryBudgetMock,
}));

const defaultCategories = [
  {
    id: "cat-fuel",
    tripId: "trip-1",
    name: "Fuel",
    budgetAmount: 0,
    icon: "local_gas_station",
    color: "#865300",
    createdAt: "2026-04-06T09:00:00.000Z",
    updatedAt: "2026-04-06T09:00:00.000Z",
    createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    syncStatus: "pending",
    isDeleted: false,
  },
  {
    id: "cat-food",
    tripId: "trip-1",
    name: "Food",
    budgetAmount: 0,
    icon: "restaurant",
    color: "#36b96a",
    createdAt: "2026-04-06T09:00:00.000Z",
    updatedAt: "2026-04-06T09:00:00.000Z",
    createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    syncStatus: "pending",
    isDeleted: false,
  },
];

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
    updateCategoryBudgetMock.mockReset();

    readPersistedSyncStatusMock.mockResolvedValue({
      mode: "synced",
      pendingCount: 0,
      conflictCount: 0,
      lastSyncedAt: "2026-04-05T10:00:00.000Z",
    });
    getLatestActiveTripMock.mockResolvedValue(null);
    getTripCategoriesMock.mockResolvedValue(defaultCategories);

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

  it("renders the create-trip flow when no trip exists", async () => {
    await renderShell();

    expect(
      screen.getByRole("heading", { name: /the journey begins/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/trip name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create trip/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /use browser menu to install/i }),
    ).toBeDisabled();
  });

  it("shows validation feedback when a required field is blurred", async () => {
    const user = userEvent.setup();

    await renderShell();

    await user.click(screen.getByLabelText(/trip name/i));
    await user.tab();

    expect(screen.getByText(/trip name is required/i)).toBeInTheDocument();
  });

  it("creates a trip locally and shows seeded editable categories", async () => {
    const user = userEvent.setup();
    const createdTrip = {
      id: "trip-1",
      name: "Spiti Escape",
      startDate: "2026-05-11",
      endDate: "2026-05-18",
      baseCurrency: "INR",
      totalBudget: 72000,
      createdAt: "2026-04-06T09:00:00.000Z",
      updatedAt: "2026-04-06T09:00:00.000Z",
      createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
      syncStatus: "pending",
      isDeleted: false,
    };

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
    createTripMock.mockResolvedValue(createdTrip);

    await renderShell();

    await user.type(screen.getByLabelText(/trip name/i), "Spiti Escape");
    await user.type(screen.getByLabelText(/total budget/i), "72000");
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: "2026-05-11" },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "2026-05-18" },
    });

    await user.click(screen.getByRole("button", { name: /create trip/i }));

    await waitFor(() => {
      expect(createTripMock).toHaveBeenCalledWith({
        name: "Spiti Escape",
        startDate: "2026-05-11",
        endDate: "2026-05-18",
        totalBudget: "72000",
      });
      expect(getTripCategoriesMock).toHaveBeenCalledWith("trip-1");
    });

    expect(
      screen.getByRole("heading", { name: /default categories/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/fuel budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/food budget/i)).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("72,000.00"))).toBeInTheDocument();
  });

  it("saves a category budget edit locally on blur", async () => {
    const user = userEvent.setup();
    getLatestActiveTripMock.mockResolvedValue({
      id: "trip-1",
      name: "BLR GOA Roadtrip",
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
    });
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
        lastSyncedAt: "2026-04-05T10:00:00.000Z",
      });
    updateCategoryBudgetMock.mockResolvedValue({
      ...defaultCategories[0],
      budgetAmount: 12000,
      updatedAt: "2026-04-06T10:00:00.000Z",
    });

    await renderShell();

    const fuelBudgetInput = screen.getByLabelText(/fuel budget/i);
    await user.type(fuelBudgetInput, "12000");
    fireEvent.blur(fuelBudgetInput);

    await waitFor(() => {
      expect(updateCategoryBudgetMock).toHaveBeenCalledWith({
        categoryId: "cat-fuel",
        budgetAmount: "12000",
      });
    });

    expect(screen.getByDisplayValue("12000")).toBeInTheDocument();
    expect(screen.getByText(/2 changes are queued for sync/i)).toBeInTheDocument();
  });
});
