import { useEffect, useState } from "react";

import { tripLedgerDb, type CategoryRecord, type ExpenseRecord } from "../../../db/tripLedgerDb";
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
import { QuickAddExpenseSheet } from "../../expenses/components/QuickAddExpenseSheet";
import { createExpense, getTripExpenses, updateExpense } from "../../expenses/services/expenseService";

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

function RecentExpensesSection({
  expenses,
  categories,
  onEditExpense,
}: {
  expenses: ExpenseRecord[];
  categories: CategoryRecord[];
  onEditExpense: (expense: ExpenseRecord) => void;
}) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const recentExpenses = expenses.slice(0, 4);
  const newestExpenseId = recentExpenses[0]?.id ?? null;

  function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function formatLoggedAt(loggedAt: string) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(loggedAt));
  }

  return (
    <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            Local-first logging
          </p>
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary">
            Recent Activity
          </h2>
        </div>
        <div className="rounded-full bg-secondary-container/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
          {expenses.length} total
        </div>
      </div>

      {recentExpenses.length === 0 ? (
        <div className="rounded-3xl bg-surface-container-low p-5 text-sm leading-6 text-on-surface/75">
          No expenses logged yet. Use Quick Add to capture the moment before it slips.
        </div>
      ) : (
        <div className="space-y-4">
          {recentExpenses.map((expense) => {
            const category = categoryMap.get(expense.categoryId);
            const isPending = expense.syncStatus === "pending";
            const isNewestPending = isPending && expense.id === newestExpenseId;
            const expenseTitle = expense.description || category?.name || "Expense";
            return (
              <div
                className={isNewestPending
                  ? "rounded-3xl border-l-4 border-secondary bg-surface-container-lowest p-5 shadow-sm"
                  : "rounded-3xl bg-surface-container-low p-5"
                }
                data-testid="recent-expense-card"
                key={expense.id}
              >
                <div className="flex items-start gap-4">
                  <div className={isNewestPending
                    ? "flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-container/10 text-secondary"
                    : "flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-lowest text-primary"
                  }>
                    <span className="material-symbols-outlined text-3xl">
                      {category?.icon ?? "payments"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-headline text-xl font-bold text-primary">
                          {expenseTitle}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-on-surface/70">
                          <span>{formatLoggedAt(expense.loggedAt)}</span>
                          <span className="h-1 w-1 rounded-full bg-outline-variant"></span>
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                              <span className="material-symbols-outlined animate-sync-pulse text-[12px]">sync</span>
                              Local Pending
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-on-surface/60">Synced</span>
                          )}
                          {expense.location ? (
                            <>
                              <span className="h-1 w-1 rounded-full bg-outline-variant"></span>
                              <span>{expense.location}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={isPending ? "font-headline text-lg font-bold text-secondary" : "font-headline text-lg font-bold text-primary"}>
                          {formatAmount(expense.amount, expense.currency)}
                        </p>
                        <p className="mt-1 text-xs font-medium text-on-surface/65">
                          Paid by {expense.paidBy || "You"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        aria-label={`Edit ${expenseTitle}`}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2 text-sm font-semibold text-primary transition hover:brightness-105"
                        onClick={() => onEditExpense(expense)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StartupRecoveryCard({ detail }: { detail: string }) {
  return (
    <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
      <div className="rounded-3xl bg-surface-container-low p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container/20 text-secondary">
            <span className="material-symbols-outlined text-2xl">database</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              Offline storage recovery
            </p>
            <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-primary">
              Local data needs a refresh
            </h1>
            <p className="mt-3 text-sm leading-6 text-on-surface/75">{detail}</p>
            <div className="mt-5 rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface/70">
              If a refresh does not fix it, clear site data for this TripLedger origin once and reopen the app.
            </div>
          </div>
        </div>
      </div>
      <button
        className="mt-6 min-h-14 w-full rounded-2xl bg-primary px-5 py-4 text-base font-bold text-on-primary shadow-ambient transition"
        onClick={() => window.location.reload()}
        type="button"
      >
        Refresh TripLedger
      </button>
    </section>
  );
}

function isSchemaMismatchError(error: unknown) {
  const candidate = error as {
    name?: string;
    message?: string;
    inner?: { name?: string; message?: string };
  };

  const messages = [candidate?.message, candidate?.inner?.message].filter(
    (value): value is string => typeof value === "string",
  );
  const names = [candidate?.name, candidate?.inner?.name].filter(
    (value): value is string => typeof value === "string",
  );

  return (
    names.includes("NotFoundError") &&
    messages.some((message) => message.toLowerCase().includes("object store was not found"))
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
    expenses,
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
    setExpenses,
    prependExpense,
    replaceExpense,
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
  const [isQuickAddOpen, setQuickAddOpen] = useState(false);
  const [isSavingExpense, setSavingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [expenseFeedback, setExpenseFeedback] = useState<string | null>(null);
  const [startupRecoveryMessage, setStartupRecoveryMessage] = useState<string | null>(null);

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
      try {
        setStartupRecoveryMessage(null);

        const status = await readPersistedSyncStatus();
        const trip = await getLatestActiveTrip();

        if (cancelled) {
          return;
        }

        setPersistedSyncStatus(status);
        setActiveTrip(trip);

        if (trip) {
          const [tripCategories, tripExpenses] = await Promise.all([
            getTripCategories(trip.id),
            getTripExpenses(trip.id),
          ]);
          if (!cancelled) {
            setCategories(tripCategories);
            setExpenses(tripExpenses);
          }
        } else if (!cancelled) {
          setExpenses([]);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isSchemaMismatchError(error)) {
          setStartupRecoveryMessage(
            "TripLedger found an older offline database shape on this device. Refresh once so the browser can reopen local storage with the latest schema.",
          );
        } else {
          setStartupRecoveryMessage(
            "TripLedger could not open local storage on this device. Refresh once and try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setHydrating(false);
        }
      }
    }

    void hydrateApp();

    return () => {
      cancelled = true;
    };
  }, [setActiveTrip, setCategories, setExpenses, setHydrating, setPersistedSyncStatus]);

  useEffect(() => {
    if (!expenseFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExpenseFeedback(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [expenseFeedback]);

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
      setExpenses([]);
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
        setExpenses([]);
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

  function closeExpenseSheet() {
    setQuickAddOpen(false);
    setEditingExpense(null);
  }

  async function handleExpenseSubmit(input: {
    categoryId: string;
    amount: string;
    description: string;
    location: string;
    paidBy: string;
  }) {
    if (!activeTrip) {
      return;
    }

    setSavingExpense(true);

    try {
      if (editingExpense) {
        const updatedExpense = await updateExpense({
          expenseId: editingExpense.id,
          categoryId: input.categoryId,
          amount: input.amount,
          description: input.description,
          location: input.location,
          paidBy: input.paidBy,
        });
        replaceExpense(updatedExpense);
        setExpenseFeedback("Expense updated locally");
      } else {
        const expense = await createExpense({
          tripId: activeTrip.id,
          categoryId: input.categoryId,
          amount: input.amount,
          currency: activeTrip.baseCurrency,
          description: input.description,
          location: input.location,
          paidBy: input.paidBy,
        });
        prependExpense(expense);
        setExpenseFeedback("Expense added locally");
      }

      closeExpenseSheet();
      setPersistedSyncStatus(await readPersistedSyncStatus());
    } finally {
      setSavingExpense(false);
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
    <>
      <main className="min-h-dvh bg-surface px-6 pb-24 pt-6 text-on-surface">
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

          {isHydrating ? null : startupRecoveryMessage ? (
            <StartupRecoveryCard detail={startupRecoveryMessage} />
          ) : activeTrip && screenMode === "summary" ? (
            <>
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
              <RecentExpensesSection
                categories={categories}
                expenses={expenses}
                onEditExpense={(expense) => {
                  setEditingExpense(expense);
                  setQuickAddOpen(true);
                }}
              />
            </>
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
            Version {appVersion}. Offline-first trip setup and expense logging write to Dexie before any sync path starts.
          </footer>
        </div>
      </main>

      {activeTrip && screenMode === "summary" && !startupRecoveryMessage ? (
        <button
          aria-label="Quick Add Expense"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container text-primary shadow-[0_12px_24px_rgba(254,165,32,0.3)] transition active:scale-95"
          onClick={() => {
            setEditingExpense(null);
            setQuickAddOpen(true);
          }}
          type="button"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      ) : null}

      {expenseFeedback ? (
        <div className="fixed bottom-24 left-1/2 z-[70] w-[90%] max-w-sm -translate-x-1/2">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#36b96a]/10 bg-[#7efba4] px-4 py-3 text-[#00210c] shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#36b96a]/20 text-[#005228]">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </div>
              <p className="font-headline text-sm font-bold">{expenseFeedback}</p>
            </div>
            <button onClick={() => setExpenseFeedback(null)} type="button">
              <span className="material-symbols-outlined text-[#005228]">close</span>
            </button>
          </div>
        </div>
      ) : null}

      <QuickAddExpenseSheet
        categories={categories}
        currency={activeTrip?.baseCurrency ?? "INR"}
        editingExpense={editingExpense}
        isOpen={isQuickAddOpen}
        isSaving={isSavingExpense}
        mode={editingExpense ? "edit" : "create"}
        onClose={closeExpenseSheet}
        onSubmit={handleExpenseSubmit}
      />
    </>
  );
}
