export type TripDraft = {
  name: string;
  startDate: string;
  endDate: string;
  totalBudget: string;
};

export type TripField = keyof TripDraft;

export type TripFormErrors = Partial<Record<TripField, string>>;

export const emptyTripDraft: TripDraft = {
  name: "",
  startDate: "",
  endDate: "",
  totalBudget: "",
};

function parseBudget(rawBudget: string) {
  const normalized = rawBudget.trim();
  if (!normalized) {
    return Number.NaN;
  }

  return Number.parseFloat(normalized);
}

export function validateTripDraft(draft: TripDraft): TripFormErrors {
  const errors: TripFormErrors = {};

  if (!draft.name.trim()) {
    errors.name = "Trip name is required";
  }

  if (!draft.startDate) {
    errors.startDate = "Start date is required";
  }

  if (!draft.endDate) {
    errors.endDate = "End date is required";
  }

  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    errors.endDate = "End date must be on or after the start date";
  }

  const budget = parseBudget(draft.totalBudget);
  if (!draft.totalBudget.trim()) {
    errors.totalBudget = "Total budget is required";
  } else if (!Number.isFinite(budget) || budget <= 0) {
    errors.totalBudget = "Total budget must be greater than zero";
  }

  return errors;
}

export function parseTripBudget(rawBudget: string) {
  const budget = parseBudget(rawBudget);
  return Number.isFinite(budget) ? Math.round(budget * 100) / 100 : budget;
}
