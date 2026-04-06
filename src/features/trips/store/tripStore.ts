import { create } from "zustand";

import type { CategoryRecord, ExpenseRecord, TripRecord } from "../../../db/tripLedgerDb";
import {
  emptyTripDraft,
  type TripDraft,
  type TripField,
  type TripFormErrors,
} from "../lib/tripDraft";

type JoinFeedback = {
  tone: "queued" | "hydrated";
  title: string;
  detail: string;
};

type ScreenMode = "create" | "join" | "summary";

type TripStore = {
  screenMode: ScreenMode;
  activeTrip: TripRecord | null;
  categories: CategoryRecord[];
  expenses: ExpenseRecord[];
  categoryBudgetDrafts: Record<string, string>;
  categoryErrors: Record<string, string | undefined>;
  savingCategoryId: string | null;
  joinCodeDraft: string;
  joinCodeError: string | null;
  joinFeedback: JoinFeedback | null;
  isJoining: boolean;
  draft: TripDraft;
  errors: TripFormErrors;
  touchedFields: Partial<Record<TripField, boolean>>;
  isHydrating: boolean;
  isSaving: boolean;
  saveError: string | null;
  setScreenMode: (screenMode: ScreenMode) => void;
  setDraftField: (field: TripField, value: string) => void;
  setErrors: (errors: TripFormErrors) => void;
  touchField: (field: TripField) => void;
  setActiveTrip: (trip: TripRecord | null) => void;
  setCategories: (categories: CategoryRecord[]) => void;
  setExpenses: (expenses: ExpenseRecord[]) => void;
  prependExpense: (expense: ExpenseRecord) => void;
  replaceExpense: (expense: ExpenseRecord) => void;
  removeExpense: (expenseId: string) => void;
  setCategoryBudgetDraft: (categoryId: string, value: string) => void;
  setCategoryError: (categoryId: string, message?: string) => void;
  setSavingCategoryId: (categoryId: string | null) => void;
  updateCategory: (category: CategoryRecord) => void;
  setJoinCodeDraft: (joinCodeDraft: string) => void;
  setJoinCodeError: (joinCodeError: string | null) => void;
  setJoinFeedback: (joinFeedback: JoinFeedback | null) => void;
  setJoining: (isJoining: boolean) => void;
  setHydrating: (isHydrating: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setSaveError: (saveError: string | null) => void;
  resetDraft: () => void;
  resetState: () => void;
};

const defaultState = {
  screenMode: "create" as ScreenMode,
  activeTrip: null,
  categories: [],
  expenses: [],
  categoryBudgetDrafts: {},
  categoryErrors: {},
  savingCategoryId: null,
  joinCodeDraft: "",
  joinCodeError: null,
  joinFeedback: null,
  isJoining: false,
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

function sortExpensesByLoggedAt(expenses: ExpenseRecord[]) {
  return [...expenses].sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));
}

export const useTripStore = create<TripStore>((set) => ({
  ...defaultState,
  setScreenMode: (screenMode) => set({ screenMode }),
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
  setActiveTrip: (activeTrip) =>
    set((state) => ({
      activeTrip,
      screenMode: activeTrip ? "summary" : state.screenMode === "summary" ? "create" : state.screenMode,
    })),
  setCategories: (categories) =>
    set({
      categories,
      categoryBudgetDrafts: toBudgetDrafts(categories),
      categoryErrors: {},
      savingCategoryId: null,
    }),
  setExpenses: (expenses) => set({ expenses }),
  prependExpense: (expense) =>
    set((state) => ({
      expenses: sortExpensesByLoggedAt([
        expense,
        ...state.expenses.filter((item) => item.id !== expense.id),
      ]),
    })),
  replaceExpense: (expense) =>
    set((state) => ({
      expenses: sortExpensesByLoggedAt(
        state.expenses.some((item) => item.id === expense.id)
          ? state.expenses.map((item) => (item.id === expense.id ? expense : item))
          : [expense, ...state.expenses],
      ),
    })),
  removeExpense: (expenseId) =>
    set((state) => ({
      expenses: state.expenses.filter((item) => item.id !== expenseId),
    })),
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
  setJoinCodeDraft: (joinCodeDraft) => set({ joinCodeDraft }),
  setJoinCodeError: (joinCodeError) => set({ joinCodeError }),
  setJoinFeedback: (joinFeedback) => set({ joinFeedback }),
  setJoining: (isJoining) => set({ isJoining }),
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
