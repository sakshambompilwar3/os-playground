import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, rootRouteId, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { SchedulingDetails } from "@/components/SchedulingDetails";
import { assignProcessColors } from "@/lib/process-palette";
import { runScheduling } from "@/lib/scheduling";

vi.mock("@/components/PageTransition", () => ({
  PageTransition: () => null,
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function createTestRouter(initialEntry: string) {
  return createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

describe("App routing for CPU scheduling", () => {
  it("matches all CPU scheduling routes without falling back to not found", () => {
    const router = createTestRouter("/");
    for (const path of [
      "/cpu-scheduling",
      "/cpu-scheduling/simulator",
      "/comparison/cpu-scheduling",
      "/cpu-scheduling/comparison",
      "/notes/cpu-scheduling",
      "/quiz/cpu-scheduling",
    ]) {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    }
  });
});

describe("CPU Scheduling Simulator UI", () => {
  it("renders controls, process table, and chalkboard prompt without crashing", async () => {
    const router = createTestRouter("/cpu-scheduling/simulator");
    await router.load();
    render(<RouterProvider router={router} />);

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
    const router = createTestRouter("/cpu-scheduling/simulator");
    await router.load();
    render(<RouterProvider router={router} />);
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

  it("renders CPU scheduling comparison page with all 6 algorithms and synchronized playhead", async () => {
    const router = createTestRouter("/comparison/cpu-scheduling");
    await router.load();
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("heading", { name: /Algorithm comparison/i })).toBeInTheDocument();
    expect(screen.getByText(/Watch all 6 scheduling algorithms race/i)).toBeInTheDocument();

    // Scoreboard displays algorithms
    expect(screen.getByText("FCFS (First-Come, First-Served)")).toBeInTheDocument();
    expect(screen.getByText("SJF (Shortest Job First - Non-Preemptive)")).toBeInTheDocument();
    expect(screen.getByText("SRTF (Shortest Remaining Time First)")).toBeInTheDocument();
    expect(screen.getAllByText(/Round Robin/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Priority (Non-Preemptive)")).toBeInTheDocument();
    expect(screen.getByText("Priority (Preemptive)")).toBeInTheDocument();

    // Stepping advances synchronized execution
    fireEvent.click(screen.getByRole("button", { name: /Step/i }));
    expect(screen.getByText(/Synchronized playhead at t =/i)).toBeInTheDocument();

    // Verdict card is rendered: shows prompt and "Show verdict now" button before completion
    expect(screen.getByRole("heading", { name: /Best for this example/i })).toBeInTheDocument();
    expect(screen.getByText(/The verdict appears when the run finishes/i)).toBeInTheDocument();

    // Clicking "Show verdict now" immediately reveals the verdict
    fireEvent.click(screen.getByRole("button", { name: /Show verdict now/i }));
    expect(screen.getByText(/Lowest waiting:/i)).toBeInTheDocument();
    expect(screen.getByText(/Fastest response:/i)).toBeInTheDocument();
    expect(screen.getByText(/How is "best" decided\?/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Best here means lowest average waiting time for this input/i),
    ).toBeInTheDocument();
  });

  it("switches algorithms cleanly and steps through Gantt execution with live calculations", async () => {
    const router = createTestRouter("/cpu-scheduling/simulator");
    await router.load();
    render(<RouterProvider router={router} />);

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
  });

  it("renders CPU scheduling Learn page with 11 sections and visual diagrams", async () => {
    const router = createTestRouter("/notes/cpu-scheduling");
    await router.load();
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("heading", { name: /The notes/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /1\. Background: Multiprogramming & Burst Cycles/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /4\. Key Terms & Formulas/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /11\. Summary Table & Exam Tips/i }),
    ).toBeInTheDocument();

    // Switching to section 4 renders the timeline section
    fireEvent.click(screen.getByRole("button", { name: /4\. Key Terms & Formulas/i }));
    expect(screen.getByText(/Process Lifecycle Timeline/i)).toBeInTheDocument();
  });

  it("renders CPU scheduling Pop Quiz and checks correct answers with explanations", async () => {
    const router = createTestRouter("/quiz/cpu-scheduling");
    await router.load();
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("heading", { name: /CPU Scheduling Quiz/i })).toBeInTheDocument();

    // Q1: minimum average waiting time
    expect(
      screen.getByText(
        /For a set of processes that all arrive at time 0, which algorithm gives the minimum average waiting time\?/i,
      ),
    ).toBeInTheDocument();

    // Click option B: SJF (correct answer)
    fireEvent.click(screen.getByRole("button", { name: /B\. SJF/i }));
    expect(
      screen.getByText(/Running the shortest jobs first minimizes total waiting/i),
    ).toBeInTheDocument();

    // Click next to advance to Q2
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    expect(screen.getByText(/P1 \(BT 24\), P2 \(BT 3\) and P3 \(BT 3\)/i)).toBeInTheDocument();
  });

  it("renders scheduling calculation details with exact formulas, substitutions, and averages", () => {
    const inputs = [
      { id: "P1", name: "Alpha", arrivalTime: 0, burstTime: 4 },
      { id: "P2", name: "Beta", arrivalTime: 1, burstTime: 2 },
    ];
    const result = runScheduling(inputs, { algorithm: "fcfs" });
    const colors = assignProcessColors(inputs);
    render(
      <SchedulingDetails
        result={result}
        colors={colors}
        currentTime={result.totalTime}
        started={true}
        contextSwitchTime={0}
        quantum={2}
        aging={false}
      />,
    );

    expect(screen.getAllByText(/TAT = CT − AT/i)).toHaveLength(2);
    expect(screen.getAllByText(/WT = TAT − BT/i)).toHaveLength(2);
    expect(screen.getAllByText(/RT = first CPU time − AT/i)).toHaveLength(2);
    expect(screen.getByText(/Average WT = \(sum of all WT\) \/ n/i)).toBeInTheDocument();
    expect(screen.getByText(/Average TAT = \(sum of all TAT\) \/ n/i)).toBeInTheDocument();
    expect(screen.getByText(/Average RT = \(sum of all RT\) \/ n/i)).toBeInTheDocument();
    expect(screen.getAllByText("1.50").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("4.50")).toBeInTheDocument();
  });
});
