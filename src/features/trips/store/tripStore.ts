import { create } from "zustand";

import type { CategoryRecord, TripRecord } from "../../../db/tripLedgerDb";
import {
  emptyTripDraft,
  type TripDraft,
  type TripField,
  type TripFormErrors,
} from "../lib/tripDraft";

type TripStore = {
  activeTrip: TripRecord | null;
  categories: CategoryRecord[];
  categoryBudgetDrafts: Record<string, string>;
  categoryErrors: Record<string, string | undefined>;
  savingCategoryId: string | null;
  draft: TripDraft;
  errors: TripFormErrors;
  touchedFields: Partial<Record<TripField, boolean>>;
  isHydrating: boolean;
  isSaving: boolean;
  saveError: string | null;
  setDraftField: (field: TripField, value: string) => void;
  setErrors: (errors: TripFormErrors) => void;
  touchField: (field: TripField) => void;
  setActiveTrip: (trip: TripRecord | null) => void;
  setCategories: (categories: CategoryRecord[]) => void;
  setCategoryBudgetDraft: (categoryId: string, value: string) => void;
  setCategoryError: (categoryId: string, message?: string) => void;
  setSavingCategoryId: (categoryId: string | null) => void;
  updateCategory: (category: CategoryRecord) => void;
  setHydrating: (isHydrating: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setSaveError: (saveError: string | null) => void;
  resetDraft: () => void;
  resetState: () => void;
};

const defaultState = {
  activeTrip: null,
  categories: [],
  categoryBudgetDrafts: {},
  categoryErrors: {},
  savingCategoryId: null,
  draft: emptyTripDraft,
  errors: {},
  touchedFields: {},
  isHydrating: true,
  isSaving: false,
  saveError: null,
};

function toBudgetDrafts(categories: CategoryRecord[]) {
  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      category.budgetAmount === 0 ? "" : String(category.budgetAmount),
    ]),
  );
}

export const useTripStore = create<TripStore>((set) => ({
  ...defaultState,
  setDraftField: (field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        [field]: value,
      },
    })),
  setErrors: (errors) => set({ errors }),
  touchField: (field) =>
    set((state) => ({
      touchedFields: {
        ...state.touchedFields,
        [field]: true,
      },
    })),
  setActiveTrip: (activeTrip) => set({ activeTrip }),
  setCategories: (categories) =>
    set({
      categories,
      categoryBudgetDrafts: toBudgetDrafts(categories),
      categoryErrors: {},
      savingCategoryId: null,
    }),
  setCategoryBudgetDraft: (categoryId, value) =>
    set((state) => ({
      categoryBudgetDrafts: {
        ...state.categoryBudgetDrafts,
        [categoryId]: value,
      },
    })),
  setCategoryError: (categoryId, message) =>
    set((state) => ({
      categoryErrors: {
        ...state.categoryErrors,
        [categoryId]: message,
      },
    })),
  setSavingCategoryId: (savingCategoryId) => set({ savingCategoryId }),
  updateCategory: (category) =>
    set((state) => ({
      categories: state.categories.map((item) => (item.id === category.id ? category : item)),
      categoryBudgetDrafts: {
        ...state.categoryBudgetDrafts,
        [category.id]: category.budgetAmount === 0 ? "" : String(category.budgetAmount),
      },
      categoryErrors: {
        ...state.categoryErrors,
        [category.id]: undefined,
      },
      savingCategoryId: null,
    })),
  setHydrating: (isHydrating) => set({ isHydrating }),
  setSaving: (isSaving) => set({ isSaving }),
  setSaveError: (saveError) => set({ saveError }),
  resetDraft: () =>
    set({
      draft: emptyTripDraft,
      errors: {},
      touchedFields: {},
      isSaving: false,
      saveError: null,
    }),
  resetState: () => set(defaultState),
}));
