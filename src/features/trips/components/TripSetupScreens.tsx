import type { ReactNode } from "react";

import type { TripRecord } from "../../../db/tripLedgerDb";
import type { SyncStatusViewModel } from "../../foundation/lib/syncStatus";
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
  installAction: ReactNode;
  syncStatus: SyncStatusViewModel;
};

type TripSummaryProps = {
  trip: TripRecord;
  installAction: ReactNode;
  syncStatus: SyncStatusViewModel;
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

export function CreateTripScreen({
  draft,
  errors,
  touchedFields,
  isSaving,
  saveError,
  onChange,
  onBlur,
  onSubmit,
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
        <button
          className="min-h-14 w-full rounded-2xl bg-primary px-5 py-4 text-base font-bold text-on-primary shadow-ambient transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          disabled={!isFormValid || isSaving}
          onClick={onSubmit}
          type="button"
        >
          {isSaving ? "Saving locally..." : "Create Trip"}
        </button>
        <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-outline">
          Step 1 of 1: Financial starting point
        </p>
      </div>
    </>
  );
}

export function TripSummaryScreen({ trip, installAction, syncStatus }: TripSummaryProps) {
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
        <div className="space-y-3">
          <p className="font-body text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Saved on this device
          </p>
          <p className="font-headline text-3xl font-bold tracking-tight">
            The group now has a starting budget before the first expense is logged.
          </p>
          <p className="max-w-sm text-sm leading-6 text-white/80">
            Local writes land first and sync can catch up later without blocking trip setup.
          </p>
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
        {installAction}
      </section>
    </>
  );
}
