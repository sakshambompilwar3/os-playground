import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryResultsPanel } from "@/components/MemoryDetails";
import {
  DEFAULT_EXAMPLE_BLOCKS,
  DEFAULT_EXAMPLE_MEM_PROCESSES,
  simulateMemoryAllocation,
} from "@/lib/memory";
import { assignProcessColors } from "@/lib/palette";
import { Route as MemorySimulatorRoute } from "@/routes/memory-allocation.simulator";

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
