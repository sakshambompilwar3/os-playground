import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";

async function renderSimulator() {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: ["/cpu-scheduling/simulator"] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

describe("CPU Scheduling Simulator UI", () => {
  it("renders controls, process table, and chalkboard prompt without crashing", async () => {
    await renderSimulator();
    expect(screen.getByRole("heading", { name: /CPU Scheduling simulator/i })).toBeInTheDocument();
    expect(screen.getByText(/press play to begin/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Number of processes")).toHaveValue(4);
    expect(screen.getByLabelText("Context switch time")).toHaveValue(0);
    expect(screen.getByRole("link", { name: /back to CPU Scheduling/i })).toHaveAttribute(
      "href",
      "/cpu-scheduling",
    );
  });

  it("resizes process count, handles empty inputs without NaN, and clamps on blur", async () => {
    await renderSimulator();
    const countInput = screen.getByLabelText("Number of processes") as HTMLInputElement;

    // Empty while typing should not crash or render NaN
    fireEvent.change(countInput, { target: { value: "" } });
    expect(countInput.value).toBe("");
    expect(document.body.textContent).not.toContain("NaN");

    // Typing 6 grows the table to 6 processes
    fireEvent.change(countInput, { target: { value: "6" } });
    expect(screen.getByLabelText("Process name for P6")).toBeInTheDocument();

    // Out-of-range value clamps to 10 on blur
    fireEvent.change(countInput, { target: { value: "25" } });
    fireEvent.blur(countInput);
    expect(countInput.value).toBe("10");
    expect(screen.getByLabelText("Process name for P10")).toBeInTheDocument();
  });

  it("switches algorithms cleanly and steps through Gantt execution with live calculations", async () => {
    await renderSimulator();

    // Priority shows priority column, preemptive toggle, and aging toggle
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    expect(screen.getByText(/Priority \(0 = high\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aging: Off/i })).toBeInTheDocument();

    // Round Robin shows time quantum input
    fireEvent.click(screen.getByRole("button", { name: "Round Robin" }));
    expect(screen.getByLabelText("Time quantum")).toHaveValue(2);

    // FCFS + Step advances timeline and reveals Gantt chart + live narration
    fireEvent.click(screen.getByRole("button", { name: "FCFS" }));
    fireEvent.click(screen.getByRole("button", { name: /Step/i }));
    expect(screen.queryByText(/press play to begin/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Netflix is ready \(AT=0\)/i)).toBeInTheDocument();

    // Calculations dialog opens and displays formulas with process names
    fireEvent.click(screen.getByRole("button", { name: /Calculations/i }));
    expect(screen.getByRole("heading", { name: /All calculations/i })).toBeInTheDocument();
    expect(screen.getAllByText(/TAT = CT − AT/i)).toHaveLength(4);
    expect(screen.getByText(/Netflix: 0 − 0 =/i)).toBeInTheDocument();
  });
});
