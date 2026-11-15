import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryResultsPanel } from "@/components/MemoryDetails";
import {
  DEFAULT_EXAMPLE_BLOCKS,
  DEFAULT_EXAMPLE_MEM_PROCESSES,
  simulateMemoryAllocation,
} from "@/lib/memory";
import { assignProcessColors } from "@/lib/palette";
import { OS_TOPICS } from "@/lib/topics";
import { Route as MemoryComparisonRoute } from "@/routes/comparison.memory-allocation";
import { Route as MemorySimulatorRoute } from "@/routes/memory-allocation.simulator";
import { Route as MemoryNotesRoute } from "@/routes/notes.memory-allocation";
import { Route as NotesIndexRoute } from "@/routes/notes.index";
import { Route as MemoryQuizRoute, MEMORY_QUIZ_QUESTIONS } from "@/routes/quiz.memory-allocation";
import { Route as QuizIndexRoute } from "@/routes/quiz.index";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
      className?: string;
    }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

afterEach(() => {
  cleanup();
});

describe("MemoryAllocationSimulatorPage UI", () => {
  const SimComponent = MemorySimulatorRoute.options.component!;

  it("renders default example, allows empty input without NaN, and validates invalid sizes", () => {
    render(<SimComponent />);

    expect(screen.getByText("Memory Allocation simulator")).toBeTruthy();
    expect(screen.getByText("Active: Dynamic partitioning + First Fit")).toBeTruthy();

    const block1Input = screen.getByLabelText("Size for B1") as HTMLInputElement;
    fireEvent.change(block1Input, { target: { value: "" } });
    expect(block1Input.value).toBe("");
    expect(screen.getByRole("alert")).toBeTruthy();
    expect((screen.getByRole("button", { name: /play/i }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(block1Input, { target: { value: "100" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByRole("button", { name: /play/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("steps through all 4 processes and enables Compaction in Dynamic mode only", () => {
    render(<SimComponent />);

    const compactBtn = screen.getByRole("button", { name: /compact memory/i }) as HTMLButtonElement;
    expect(compactBtn.disabled).toBe(true);

    const stepBtn = screen.getByRole("button", { name: /^step$/i });
    fireEvent.click(stepBtn);
    fireEvent.click(stepBtn);
    fireEvent.click(stepBtn);
    fireEvent.click(stepBtn);

    expect(screen.getByText("step 4 / 4")).toBeTruthy();
    expect(screen.getByText("Waiting processes (not allocated)")).toBeTruthy();
    expect(compactBtn.disabled).toBe(false);

    fireEvent.click(compactBtn);
    expect(screen.getByText("Before compaction")).toBeTruthy();

    const retryBtn = screen.getByRole("button", { name: /try waiting processes again/i });
    fireEvent.click(retryBtn);
    expect(screen.queryByText("Waiting processes (not allocated)")).toBeNull();
  });

  it("disables Compaction in Fixed partitioning mode", () => {
    render(<SimComponent />);
    fireEvent.click(screen.getByRole("button", { name: "Fixed partitioning" }));
    expect(screen.getByText("Active: Fixed partitioning + First Fit")).toBeTruthy();

    const stepBtn = screen.getByRole("button", { name: /^step$/i });
    fireEvent.click(stepBtn);
    fireEvent.click(stepBtn);
    fireEvent.click(stepBtn);
    fireEvent.click(stepBtn);

    const compactBtn = screen.getByRole("button", { name: /compact memory/i }) as HTMLButtonElement;
    expect(compactBtn.disabled).toBe(true);
  });
});

describe("MemoryAllocationComparisonPage UI", () => {
  const CompComponent = MemoryComparisonRoute.options.component!;

  it("renders all 4 strategies, shows synchronized step controls, and reveals Best Fit verdict", () => {
    render(<CompComponent />);

    expect(screen.getByText("Memory Allocation comparison")).toBeTruthy();
    expect(screen.getAllByText("First Fit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Best Fit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Worst Fit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Next Fit").length).toBeGreaterThan(0);

    // Check "Show verdict now"
    const verdictBtn = screen.getByRole("button", { name: /show verdict now/i });
    fireEvent.click(verdictBtn);

    expect(screen.getByText(/Verdict: Best strategy is Best Fit/)).toBeTruthy();
    expect(screen.getByText(/68.65% utilization/)).toBeTruthy();
    expect(screen.getByText("Comparison matrix")).toBeTruthy();

    // Changing an input clears the verdict
    const block1Input = screen.getByLabelText("Size for B1") as HTMLInputElement;
    fireEvent.change(block1Input, { target: { value: "150" } });
    expect(screen.queryByText(/Verdict: Best strategy is/)).toBeNull();
  });

  it("switches to Fixed partitioning and updates comparison metrics", () => {
    render(<CompComponent />);

    const fixedBtn = screen.getByRole("button", { name: "Fixed partitioning" });
    fireEvent.click(fixedBtn);
    expect(screen.getByText("Mode: Fixed partitioning")).toBeTruthy();

    const verdictBtn = screen.getByRole("button", { name: /show verdict now/i });
    fireEvent.click(verdictBtn);

    expect(screen.getByText(/Verdict: Best strategy is Best Fit/)).toBeTruthy();
  });
});

describe("MemoryAllocationNotes UI", () => {
  const NotesComponent = MemoryNotesRoute.options.component!;

  it("renders 9 cards and allows switching between sections", () => {
    render(<NotesComponent />);

    expect(screen.getByText("The notes")).toBeTruthy();
    expect(screen.getAllByText("1. What is Memory Allocation?").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2. Fixed (Static) Partitioning").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4. Fragmentation: Internal vs. External").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7. Worked Example (Textbook Benchmark)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8. Strategy Summary").length).toBeGreaterThan(0);

    // Click on Worked Example in the sidebar
    const workedExampleBtn = screen.getByRole("button", { name: "7. Worked Example (Textbook Benchmark)" });
    fireEvent.click(workedExampleBtn);
    expect(screen.getByText("Best Fit Step-by-Step (All 4 placed!)")).toBeTruthy();
    expect(screen.getByText("Contrast: Why First Fit Fails on this Input")).toBeTruthy();
  });
});

describe("MemoryAllocationQuiz UI", () => {
  const QuizComponent = MemoryQuizRoute.options.component!;

  it("runs through all 6 questions, checks explanations, and shows final score", () => {
    render(<QuizComponent />);

    expect(screen.getByText("Memory Allocation Quiz")).toBeTruthy();
    expect(screen.getByText(MEMORY_QUIZ_QUESTIONS[0]!.q)).toBeTruthy();

    // Answer Q1 correctly (option C: 288 KB)
    fireEvent.click(screen.getByRole("button", { name: /288 KB/ }));
    expect(screen.getByText(/Explanation:/)).toBeTruthy();
    expect(screen.getByText(/internal fragmentation = block size - process size/)).toBeTruthy();

    // Proceed to Q2
    fireEvent.click(screen.getByText("next →"));
    expect(screen.getByText(MEMORY_QUIZ_QUESTIONS[1]!.q)).toBeTruthy();

    // Q2 correct (option B: External fragmentation)
    fireEvent.click(screen.getByRole("button", { name: /External fragmentation/ }));
    fireEvent.click(screen.getByText("next →"));

    // Q3 correct (option B: 300 KB)
    fireEvent.click(screen.getByRole("button", { name: /300 KB/ }));
    fireEvent.click(screen.getByText("next →"));

    // Q4 correct (option D: 600 KB)
    fireEvent.click(screen.getByRole("button", { name: /600 KB/ }));
    fireEvent.click(screen.getByText("next →"));

    // Q5 correct (option D: 426 KB)
    fireEvent.click(screen.getByRole("button", { name: /426 KB/ }));
    fireEvent.click(screen.getByText("next →"));

    // Q6 correct (option A: Compaction)
    fireEvent.click(screen.getByRole("button", { name: /Compaction/ }));
    fireEvent.click(screen.getByText("next →"));

    // Final grade screen
    expect(screen.getByText("Grade: 6/6")).toBeTruthy();
    expect(screen.getByText("A+ ⭐ Memory Master!")).toBeTruthy();
  });
});

describe("Topic Availability in /notes and /quiz", () => {
  it("shows Memory Allocation as fully available in topics data and indexes", () => {
    const memTopic = OS_TOPICS.find((t) => t.slug === "memory-allocation")!;
    expect(memTopic.ready).toBe(true);
    expect(memTopic.notesReady).toBe(true);
    expect(memTopic.quizReady).toBe(true);
    expect(memTopic.hubEntries.every((e) => !e.comingSoon)).toBe(true);

    const diskTopic = OS_TOPICS.find((t) => t.slug === "disk-scheduling")!;
    expect(diskTopic.ready).toBe(false);

    // Notes Index
    const NotesIndexComponent = NotesIndexRoute.options.component!;
    render(<NotesIndexComponent />);
    // Memory card has no coming soon badge, Disk has coming soon badge
    expect(screen.getByText("Disk Scheduling")).toBeTruthy();
    cleanup();

    // Quiz Index
    const QuizIndexComponent = QuizIndexRoute.options.component!;
    render(<QuizIndexComponent />);
    expect(screen.getByText("Disk Scheduling")).toBeTruthy();
  });
});

describe("MemoryResultsPanel", () => {
  it("renders waiting reason and utilization accurately", () => {
    const res = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "dynamic",
      "first-fit",
    );
    const colors = assignProcessColors(DEFAULT_EXAMPLE_MEM_PROCESSES);
    const displayNames = Object.fromEntries(
      DEFAULT_EXAMPLE_MEM_PROCESSES.map((p) => [p.id, p.name]),
    );
    render(
      <MemoryResultsPanel
        records={res.records}
        summary={res.summary}
        mode="dynamic"
        colors={colors}
        displayNames={displayNames}
      />,
    );
    expect(screen.getByText("1700 KB")).toBeTruthy();
    expect(screen.getByText("43.59%")).toBeTruthy();
    expect(screen.getByText(/needs 426 KB, largest free hole is 300 KB/)).toBeTruthy();
  });
});
