import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OS_TOPICS } from "@/lib/topics";
import { Route as DiskComparisonRoute } from "@/routes/comparison.disk-scheduling";
import { Route as DiskHubRoute } from "@/routes/disk-scheduling.index";
import { Route as DiskSimulatorRoute } from "@/routes/disk-scheduling.simulator";
import { Route as DiskNotesRoute } from "@/routes/notes.disk-scheduling";
import { Route as NotesIndexRoute } from "@/routes/notes.index";
import { Route as DiskQuizRoute } from "@/routes/quiz.disk-scheduling";
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

describe("DiskSchedulingSimulatorPage UI", () => {
  const SimComponent = DiskSimulatorRoute.options.component!;

  it("renders default example, allows typing empty fields without NaN, and shows validation alert for invalid cylinder", () => {
    render(<SimComponent />);

    expect(screen.getByText("Disk Scheduling simulator")).toBeTruthy();
    expect(screen.getByText(/Active: FCFS/)).toBeTruthy();

    // Verify empty input handling
    const headInput = screen.getByLabelText("Head start position") as HTMLInputElement;
    fireEvent.change(headInput, { target: { value: "" } });
    expect(headInput.value).toBe("");
    expect(screen.getByRole("alert")).toBeTruthy();
    expect((screen.getByRole("button", { name: /play/i }) as HTMLButtonElement).disabled).toBe(true);

    // Fix head input
    fireEvent.change(headInput, { target: { value: "53" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByRole("button", { name: /play/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("loads the textbook example, steps through segments, and verifies SSTF calculation", () => {
    render(<SimComponent />);

    // Click SSTF
    fireEvent.click(screen.getByRole("button", { name: "SSTF" }));
    expect(screen.getByText(/Active: SSTF/)).toBeTruthy();

    // Click Load example
    fireEvent.click(screen.getByRole("button", { name: "Load example" }));

    // Step through the segments
    const stepBtn = screen.getByRole("button", { name: /^step$/i });
    for (let i = 0; i < 8; i += 1) {
      fireEvent.click(stepBtn);
    }

    // In SSTF with textbook example, total movement is 236
    expect(screen.getByText(/segment 8 \/ 8/)).toBeTruthy();
    expect(screen.getByText("236 cylinders")).toBeTruthy();
    expect(screen.getByText("29.50 cyl")).toBeTruthy();
  });

  it("switches to SCAN, sets direction, and verifies end-of-disk segment", () => {
    render(<SimComponent />);

    fireEvent.click(screen.getByRole("button", { name: "SCAN" }));
    expect(screen.getByText(/Active: SCAN, moving toward higher/)).toBeTruthy();

    // Change direction to lower
    const lowerBtn = screen.getByRole("button", { name: "← Lower" });
    fireEvent.click(lowerBtn);
    expect(screen.getByText(/Active: SCAN, moving toward lower/)).toBeTruthy();
  });
});

describe("Disk Scheduling Hub & Availability", () => {
  it("renders the Disk Scheduling notebook hub with all 4 active entries (no coming soon)", () => {
    const HubComponent = DiskHubRoute.options.component!;
    render(<HubComponent />);

    expect(screen.getByText("Disk Scheduling")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Table of Contents" })).toBeTruthy();
    expect(screen.getByText("Learn")).toBeTruthy();
    expect(screen.getByText("Simulator")).toBeTruthy();
    expect(screen.getByText("Comparison")).toBeTruthy();
    expect(screen.getByText("Pop Quiz")).toBeTruthy();
    expect(screen.queryByText("coming soon")).toBeNull();
  });

  it("verifies Disk Scheduling is fully available across all topic indexes", () => {
    const diskTopic = OS_TOPICS.find((t) => t.slug === "disk-scheduling")!;
    expect(diskTopic.ready).toBe(true);
    expect(diskTopic.notesReady).toBe(true);
    expect(diskTopic.quizReady).toBe(true);
    expect(diskTopic.simulatorLink).toBe("/disk-scheduling/simulator");
    expect(diskTopic.notesLink).toBe("/notes/disk-scheduling");

    // All hub entries have comingSoon undefined or false
    for (const entry of diskTopic.hubEntries) {
      expect(entry.comingSoon).toBeFalsy();
    }

    // Notes index has zero "coming soon" badges across all 4 topics
    const NotesIndexComp = NotesIndexRoute.options.component!;
    render(<NotesIndexComp />);
    expect(screen.queryByText("coming soon")).toBeNull();
    cleanup();

    // Quiz index has zero "coming soon" badges across all 4 topics
    const QuizIndexComp = QuizIndexRoute.options.component!;
    render(<QuizIndexComp />);
    expect(screen.queryByText("coming soon")).toBeNull();
  });
});

describe("Disk Scheduling Notes (Learn)", () => {
  const NotesComp = DiskNotesRoute.options.component!;

  it("renders all 10 sub-topic sections and diagrams", () => {
    render(<NotesComp />);

    expect(screen.getByText(/Disk Scheduling Hub/)).toBeTruthy();
    expect(screen.getByText("The notes")).toBeTruthy();

    // Check first section title
    expect(screen.getAllByText("1. Disk Structure & Why Scheduling Matters").length).toBeGreaterThan(0);
    expect(screen.getByText(/A traditional hard disk drive/)).toBeTruthy();

    // Navigate to section 2: The Six Algorithms in this Unit
    fireEvent.click(screen.getByRole("button", { name: "2. The Six Algorithms in this Unit" }));
    expect(screen.getByText(/Head Trajectory Patterns of the Six Algorithms/)).toBeTruthy();

    // Navigate to section 3: FCFS
    fireEvent.click(screen.getByRole("button", { name: "3. First-Come, First-Served (FCFS)" }));
    expect(screen.getByText(/640 cylinders/)).toBeTruthy();

    // Navigate to section 4: SSTF
    fireEvent.click(screen.getByRole("button", { name: "4. Shortest Seek Time First (SSTF)" }));
    expect(screen.getByText(/236 cylinders/)).toBeTruthy();

    // Navigate to section 8: Why Direction Matters
    fireEvent.click(screen.getByRole("button", { name: "8. Why Direction Matters" }));
    expect(screen.getByText(/Direction Sensitivity/)).toBeTruthy();

    // Navigate to section 10: Summary table and exam tips
    fireEvent.click(screen.getByRole("button", { name: "10. Summary Table & Exam Tips" }));
    expect(screen.getByText(/Exam Traps & Mental Checkpoints:/)).toBeTruthy();
    expect(screen.getByText("Try it in the simulator →")).toBeTruthy();
    expect(screen.getByText("Based on class notes and the syllabus textbooks.")).toBeTruthy();
  });
});

describe("Disk Scheduling Pop Quiz", () => {
  const QuizComp = DiskQuizRoute.options.component!;

  it("renders questions, validates answers, provides explanations, and displays final score", () => {
    render(<QuizComp />);

    expect(screen.getByText("Disk Scheduling Quiz")).toBeTruthy();
    expect(screen.getByText("1/6 · score 0")).toBeTruthy();

    // Q1: Seek time (option A)
    const q1Correct = screen.getByRole("button", { name: /A\. Seek time/i });
    fireEvent.click(q1Correct);
    expect(screen.getByText(/Explanation:/)).toBeTruthy();
    expect(screen.getByText("1/6 · score 1")).toBeTruthy();

    // Next question
    fireEvent.click(screen.getByRole("button", { name: "next →" }));
    expect(screen.getByText("2/6 · score 1")).toBeTruthy();

    // Q2: 640 (option D)
    const q2Correct = screen.getByRole("button", { name: /D\. 640/i });
    fireEvent.click(q2Correct);
    expect(screen.getByText("2/6 · score 2")).toBeTruthy();

    // Next question
    fireEvent.click(screen.getByRole("button", { name: "next →" }));

    // Q3: C-SCAN jumps to first cylinder (option B)
    const q3Correct = screen.getByRole("button", {
      name: /B\. It jumps to the first cylinder without serving requests and continues in the same direction/i,
    });
    fireEvent.click(q3Correct);
    expect(screen.getByText("3/6 · score 3")).toBeTruthy();

    // Next question
    fireEvent.click(screen.getByRole("button", { name: "next →" }));

    // Q4: SCAN higher = 331 (option C)
    const q4Correct = screen.getByRole("button", { name: /C\. 331/i });
    fireEvent.click(q4Correct);
    expect(screen.getByText("4/6 · score 4")).toBeTruthy();

    // Next question
    fireEvent.click(screen.getByRole("button", { name: "next →" }));

    // Q5: LOOK higher = 299 (option C)
    const q5Correct = screen.getByRole("button", { name: /C\. 299/i });
    fireEvent.click(q5Correct);
    expect(screen.getByText("5/6 · score 5")).toBeTruthy();

    // Next question
    fireEvent.click(screen.getByRole("button", { name: "next →" }));

    // Q6: SSTF can cause starvation (option B)
    const q6Correct = screen.getByRole("button", { name: /B\. SSTF/i });
    fireEvent.click(q6Correct);
    expect(screen.getByText("6/6 · score 6")).toBeTruthy();

    // Finish
    fireEvent.click(screen.getByRole("button", { name: "next →" }));

    // Grade screen
    expect(screen.getByText("Grade: 6/6")).toBeTruthy();
    expect(screen.getByText(/A\+ ⭐ Disk Master!/)).toBeTruthy();
  });
});

describe("Disk Scheduling Comparison UI", () => {
  const CompComp = DiskComparisonRoute.options.component!;

  it("renders all six algorithms, handles input changes, and calculates best algorithm verdict", () => {
    render(<CompComp />);

    expect(screen.getByText("Disk Scheduling comparison")).toBeTruthy();
    expect(screen.getByText("Live comparison summary")).toBeTruthy();

    // Check all 6 algorithm titles in charts
    expect(screen.getAllByText("FCFS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SSTF").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SCAN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("C-SCAN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LOOK").length).toBeGreaterThan(0);
    expect(screen.getAllByText("C-LOOK").length).toBeGreaterThan(0);

    // Show verdict now button
    const verdictBtn = screen.getByRole("button", { name: /show verdict now/i });
    fireEvent.click(verdictBtn);

    // Default benchmark: 200 cyl, head 53, moving higher: SSTF is winner (236 cyl)
    expect(screen.getByText(/Winner: SSTF \(236 cylinders\)/)).toBeTruthy();
    expect(screen.getByText(/SSTF always serves the nearest request/)).toBeTruthy();
    expect(screen.getByText(/Direction Sensitivity/)).toBeTruthy();

    // Open Calculations dialog
    const calcBtn = screen.getByRole("button", { name: /calculations/i });
    fireEvent.click(calcBtn);
    expect(screen.getByText(/Calculations Breakdown & Best Verdict/)).toBeTruthy();
    expect(screen.getByText(/How the best algorithm was chosen:/)).toBeTruthy();
  });

  it("switches direction to lower and verifies LOOK becomes the winner", () => {
    render(<CompComp />);

    // Click "Lower cylinders"
    const lowerBtn = screen.getByRole("button", { name: /lower cylinders/i });
    fireEvent.click(lowerBtn);

    // Show verdict
    const verdictBtn = screen.getByRole("button", { name: /show verdict now/i });
    fireEvent.click(verdictBtn);

    // Benchmark lower: LOOK wins with 208 cylinders!
    expect(screen.getByText(/Winner: LOOK \(208 cylinders\)/)).toBeTruthy();
    expect(screen.getByText(/LOOK turns at the last request/)).toBeTruthy();
  });
});
