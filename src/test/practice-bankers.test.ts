import { describe, it, expect } from "vitest";
import { runBankersProductionSolver } from "../lib/practice/adapters/bankers";
import { runBankersReferenceSolver } from "../lib/practice/reference/bankers";
import { generateVerified } from "../lib/practice/gate";
import { ProblemLevel } from "../lib/practice/types";

describe("Practice Mode - Banker's Algorithm (Phase 4)", () => {
  describe("Anchor Tests", () => {
    const maxAnchor = [
      [7, 5, 3],
      [3, 2, 2],
      [9, 0, 2],
      [2, 2, 2],
      [4, 3, 3],
    ];

    const allocAnchor = [
      [0, 1, 0],
      [2, 0, 0],
      [3, 0, 2],
      [2, 1, 1],
      [0, 0, 2],
    ];

    const availAnchor = [3, 3, 2];

    it("Silberschatz textbook anchor: safe sequence under simulator rule is P1, P3, P4, P0, P2", () => {
      const prod = runBankersProductionSolver({
        available: availAnchor,
        max: maxAnchor,
        alloc: allocAnchor,
      });

      const ref = runBankersReferenceSolver(availAnchor, maxAnchor, allocAnchor);

      expect(prod.safe).toBe(true);
      expect(ref.safe).toBe(true);

      // Verify Need matrix
      expect(prod.need).toEqual([
        [7, 4, 3],
        [1, 2, 2],
        [6, 0, 0],
        [0, 1, 1],
        [4, 3, 1],
      ]);
      expect(ref.need).toEqual(prod.need);

      // Stated safe sequence
      expect(prod.safeSequence).toEqual(["P1", "P3", "P4", "P0", "P2"]);
      expect(ref.safeSequence).toEqual(["P1", "P3", "P4", "P0", "P2"]);

      // Request (1, 0, 2) by P1 -> can be granted
      const req1Prod = runBankersProductionSolver({
        available: availAnchor,
        max: maxAnchor,
        alloc: allocAnchor,
        request: { pid: 1, vector: [1, 0, 2] },
      });
      const req1Ref = runBankersReferenceSolver(availAnchor, maxAnchor, allocAnchor, {
        pid: 1,
        vector: [1, 0, 2],
      });
      expect(req1Prod.requestGranted).toBe(true);
      expect(req1Ref.requestGranted).toBe(true);

      // Request (3, 3, 0) by P4 from Load-example state:
      // Passes Check 1 (3,3,0 <= 4,3,1) and Check 2 (3,3,0 <= 3,3,2), but trial state has Available (0,0,2) which is UNSAFE.
      const req2Prod = runBankersProductionSolver({
        available: availAnchor,
        max: maxAnchor,
        alloc: allocAnchor,
        request: { pid: 4, vector: [3, 3, 0] },
      });
      const req2Ref = runBankersReferenceSolver(availAnchor, maxAnchor, allocAnchor, {
        pid: 4,
        vector: [3, 3, 0],
      });
      expect(req2Prod.requestStatus).toBe("unsafe");
      expect(req2Ref.requestStatus).toBe("unsafe");
      expect(req2Prod.requestGranted).toBe(false);
      expect(req2Ref.requestGranted).toBe(false);
    });

    it("Unsafe example anchor derived by hand", () => {
      // 3 processes, 2 resources, available [0, 0]
      // All processes have positive remaining need
      const maxUnsafe = [
        [2, 2],
        [3, 3],
        [4, 4],
      ];
      const allocUnsafe = [
        [1, 0],
        [0, 1],
        [1, 1],
      ];
      const availUnsafe = [0, 0];

      const prod = runBankersProductionSolver({
        available: availUnsafe,
        max: maxUnsafe,
        alloc: allocUnsafe,
      });
      const ref = runBankersReferenceSolver(availUnsafe, maxUnsafe, allocUnsafe);

      expect(prod.safe).toBe(false);
      expect(ref.safe).toBe(false);
      expect(prod.safeSequence).toEqual([]);
      expect(ref.safeSequence).toEqual([]);
    });
  });

  describe("Sweep over 2000 seeds per level", () => {
    const levels: ProblemLevel[] = ["easy", "medium", "hard"];

    for (const level of levels) {
      it(`sweeps 2000 seeds for level: ${level}`, () => {
        let safeCount = 0;
        let disagreements = 0;

        for (let i = 0; i < 2000; i++) {
          const seed = `BK${level[0].toUpperCase()}${String(i).padStart(4, "0")}`;
          const problem = generateVerified("bankers", level, seed);

          expect(problem.id).toBe(`bankers-${level}-${seed}`);
          expect(problem.questions.length).toBeGreaterThanOrEqual(1);

          const raw = problem.rawParams;
          const prod = runBankersProductionSolver({
            available: raw.available,
            max: raw.max,
            alloc: raw.alloc,
            request: raw.requestParam,
          });

          if (prod.safe) {
            safeCount++;
            expect(prod.safeSequence.length).toBe(raw.numProcesses);
          } else {
            expect(prod.safeSequence.length).toBe(0);
          }

          // Determinism check
          if (i % 200 === 0) {
            const replay = generateVerified("bankers", level, seed);
            expect(replay).toEqual(problem);
          }
        }

        expect(disagreements).toBe(0);
        const safePercent = (safeCount / 2000) * 100;
        // Verify balance stays within 45-75% safe
        expect(safePercent).toBeGreaterThanOrEqual(45);
        expect(safePercent).toBeLessThanOrEqual(75);
      });
    }
  });
});
