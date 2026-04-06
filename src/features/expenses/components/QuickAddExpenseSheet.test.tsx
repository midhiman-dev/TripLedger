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
});
