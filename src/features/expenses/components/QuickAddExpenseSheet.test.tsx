import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuickAddExpenseSheet } from "./QuickAddExpenseSheet";

const categories = [
  {
    id: "cat-fuel",
    tripId: "trip-1",
    name: "Fuel",
    budgetAmount: 0,
    icon: "local_gas_station",
    color: "#865300",
    createdAt: "2026-04-06T09:00:00.000Z",
    updatedAt: "2026-04-06T09:00:00.000Z",
    createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
    syncStatus: "pending" as const,
    isDeleted: false,
  },
];

describe("QuickAddExpenseSheet", () => {
  it("keeps optional fields behind the more-details affordance by default", () => {
    render(
      <QuickAddExpenseSheet
        categories={categories}
        currency="INR"
        isOpen
        isSaving={false}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const toggle = screen.getByRole("button", { name: /more details/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/expense note/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/expense location/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/paid by/i)).not.toBeInTheDocument();
  });

  it("reveals and submits optional note, location, and paid-by fields when expanded", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <QuickAddExpenseSheet
        categories={categories}
        currency="INR"
        isOpen
        isSaving={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: /more details/i }));

    expect(screen.getByRole("button", { name: /more details/i })).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: /fuel/i }));
    await user.type(screen.getByLabelText(/expense amount/i), "1250");
    await user.type(screen.getByLabelText(/expense note/i), "Dhaba stop");
    await user.type(screen.getByLabelText(/expense location/i), "NH-44");
    await user.type(screen.getByLabelText(/paid by/i), "Riya");
    await user.click(screen.getByRole("button", { name: /^Add Expense$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      categoryId: "cat-fuel",
      amount: "1250",
      description: "Dhaba stop",
      location: "NH-44",
      paidBy: "Riya",
    });
  });

  it("prefills an existing expense in edit mode and saves changes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <QuickAddExpenseSheet
        categories={categories}
        currency="INR"
        editingExpense={{
          id: "expense-1",
          tripId: "trip-1",
          categoryId: "cat-fuel",
          amount: 450,
          currency: "INR",
          description: "Dinner stop",
          location: "Manali",
          paidBy: "Riya",
          loggedAt: "2026-04-06T10:12:00.000Z",
          deviceId: "device-local",
          createdAt: "2026-04-06T10:12:00.000Z",
          updatedAt: "2026-04-06T10:12:00.000Z",
          createdAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
          updatedAtHlc: { wallClock: 1, logical: 0, nodeId: "device-local" },
          syncStatus: "pending",
          conflictData: null,
          isDeleted: false,
        }}
        isOpen
        isSaving={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("heading", { name: /edit expense/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("450")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /more details/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByDisplayValue("Dinner stop")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Manali")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Riya")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/expense amount/i));
    await user.type(screen.getByLabelText(/expense amount/i), "520");
    await user.clear(screen.getByLabelText(/expense note/i));
    await user.type(screen.getByLabelText(/expense note/i), "Dinner corrected");
    await user.click(screen.getByRole("button", { name: /^Save Changes$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      categoryId: "cat-fuel",
      amount: "520",
      description: "Dinner corrected",
      location: "Manali",
      paidBy: "Riya",
    });
  });
});
