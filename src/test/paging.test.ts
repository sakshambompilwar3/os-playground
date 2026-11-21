import { describe, expect, it } from "vitest";
import {
  effectiveAccessTime,
  findBelady,
  frameSweep,
  pickBest,
  simulatePaging,
  type PagingAlgorithm,
} from "@/lib/paging";

describe("Page Replacement Algorithmic Engine (src/lib/paging.ts)", () => {
  const textbookRefs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
  const beladyRefs = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

  describe("Textbook Benchmark: 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1 with 3 frames", () => {
    it("FIFO produces exactly 15 faults, 5 hits, 75% fault ratio, correct fault steps and eviction order", () => {
      const res = simulatePaging("fifo", textbookRefs, 3);

      expect(res.faults).toBe(15);
      expect(res.hits).toBe(5);
      expect(res.hitRatio).toBe(0.25);
      expect(res.faultRatio).toBe(0.75);
      expect(res.evictions).toBe(12);

      const faultSteps = res.steps.filter((s) => !s.hit).map((s) => s.stepNumber);
      expect(faultSteps).toEqual([1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 14, 15, 18, 19, 20]);

      expect(res.evictionOrder).toEqual([7, 0, 1, 2, 3, 0, 4, 2, 3, 0, 1, 2]);
      expect(res.finalFrames).toEqual([7, 0, 1]);
    });

    it("LRU produces exactly 12 faults, 8 hits, 60% fault ratio, correct fault steps, and final page set {0, 1, 7}", () => {
      const res = simulatePaging("lru", textbookRefs, 3);

      expect(res.faults).toBe(12);
      expect(res.hits).toBe(8);
      expect(res.hitRatio).toBe(0.4);
      expect(res.faultRatio).toBe(0.6);
      expect(res.evictions).toBe(9);

      const faultSteps = res.steps.filter((s) => !s.hit).map((s) => s.stepNumber);
      expect(faultSteps).toEqual([1, 2, 3, 4, 6, 8, 9, 10, 11, 14, 16, 18]);

      const finalSet = new Set(res.finalFrames.filter((f) => f !== null));
      expect(finalSet).toEqual(new Set([0, 1, 7]));
    });

    it("OPTIMAL produces exactly 9 faults, 11 hits, 45% fault ratio, correct fault steps, and final page set {0, 1, 7}", () => {
      const res = simulatePaging("optimal", textbookRefs, 3);

      expect(res.faults).toBe(9);
      expect(res.hits).toBe(11);
      expect(res.hitRatio).toBe(0.55);
      expect(res.faultRatio).toBe(0.45);
      expect(res.evictions).toBe(6);

      const faultSteps = res.steps.filter((s) => !s.hit).map((s) => s.stepNumber);
      expect(faultSteps).toEqual([1, 2, 3, 4, 6, 8, 11, 14, 18]);

      const finalSet = new Set(res.finalFrames.filter((f) => f !== null));
      expect(finalSet).toEqual(new Set([0, 1, 7]));
    });
  });

  describe("Belady's Anomaly Benchmark: 1 2 3 4 1 2 5 1 2 3 4 5", () => {
    it("detects Belady anomaly in FIFO (9 faults at 3 frames vs 10 faults at 4 frames)", () => {
      const fifo3 = simulatePaging("fifo", beladyRefs, 3);
      const fifo4 = simulatePaging("fifo", beladyRefs, 4);

      expect(fifo3.faults).toBe(9);
      expect(fifo4.faults).toBe(10);

      const anomalies = findBelady(beladyRefs, 10, "fifo");
      expect(anomalies.some((a) => a.k === 3 && a.faultsK === 9 && a.faultsKPlus1 === 10)).toBe(
        true,
      );
    });

    it("verifies LRU never suffers from Belady anomaly (10 faults at 3 frames down to 8 at 4 frames)", () => {
      const lru3 = simulatePaging("lru", beladyRefs, 3);
      const lru4 = simulatePaging("lru", beladyRefs, 4);

      expect(lru3.faults).toBe(10);
      expect(lru4.faults).toBe(8);

      const lruAnomalies = findBelady(beladyRefs, 10, "lru");
      expect(lruAnomalies).toHaveLength(0);
    });

    it("verifies OPTIMAL never suffers from Belady anomaly (7 faults at 3 frames down to 6 at 4 frames)", () => {
      const opt3 = simulatePaging("optimal", beladyRefs, 3);
      const opt4 = simulatePaging("optimal", beladyRefs, 4);

      expect(opt3.faults).toBe(7);
      expect(opt4.faults).toBe(6);

      const optAnomalies = findBelady(beladyRefs, 10, "optimal");
      expect(optAnomalies).toHaveLength(0);
    });
  });

  describe("Edge cases & Boundary values", () => {
    it("with 1 frame every algorithm gives 20 faults on textbook string", () => {
      for (const algo of ["fifo", "lru", "optimal"] as const) {
        const res = simulatePaging(algo, textbookRefs, 1);
        expect(res.faults).toBe(20);
        expect(res.hits).toBe(0);
      }
    });

    it("with 6 or more frames (distinct count = 6) every algorithm gives exactly 6 faults on textbook string", () => {
      for (const frames of [6, 7, 8, 10]) {
        for (const algo of ["fifo", "lru", "optimal"] as const) {
          const res = simulatePaging(algo, textbookRefs, frames);
          expect(res.faults).toBe(6);
          expect(res.hits).toBe(14);
        }
      }
    });

    it("effectiveAccessTime calculation returns exact ns", () => {
      // p = 0.001, 200 ns, 8 ms => 8199.8 ns
      const eat1 = effectiveAccessTime(0.001, 200, 8);
      expect(eat1).toBeCloseTo(8199.8, 5);

      // p = 0.75, 200 ns, 8 ms => 6000050 ns
      const eat2 = effectiveAccessTime(0.75, 200, 8);
      expect(eat2).toBe(6000050);
    });
  });

  describe("pickBest verdict logic", () => {
    it("picks LRU as best practical when it has fewer faults than FIFO", () => {
      const fifo = simulatePaging("fifo", textbookRefs, 3);
      const lru = simulatePaging("lru", textbookRefs, 3);
      const optimal = simulatePaging("optimal", textbookRefs, 3);

      const verdict = pickBest({ fifo, lru, optimal });
      expect(verdict.bestPossible).toBe("optimal");
      expect(verdict.bestPractical).toBe("lru");
      expect(verdict.gapFifo).toBe(6);
      expect(verdict.gapLru).toBe(3);
      expect(verdict.explanation).toContain("LRU is the best practical algorithm");
      expect(verdict.explanation).toContain(
        "Best here means the fewest page faults for this string and frame count. A different string can change the answer.",
      );
    });

    it("reports tie when FIFO and LRU have equal faults", () => {
      const refs = [1, 2, 3, 1, 2, 3];
      const fifo = simulatePaging("fifo", refs, 3);
      const lru = simulatePaging("lru", refs, 3);
      const optimal = simulatePaging("optimal", refs, 3);

      const verdict = pickBest({ fifo, lru, optimal });
      expect(verdict.bestPractical).toBe("tie");
      expect(verdict.explanation).toContain("tied");
    });
  });

  describe("Invariants across 300+ randomized inputs", () => {
    it("preserves all required invariants across 350 random configurations", () => {
      const algorithms: PagingAlgorithm[] = ["fifo", "lru", "optimal"];

      for (let run = 0; run < 350; run++) {
        const len = 1 + Math.floor(Math.random() * 40);
        const maxPage = 1 + Math.floor(Math.random() * 16);
        const refs: number[] = Array.from({ length: len }, () =>
          Math.floor(Math.random() * maxPage),
        );
        const frames = 1 + Math.floor(Math.random() * 10);
        const distinctCount = new Set(refs).size;

        const results = {
          fifo: simulatePaging("fifo", refs, frames),
          lru: simulatePaging("lru", refs, frames),
          optimal: simulatePaging("optimal", refs, frames),
        };

        for (const algo of algorithms) {
          const res = results[algo];

          // 1. faults + hits = n
          expect(res.faults + res.hits).toBe(len);

          // 2. faults >= distinctCount (each unique page must be loaded at least once)
          expect(res.faults).toBeGreaterThanOrEqual(Math.min(distinctCount, len));
          expect(res.faults).toBeLessThanOrEqual(len);

          // 3. evictions = max(0, faults - frames)
          expect(res.evictions).toBe(Math.max(0, res.faults - frames));

          // 4. frames never hold duplicate pages or more than F pages
          for (const step of res.steps) {
            const nonNullFrames = step.frames.filter((p) => p !== null);
            expect(nonNullFrames.length).toBeLessThanOrEqual(frames);
            const frameSet = new Set(nonNullFrames);
            expect(frameSet.size).toBe(nonNullFrames.length);
          }
        }

        // 5. Optimal faults <= FIFO faults and <= LRU faults
        expect(results.optimal.faults).toBeLessThanOrEqual(results.fifo.faults);
        expect(results.optimal.faults).toBeLessThanOrEqual(results.lru.faults);

        // 6. LRU and Optimal fault counts never increase as frames increase
        const lruSweep = frameSweep("lru", refs, 6);
        for (let i = 0; i < lruSweep.length - 1; i++) {
          expect(lruSweep[i + 1]!.faults).toBeLessThanOrEqual(lruSweep[i]!.faults);
        }

        const optSweep = frameSweep("optimal", refs, 6);
        for (let i = 0; i < optSweep.length - 1; i++) {
          expect(optSweep[i + 1]!.faults).toBeLessThanOrEqual(optSweep[i]!.faults);
        }

        // 7. pickBest returns a winner whose faults equal true minimum
        const verdict = pickBest(results);
        const trueMinPractical = Math.min(results.fifo.faults, results.lru.faults);
        if (results.fifo.faults === results.lru.faults) {
          expect(verdict.bestPractical).toBe("tie");
        } else if (results.lru.faults < results.fifo.faults) {
          expect(verdict.bestPractical).toBe("lru");
        } else {
          expect(verdict.bestPractical).toBe("fifo");
        }
      }
    });
  });
});
