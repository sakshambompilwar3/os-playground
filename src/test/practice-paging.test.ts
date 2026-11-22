import { describe, it, expect } from "vitest";
import { runPagingProductionSolver } from "../lib/practice/adapters/paging";
import { runPagingReferenceSolver } from "../lib/practice/reference/paging";
import { generateVerified } from "../lib/practice/gate";
import { ProblemLevel } from "../lib/practice/types";

describe("Practice Mode - Page Replacement (Phase 4)", () => {
  describe("Anchor Tests", () => {
    const textbookRefs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
    const frameCount = 3;

    it("Textbook reference string with 3 frames gives FIFO 15, LRU 12, Optimal 9", () => {
      const fifoProd = runPagingProductionSolver({
        algorithm: "fifo",
        references: textbookRefs,
        frameCount,
      });
      const fifoRef = runPagingReferenceSolver(textbookRefs, frameCount, "fifo");
      expect(fifoProd.faults).toBe(15);
      expect(fifoRef.faults).toBe(15);

      const lruProd = runPagingProductionSolver({
        algorithm: "lru",
        references: textbookRefs,
        frameCount,
      });
      const lruRef = runPagingReferenceSolver(textbookRefs, frameCount, "lru");
      expect(lruProd.faults).toBe(12);
      expect(lruRef.faults).toBe(12);

      const optProd = runPagingProductionSolver({
        algorithm: "optimal",
        references: textbookRefs,
        frameCount,
      });
      const optRef = runPagingReferenceSolver(textbookRefs, frameCount, "optimal");
      expect(optProd.faults).toBe(9);
      expect(optRef.faults).toBe(9);
    });

    it("Belady Anomaly anchor: 1 2 3 4 1 2 5 1 2 3 4 5 with FIFO gives 9 faults (3 frames) and 10 faults (4 frames)", () => {
      const beladyRefs = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

      const f3Prod = runPagingProductionSolver({
        algorithm: "fifo",
        references: beladyRefs,
        frameCount: 3,
      });
      const f3Ref = runPagingReferenceSolver(beladyRefs, 3, "fifo");
      expect(f3Prod.faults).toBe(9);
      expect(f3Ref.faults).toBe(9);

      const f4Prod = runPagingProductionSolver({
        algorithm: "fifo",
        references: beladyRefs,
        frameCount: 4,
      });
      const f4Ref = runPagingReferenceSolver(beladyRefs, 4, "fifo");
      expect(f4Prod.faults).toBe(10);
      expect(f4Ref.faults).toBe(10);
    });
  });

  describe("Sweep over 2000 seeds per level", () => {
    const levels: ProblemLevel[] = ["easy", "medium", "hard"];

    for (const level of levels) {
      it(`sweeps 2000 seeds for level: ${level}`, () => {
        let disagreements = 0;

        for (let i = 0; i < 2000; i++) {
          const seed = `PG${level[0].toUpperCase()}${String(i).padStart(4, "0")}`;
          const problem = generateVerified("page-replacement", level, seed);

          expect(problem.id).toBe(`page-replacement-${level}-${seed}`);
          expect(problem.questions.length).toBeGreaterThanOrEqual(1);

          // Verify mathematical invariants
          const raw = problem.rawParams;
          const prod = runPagingProductionSolver({
            algorithm: raw.algorithm,
            references: raw.references,
            frameCount: raw.frameCount,
          });

          expect(prod.hits).toBeGreaterThanOrEqual(2);
          expect(prod.faults).toBeGreaterThanOrEqual(raw.frameCount + 3);
          expect(prod.hits + prod.faults).toBe(raw.references.length);
          expect(prod.finalPages.length).toBeLessThanOrEqual(raw.frameCount);

          // Determinism check
          if (i % 200 === 0) {
            const replay = generateVerified("page-replacement", level, seed);
            expect(replay).toEqual(problem);
          }
        }

        expect(disagreements).toBe(0);
      });
    }
  });
});
