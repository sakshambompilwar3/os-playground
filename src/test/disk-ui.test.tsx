import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OS_TOPICS } from "@/lib/topics";
import { Route as DiskComparisonPlaceholderRoute } from "@/routes/comparison.disk-scheduling";
import { Route as DiskHubRoute } from "@/routes/disk-scheduling.index";
import { Route as DiskSimulatorRoute } from "@/routes/disk-scheduling.simulator";
import { Route as DiskNotesPlaceholderRoute } from "@/routes/notes.disk-scheduling";
import { Route as NotesIndexRoute } from "@/routes/notes.index";
import { Route as DiskQuizPlaceholderRoute } from "@/routes/quiz.disk-scheduling";
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

describe("Disk Scheduling Hub & Placeholders", () => {
  it("renders the Disk Scheduling notebook hub with 4 entries", () => {
    const HubComponent = DiskHubRoute.options.component!;
    render(<HubComponent />);

    expect(screen.getByText("Disk Scheduling")).toBeTruthy();
    expect(screen.getByText("Table of Contents")).toBeTruthy();
    expect(screen.getByText("Learn")).toBeTruthy();
    expect(screen.getByText("Simulator")).toBeTruthy();
    expect(screen.getByText("Comparison")).toBeTruthy();
    expect(screen.getByText("Pop Quiz")).toBeTruthy();
  });

  it("renders Comparison, Learn, and Quiz placeholders with back links", () => {
    const CompComp = DiskComparisonPlaceholderRoute.options.component!;
    render(<CompComp />);
    expect(screen.getByText("Disk Scheduling Comparison")).toBeTruthy();
    expect(screen.getByText("← back to Disk Scheduling")).toBeTruthy();
    cleanup();

    const NotesComp = DiskNotesPlaceholderRoute.options.component!;
    render(<NotesComp />);
    expect(screen.getByText("Disk Scheduling Notes")).toBeTruthy();
    expect(screen.getByText("← back to Disk Scheduling")).toBeTruthy();
    cleanup();

    const QuizComp = DiskQuizPlaceholderRoute.options.component!;
    render(<QuizComp />);
    expect(screen.getByText("Disk Scheduling Quiz")).toBeTruthy();
    expect(screen.getByText("← back to Disk Scheduling")).toBeTruthy();
  });

  it("verifies Disk Scheduling availability on Home and coming-soon on Notes/Quiz lists", () => {
    const diskTopic = OS_TOPICS.find((t) => t.slug === "disk-scheduling")!;
    expect(diskTopic.ready).toBe(true);
    expect(diskTopic.notesReady).toBe(false);
    expect(diskTopic.quizReady).toBe(false);
    expect(diskTopic.simulatorLink).toBe("/disk-scheduling/simulator");

    // Notes index shows coming soon for Disk Scheduling
    const NotesIndexComp = NotesIndexRoute.options.component!;
    render(<NotesIndexComp />);
    expect(screen.getAllByText("coming soon").length).toBeGreaterThan(0);
    cleanup();

    // Quiz index shows coming soon for Disk Scheduling
    const QuizIndexComp = QuizIndexRoute.options.component!;
    render(<QuizIndexComp />);
    expect(screen.getAllByText("coming soon").length).toBeGreaterThan(0);
  });
});
