import { tripLedgerManifest } from "./manifest";

describe("tripLedgerManifest", () => {
  it("configures standalone home-screen installability", () => {
    expect(tripLedgerManifest.display).toBe("standalone");
    expect(tripLedgerManifest.start_url).toBe("/");
    expect(tripLedgerManifest.theme_color).toBe("#1a1c54");
    expect(tripLedgerManifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ purpose: "maskable" }),
      ]),
    );
  });
});
