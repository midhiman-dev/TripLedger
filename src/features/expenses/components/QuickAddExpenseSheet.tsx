import { useEffect, useMemo, useState } from "react";

import type { CategoryRecord } from "../../../db/tripLedgerDb";

type QuickAddExpenseSheetProps = {
  categories: CategoryRecord[];
  currency: string;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: {
    categoryId: string;
    amount: string;
    description: string;
    location: string;
    paidBy: string;
  }) => Promise<void>;
};

function formatCurrencyPrefix(currency: string) {
  return currency === "INR" ? "Rs" : currency;
}

export function QuickAddExpenseSheet({
  categories,
  currency,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: QuickAddExpenseSheetProps) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showAmountError, setShowAmountError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCategoryId("");
      setAmount("");
      setDescription("");
      setLocation("");
      setPaidBy("");
      setShowMoreDetails(false);
      setShowAmountError(false);
    }
  }, [isOpen]);

  const parsedAmount = useMemo(() => Number.parseFloat(amount.replace(/,/g, "")), [amount]);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSubmit = Boolean(categoryId) && amountValid && !isSaving;
  const currencyPrefix = formatCurrencyPrefix(currency);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit() {
    setShowAmountError(true);
    if (!canSubmit) {
      return;
    }

    await onSubmit({
      categoryId,
      amount,
      description,
      location,
      paidBy,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-primary/30 backdrop-blur-sm">
      <button
        aria-label="Close quick add"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-surface-container-lowest px-6 pb-12 pt-4 shadow-[0_-12px_48px_rgba(26,28,84,0.15)]">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-surface-variant"></div>
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Quick Add</p>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary">
              Quick Add Expense
            </h2>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition hover:brightness-105"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-8">
          <div className="rounded-3xl bg-surface-container-low px-6 py-5 text-center">
            <p className="text-sm font-medium text-on-surface/70">Enter Amount</p>
            <div className="mt-2 flex items-baseline justify-center gap-3">
              <span className="font-headline text-2xl font-bold text-primary/60">{currencyPrefix}</span>
              <input
                aria-label="Expense amount"
                className="w-full border-0 bg-transparent p-0 text-center font-headline text-5xl font-extrabold text-primary focus:ring-0"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                type="text"
                value={amount}
              />
            </div>
            {showAmountError && !amountValid ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-red-700">
                <span className="material-symbols-outlined text-base">error</span>
                <span>Enter an amount greater than {currencyPrefix}0</span>
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Category</p>
              {!categoryId ? (
                <span className="text-xs font-semibold text-on-surface/60">Tap one to continue</span>
              ) : null}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {categories.map((category) => {
                const selected = category.id === categoryId;
                return (
                  <button
                    className={`flex min-w-[96px] items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition ${
                      selected
                        ? "bg-primary text-on-primary shadow-ambient"
                        : "bg-surface-container-low text-on-surface-variant"
                    }`}
                    key={category.id}
                    onClick={() => setCategoryId(category.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">{category.icon}</span>
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-surface-container-low p-5">
            <button
              className="flex w-full items-center justify-between gap-4 text-left"
              onClick={() => setShowMoreDetails((current) => !current)}
              type="button"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Optional</p>
                <h3 className="mt-1 font-headline text-xl font-bold text-primary">More details</h3>
              </div>
              <span className="material-symbols-outlined text-primary">
                {showMoreDetails ? "expand_less" : "expand_more"}
              </span>
            </button>

            {showMoreDetails ? (
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-on-surface/70">Note</span>
                  <input
                    aria-label="Expense note"
                    className="w-full rounded-2xl border-0 bg-surface-container-highest px-4 py-4 text-base text-on-surface focus:ring-2 focus:ring-primary/15"
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What was this for?"
                    type="text"
                    value={description}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-on-surface/70">Location</span>
                  <input
                    aria-label="Expense location"
                    className="w-full rounded-2xl border-0 bg-surface-container-highest px-4 py-4 text-base text-on-surface focus:ring-2 focus:ring-primary/15"
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Where did this happen?"
                    type="text"
                    value={location}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-on-surface/70">Paid By</span>
                  <input
                    aria-label="Paid by"
                    className="w-full rounded-2xl border-0 bg-surface-container-highest px-4 py-4 text-base text-on-surface focus:ring-2 focus:ring-primary/15"
                    onChange={(event) => setPaidBy(event.target.value)}
                    placeholder="Who paid?"
                    type="text"
                    value={paidBy}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <button
            className="min-h-14 w-full rounded-2xl bg-primary px-5 py-4 text-base font-bold text-on-primary shadow-ambient transition disabled:cursor-not-allowed disabled:bg-surface-variant disabled:text-outline"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isSaving ? "Saving locally..." : "Add Expense"}
          </button>
        </div>
      </section>
    </div>
  );
}


