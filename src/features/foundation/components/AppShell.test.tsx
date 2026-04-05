import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";
import type { PersistedSyncStatus } from "../lib/syncStatus";
import { useShellStore } from "../store/shellStore";

const { readPersistedSyncStatusMock } = vi.hoisted(() => ({
  readPersistedSyncStatusMock: vi.fn<() => Promise<PersistedSyncStatus>>(),
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

async function renderShell() {
  await act(async () => {
    render(<AppShell />);
    await Promise.resolve();
  });
}

describe("AppShell", () => {
  beforeEach(() => {
    readPersistedSyncStatusMock.mockResolvedValue({
      mode: "synced",
      pendingCount: 0,
      conflictCount: 0,
      lastSyncedAt: "2026-04-05T10:00:00.000Z",
    });

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
  });

  it("renders the install-focused shell state", async () => {
    await renderShell();

    expect(
      screen.getByRole("heading", { name: /install once\./i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/home-screen ready/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /use browser menu to install/i }),
    ).toBeDisabled();
    expect(screen.getAllByText(/^synced$/i)).toHaveLength(2);
  });

  it("shows the offline banner when connectivity drops", async () => {
    await renderShell();

    fireEvent(window, new Event("offline"));

    expect(
      screen.getByText(/you are offline\. local changes will sync when signal returns\./i),
    ).toBeInTheDocument();
  });

  it("shows queued local changes as pending", async () => {
    readPersistedSyncStatusMock.mockResolvedValue({
      mode: "pending",
      pendingCount: 3,
      conflictCount: 0,
      lastSyncedAt: "2026-04-05T09:45:00.000Z",
    });

    await renderShell();

    await waitFor(() => {
      expect(screen.getAllByText(/pending \(3\)/i)).toHaveLength(2);
    });

    expect(
      screen.getByText(/3 changes are queued for sync\. your local ledger is already saved\./i),
    ).toBeInTheDocument();
  });

  it("prioritizes conflict messaging over offline messaging", async () => {
    readPersistedSyncStatusMock.mockResolvedValue({
      mode: "conflict",
      pendingCount: 0,
      conflictCount: 1,
      lastSyncedAt: "2026-04-05T09:45:00.000Z",
    });

    useShellStore.setState({ isOnline: false });

    await renderShell();

    await waitFor(() => {
      expect(screen.getAllByText(/^conflict$/i)).toHaveLength(2);
    });

    expect(
      screen.getByText(/1 sync conflict needs review\. no conflicting field will be overwritten silently\./i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/you are offline\. local changes will sync when signal returns\./i),
    ).not.toBeInTheDocument();
  });
});
