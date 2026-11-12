import { describe, expect, it } from "vitest";
import {
  compactMemory,
  DEFAULT_EXAMPLE_BLOCKS,
  DEFAULT_EXAMPLE_MEM_PROCESSES,
  retryWaitingAfterCompaction,
  simulateMemoryAllocation,
  type BlockInput,
  type FitStrategy,
  type MemProcessInput,
  type PartitionMode,
} from "@/lib/memory";

describe("memory allocation textbook cases (100, 500, 200, 300, 600 / 212, 417, 112, 426)", () => {
  it("Dynamic First Fit: P1->B2(288 rem), P2->B5(183 rem), P3->B2 rem(176 rem), P4 waits", () => {
    const res = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "dynamic",
      "first-fit",
    );
    expect(res.records.map((r) => [r.processId, r.status, r.start, r.end, r.leftoverHole])).toEqual([
      ["P1", "allocated", 100, 312, 288],
      ["P2", "allocated", 1100, 1517, 183],
      ["P3", "allocated", 312, 424, 176],
      ["P4", "waiting", null, null, 0],
    ]);
    expect(res.summary.totalMemory).toBe(1700);
    expect(res.summary.allocatedProcessMemory).toBe(741);
    expect(res.summary.totalFreeMemory).toBe(959);
    expect(res.summary.largestFreeHole).toBe(300);
    expect(res.summary.externalFragApplies).toBe(true);
    expect(res.records[3]!.waitReason).toContain("426 KB");
    expect(res.records[3]!.waitReason).toContain("300 KB");
  });

  it("Dynamic Best Fit: allocates all 4 processes (B4, B2, B3, B5)", () => {
    const res = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "dynamic",
      "best-fit",
    );
    expect(res.records.map((r) => [r.processId, r.allocatedTo, r.leftoverHole])).toEqual([
      ["P1", "B4", 88],
      ["P2", "B2", 83],
      ["P3", "B3", 88],
      ["P4", "B5", 174],
    ]);
    expect(res.summary.waitingCount).toBe(0);
    expect(res.summary.allocatedProcessMemory).toBe(1167);
    expect(res.summary.totalFreeMemory).toBe(533);
  });

  it("Dynamic Worst Fit: P1->B5(388 rem), P2->B2(83 rem), P3->B5 rem(276 rem), P4 waits", () => {
    const res = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "dynamic",
      "worst-fit",
    );
    expect(res.records.map((r) => [r.processId, r.status, r.start, r.end, r.leftoverHole])).toEqual([
      ["P1", "allocated", 1100, 1312, 388],
      ["P2", "allocated", 100, 517, 83],
      ["P3", "allocated", 1312, 1424, 276],
      ["P4", "waiting", null, null, 0],
    ]);
    expect(res.summary.waitingCount).toBe(1);
    expect(res.summary.largestFreeHole).toBe(300);
  });

  it("Dynamic Next Fit: P1->B2(288 rem), P2->B5(183 rem), P3->B5 rem(71 rem), P4 waits", () => {
    const res = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "dynamic",
      "next-fit",
    );
    expect(res.records.map((r) => [r.processId, r.status, r.start, r.end, r.leftoverHole])).toEqual([
      ["P1", "allocated", 100, 312, 288],
      ["P2", "allocated", 1100, 1517, 183],
      ["P3", "allocated", 1517, 1629, 71],
      ["P4", "waiting", null, null, 0],
    ]);
    expect(res.summary.waitingCount).toBe(1);
  });

  it("Fixed First Fit: P1->B2(288 int), P2->B5(183 int), P3->B3(88 int), P4 waits", () => {
    const res = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "fixed",
      "first-fit",
    );
    expect(res.records.map((r) => [r.processId, r.allocatedTo, r.internalFrag, r.status])).toEqual([
      ["P1", "B2", 288, "allocated"],
      ["P2", "B5", 183, "allocated"],
      ["P3", "B3", 88, "allocated"],
      ["P4", null, 0, "waiting"],
    ]);
    expect(res.summary.totalInternalFrag).toBe(288 + 183 + 88);
    expect(res.summary.totalFreeMemory).toBe(100 + 300);
  });

  it("Fixed Best Fit: allocates all 4 processes (B4, B2, B3, B5) with internal frag", () => {
    const res = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "fixed",
      "best-fit",
    );
    expect(res.records.map((r) => [r.processId, r.allocatedTo, r.internalFrag])).toEqual([
      ["P1", "B4", 88],
      ["P2", "B2", 83],
      ["P3", "B3", 88],
      ["P4", "B5", 174],
    ]);
    expect(res.summary.waitingCount).toBe(0);
    expect(res.summary.totalInternalFrag).toBe(88 + 83 + 88 + 174);
  });

  it("Fixed Worst Fit: P1->B5, P2->B2, P3->B4, P4 waits", () => {
    const res = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "fixed",
      "worst-fit",
    );
    expect(res.records.map((r) => [r.processId, r.allocatedTo, r.internalFrag, r.status])).toEqual([
      ["P1", "B5", 388, "allocated"],
      ["P2", "B2", 83, "allocated"],
      ["P3", "B4", 188, "allocated"],
      ["P4", null, 0, "waiting"],
    ]);
  });

  it("Fixed Next Fit: P1->B2, P2->B5, P3->B3 (wraps), P4 waits", () => {
    const res = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "fixed",
      "next-fit",
    );
    expect(res.records.map((r) => [r.processId, r.allocatedTo, r.status])).toEqual([
      ["P1", "B2", "allocated"],
      ["P2", "B5", "allocated"],
      ["P3", "B3", "allocated"],
      ["P4", null, "waiting"],
    ]);
  });
});

describe("edge cases & compaction", () => {
  it("exact-size fit in dynamic mode leaves no zero-size hole", () => {
    const res = simulateMemoryAllocation(
      [{ id: "B1", size: 200 }, { id: "B2", size: 300 }],
      [{ id: "P1", name: "App", size: 200 }],
      "dynamic",
      "first-fit",
    );
    expect(res.finalSegments).toHaveLength(2);
    expect(res.finalSegments.every((s) => s.size > 0)).toBe(true);
    expect(res.records[0]!.leftoverHole).toBe(0);
  });

  it("Best Fit and Worst Fit break ties by lowest address", () => {
    const blocks: BlockInput[] = [
      { id: "B1", size: 300 },
      { id: "B2", size: 300 },
    ];
    const procs: MemProcessInput[] = [{ id: "P1", name: "App", size: 150 }];
    const best = simulateMemoryAllocation(blocks, procs, "dynamic", "best-fit");
    const worst = simulateMemoryAllocation(blocks, procs, "dynamic", "worst-fit");
    expect(best.records[0]!.allocatedTo).toBe("B1");
    expect(worst.records[0]!.allocatedTo).toBe("B1");
  });

  it("Compaction merges all free holes into one and allows waiting P4 (426 KB) to fit", () => {
    const sim = simulateMemoryAllocation(
      DEFAULT_EXAMPLE_BLOCKS,
      DEFAULT_EXAMPLE_MEM_PROCESSES,
      "dynamic",
      "first-fit",
    );
    const compacted = compactMemory(sim.finalSegments, sim.records);
    expect(compacted.mergedHoleSize).toBe(959);
    expect(compacted.segmentsAfter.filter((s) => s.kind === "free")).toHaveLength(1);
    const freeSeg = compacted.segmentsAfter.find((s) => s.kind === "free")!;
    expect(freeSeg.start).toBe(741);
    expect(freeSeg.end).toBe(1700);

    const retried = retryWaitingAfterCompaction(compacted.segmentsAfter, sim.records, "first-fit");
    expect(retried.summary.waitingCount).toBe(0);
    expect(retried.records[3]!.status).toBe("allocated");
    expect(retried.records[3]!.start).toBe(741);
    expect(retried.records[3]!.end).toBe(1167);
  });
});

describe("randomized memory invariants (250 runs)", () => {
  function seededRng(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  it("preserves total memory, contiguous addresses, and fragmentation invariants across 250 random runs", () => {
    const rng = seededRng(42);
    const modes: PartitionMode[] = ["fixed", "dynamic"];
    const strategies: FitStrategy[] = ["first-fit", "best-fit", "worst-fit", "next-fit"];

    for (let trial = 0; trial < 250; trial += 1) {
      const numBlocks = 1 + Math.floor(rng() * 10);
      const numProcs = 1 + Math.floor(rng() * 10);
      const blocks: BlockInput[] = Array.from({ length: numBlocks }, (_, i) => ({
        id: `B${i + 1}`,
        size: 50 + Math.floor(rng() * 600),
      }));
      const procs: MemProcessInput[] = Array.from({ length: numProcs }, (_, i) => ({
        id: `P${i + 1}`,
        name: `App${i + 1}`,
        size: 30 + Math.floor(rng() * 550),
      }));
      const mode = modes[trial % modes.length]!;
      const strategy = strategies[Math.floor(trial / 2) % strategies.length]!;

      const res = simulateMemoryAllocation(blocks, procs, mode, strategy);
      const expectedTotal = blocks.reduce((a, b) => a + b.size, 0);

      expect(res.summary.totalMemory).toBe(expectedTotal);

      let cursor = 0;
      for (const seg of res.finalSegments) {
        expect(seg.size).toBeGreaterThan(0);
        expect(seg.start).toBe(cursor);
        expect(seg.end).toBe(cursor + seg.size);
        cursor = seg.end;
      }
      expect(cursor).toBe(expectedTotal);

      expect(
        res.summary.allocatedProcessMemory + res.summary.totalInternalFrag + res.summary.totalFreeMemory,
      ).toBe(expectedTotal);

      if (mode === "fixed") {
        expect(res.finalSegments.length).toBe(blocks.length);
      } else {
        expect(res.summary.totalInternalFrag).toBe(0);
        const compacted = compactMemory(res.finalSegments, res.records);
        expect(compacted.summaryAfter.totalMemory).toBe(expectedTotal);
        expect(compacted.segmentsAfter.filter((s) => s.kind === "free").length).toBeLessThanOrEqual(1);
      }
    }
  });
});
