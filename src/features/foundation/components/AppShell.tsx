import { useEffect } from "react";

import { tripLedgerDb } from "../../../db/tripLedgerDb";
import {
  type BeforeInstallPromptEvent,
  isStandaloneDisplay,
} from "../lib/installPrompt";
import { getSyncStatusViewModel, readPersistedSyncStatus } from "../lib/syncStatus";
import { useShellStore } from "../store/shellStore";
import { CreateTripScreen, JoinTripScreen, TripSummaryScreen } from "../../trips/components/TripSetupScreens";
import { validateJoinCode } from "../../trips/lib/joinCode";
import { formatTripCode } from "../../trips/lib/tripCode";
import { validateTripDraft } from "../../trips/lib/tripDraft";
import { joinTripByCode } from "../../trips/services/joinTripService";
import { createTrip, getLatestActiveTrip, getTripCategories } from "../../trips/services/tripService";
import { useTripStore } from "../../trips/store/tripStore";
import { updateCategoryBudget } from "../../categories/services/categoryService";

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

function OfflineBanner({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      className="sticky top-0 z-50 -mx-6 flex items-center justify-center gap-3 bg-secondary-container/90 px-6 py-3 text-center text-sm font-semibold text-on-secondary-container backdrop-blur-md"
      role="status"
    >
      <span className="material-symbols-outlined text-lg">cloud_off</span>
      <p>{message}</p>
    </div>
  );
}

function InstallCard({
  canInstall,
  deferredInstallPrompt,
  isInstalled,
  updateReady,
  markInstalled,
  setInstallPrompt,
}: {
  canInstall: boolean;
  deferredInstallPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  updateReady: boolean;
  markInstalled: () => void;
  setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
}) {
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
    <div className="grid gap-3">
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
      <p className="text-sm leading-6 text-on-surface/75">
        Installability stays intact in this slice, but trip creation now comes first so organisers can set up a budget even before network access is reliable.
      </p>
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
    </div>
  );
}

function validateCategoryBudget(rawBudget: string) {
  if (!rawBudget.trim()) {
    return undefined;
  }

  const parsed = Number.parseFloat(rawBudget);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "Budget amount must be zero or greater";
  }

  return undefined;
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
  const {
    screenMode,
    activeTrip,
    categories,
    categoryBudgetDrafts,
    categoryErrors,
    savingCategoryId,
    joinCodeDraft,
    joinCodeError,
    joinFeedback,
    isJoining,
    draft,
    errors,
    touchedFields,
    isHydrating,
    isSaving,
    saveError,
    setScreenMode,
    setActiveTrip,
    setCategories,
    setCategoryBudgetDraft,
    setCategoryError,
    setSavingCategoryId,
    updateCategory,
    setJoinCodeDraft,
    setJoinCodeError,
    setJoinFeedback,
    setJoining,
    setDraftField,
    setErrors,
    setHydrating,
    setSaveError,
    setSaving,
    touchField,
    resetDraft,
  } = useTripStore();

  const syncStatus = getSyncStatusViewModel(isOnline, persistedSyncStatus);

  useEffect(() => {
    void tripLedgerDb.appMeta.put({
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
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [appVersion, markInstalled, setInstallPrompt, setOnlineStatus]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateApp() {
      const [status, trip] = await Promise.all([
        readPersistedSyncStatus(),
        getLatestActiveTrip(),
      ]);

      if (cancelled) {
        return;
      }

      setPersistedSyncStatus(status);
      setActiveTrip(trip);

      if (trip) {
        const tripCategories = await getTripCategories(trip.id);
        if (!cancelled) {
          setCategories(tripCategories);
        }
      }

      if (!cancelled) {
        setHydrating(false);
      }
    }

    void hydrateApp();

    return () => {
      cancelled = true;
    };
  }, [setActiveTrip, setCategories, setHydrating, setPersistedSyncStatus]);

  function handleFieldChange(field: keyof typeof draft, value: string) {
    const nextDraft = {
      ...draft,
      [field]: value,
    };

    setDraftField(field, value);
    if (touchedFields[field]) {
      setErrors(validateTripDraft(nextDraft));
    }
    if (saveError) {
      setSaveError(null);
    }
  }

  function handleFieldBlur(field: keyof typeof draft) {
    touchField(field);
    setErrors(validateTripDraft(draft));
  }

  async function handleCreateTrip() {
    const nextErrors = validateTripDraft(draft);
    setErrors(nextErrors);
    touchField("name");
    touchField("startDate");
    touchField("endDate");
    touchField("totalBudget");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const trip = await createTrip(draft);
      const tripCategories = await getTripCategories(trip.id);
      setActiveTrip(trip);
      setCategories(tripCategories);
      setScreenMode("summary");
      resetDraft();
      setPersistedSyncStatus(await readPersistedSyncStatus());
    } catch {
      setSaveError("Trip setup could not be saved locally. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCategoryBudgetChange(categoryId: string, value: string) {
    setCategoryBudgetDraft(categoryId, value);
    setCategoryError(categoryId, validateCategoryBudget(value));
  }

  async function handleCategoryBudgetBlur(categoryId: string) {
    const rawBudget = categoryBudgetDrafts[categoryId] ?? "";
    const error = validateCategoryBudget(rawBudget);
    setCategoryError(categoryId, error);

    if (error) {
      return;
    }

    const currentCategory = categories.find((category) => category.id === categoryId);
    if (!currentCategory) {
      return;
    }

    const normalizedBudget = rawBudget.trim() === "" ? 0 : Number.parseFloat(rawBudget);
    if (normalizedBudget === currentCategory.budgetAmount) {
      return;
    }

    setSavingCategoryId(categoryId);

    try {
      const updatedCategory = await updateCategoryBudget({
        categoryId,
        budgetAmount: rawBudget.trim() === "" ? "0" : rawBudget,
      });
      updateCategory(updatedCategory);
      setPersistedSyncStatus(await readPersistedSyncStatus());
    } catch {
      setCategoryError(categoryId, "Category budget could not be saved locally.");
      setSavingCategoryId(null);
    }
  }

  function handleOpenJoin() {
    setJoinFeedback(null);
    setJoinCodeError(null);
    setScreenMode("join");
  }

  function handleJoinCodeChange(value: string) {
    setJoinCodeDraft(formatTripCode(value));
    if (joinCodeError) {
      setJoinCodeError(validateJoinCode(value) ?? null);
    }
  }

  async function handleJoinTrip() {
    const error = validateJoinCode(joinCodeDraft);
    setJoinCodeError(error ?? null);
    if (error) {
      return;
    }

    setJoining(true);
    setJoinFeedback(null);

    try {
      const result = await joinTripByCode(joinCodeDraft);
      setPersistedSyncStatus(await readPersistedSyncStatus());

      if (result.status === "hydrated" && result.trip) {
        setActiveTrip(result.trip);
        setCategories(result.categories);
        setScreenMode("summary");
        setJoinFeedback({
          tone: "hydrated",
          title: "Trip hydrated locally.",
          detail: `Code ${result.request.tripCode} restored the full trip snapshot on this device.`,
        });
        return;
      }

      setJoinFeedback({
        tone: "queued",
        title: "You will be added when signal returns.",
        detail: `Code ${result.request.tripCode} was saved locally and queued for first sync.`,
      });
    } catch (joinError) {
      setJoinCodeError(joinError instanceof Error ? joinError.message : "Join request could not be saved locally.");
    } finally {
      setJoining(false);
    }
  }

  const installAction = (
    <InstallCard
      canInstall={canInstall}
      deferredInstallPrompt={deferredInstallPrompt}
      isInstalled={isInstalled}
      markInstalled={markInstalled}
      setInstallPrompt={setInstallPrompt}
      updateReady={updateReady}
    />
  );

  return (
    <main className="min-h-dvh bg-surface px-6 pb-8 pt-6 text-on-surface">
      {syncStatus.tone === "offline" && syncStatus.banner ? (
        <OfflineBanner message={syncStatus.banner} />
      ) : null}

      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col gap-6">
        {syncStatus.banner && syncStatus.tone !== "offline" ? (
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

        {isHydrating ? null : activeTrip && screenMode === "summary" ? (
          <TripSummaryScreen
            categories={categories}
            categoryBudgetDrafts={categoryBudgetDrafts}
            categoryErrors={categoryErrors}
            installAction={installAction}
            onCategoryBudgetBlur={handleCategoryBudgetBlur}
            onCategoryBudgetChange={handleCategoryBudgetChange}
            savingCategoryId={savingCategoryId}
            syncStatus={syncStatus}
            trip={activeTrip}
          />
        ) : screenMode === "join" ? (
          <JoinTripScreen
            isJoining={isJoining}
            joinCodeDraft={joinCodeDraft}
            joinCodeError={joinCodeError}
            joinFeedback={joinFeedback}
            onClose={() => setScreenMode(activeTrip ? "summary" : "create")}
            onCodeChange={handleJoinCodeChange}
            onSubmit={handleJoinTrip}
          />
        ) : (
          <CreateTripScreen
            draft={draft}
            errors={errors}
            installAction={installAction}
            isSaving={isSaving}
            onBlur={handleFieldBlur}
            onChange={handleFieldChange}
            onOpenJoin={handleOpenJoin}
            onSubmit={handleCreateTrip}
            saveError={saveError}
            syncStatus={syncStatus}
            touchedFields={touchedFields}
          />
        )}

        <footer className="pb-24 text-center text-xs font-medium text-on-surface/60">
          Version {appVersion}. Offline-first trip setup writes to Dexie before any sync path starts.
        </footer>
      </div>
    </main>
  );
}
