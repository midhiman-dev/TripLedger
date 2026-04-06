import { formatTripCode } from "./tripCode";

export function validateJoinCode(rawCode: string) {
  const formatted = formatTripCode(rawCode);
  const normalized = formatted.replace("-", "");

  if (normalized.length !== 6) {
    return "Enter a 6-character trip code";
  }

  return undefined;
}
