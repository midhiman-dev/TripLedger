import type { ManifestOptions } from "vite-plugin-pwa";

export const tripLedgerManifest: Partial<ManifestOptions> = {
  id: "/",
  name: "TripLedger",
  short_name: "TripLedger",
  description:
    "Offline-first group trip budgeting for Indian road-trip travellers.",
  theme_color: "#1a1c54",
  background_color: "#f4fafd",
  display: "standalone",
  orientation: "portrait",
  start_url: "/",
  scope: "/",
  icons: [
    {
      src: "/icons/icon-192.svg",
      sizes: "192x192",
      type: "image/svg+xml",
      purpose: "any",
    },
    {
      src: "/icons/icon-512.svg",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any",
    },
    {
      src: "/icons/icon-maskable.svg",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "maskable",
    },
  ],
};
