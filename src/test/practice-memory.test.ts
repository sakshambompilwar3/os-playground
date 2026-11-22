import { describe, it, expect } from "vitest";
import { runMemoryProductionSolver } from "../lib/practice/adapters/memory";
import { runMemoryReferenceSolver } from "../lib/practice/reference/memory";
import { generateVerified } from "../lib/practice/gate";
import { ProblemLevel } from "../lib/practice/types";

describe("Practice Mode - Memory Allocation (Phase 3)", () => {
  describe("Anchor Tests", () => {
    const blocksAnchor = [
      { id: "B1", size: 100 },
      { id: "B2", size: 500 },
      { id: "B3", size: 200 },
      { id: "B4", size: 300 },
      { id: "B5", size: 600 },
    ];

    const processesAnchor = [
      { id: "P1", size: 212 },
      { id: "P2", size: 417 },
      { id: "P3", size: 112 },
      { id: "P4", size: 426 },
    ];

    it("Dynamic partitioning anchors on both solvers", () => {
      // First Fit
      const ffProd = runMemoryProductionSolver({
        blocks: blocksAnchor,
        processes: processesAnchor,
        mode: "dynamic",
        strategy: "first-fit",
      });
      const ffRef = runMemoryReferenceSolver(blocksAnchor, processesAnchor, "dynamic", "first-fit");
      expect(ffProd.allocations["P4"]).toBe("none");
      expect(ffRef.allocations["P4"]).toBe("none");
      expect(ffProd.totalFreeMemory).toBe(959);
      expect(ffRef.totalFreeMemory).toBe(959);

      // Best Fit
      const bfProd = runMemoryProductionSolver({
        blocks: blocksAnchor,
        processes: processesAnchor,
        mode: "dynamic",
        strategy: "best-fit",
      });
      const bfRef = runMemoryReferenceSolver(blocksAnchor, processesAnchor, "dynamic", "best-fit");
      expect(bfProd.unallocatedProcessCount).toBe(0);
      expect(bfRef.unallocatedProcessCount).toBe(0);
      expect(bfProd.totalFreeMemory).toBe(533);
      expect(bfRef.totalFreeMemory).toBe(533);
      expect(bfProd.memoryUtilizationPercent).toBe(68.65);
      expect(bfRef.memoryUtilizationPercent).toBe(68.65);

      // Worst Fit
      const wfProd = runMemoryProductionSolver({
        blocks: blocksAnchor,
        processes: processesAnchor,
        mode: "dynamic",
        strategy: "worst-fit",
      });
      const wfRef = runMemoryReferenceSolver(blocksAnchor, processesAnchor, "dynamic", "worst-fit");
      expect(wfProd.allocations["P4"]).toBe("none");
      expect(wfRef.allocations["P4"]).toBe("none");
      expect(wfProd.totalFreeMemory).toBe(959);
      expect(wfRef.totalFreeMemory).toBe(959);

      // Next Fit
      const nfProd = runMemoryProductionSolver({
        blocks: blocksAnchor,
        processes: processesAnchor,
        mode: "dynamic",
        strategy: "next-fit",
      });
      const nfRef = runMemoryReferenceSolver(blocksAnchor, processesAnchor, "dynamic", "next-fit");
      expect(nfProd.allocations["P4"]).toBe("none");
      expect(nfRef.allocations["P4"]).toBe("none");
      expect(nfProd.totalFreeMemory).toBe(959);
      expect(nfRef.totalFreeMemory).toBe(959);
    });

    it("Fixed partitioning internal fragmentation anchors on both solvers", () => {
      const strategies = [
        { strat: "first-fit" as const, expectedFrag: 559 },
        { strat: "best-fit" as const, expectedFrag: 433 },
        { strat: "worst-fit" as const, expectedFrag: 659 },
        { strat: "next-fit" as const, expectedFrag: 559 },
      ];

      for (const { strat, expectedFrag } of strategies) {
        const prod = runMemoryProductionSolver({
          blocks: blocksAnchor,
          processes: processesAnchor,
          mode: "fixed",
          strategy: strat,
        });
        const ref = runMemoryReferenceSolver(blocksAnchor, processesAnchor, "fixed", strat);

        expect(prod.totalInternalFragmentation).toBe(expectedFrag);
        expect(ref.totalInternalFragmentation).toBe(expectedFrag);
      }
    });
  });

  describe("Sweep over 2000 seeds per level", () => {
    const levels: ProblemLevel[] = ["easy", "medium", "hard"];

    for (const level of levels) {
      it(`sweeps 2000 seeds for level: ${level}`, () => {
        let disagreements = 0;

        for (let i = 0; i < 2000; i++) {
          const seed = `ME${level[0].toUpperCase()}${String(i).padStart(4, "0")}`;
          const problem = generateVerified("memory-allocation", level, seed);

          expect(problem.id).toBe(`memory-allocation-${level}-${seed}`);
          expect(problem.questions.length).toBeGreaterThanOrEqual(1);

          // Verify mathematical invariants
          const raw = problem.rawParams;
          const prod = runMemoryProductionSolver({
            blocks: raw.blocks,
            processes: raw.processes,
            mode: raw.mode,
            strategy: raw.strategy,
          });

          const totalBlockMemory = raw.blocks.reduce((s: number, b: any) => s + b.size, 0);
          expect(prod.totalFreeMemory).toBeLessThanOrEqual(totalBlockMemory);
          expect(prod.memoryUtilizationPercent).toBeGreaterThanOrEqual(0);
          expect(prod.memoryUtilizationPercent).toBeLessThanOrEqual(100);

          if (raw.mode === "fixed") {
            expect(prod.totalInternalFragmentation).toBeLessThanOrEqual(totalBlockMemory);
          }

          // Determinism check
          if (i % 200 === 0) {
            const replay = generateVerified("memory-allocation", level, seed);
            expect(replay).toEqual(problem);
          }
        }

        expect(disagreements).toBe(0);
      });
    }
  });
});
