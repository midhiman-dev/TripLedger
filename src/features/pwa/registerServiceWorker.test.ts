import { beforeEach, expect, it, vi } from "vitest";

const registerSWMock = vi.fn();

describe("registerTripLedgerServiceWorker", () => {
  beforeEach(async () => {
    vi.resetModules();
    registerSWMock.mockReset();
    vi.stubGlobal("__registerSWMock__", registerSWMock);
  });

  it("registers once with update callbacks", async () => {
    const module = await import("./registerServiceWorker");

    module.registerTripLedgerServiceWorker();
    module.registerTripLedgerServiceWorker();

    expect(registerSWMock).toHaveBeenCalledTimes(1);
    expect(registerSWMock).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onNeedRefresh: expect.any(Function),
        onOfflineReady: expect.any(Function),
      }),
    );
  });
});
