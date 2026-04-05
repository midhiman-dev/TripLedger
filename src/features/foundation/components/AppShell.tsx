import { useEffect } from "react";

import { tripLedgerDb } from "../../../db/tripLedgerDb";
import {
  type BeforeInstallPromptEvent,
  isStandaloneDisplay,
} from "../lib/installPrompt";
import { useShellStore } from "../store/shellStore";

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "offline" | "ready" | "pending";
}) {
  const toneClasses = {
    offline: "bg-surface-variant/80 text-on-surface",
    ready: "bg-tertiary-container text-[#dfffe9]",
    pending: "bg-secondary-container/90 text-on-secondary-container",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses[tone]}`}
    >
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
    updateReady,
    markInstalled,
    setInstallPrompt,
    setOnlineStatus,
  } = useShellStore();

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
        {!isOnline ? (
          <div className="rounded-2xl bg-secondary-container/85 px-4 py-3 text-sm font-medium text-on-secondary-container shadow-ambient backdrop-blur">
            You are offline. TripLedger will keep the shell ready and local data
            available.
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
            <StatusPill
              label={isOnline ? "Ready" : "Offline"}
              tone={isOnline ? "ready" : "offline"}
            />
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
            <div className="flex flex-wrap gap-2">
              <StatusPill
                label={isInstalled ? "Installed" : "Browser"}
                tone={isInstalled ? "ready" : "pending"}
              />
              <StatusPill
                label={updateReady ? "Update ready" : "Shell cached"}
                tone={updateReady ? "pending" : "ready"}
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
