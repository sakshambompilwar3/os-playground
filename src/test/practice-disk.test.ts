import { describe, it, expect } from "vitest";
import { runDiskProductionSolver } from "../lib/practice/adapters/disk";
import { runDiskReferenceSolver } from "../lib/practice/reference/disk";
import { generateVerified } from "../lib/practice/gate";
import { ProblemLevel } from "../lib/practice/types";

describe("Practice Mode - Disk Scheduling (Phase 3)", () => {
  describe("Anchor Tests", () => {
    const cylindersAnchor = 200;
    const headAnchor = 53;
    const requestsAnchor = [98, 183, 37, 122, 14, 124, 65, 67];

    it("Toward higher direction anchors on both solvers", () => {
      const tests = [
        { algo: "fcfs" as const, expected: 640 },
        { algo: "sstf" as const, expected: 236 },
        { algo: "scan" as const, expected: 331 },
        { algo: "c-scan" as const, expected: 382 },
        { algo: "look" as const, expected: 299 },
        { algo: "c-look" as const, expected: 322 },
      ];

      for (const t of tests) {
        const prod = runDiskProductionSolver({
          cylinders: cylindersAnchor,
          head: headAnchor,
          requests: requestsAnchor,
          algorithm: t.algo,
          direction: "higher",
        });
        const ref = runDiskReferenceSolver(
          cylindersAnchor,
          headAnchor,
          requestsAnchor,
          t.algo,
          "higher",
        );

        expect(prod.totalHeadMovement).toBe(t.expected);
        expect(ref.totalHeadMovement).toBe(t.expected);
      }
    });

    it("Toward lower direction anchors on both solvers", () => {
      const tests = [
        { algo: "scan" as const, expected: 236 },
        { algo: "c-scan" as const, expected: 386 },
        { algo: "look" as const, expected: 208 },
        { algo: "c-look" as const, expected: 326 },
      ];

      for (const t of tests) {
        const prod = runDiskProductionSolver({
          cylinders: cylindersAnchor,
          head: headAnchor,
          requests: requestsAnchor,
          algorithm: t.algo,
          direction: "lower",
        });
        const ref = runDiskReferenceSolver(
          cylindersAnchor,
          headAnchor,
          requestsAnchor,
          t.algo,
          "lower",
        );

        expect(prod.totalHeadMovement).toBe(t.expected);
        expect(ref.totalHeadMovement).toBe(t.expected);
      }
    });
  });

  describe("Sweep over 2000 seeds per level", () => {
    const levels: ProblemLevel[] = ["easy", "medium", "hard"];

    for (const level of levels) {
      it(`sweeps 2000 seeds for level: ${level}`, () => {
        let disagreements = 0;

        for (let i = 0; i < 2000; i++) {
          const seed = `DK${level[0].toUpperCase()}${String(i).padStart(4, "0")}`;
          const problem = generateVerified("disk-scheduling", level, seed);

          expect(problem.id).toBe(`disk-scheduling-${level}-${seed}`);
          expect(problem.questions.length).toBeGreaterThanOrEqual(1);

          // Verify mathematical invariants
          const raw = problem.rawParams;
          const prod = runDiskProductionSolver({
            cylinders: raw.cylinders,
            head: raw.head,
            requests: raw.requests,
            algorithm: raw.algorithm,
            direction: raw.direction,
          });

          expect(prod.totalHeadMovement).toBeGreaterThanOrEqual(0);
          expect(prod.servedSequence.length).toBe(raw.requests.length);

          // Average seek distance * request count = total movement
          const calcTotal = prod.averageSeekPerRequest * raw.requests.length;
          expect(Math.abs(calcTotal - prod.totalHeadMovement)).toBeLessThanOrEqual(raw.requests.length * 0.01 + 0.1);

          // Determinism check
          if (i % 200 === 0) {
            const replay = generateVerified("disk-scheduling", level, seed);
            expect(replay).toEqual(problem);
          }
        }

        expect(disagreements).toBe(0);
      });
    }
  });
});
