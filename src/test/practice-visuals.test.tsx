import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { SchedulingGantt } from "@/components/SchedulingGantt";
import { MemoryMap } from "@/components/MemoryMap";
import { FrameTable } from "@/components/PagingDetails";
import { DiskHeadChart } from "@/components/DiskHeadChart";
import { PROCESS_PALETTE, assignProcessColors } from "@/lib/palette";
import type { GanttSegment } from "@/lib/scheduling";
import type { MemorySegment } from "@/lib/memory";
import type { PagingResult } from "@/lib/paging";

describe("Practice Mode Visuals (Paper Variant)", () => {
  const dummyColors = {
    P1: PROCESS_PALETTE[0]!,
    P2: PROCESS_PALETTE[1]!,
    P3: PROCESS_PALETTE[2]!,
  };

  it("renders SchedulingGantt with paper variant, accessible aria-label, and no CS on zero switch time", () => {
    const gantt: GanttSegment[] = [
      { startTime: 0, endTime: 4, processId: "P1", displayName: "P1", type: "run" },
      { startTime: 4, endTime: 9, processId: "P2", displayName: "P2", type: "run" },
      { startTime: 9, endTime: 12, processId: "P3", displayName: "P3", type: "run" },
    ];

    render(
      <SchedulingGantt
        gantt={gantt}
        colors={dummyColors}
        totalTime={12}
        currentTime={12}
        started={true}
        variant="paper"
      />
    );

    const img = screen.getByRole("img");
    expect(img).toBeDefined();
    expect(img.getAttribute("aria-label")).toContain("P1 from 0 to 4");
    expect(img.getAttribute("aria-label")).toContain("P2 from 4 to 9");
    expect(img.getAttribute("aria-label")).toContain("P3 from 9 to 12");

    // Must NOT contain "CS"
    expect(screen.queryByText("CS")).toBeNull();

    // Contains process names and durations
    expect(screen.getAllByText("P1").length).toBeGreaterThan(0);
    expect(screen.getByText("4ms")).toBeDefined();
    expect(screen.getByText("5ms")).toBeDefined();
    expect(screen.getByText("3ms")).toBeDefined();
  });

  it("renders MemoryMap with paper variant showing stacked Initial and After Allocation bars", () => {
    const initialSegments: MemorySegment[] = [
      { segmentId: "b-1", kind: "free", label: "B1", start: 0, end: 100, size: 100, internalFrag: 0 },
      { segmentId: "b-2", kind: "free", label: "B2", start: 100, end: 300, size: 200, internalFrag: 0 },
    ];

    const finalSegments: MemorySegment[] = [
      {
        segmentId: "b-1",
        kind: "allocated",
        processId: "P1",
        processName: "P1",
        processSize: 80,
        label: "B1",
        start: 0,
        end: 100,
        size: 100,
        internalFrag: 20,
      },
      {
        segmentId: "b-2",
        kind: "allocated",
        processId: "P2",
        processName: "P2",
        processSize: 150,
        label: "B2",
        start: 100,
        end: 300,
        size: 200,
        internalFrag: 50,
      },
    ];

    render(
      <MemoryMap
        segments={finalSegments}
        initialSegments={initialSegments}
        totalMemory={300}
        colors={dummyColors}
        mode="fixed"
        variant="paper"
      />
    );

    expect(screen.getByText("Initial Partitions")).toBeDefined();
    expect(screen.getByText("After Allocation")).toBeDefined();
    expect(screen.getByText("Internal Fragmentation")).toBeDefined();
    expect(screen.getByText("frag 20 KB")).toBeDefined();
    expect(screen.getByText("frag 50 KB")).toBeDefined();
  });

  it("renders FrameTable with paper variant showing hit/fault indicators", () => {
    const pagingResult: PagingResult = {
      frameCount: 3,
      referenceString: [1, 2, 1],
      steps: [
        {
          stepNumber: 1,
          page: 1,
          frames: [1, null, null],
          hit: false,
          loadedFrameIndex: 0,
          evictedPage: null,
          reason: "Cold start load",
          diagnostics: { pageLastUsedStep: {}, pageLoadedAtStep: { 1: 1 }, nextUseDistance: {} },
        },
        {
          stepNumber: 2,
          page: 2,
          frames: [1, 2, null],
          hit: false,
          loadedFrameIndex: 1,
          evictedPage: null,
          reason: "Cold start load",
          diagnostics: { pageLastUsedStep: {}, pageLoadedAtStep: { 1: 1, 2: 2 }, nextUseDistance: {} },
        },
        {
          stepNumber: 3,
          page: 1,
          frames: [1, 2, null],
          hit: true,
          loadedFrameIndex: null,
          evictedPage: null,
          reason: "Hit",
          diagnostics: { pageLastUsedStep: {}, pageLoadedAtStep: { 1: 1, 2: 2 }, nextUseDistance: {} },
        },
      ],
      totalFaults: 2,
      totalHits: 1,
      hitRatio: 33.33,
      faultRatio: 66.67,
    };

    render(
      <FrameTable
        result={pagingResult}
        currentStepIndex={3}
        colors={{ 1: PROCESS_PALETTE[0]!, 2: PROCESS_PALETTE[1]! }}
        variant="paper"
      />
    );

    expect(screen.getByText("Ref")).toBeDefined();
    expect(screen.getByText("F1")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("✓")).toBeDefined();
    expect(screen.getAllByText("✗").length).toBe(2);
  });

  it("renders DiskHeadChart with paper variant", () => {
    render(
      <DiskHeadChart
        totalCylinders={200}
        lastCylinder={199}
        startHead={50}
        segments={[
          {
            stepIndex: 0,
            from: 50,
            to: 80,
            distance: 30,
            kind: "serve",
            requestId: "R1",
            requestName: "R1",
            cylinder: 80,
            countedInTotal: true,
            narration: "R1 served",
          },
        ]}
        activeStep={1}
        colors={{ R1: PROCESS_PALETTE[0]! }}
        displayNames={{ R1: "R1" }}
        variant="paper"
      />
    );

    const chart = screen.getByRole("img", { name: /disk head movement chart/i });
    expect(chart).toBeDefined();
    expect(chart.getAttribute("class")).toContain("text-foreground");
  });
});
