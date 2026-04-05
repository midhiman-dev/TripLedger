import { useEffect } from "react";

import { tripLedgerDb } from "../../../db/tripLedgerDb";
import {
  type BeforeInstallPromptEvent,
  isStandaloneDisplay,
} from "../lib/installPrompt";
import { getSyncStatusViewModel, readPersistedSyncStatus } from "../lib/syncStatus";
import { useShellStore } from "../store/shellStore";

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "offline" | "synced" | "pending" | "conflict";
}) {
  const toneClasses = {
    offline:
      "bg-surface/70 text-on-surface ring-1 ring-outline/10 backdrop-blur",
    synced:
      "bg-[#7efba4]/20 text-[#005228] shadow-[0_0_18px_rgba(126,251,164,0.24)]",
    pending:
      "bg-secondary-container/20 text-secondary ring-1 ring-secondary/10 animate-sync-pulse",
    conflict: "bg-red-100 text-red-700 ring-1 ring-red-200",
  };
  const toneIcons = {
    offline: "cloud_off",
    synced: "cloud_done",
    pending: "sync",
    conflict: "sync_problem",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses[tone]}`}
    >
      <span className="material-symbols-outlined text-sm">{toneIcons[tone]}</span>
      {label}
    </span>
  );
}

export function AppShell() {
  const {
    appVersion,
    canInstall,
    deferredInstallPrompt,
    isInstalled,
    isOnline,
    persistedSyncStatus,
    updateReady,
    markInstalled,
    setInstallPrompt,
    setOnlineStatus,
    setPersistedSyncStatus,
  } = useShellStore();

  const syncStatus = getSyncStatusViewModel(isOnline, persistedSyncStatus);

  useEffect(() => {
    tripLedgerDb.appMeta.put({
      key: "shellVersion",
      value: appVersion,
    });

    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    const handleInstalled = () => markInstalled();
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (isStandaloneDisplay()) {
      markInstalled();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [appVersion, markInstalled, setInstallPrompt, setOnlineStatus]);

  useEffect(() => {
    let cancelled = false;

    void readPersistedSyncStatus().then((status) => {
      if (!cancelled) {
        setPersistedSyncStatus(status);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [setPersistedSyncStatus]);

  async function handleInstallClick() {
    if (!deferredInstallPrompt) {
      return;
    }

    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;

    if (choice.outcome === "accepted") {
      markInstalled();
      return;
    }

    setInstallPrompt(null);
  }

  return (
    <main className="min-h-dvh bg-surface px-6 pb-8 pt-6 text-on-surface">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col gap-6">
        {syncStatus.banner ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-medium shadow-ambient ${
              syncStatus.tone === "conflict"
                ? "bg-red-600 text-white"
                : "bg-secondary-container/85 text-on-secondary-container backdrop-blur"
            }`}
          >
            {syncStatus.banner}
          </div>
        ) : null}

        <header className="rounded-3xl bg-surface-container-low px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="font-body text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">
                TripLedger
              </p>
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
                Install once.
                <br />
                Travel offline.
              </h1>
            </div>
            <StatusPill label={syncStatus.label} tone={syncStatus.tone} />
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl bg-hero-gradient p-6 text-on-primary shadow-ambient">
          <div className="space-y-3">
            <p className="font-body text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Home-screen ready
            </p>
            <p className="font-headline text-3xl font-bold tracking-tight">
              Launch TripLedger like a native travel tool without app-store
              friction.
            </p>
            <p className="max-w-sm text-sm leading-6 text-white/80">
              The app shell is cached for offline launch, and new deployments
              refresh through the service worker when an update is available.
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-body text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Ledger safety
                </p>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-primary">
                  {syncStatus.label}
                </h2>
              </div>
              <StatusPill label={syncStatus.meta} tone={syncStatus.tone} />
            </div>

            <div className="rounded-2xl bg-surface-container-low px-4 py-4">
              <p className="text-sm leading-6 text-on-surface/80">
                {syncStatus.detail}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusPill
                label={isInstalled ? "Installed" : "Browser"}
                tone={isInstalled ? "synced" : "pending"}
              />
              <StatusPill
                label={updateReady ? "Update ready" : "Shell cached"}
                tone={updateReady ? "pending" : "synced"}
              />
            </div>

            <div className="space-y-2">
              <h2 className="font-headline text-2xl font-bold tracking-tight text-primary">
                Trip shell
              </h2>
              <p className="text-sm leading-6 text-on-surface/75">
                No trips yet. Install the shell now so the next budget, expense,
                and sync flows open from your home screen with standalone
                launch behavior.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                className="min-h-14 rounded-2xl bg-secondary-container px-5 py-4 text-left text-base font-semibold text-on-secondary-container transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleInstallClick}
                disabled={!canInstall}
                type="button"
              >
                {isInstalled
                  ? "Installed on this device"
                  : canInstall
                    ? "Install TripLedger"
                    : "Use browser menu to install"}
              </button>
              <div className="rounded-2xl bg-surface-container-low px-4 py-4 text-sm leading-6 text-on-surface/75">
                Version {appVersion}. Local-first foundation is ready for Dexie,
                Zustand, and sync-safe app-shell updates.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
