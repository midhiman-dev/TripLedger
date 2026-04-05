import { registerSW } from "virtual:pwa-register";

import { useShellStore } from "../foundation/store/shellStore";

let alreadyRegistered = false;

export function registerTripLedgerServiceWorker() {
  if (alreadyRegistered || typeof window === "undefined") {
    return;
  }

  alreadyRegistered = true;

  const setUpdateReady = useShellStore.getState().setUpdateReady;

  registerSW({
    immediate: true,
    onNeedRefresh() {
      setUpdateReady(true);
    },
    onOfflineReady() {
      setUpdateReady(false);
    },
  });
}

export function __resetServiceWorkerRegistrationForTests() {
  alreadyRegistered = false;
}
