const tripCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function formatTripCode(code: string) {
  const normalized = code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (normalized.length <= 3) {
    return normalized;
  }

  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}`;
}

export function createTripCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const rawCode = Array.from(bytes, (value) => tripCodeAlphabet[value % tripCodeAlphabet.length]).join("");

  return formatTripCode(rawCode);
}

export function buildTripShareText(tripName: string, tripCode: string) {
  return `Join my TripLedger trip "${tripName}" with code ${tripCode}.`;
}
