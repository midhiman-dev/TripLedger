import { create } from "zustand";

import {
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
} from "../lib/installPrompt";

type ShellStore = {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  updateReady: boolean;
  appVersion: string;
  deferredInstallPrompt: BeforeInstallPromptEvent | null;
  setOnlineStatus: (isOnline: boolean) => void;
  setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  markInstalled: () => void;
  setUpdateReady: (updateReady: boolean) => void;
};

export const useShellStore = create<ShellStore>((set) => ({
  isOnline:
    typeof navigator === "undefined" ? true : navigator.onLine,
  isInstalled: isStandaloneDisplay(),
  canInstall: false,
  updateReady: false,
  appVersion: __APP_VERSION__,
  deferredInstallPrompt: null,
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
}));
