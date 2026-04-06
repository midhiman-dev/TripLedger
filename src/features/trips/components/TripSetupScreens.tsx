import { useMemo, useState, type ReactNode } from "react";

import type { CategoryRecord, ExpenseRecord, TripRecord } from "../../../db/tripLedgerDb";
import { buildDashboardSummary } from "../../dashboard/lib/dashboardSummary";
import type { SyncStatusViewModel } from "../../foundation/lib/syncStatus";
import { buildTripShareText, formatTripCode } from "../lib/tripCode";
import {
  validateTripDraft,
  type TripDraft,
  type TripField,
  type TripFormErrors,
} from "../lib/tripDraft";

type CreateTripScreenProps = {
  draft: TripDraft;
  errors: TripFormErrors;
  touchedFields: Partial<Record<TripField, boolean>>;
  isSaving: boolean;
  saveError: string | null;
  onChange: (field: TripField, value: string) => void;
  onBlur: (field: TripField) => void;
  onSubmit: () => void;
  onOpenJoin: () => void;
  installAction: ReactNode;
  syncStatus: SyncStatusViewModel;
};

type JoinTripScreenProps = {
  joinCodeDraft: string;
  joinCodeError: string | null;
  joinFeedback: {
    tone: "queued" | "hydrated";
    title: string;
    detail: string;
  } | null;
  isJoining: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

type TripSummaryProps = {
  trip: TripRecord;
  categories: CategoryRecord[];
  expenses: ExpenseRecord[];
  categoryBudgetDrafts: Record<string, string>;
  categoryErrors: Record<string, string | undefined>;
  savingCategoryId: string | null;
  installAction: ReactNode;
  syncStatus: SyncStatusViewModel;
  onCategoryBudgetChange: (categoryId: string, value: string) => void;
  onCategoryBudgetBlur: (categoryId: string) => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-red-700">
      <span className="material-symbols-outlined text-base">error</span>
      <p>{message}</p>
    </div>
  );
}

function formatTripDates(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`;
}

function formatTripBudget(totalBudget: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(totalBudget);
}

function formatCompactTripBudget(totalBudget: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(totalBudget);
}

function FormField({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div className="group">
      <label className="mb-2 block font-headline text-sm font-bold text-primary transition-colors group-focus-within:text-secondary">
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function formatCategoryBudgetInput(value: string) {
  return value === "" ? "" : value;
}

export function CreateTripScreen({
  draft,
  errors,
  touchedFields,
  isSaving,
  saveError,
  onChange,
  onBlur,
  onSubmit,
  onOpenJoin,
  installAction,
  syncStatus,
}: CreateTripScreenProps) {
  const formErrors = validateTripDraft(draft);
  const isFormValid = Object.keys(formErrors).length === 0;

  return (
    <>
      <header className="rounded-3xl bg-surface-container-low px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-body text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">
              TripLedger
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
              The Journey Begins
            </h1>
          </div>
          <div className="rounded-full bg-[#7efba4]/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#005228] shadow-[0_0_18px_rgba(126,251,164,0.24)]">
            {syncStatus.label}
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl bg-hero-gradient p-6 text-on-primary shadow-ambient">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-white"></div>
            <div className="h-1.5 flex-1 rounded-full bg-white/25"></div>
            <div className="h-1.5 flex-1 rounded-full bg-white/25"></div>
          </div>
          <p className="font-headline text-3xl font-bold tracking-tight">
            Name the trip, lock the dates, and set the first budget before the road opens up.
          </p>
          <p className="max-w-sm text-sm leading-6 text-white/80">
            This saves locally first, so organisers can start planning even when signal drops.
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
        <div className="space-y-6">
          <FormField label="Trip Name" error={touchedFields.name ? errors.name : undefined}>
            <input
              aria-label="Trip Name"
              className={`w-full border-0 border-b-2 bg-transparent px-0 py-4 text-lg font-medium text-on-surface placeholder:text-outline focus:border-secondary focus:ring-0 ${
                touchedFields.name && errors.name ? "border-red-600" : "border-surface-container-highest"
              }`}
              onBlur={() => onBlur("name")}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="e.g. Manali Expedition 2026"
              type="text"
              value={draft.name}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-surface-container-low p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-outline">
                Primary Currency
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-headline text-xl font-bold text-primary">INR (Rs)</span>
                <span className="material-symbols-outlined text-outline">payments</span>
              </div>
            </div>
            <div className="rounded-3xl bg-surface-container-low p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-outline">
                Total Budget
              </p>
              <div className="flex items-center gap-3">
                <span className="font-headline text-xl font-bold text-primary">Rs</span>
                <input
                  aria-label="Total Budget"
                  className="w-full border-0 bg-transparent px-0 py-2 text-lg font-semibold text-on-surface placeholder:text-outline focus:ring-0"
                  inputMode="decimal"
                  onBlur={() => onBlur("totalBudget")}
                  onChange={(event) => onChange("totalBudget", event.target.value)}
                  placeholder="50000"
                  type="text"
                  value={draft.totalBudget}
                />
              </div>
              <FieldError message={touchedFields.totalBudget ? errors.totalBudget : undefined} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Start Date"
              error={touchedFields.startDate ? errors.startDate : undefined}
            >
              <input
                aria-label="Start Date"
                className={`w-full rounded-3xl bg-surface-container-low px-4 py-4 text-base font-medium text-on-surface focus:ring-2 focus:ring-secondary/30 ${
                  touchedFields.startDate && errors.startDate ? "text-red-700" : ""
                }`}
                onBlur={() => onBlur("startDate")}
                onChange={(event) => onChange("startDate", event.target.value)}
                type="date"
                value={draft.startDate}
              />
            </FormField>
            <FormField label="End Date" error={touchedFields.endDate ? errors.endDate : undefined}>
              <input
                aria-label="End Date"
                className={`w-full rounded-3xl bg-surface-container-low px-4 py-4 text-base font-medium text-on-surface focus:ring-2 focus:ring-secondary/30 ${
                  touchedFields.endDate && errors.endDate ? "text-red-700" : ""
                }`}
                onBlur={() => onBlur("endDate")}
                onChange={(event) => onChange("endDate", event.target.value)}
                type="date"
                value={draft.endDate}
              />
            </FormField>
          </div>

          {saveError ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {saveError}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
        <div className="space-y-3">
          <p className="text-sm leading-6 text-on-surface/75">
            The UI guide includes the validation state for trip setup, but it does not include the completed create-trip success screen for this story. This slice keeps the same spacing, tonal layering, labels, and fixed bottom action pattern while using the smallest safe one-screen flow.
          </p>
          {installAction}
        </div>
      </section>

      <div className="sticky bottom-0 z-40 -mx-6 mt-auto bg-white/75 px-6 pb-6 pt-4 backdrop-blur-2xl">
        <div className="grid gap-3">
          <button
            className="min-h-14 w-full rounded-2xl bg-primary px-5 py-4 text-base font-bold text-on-primary shadow-ambient transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            disabled={!isFormValid || isSaving}
            onClick={onSubmit}
            type="button"
          >
            {isSaving ? "Saving locally..." : "Create Trip"}
          </button>
          <button
            className="min-h-14 w-full rounded-2xl bg-secondary-container px-5 py-4 text-base font-bold text-on-secondary-container transition hover:brightness-105"
            onClick={onOpenJoin}
            type="button"
          >
            Enter Trip Code
          </button>
        </div>
        <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-outline">
          Step 1 of 1: Financial starting point
        </p>
      </div>
    </>
  );
}

export function JoinTripScreen({
  joinCodeDraft,
  joinCodeError,
  joinFeedback,
  isJoining,
  onCodeChange,
  onSubmit,
  onClose,
}: JoinTripScreenProps) {
  const formattedCode = formatTripCode(joinCodeDraft);
  const codeCells = formattedCode.replace("-", "").padEnd(6, "_").split("");

  return (
    <>
      <header className="rounded-3xl bg-surface-container-low px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <button className="text-slate-500 transition active:scale-95" onClick={onClose} type="button">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div>
              <p className="font-body text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">
                TripLedger
              </p>
              <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary">
                Join a Trip
              </h1>
            </div>
          </div>
          <div className="rounded-full bg-surface-container-lowest px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-outline ring-1 ring-outline/10">
            Offline Ready
          </div>
        </div>
      </header>

      <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
        <div className="space-y-6">
          <div>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary">
              Enter Invite Code
            </h2>
            <p className="mt-3 max-w-md text-base text-on-surface/70">
              Connect with your travel group even while deep in the mountains.
            </p>
          </div>

          <div className="rounded-3xl bg-surface-container-low p-5">
            <label className="mb-4 block text-xs font-bold uppercase tracking-[0.18em] text-outline">
              6-Character Code
            </label>
            <input
              aria-label="Trip Code"
              autoCapitalize="characters"
              className="mb-5 w-full rounded-2xl bg-surface-container-lowest px-4 py-4 text-lg font-semibold tracking-[0.3em] text-primary focus:ring-2 focus:ring-secondary/30"
              inputMode="text"
              maxLength={7}
              onChange={(event) => onCodeChange(event.target.value)}
              placeholder="ABC-123"
              type="text"
              value={formattedCode}
            />
            <div className="mb-4 flex items-center gap-2">
              {codeCells.slice(0, 3).map((character, index) => (
                <div className="flex-1 rounded-xl bg-surface-container-lowest py-4 text-center font-headline text-2xl font-bold text-primary" key={`left-${index}`}>
                  {character}
                </div>
              ))}
              <div className="mx-1 h-1 w-4 rounded-full bg-outline-variant"></div>
              {codeCells.slice(3).map((character, index) => (
                <div className="flex-1 rounded-xl bg-surface-container-lowest py-4 text-center font-headline text-2xl font-bold text-primary" key={`right-${index}`}>
                  {character}
                </div>
              ))}
            </div>
            <FieldError message={joinCodeError ?? undefined} />

            {joinFeedback ? (
              <div className="mt-5 flex items-center gap-4 rounded-2xl bg-[#e1e0ff]/40 p-5 text-primary">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-white">
                  <span className="material-symbols-outlined">
                    {joinFeedback.tone === "hydrated" ? "cloud_done" : "schedule"}
                  </span>
                </div>
                <div>
                  <p className="font-headline font-bold leading-tight">{joinFeedback.title}</p>
                  <p className="mt-1 text-sm text-on-surface/70">{joinFeedback.detail}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-surface-container-low p-5">
              <span className="material-symbols-outlined mb-3 text-secondary">travel_explore</span>
              <h3 className="font-headline text-lg font-bold text-primary">Smart Syncing</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface/70">
                TripLedger caches your request. As soon as signal returns, the join can complete safely.
              </p>
            </div>
            <div className="rounded-3xl bg-surface-container-low p-5">
              <span className="material-symbols-outlined mb-3 text-primary">group</span>
              <h3 className="font-headline text-lg font-bold text-primary">First Sync Snapshot</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface/70">
                When a matching snapshot is available, the device starts with the full trip context instead of an empty shell.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-40 -mx-6 mt-auto bg-white/75 px-6 pb-6 pt-4 backdrop-blur-2xl">
        <button
          className="min-h-14 w-full rounded-2xl bg-primary px-5 py-4 text-base font-bold text-on-primary shadow-ambient transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          disabled={isJoining}
          onClick={onSubmit}
          type="button"
        >
          {isJoining ? "Queueing Join..." : "Join with Code"}
        </button>
        <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-outline">
          Code entry tracked locally first
        </p>
      </div>
    </>
  );
}

export function TripSummaryScreen({
  trip,
  categories,
  expenses,
  categoryBudgetDrafts,
  categoryErrors,
  savingCategoryId,
  installAction,
  syncStatus,
  onCategoryBudgetChange,
  onCategoryBudgetBlur,
}: TripSummaryProps) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const dashboardSummary = useMemo(
    () => buildDashboardSummary(trip, categories, expenses),
    [trip, categories, expenses],
  );
  const progressToneClasses = {
    healthy: "bg-[#7efba4]/20 text-[#005228]",
    watch: "bg-secondary-container/20 text-secondary",
    critical: "bg-red-100 text-red-700",
  };
  const progressBarClasses = {
    healthy: "bg-[#61de8a]",
    watch: "bg-secondary-container",
    critical: "bg-red-500",
  };

  async function handleShareCode() {
    const shareText = buildTripShareText(trip.name, trip.tripCode);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${trip.name} invite`,
          text: shareText,
        });
        setShareFeedback("Invite ready to send.");
        return;
      } catch {
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      setShareFeedback("Invite copied. Paste it into WhatsApp or any other app.");
      return;
    }

    setShareFeedback("Copy is not available on this browser.");
  }

  return (
    <>
      <header className="rounded-3xl bg-surface-container-low px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-body text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">
              Active Trip
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
              {trip.name}
            </h1>
          </div>
          <div className="rounded-full bg-secondary-container/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
            {syncStatus.label}
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl bg-hero-gradient p-6 text-on-primary shadow-ambient">
        <div className="relative space-y-6">
          <div className="absolute right-[-3rem] top-[-4rem] h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div aria-label="Total spent">
              <p className="font-body text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Total Trip Spent
              </p>
              <p className="mt-3 font-headline text-5xl font-extrabold tracking-tight">
                {formatCompactTripBudget(dashboardSummary.totalSpent, trip.baseCurrency)}
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                progressToneClasses[dashboardSummary.healthTone]
              }`}
            >
              {dashboardSummary.healthLabel}
            </div>
          </div>
          <div className="relative z-10 grid gap-4 sm:grid-cols-2">
            <div aria-label="Total budget" className="rounded-3xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                Total Budget
              </p>
              <p className="mt-2 font-headline text-2xl font-bold">
                {formatTripBudget(dashboardSummary.totalBudget, trip.baseCurrency)}
              </p>
            </div>
            <div aria-label="Remaining amount" className="rounded-3xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                Remaining
              </p>
              <p className="mt-2 font-headline text-2xl font-bold">
                {formatTripBudget(Math.abs(dashboardSummary.remainingAmount), trip.baseCurrency)}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                {dashboardSummary.remainingAmount >= 0 ? "Still available" : "Over budget"}
              </p>
            </div>
          </div>
          <div
            aria-label="Overall trip progress"
            className="relative z-10 rounded-3xl bg-white/10 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                  Overall Trip Progress
                </p>
                <p className="mt-2 font-headline text-2xl font-bold">
                  {dashboardSummary.progressPercent}%
                </p>
              </div>
              <p className="max-w-[11rem] text-right text-sm leading-6 text-white/80">
                {dashboardSummary.budgetedCategoryCount} of {dashboardSummary.totalCategoryCount} category budgets set
              </p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className={`h-full rounded-full ${progressBarClasses[dashboardSummary.healthTone]}`}
                style={{ width: `${dashboardSummary.progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              Shareable invite
            </p>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary">
              Trip Code
            </h2>
          </div>
          <div className="rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            6 characters
          </div>
        </div>

        <div className="space-y-4 rounded-3xl bg-surface-container-low p-5">
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest px-4 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Invite Code</p>
              <p className="font-headline text-3xl font-extrabold tracking-[0.12em] text-primary">
                {trip.tripCode}
              </p>
            </div>
            <span className="material-symbols-outlined text-3xl text-secondary">qr_code_scanner</span>
          </div>
          <p className="text-sm leading-6 text-on-surface/75">
            Share this short code through WhatsApp or any other app. People can use it later to join without email or passwords.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="min-h-14 rounded-2xl bg-secondary-container px-5 py-4 text-base font-semibold text-on-secondary-container transition hover:brightness-105"
              onClick={handleShareCode}
              type="button"
            >
              Share Code
            </button>
            <button
              className="min-h-14 rounded-2xl bg-surface-container-high px-5 py-4 text-base font-semibold text-primary transition hover:brightness-105"
              onClick={handleShareCode}
              type="button"
            >
              Copy Invite
            </button>
          </div>
          {shareFeedback ? (
            <div className="rounded-2xl bg-[#e1e0ff]/40 px-4 py-3 text-sm font-medium text-primary">
              {shareFeedback}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
        <div className="grid gap-4">
          <div className="rounded-3xl bg-surface-container-low p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-outline">Trip Duration</p>
            <p className="font-headline text-2xl font-bold text-primary">
              {formatTripDates(trip.startDate, trip.endDate)}
            </p>
          </div>
          <div className="rounded-3xl bg-surface-container-low p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-outline">Total Budget</p>
            <p className="font-headline text-2xl font-bold text-primary">
              {formatTripBudget(trip.totalBudget, trip.baseCurrency)}
            </p>
          </div>
          <div className="rounded-3xl bg-surface-container-low p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-outline">Sync Status</p>
            <p className="text-sm leading-6 text-on-surface/80">{syncStatus.detail}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              Spending expectations
            </p>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary">
              Default Categories
            </h2>
          </div>
          <div className="rounded-full bg-secondary-container/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
            {categories.length} seeded
          </div>
        </div>

        <div className="space-y-4">
          {categories.map((category) => {
            const hasError = Boolean(categoryErrors[category.id]);
            return (
              <div className="rounded-3xl bg-surface-container-low p-5" key={category.id}>
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-lowest"
                    style={{ color: category.color }}
                  >
                    <span className="material-symbols-outlined text-3xl">{category.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-headline text-xl font-bold text-primary">{category.name}</h3>
                        <p className="mt-1 text-sm text-on-surface/70">
                          Set the category budget now and adjust it later as the trip plan changes.
                        </p>
                      </div>
                      {savingCategoryId === category.id ? (
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                          Saving
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 py-3">
                      <span className="font-headline text-lg font-bold text-primary">Rs</span>
                      <input
                        aria-label={`${category.name} Budget`}
                        className={`w-full border-0 bg-transparent px-0 py-1 text-lg font-semibold text-on-surface placeholder:text-outline focus:ring-0 ${
                          hasError ? "text-red-700" : ""
                        }`}
                        inputMode="decimal"
                        onBlur={() => onCategoryBudgetBlur(category.id)}
                        onChange={(event) => onCategoryBudgetChange(category.id, event.target.value)}
                        placeholder="0"
                        type="text"
                        value={formatCategoryBudgetInput(categoryBudgetDrafts[category.id] ?? "")}
                      />
                    </div>
                    <FieldError message={categoryErrors[category.id]} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
        {installAction}
      </section>
    </>
  );
}
