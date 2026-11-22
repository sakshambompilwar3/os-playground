import { describe, it, expect } from "vitest";
import { generateVerified } from "@/lib/practice/gate";
import { TOPIC_SELECTORS, parsePracticeUrlParams } from "@/lib/practice/subtopics";
import { ProblemLevel, ProblemTopic } from "@/lib/practice/types";
import { runMemoryProductionSolver } from "@/lib/practice/adapters/memory";
import { simulateMemoryAllocation } from "@/lib/memory";
import { PROCESS_PALETTE } from "@/lib/palette";

// --- Contrast ratio utility (WCAG 2.1) ---
function parseColor(str: string): [number, number, number] {
  if (str.startsWith("#")) {
    const hex = str.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r, g, b];
  }
  // Approximate standard CSS colors used in the app
  if (str === "var(--foreground)" || str === "#1F2937") return [0.12, 0.16, 0.22];
  if (str === "var(--chalk)" || str === "#244933") return [0.14, 0.29, 0.20];
  if (str === "var(--paper)" || str === "#FFFDF7") return [1.0, 0.99, 0.97];
  if (str === "var(--highlight)" || str === "#FFE566") return [1.0, 0.90, 0.40];
  if (str === "#a64024") return [0.65, 0.25, 0.14];
  if (str.startsWith("oklch")) {
    // Parse L C H from oklch(L C H)
    const match = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
    if (match) {
      const L = parseFloat(match[1]!);
      // Rough RGB estimation from OKLCH lightness
      return [L, L, L];
    }
  }
  return [0.5, 0.5, 0.5];
}

function sRgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(sRgbToLinear);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(parseColor(color1));
  const l2 = relativeLuminance(parseColor(color2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Practice Mode Subtopic & Random Tests", () => {
  const TOPICS: ProblemTopic[] = [
    "cpu-scheduling",
    "memory-allocation",
    "disk-scheduling",
    "page-replacement",
    "bankers-algorithm",
  ];

  // 1. Concrete subtopic generation across levels with 500 seeds each
  describe("Concrete subtopic options at every level (500 seeds per combination)", () => {
    it("generates CPU scheduling for all 6 algorithms across levels without errors", () => {
      const algos = ["fcfs", "sjf", "srtf", "rr", "priority-np", "priority-p"];
      const levels: ProblemLevel[] = ["easy", "medium", "hard"];

      for (const algo of algos) {
        for (const level of levels) {
          for (let seedNum = 1; seedNum <= 500; seedNum++) {
            const seed = `CP${algo.slice(0, 2)}${level[0]}${seedNum}`;
            const problem = generateVerified("cpu-scheduling", level, seed, { sub: algo });

            expect(problem).toBeDefined();
            expect(problem.subtopic).toBe(algo);

            // Tie checks for Easy and Medium:
            // For SJF/SRTF: burst times must be distinct
            if (
              (level === "easy" || level === "medium") &&
              (algo === "sjf" || algo === "srtf")
            ) {
              const bursts = problem.rawParams.processes.map((p: any) => p.burstTime);
              const uniqueBursts = new Set(bursts);
              expect(uniqueBursts.size).toBe(bursts.length);
            }
            // For Priority scheduling: priorities must be distinct
            if (
              (level === "easy" || level === "medium") &&
              algo.startsWith("priority")
            ) {
              const priorities = problem.rawParams.processes.map((p: any) => p.priority);
              const uniquePriorities = new Set(priorities);
              expect(uniquePriorities.size).toBe(priorities.length);
            }
          }
        }
      }
    });

    it("generates Memory allocation for all 8 mode/strategy combinations across levels without errors", () => {
      const modes: Array<"fixed" | "dynamic"> = ["fixed", "dynamic"];
      const strategies: Array<"first-fit" | "best-fit" | "worst-fit" | "next-fit"> = [
        "first-fit",
        "best-fit",
        "worst-fit",
        "next-fit",
      ];
      const levels: ProblemLevel[] = ["easy", "medium", "hard"];

      for (const mode of modes) {
        for (const strategy of strategies) {
          for (const level of levels) {
            for (let seedNum = 1; seedNum <= 500; seedNum++) {
              const seed = `M${mode[0]}${strategy[0]}${level[0]}${seedNum}`;
              const problem = generateVerified("memory-allocation", level, seed, {
                mode,
                strategy,
              });

              expect(problem).toBeDefined();
              expect(problem.rawParams.mode).toBe(mode);
              expect(problem.rawParams.strategy).toBe(strategy);

              // Tie check for Easy and Medium: block sizes must be distinct
              if (level === "easy" || level === "medium") {
                const sizes = problem.rawParams.blocks.map((b: any) => b.size);
                const uniqueSizes = new Set(sizes);
                expect(uniqueSizes.size).toBe(sizes.length);
              }
            }
          }
        }
      }
    });

    it("generates Disk scheduling for all 6 algorithms across levels without errors", () => {
      const algos = ["fcfs", "sstf", "scan", "c-scan", "look", "c-look"];
      const levels: ProblemLevel[] = ["easy", "medium", "hard"];

      for (const algo of algos) {
        for (const level of levels) {
          for (let seedNum = 1; seedNum <= 500; seedNum++) {
            const seed = `D${algo.slice(0, 2)}${level[0]}${seedNum}`;
            const problem = generateVerified("disk-scheduling", level, seed, { sub: algo });

            expect(problem).toBeDefined();
            expect(problem.subtopic).toBe(algo);
            expect(problem.rawParams.algorithm).toBe(algo);

            if (level === "easy" || level === "medium") {
              const reqs = problem.rawParams.requests;
              const uniqueReqs = new Set(reqs);
              expect(uniqueReqs.size).toBe(reqs.length);
            }
          }
        }
      }
    });

    it("generates Page Replacement for all 3 algorithms across levels without errors", () => {
      const algos = ["fifo", "lru", "optimal"];
      const levels: ProblemLevel[] = ["easy", "medium", "hard"];

      for (const algo of algos) {
        for (const level of levels) {
          for (let seedNum = 1; seedNum <= 500; seedNum++) {
            const seed = `P${algo.slice(0, 2)}${level[0]}${seedNum}`;
            const problem = generateVerified("page-replacement", level, seed, { sub: algo });

            expect(problem).toBeDefined();
            expect(problem.subtopic).toBe(algo);
            expect(problem.rawParams.algorithm).toBe(algo);
          }
        }
      }
    });

    it("generates Banker's Algorithm for all 3 subtopics across levels without errors", () => {
      const subtopics = ["safety-check", "safe-sequence", "resource-request"];
      const levels: ProblemLevel[] = ["easy", "medium", "hard"];

      for (const sub of subtopics) {
        for (const level of levels) {
          for (let seedNum = 1; seedNum <= 500; seedNum++) {
            const seed = `B${sub.slice(0, 2)}${level[0]}${seedNum}`;
            const problem = generateVerified("bankers", level, seed, { sub });

            expect(problem).toBeDefined();
            expect(problem.subtopic).toBe(sub);
            expect(problem.rawParams.subtopic).toBe(sub);
          }
        }
      }
    });
  });

  // 2. Random option: 2,000 seed sweep per topic
  describe("Random selector option (2,000 seeds sweep)", () => {
    it("covers all 6 CPU algorithms with uniform distribution >= 5% each", () => {
      const counts: Record<string, number> = {
        fcfs: 0,
        sjf: 0,
        srtf: 0,
        rr: 0,
        "priority-np": 0,
        "priority-p": 0,
      };

      for (let i = 1; i <= 2000; i++) {
        const seed = `RNDCPU${i}`;
        const problem = generateVerified("cpu-scheduling", "medium", seed, { sub: "random" });
        const subtopic = problem.subtopic || problem.rawParams.algorithm;
        counts[subtopic] = (counts[subtopic] || 0) + 1;
      }

      for (const [algo, count] of Object.entries(counts)) {
        const pct = (count / 2000) * 100;
        expect(pct).toBeGreaterThanOrEqual(5.0);
        expect(count).toBeGreaterThan(0);
      }
    });

    it("covers all Disk algorithms with uniform distribution >= 5% each", () => {
      const counts: Record<string, number> = {
        fcfs: 0,
        sstf: 0,
        scan: 0,
        "c-scan": 0,
        look: 0,
        "c-look": 0,
      };

      for (let i = 1; i <= 2000; i++) {
        const seed = `RNDDSK${i}`;
        const problem = generateVerified("disk-scheduling", "medium", seed, { sub: "random" });
        const algo = problem.rawParams.algorithm;
        counts[algo] = (counts[algo] || 0) + 1;
      }

      for (const [algo, count] of Object.entries(counts)) {
        const pct = (count / 2000) * 100;
        expect(pct).toBeGreaterThanOrEqual(5.0);
        expect(count).toBeGreaterThan(0);
      }
    });

    it("covers all Paging algorithms with uniform distribution >= 5% each", () => {
      const counts: Record<string, number> = {
        fifo: 0,
        lru: 0,
        optimal: 0,
      };

      for (let i = 1; i <= 2000; i++) {
        const seed = `RNDPAG${i}`;
        const problem = generateVerified("page-replacement", "medium", seed, { sub: "random" });
        const algo = problem.rawParams.algorithm;
        counts[algo] = (counts[algo] || 0) + 1;
      }

      for (const [algo, count] of Object.entries(counts)) {
        const pct = (count / 2000) * 100;
        expect(pct).toBeGreaterThanOrEqual(5.0);
        expect(count).toBeGreaterThan(0);
      }
    });

    it("covers all Banker's subtopics with uniform distribution >= 5% each", () => {
      const counts: Record<string, number> = {
        "safety-check": 0,
        "safe-sequence": 0,
        "resource-request": 0,
      };

      for (let i = 1; i <= 2000; i++) {
        const seed = `RNDBNK${i}`;
        const problem = generateVerified("bankers", "medium", seed, { sub: "random" });
        const sub = problem.rawParams.subtopic;
        counts[sub] = (counts[sub] || 0) + 1;
      }

      for (const [sub, count] of Object.entries(counts)) {
        const pct = (count / 2000) * 100;
        expect(pct).toBeGreaterThanOrEqual(5.0);
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  // 3. URL parsing with fallbacks and allowlist
  describe("URL parameter parsing & fallbacks", () => {
    it("falls back gracefully when parameters are invalid or missing", () => {
      const parsed = parsePracticeUrlParams("cpu-scheduling", {
        level: "invalidLevel" as any,
        sub: "nonexistentAlgo",
        from: "hacker" as any,
        seed: "",
      });

      expect(parsed.level).toBe("easy");
      expect(parsed.sub).toBe("random");
      expect(parsed.from).toBe("practice");
      expect(parsed.seed).toBeDefined();
    });

    it("round-trips valid parameters cleanly", () => {
      const parsed = parsePracticeUrlParams("memory-allocation", {
        level: "hard",
        mode: "dynamic",
        strategy: "best-fit",
        from: "hub",
        seed: "XYZ123",
      });

      expect(parsed.level).toBe("hard");
      expect(parsed.mode).toBe("dynamic");
      expect(parsed.strategy).toBe("best-fit");
      expect(parsed.from).toBe("hub");
      expect(parsed.seed).toBe("XYZ123");
    });
  });

  // 4. CS bug regression test
  describe("CS Bug Regression Test", () => {
    it("ensures that with context switch time = 0, NO segments are typed or labeled as CS", () => {
      for (let i = 1; i <= 50; i++) {
        const seed = `CSBUG${i}`;
        const problem = generateVerified("cpu-scheduling", "medium", seed, { sub: "random" });

        // Find Gantt chart visual in solution
        const ganttVisual = problem.solution.find((s) => s.visual?.type === "gantt")?.visual;
        expect(ganttVisual).toBeDefined();

        const gantt: any[] = ganttVisual!.payload.gantt;
        expect(gantt.length).toBeGreaterThan(0);

        for (const seg of gantt) {
          // Every segment MUST be either "run" or "idle"
          expect(["run", "idle"]).toContain(seg.type);

          if (seg.type === "run") {
            expect(seg.processId).toBeDefined();
            expect(seg.processId).not.toBe("CS");
            expect(seg.displayName).not.toBe("CS");
            expect(seg.type).not.toBe("cs");
          } else {
            expect(seg.type).toBe("idle");
          }
        }
      }
    });
  });

  // 5. Memory definitions comparison test
  describe("Memory definitions comparison (Simulator vs Practice)", () => {
    it("verifies simulator and practice solvers compute identical free memory, internal frag, and utilization", () => {
      const blocks = [
        { id: "B1", size: 100 },
        { id: "B2", size: 200 },
        { id: "B3", size: 300 },
      ];
      const processes = [
        { id: "P1", size: 80 },
        { id: "P2", size: 120 },
      ];

      // Fixed First Fit
      const simFixed = simulateMemoryAllocation(
        blocks.map((b) => ({ id: b.id, size: b.size })),
        processes.map((p) => ({ id: p.id, name: p.id, size: p.size })),
        "fixed",
        "first-fit",
      );

      const prodFixed = runMemoryProductionSolver({
        blocks,
        processes,
        mode: "fixed",
        strategy: "first-fit",
      });

      expect(prodFixed.totalFreeMemory).toBe(simFixed.summary.totalFreeMemory);
      expect(prodFixed.totalInternalFragmentation).toBe(simFixed.summary.totalInternalFrag);
      expect(prodFixed.memoryUtilizationPercent).toBe(
        Number(simFixed.summary.utilizationPercent.toFixed(2)),
      );

      // Verify internal frag is NOT in free memory
      // Total memory = 600.
      // P1 (80) in B1 (100) -> internal frag = 20.
      // P2 (120) in B2 (200) -> internal frag = 80.
      // B3 (300) is free -> totalFreeMemory = 300.
      // Total internal frag = 100.
      expect(prodFixed.totalFreeMemory).toBe(300);
      expect(prodFixed.totalInternalFragmentation).toBe(100);
      expect(prodFixed.totalFreeMemory + prodFixed.totalInternalFragmentation + 200).toBe(600);

      // Dynamic First Fit: internal frag is always 0
      const prodDynamic = runMemoryProductionSolver({
        blocks,
        processes,
        mode: "dynamic",
        strategy: "first-fit",
      });

      expect(prodDynamic.totalInternalFragmentation).toBe(0);
      // P1 (80) takes 80 from B1 (100), leaves hole of 20.
      // P2 (120) takes 120 from B2 (200), leaves hole of 80.
      // B3 (300) is free.
      // Free memory = 20 + 80 + 300 = 400.
      expect(prodDynamic.totalFreeMemory).toBe(400);
      expect(prodDynamic.memoryUtilizationPercent).toBe(Number(((200 / 600) * 100).toFixed(2)));
    });
  });

  // 6. WCAG AA Contrast Test
  describe("WCAG AA Contrast Compliance (>= 4.5:1)", () => {
    it("checks that all process palette colors with ink text meet >= 4.5:1 contrast", () => {
      for (const color of PROCESS_PALETTE) {
        // Lightness of all PROCESS_PALETTE swatches is >= 0.80
        // Against dark ink #1F2937 (L ~ 0.16), contrast is >= 6.5:1
        const ratio = contrastRatio(color.bg, "#1F2937");
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    });

    it("checks that verdict banner combinations meet >= 4.5:1 contrast", () => {
      // Correct banner: Chalkboard green (#244933) with cream text (#FFFDF7)
      const correctRatio = contrastRatio("#244933", "#FFFDF7");
      expect(correctRatio).toBeGreaterThanOrEqual(4.5);

      // Incorrect banner: Deep brick (#a64024) with cream text (#FFFDF7)
      const incorrectRatio = contrastRatio("#a64024", "#FFFDF7");
      expect(incorrectRatio).toBeGreaterThanOrEqual(4.5);

      // Invalid banner: Dark ink (#1F2937) with cream/paper text (#FFFDF7)
      const invalidRatio = contrastRatio("#1F2937", "#FFFDF7");
      expect(invalidRatio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
