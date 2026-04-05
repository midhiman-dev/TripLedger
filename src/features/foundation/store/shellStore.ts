import { create } from "zustand";

import {
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
} from "../lib/installPrompt";
import {
  defaultPersistedSyncStatus,
  type PersistedSyncStatus,
} from "../lib/syncStatus";

type ShellStore = {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  updateReady: boolean;
  appVersion: string;
  deferredInstallPrompt: BeforeInstallPromptEvent | null;
  persistedSyncStatus: PersistedSyncStatus;
  setOnlineStatus: (isOnline: boolean) => void;
  setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  markInstalled: () => void;
  setUpdateReady: (updateReady: boolean) => void;
  setPersistedSyncStatus: (persistedSyncStatus: PersistedSyncStatus) => void;
};

export const useShellStore = create<ShellStore>((set) => ({
  isOnline:
    typeof navigator === "undefined" ? true : navigator.onLine,
  isInstalled: isStandaloneDisplay(),
  canInstall: false,
  updateReady: false,
  appVersion: __APP_VERSION__,
  deferredInstallPrompt: null,
  persistedSyncStatus: defaultPersistedSyncStatus,
  setOnlineStatus: (isOnline) => set({ isOnline }),
  setInstallPrompt: (deferredInstallPrompt) =>
    set({
      deferredInstallPrompt,
      canInstall: deferredInstallPrompt !== null,
    }),
  markInstalled: () =>
    set({
      isInstalled: true,
      canInstall: false,
      deferredInstallPrompt: null,
    }),
  setUpdateReady: (updateReady) => set({ updateReady }),
  setPersistedSyncStatus: (persistedSyncStatus) => set({ persistedSyncStatus }),
}));
