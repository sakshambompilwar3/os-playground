import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route as SyncComparisonRoute } from "@/routes/comparison.synchronization";
import { Route as SyncNotesRoute } from "@/routes/notes.synchronization";
import { Route as DiningSimulatorRoute } from "@/routes/synchronization.dining-philosophers";
import { Route as PcSimulatorRoute } from "@/routes/synchronization.producer-consumer";
import {
  Route as SyncQuizRoute,
  SYNCHRONIZATION_QUIZ_QUESTIONS,
} from "@/routes/quiz.synchronization";

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

describe("ProducerConsumerSimulatorPage UI", () => {
  const PcComponent = PcSimulatorRoute.options.component!;

  it("renders default configuration, controls, semaphore gauges, and thread cards", () => {
    render(<PcComponent />);

    expect(screen.getByText("Producer-Consumer simulator")).toBeTruthy();
    expect(screen.getByText("Bounded Buffer (Slots 0 to 2)")).toBeTruthy();
    expect(screen.getByText("Semaphore: empty")).toBeTruthy();
    expect(screen.getByText("Semaphore: full")).toBeTruthy();
    expect(screen.getByText("Binary: mutex")).toBeTruthy();

    // Step button
    const stepBtn = screen.getByRole("button", { name: /^step$/i });
    fireEvent.click(stepBtn);

    expect(screen.getByRole("status")).toBeTruthy();
  });
});

describe("DiningPhilosophersSimulatorPage UI", () => {
  const DiningComponent = DiningSimulatorRoute.options.component!;

  it("renders default table SVG, strategy selector, and controls", () => {
    render(<DiningComponent />);

    expect(screen.getByText("Dining Philosophers simulator")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Dining Philosophers Table Visualization" })).toBeTruthy();
    expect(screen.getByText("1. Naive (Left then Right)")).toBeTruthy();
    expect(screen.getByText("2. Ordered (Hierarchy)")).toBeTruthy();

    // Step button
    const stepBtn = screen.getByRole("button", { name: /^step$/i });
    fireEvent.click(stepBtn);

    expect(screen.getByRole("status")).toBeTruthy();
  });
});

describe("SynchronizationComparisonPage UI", () => {
  const CompComponent = SyncComparisonRoute.options.component!;

  it("renders all 4 strategies, synchronized control bar, and calculates best strategy verdict", () => {
    render(<CompComponent />);

    expect(screen.getByText("Process Synchronization comparison")).toBeTruthy();
    expect(screen.getAllByText(/naive/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ordered/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/limit/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/asymmetric/i).length).toBeGreaterThan(0);

    // Show verdict now button
    const verdictBtn = screen.getByRole("button", { name: /show verdict now/i });
    fireEvent.click(verdictBtn);

    expect(screen.getByText("Best strategy verdict (Projected from full run)")).toBeTruthy();
  });
});

describe("SynchronizationNotes UI", () => {
  const NotesComponent = SyncNotesRoute.options.component!;

  it("renders all 8 sections and allows switching between sections", () => {
    render(<NotesComponent />);

    expect(screen.getByText("The notes")).toBeTruthy();
    expect(screen.getAllByText("1. Why Synchronization & Race Conditions").length).toBeGreaterThan(0);
    expect(screen.getByText("8. Exam Tips & Common Traps")).toBeTruthy();

    // Click section 4: Producer-Consumer
    fireEvent.click(screen.getByRole("button", { name: "4. Producer-Consumer (Bounded Buffer)" }));
    expect(screen.getAllByText(/The 3 Semaphores and Initial Values/i).length).toBeGreaterThan(0);

    // Click section 5: Dining Philosophers
    fireEvent.click(screen.getByRole("button", { name: "5. Dining Philosophers Problem" }));
    expect(screen.getAllByText(/The 3 Classical Remedies/i).length).toBeGreaterThan(0);
  });
});

describe("SynchronizationQuiz UI", () => {
  const QuizComp = SyncQuizRoute.options.component!;

  it("renders questions, validates answers, provides explanations, and displays final score", () => {
    render(<QuizComp />);

    expect(screen.getByText("Process Synchronization Quiz")).toBeTruthy();
    expect(screen.getByText("1/6 · score 0")).toBeTruthy();

    // Q1: Option A (lost update)
    fireEvent.click(
      screen.getByRole("button", {
        name: /A\. A lost update: both read the same old value, so one increment is lost/i,
      }),
    );
    expect(screen.getByText(/Explanation:/)).toBeTruthy();
    expect(screen.getByText("1/6 · score 1")).toBeTruthy();

    // Advance to Q2
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    expect(screen.getByText("2/6 · score 1")).toBeTruthy();

    // Q2: Option B (empty = N, full = 0, mutex = 1)
    fireEvent.click(screen.getByRole("button", { name: /B\. empty = N, full = 0, mutex = 1/i }));
    expect(screen.getByText("2/6 · score 2")).toBeTruthy();

    // Advance to Q3
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Q3: Option B (Deadlock)
    fireEvent.click(
      screen.getByRole("button", {
        name: /B\. Deadlock: the producer holds the mutex while waiting for an empty slot/i,
      }),
    );
    expect(screen.getByText("3/6 · score 3")).toBeTruthy();

    // Advance to Q4
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Q4: Option A (Deadlock)
    fireEvent.click(screen.getByRole("button", { name: /A\. Deadlock/i }));
    expect(screen.getByText("4/6 · score 4")).toBeTruthy();

    // Advance to Q5
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Q5: Option D (Let every philosopher pick the left fork first and then the right fork)
    fireEvent.click(
      screen.getByRole("button", {
        name: /D\. Let every philosopher pick the left fork first and then the right fork/i,
      }),
    );
    expect(screen.getByText("5/6 · score 5")).toBeTruthy();

    // Advance to Q6
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Q6: Option A (It ignores them, assuming they are rare)
    fireEvent.click(
      screen.getByRole("button", { name: /A\. It ignores them, assuming they are rare/i }),
    );
    expect(screen.getByText("6/6 · score 6")).toBeTruthy();

    // Finish
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Grade card
    expect(screen.getByText("Grade: 6/6")).toBeTruthy();
    expect(screen.getByText(/A\+ ⭐ Synchronization Guru!/)).toBeTruthy();
  });
});
