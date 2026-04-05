export function registerSW(...args: unknown[]) {
  const mock = (globalThis as { __registerSWMock__?: (...callArgs: unknown[]) => unknown }).__registerSWMock__;

  if (mock) {
    return mock(...args);
  }

  return undefined;
}
