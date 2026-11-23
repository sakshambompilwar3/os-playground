import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route as PageReplacementComparisonRoute } from "@/routes/comparison.page-replacement";
import { Route as PageReplacementNotesRoute } from "@/routes/notes.page-replacement";
import { Route as PageReplacementSimulatorRoute } from "@/routes/page-replacement.simulator";
import {
  Route as PageReplacementQuizRoute,
  PAGE_REPLACEMENT_QUIZ_QUESTIONS,
} from "@/routes/quiz.page-replacement";

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

describe("PageReplacementSimulatorPage UI", () => {
  const SimComponent = PageReplacementSimulatorRoute.options.component!;

  it("renders default textbook example, controls, and frame table", () => {
    render(<SimComponent />);

    expect(screen.getByText("Page Replacement simulator")).toBeTruthy();
    expect(screen.getByLabelText("Number of frames")).toHaveValue(3);
    expect(screen.getByText("FIFO Frame Allocation Table (3 frames)")).toBeTruthy();

    // Verify empty input handling
    const refInput = screen.getByLabelText(/Reference String/i) as HTMLInputElement;
    fireEvent.change(refInput, { target: { value: "" } });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect((screen.getByRole("button", { name: /play/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    // Click Load example to restore
    fireEvent.click(screen.getByRole("button", { name: /load example/i }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByRole("button", { name: /play/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("steps through reference string and updates live metrics", () => {
    render(<SimComponent />);

    // Click Step
    const stepBtn = screen.getByRole("button", { name: /step/i });
    fireEvent.click(stepBtn);

    expect(screen.getByText(/Step 1:/)).toBeTruthy();
    expect(screen.getByText(/Reference 7 is not in memory: page fault/)).toBeTruthy();

    // Step again
    fireEvent.click(stepBtn);
    expect(screen.getByText(/Step 2:/)).toBeTruthy();
    expect(screen.getByText(/Reference 0 is not in memory: page fault/)).toBeTruthy();
  });
});

describe("PageReplacementComparisonPage UI", () => {
  const CompComponent = PageReplacementComparisonRoute.options.component!;

  it("renders all 3 algorithms, synchronized controls, and calculates best algorithm verdict", () => {
    render(<CompComponent />);

    expect(screen.getByText("Page Replacement comparison")).toBeTruthy();
    expect(screen.getByText("1. FIFO (First-In, First-Out)")).toBeTruthy();
    expect(screen.getByText("2. LRU (Least Recently Used)")).toBeTruthy();
    expect(screen.getByText("3. Optimal (Theoretical Benchmark)")).toBeTruthy();

    // Show verdict now button
    const verdictBtn = screen.getByRole("button", { name: /show verdict now/i });
    fireEvent.click(verdictBtn);

    expect(screen.getByText("Best algorithm verdict (Projected from full run)")).toBeTruthy();
    expect(screen.getByText("Optimal Algorithm")).toBeTruthy();
    expect(screen.getByText("LRU Algorithm")).toBeTruthy();
  });
});

describe("PageReplacementNotes UI", () => {
  const NotesComponent = PageReplacementNotesRoute.options.component!;

  it("renders all 13 sections and allows switching between sections", () => {
    render(<NotesComponent />);

    expect(screen.getByText("The notes")).toBeTruthy();
    expect(screen.getAllByText("1. Background & Rationale for Virtual Memory").length).toBeGreaterThan(0);
    expect(screen.getByText("13. Summary Table & Exam Tips")).toBeTruthy();

    // Click section 8: Page Replacement Algorithms
    fireEvent.click(screen.getByRole("button", { name: "8. Page Replacement Algorithms & Approximations" }));
    expect(screen.getAllByText(/Belady's Anomaly/).length).toBeGreaterThanOrEqual(1);

    // Click section 11: Effective Access Time
    fireEvent.click(screen.getByRole("button", { name: "11. Effective Access Time (EAT)" }));
    expect(screen.getByText(/8,199.8 ns/)).toBeTruthy();
  });
});

describe("PageReplacementQuiz UI", () => {
  const QuizComp = PageReplacementQuizRoute.options.component!;

  it("renders questions, validates answers, provides explanations, and displays final score", () => {
    render(<QuizComp />);

    expect(screen.getByText("Page Replacement Quiz")).toBeTruthy();
    expect(screen.getByText("1/6 · score 0")).toBeTruthy();

    // Q1: FIFO causes 15 faults (Option C: 15)
    fireEvent.click(screen.getByRole("button", { name: /C\. 15/i }));
    expect(screen.getByText(/Explanation:/)).toBeTruthy();
    expect(screen.getByText("1/6 · score 1")).toBeTruthy();

    // Advance to Q2
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    expect(screen.getByText("2/6 · score 1")).toBeTruthy();

    // Q2: LRU causes 12 faults (Option C: 12)
    fireEvent.click(screen.getByRole("button", { name: /C\. 12/i }));
    expect(screen.getByText("2/6 · score 2")).toBeTruthy();

    // Advance to Q3
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Q3: Optimal causes 9 faults (Option B: 9)
    fireEvent.click(screen.getByRole("button", { name: /B\. 9/i }));
    expect(screen.getByText("3/6 · score 3")).toBeTruthy();

    // Advance to Q4
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Q4: Page 2 is replaced (Option B: Page 2)
    fireEvent.click(screen.getByRole("button", { name: /B\. Page 2/i }));
    expect(screen.getByText("4/6 · score 4")).toBeTruthy();

    // Advance to Q5
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Q5: Optimal needs future knowledge (Option C: Optimal)
    fireEvent.click(screen.getByRole("button", { name: /C\. Optimal/i }));
    expect(screen.getByText("5/6 · score 5")).toBeTruthy();

    // Advance to Q6
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Q6: Belady anomaly gives 10 faults (Option D: 10)
    fireEvent.click(screen.getByRole("button", { name: /D\. 10/i }));
    expect(screen.getByText("6/6 · score 6")).toBeTruthy();

    // Finish
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));

    // Grade card
    expect(screen.getByText("Grade: 6/6")).toBeTruthy();
    expect(screen.getByText(/A\+ ⭐ Demand Paging Master!/)).toBeTruthy();
  });
});
