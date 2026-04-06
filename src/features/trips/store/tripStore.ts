import { create } from "zustand";

import type { TripRecord } from "../../../db/tripLedgerDb";
import {
  emptyTripDraft,
  type TripDraft,
  type TripField,
  type TripFormErrors,
} from "../lib/tripDraft";

type TripStore = {
  activeTrip: TripRecord | null;
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
  setHydrating: (isHydrating: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setSaveError: (saveError: string | null) => void;
  resetDraft: () => void;
  resetState: () => void;
};

const defaultState = {
  activeTrip: null,
  draft: emptyTripDraft,
  errors: {},
  touchedFields: {},
  isHydrating: true,
  isSaving: false,
  saveError: null,
};

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
