import { describe, expect, it } from "vitest";

import { buildDashboardSummary } from "./dashboardSummary";

const trip = {
  id: "trip-1",
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
  syncStatus: "pending" as const,
  isDeleted: false,
};

const categories = [
  {
    id: "cat-fuel",
    tripId: "trip-1",
    name: "Fuel",
    budgetAmount: 12000,
    icon: "local_gas_station",
    color: "#865300",
    createdAt: "2026-04-06T09:00:00.000Z",
    updatedAt: "2026-04-06T09:00:00.000Z",
    createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    syncStatus: "pending" as const,
    isDeleted: false,
  },
  {
    id: "cat-food",
    tripId: "trip-1",
    name: "Food",
    budgetAmount: 0,
    icon: "restaurant",
    color: "#ea580c",
    createdAt: "2026-04-06T09:00:00.000Z",
    updatedAt: "2026-04-06T09:00:00.000Z",
    createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    syncStatus: "pending" as const,
    isDeleted: false,
  },
];

describe("buildDashboardSummary", () => {
  it("derives spend, remaining, progress, and budget coverage from local trip state", () => {
    const summary = buildDashboardSummary(trip, categories, [
      {
        id: "expense-1",
        tripId: "trip-1",
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
      },
      {
        id: "expense-2",
        tripId: "trip-1",
        categoryId: "cat-food",
        amount: 8750,
        currency: "INR",
        description: "Stay and food",
        location: "Manali",
        paidBy: "Riya",
        loggedAt: "2026-04-06T11:12:00.000Z",
        deviceId: "device-local",
        createdAt: "2026-04-06T11:12:00.000Z",
        updatedAt: "2026-04-06T11:12:00.000Z",
        createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
        syncStatus: "pending",
        conflictData: null,
        isDeleted: false,
      },
    ]);

    expect(summary.totalSpent).toBe(10000);
    expect(summary.remainingAmount).toBe(40000);
    expect(summary.progressPercent).toBe(20);
    expect(summary.healthTone).toBe("healthy");
    expect(summary.healthLabel).toBe("20% used");
    expect(summary.budgetedCategoryCount).toBe(1);
    expect(summary.totalCategoryCount).toBe(2);
  });

  it("marks overspent trips as critical and clamps the progress bar", () => {
    const summary = buildDashboardSummary(trip, categories, [
      {
        id: "expense-overspend",
        tripId: "trip-1",
        categoryId: "cat-fuel",
        amount: 62000,
        currency: "INR",
        description: "Major overrun",
        location: "",
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
      },
    ]);

    expect(summary.remainingAmount).toBe(-12000);
    expect(summary.progressPercent).toBe(100);
    expect(summary.healthTone).toBe("critical");
    expect(summary.healthLabel).toBe("24% over budget");
  });
});
