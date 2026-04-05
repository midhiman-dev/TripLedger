import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";

import { AppShell } from "./AppShell";
import { useShellStore } from "../store/shellStore";

describe("AppShell", () => {
  beforeEach(() => {
    useShellStore.setState({
      isOnline: true,
      isInstalled: false,
      canInstall: false,
      updateReady: false,
      appVersion: "0.1.0",
      deferredInstallPrompt: null,
    });
  });

  it("renders the install-focused shell state", () => {
    render(<AppShell />);

    expect(
      screen.getByRole("heading", { name: /install once\./i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/home-screen ready/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /use browser menu to install/i }),
    ).toBeDisabled();
  });

  it("shows the offline banner when connectivity drops", () => {
    render(<AppShell />);

    fireEvent(window, new Event("offline"));

    expect(
      screen.getByText(/you are offline\. tripledger will keep the shell ready/i),
    ).toBeInTheDocument();
  });
});
