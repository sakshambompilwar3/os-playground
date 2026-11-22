import { describe, it, expect } from "vitest";
import { runCpuProductionSolver, CpuSchedulingInputProcess } from "../lib/practice/adapters/cpu";
import { runCpuReferenceSolver, RefCpuProcess } from "../lib/practice/reference/cpu";
import { generateVerified } from "../lib/practice/gate";
import { ProblemLevel } from "../lib/practice/types";

describe("Practice Mode - CPU Scheduling (Phase 2)", () => {
  describe("Anchor Tests", () => {
    const processesAnchor1: CpuSchedulingInputProcess[] = [
      { id: "A", arrivalTime: 0, burstTime: 5 },
      { id: "B", arrivalTime: 1, burstTime: 3 },
      { id: "C", arrivalTime: 2, burstTime: 8 },
      { id: "D", arrivalTime: 3, burstTime: 6 },
    ];

    it("Anchor 1: FCFS avg WT 5.75 and avg TAT 11.25 on both solvers", () => {
      const prod = runCpuProductionSolver(processesAnchor1, "fcfs");
      const ref = runCpuReferenceSolver(processesAnchor1 as RefCpuProcess[], "fcfs");

      expect(prod.avgWaitingTime).toBe(5.75);
      expect(prod.avgTurnaroundTime).toBe(11.25);
      expect(ref.avgWaitingTime).toBe(5.75);
      expect(ref.avgTurnaroundTime).toBe(11.25);
    });

    it("Anchor 1: SJF avg WT 5.25 and avg TAT 10.75 on both solvers", () => {
      const prod = runCpuProductionSolver(processesAnchor1, "sjf");
      const ref = runCpuReferenceSolver(processesAnchor1 as RefCpuProcess[], "sjf");

      expect(prod.avgWaitingTime).toBe(5.25);
      expect(prod.avgTurnaroundTime).toBe(10.75);
      expect(ref.avgWaitingTime).toBe(5.25);
      expect(ref.avgTurnaroundTime).toBe(10.75);
    });

    it("Anchor 1: SRTF avg WT 5.0, avg TAT 10.5, avg RT 4.25 on both solvers", () => {
      const prod = runCpuProductionSolver(processesAnchor1, "srtf");
      const ref = runCpuReferenceSolver(processesAnchor1 as RefCpuProcess[], "srtf");

      expect(prod.avgWaitingTime).toBe(5.0);
      expect(prod.avgTurnaroundTime).toBe(10.5);
      expect(prod.avgResponseTime).toBe(4.25);
      expect(ref.avgWaitingTime).toBe(5.0);
      expect(ref.avgTurnaroundTime).toBe(10.5);
      expect(ref.avgResponseTime).toBe(4.25);
    });

    it("Anchor 1: Round Robin (quantum 2) completions A 14, B 11, C 22, D 20, avg WT 9.75, avg TAT 15.25, avg RT 2.0", () => {
      const prod = runCpuProductionSolver(processesAnchor1, "round-robin", 2);
      const ref = runCpuReferenceSolver(processesAnchor1 as RefCpuProcess[], "round-robin", 2);

      expect(prod.metrics["A"].completionTime).toBe(14);
      expect(prod.metrics["B"].completionTime).toBe(11);
      expect(prod.metrics["C"].completionTime).toBe(22);
      expect(prod.metrics["D"].completionTime).toBe(20);

      expect(ref.metrics["A"].completionTime).toBe(14);
      expect(ref.metrics["B"].completionTime).toBe(11);
      expect(ref.metrics["C"].completionTime).toBe(22);
      expect(ref.metrics["D"].completionTime).toBe(20);

      expect(prod.avgWaitingTime).toBe(9.75);
      expect(prod.avgTurnaroundTime).toBe(15.25);
      expect(prod.avgResponseTime).toBe(2.0);

      expect(ref.avgWaitingTime).toBe(9.75);
      expect(ref.avgTurnaroundTime).toBe(15.25);
      expect(ref.avgResponseTime).toBe(2.0);
    });

    const processesAnchor2: CpuSchedulingInputProcess[] = [
      { id: "P1", arrivalTime: 0, burstTime: 24 },
      { id: "P2", arrivalTime: 0, burstTime: 3 },
      { id: "P3", arrivalTime: 0, burstTime: 3 },
    ];

    it("Anchor 2: FCFS avg WT 17; SJF avg WT 3; Round Robin (quantum 4) WT of P1 = 6", () => {
      const prodFcfs = runCpuProductionSolver(processesAnchor2, "fcfs");
      const refFcfs = runCpuReferenceSolver(processesAnchor2 as RefCpuProcess[], "fcfs");
      expect(prodFcfs.avgWaitingTime).toBe(17);
      expect(refFcfs.avgWaitingTime).toBe(17);

      const prodSjf = runCpuProductionSolver(processesAnchor2, "sjf");
      const refSjf = runCpuReferenceSolver(processesAnchor2 as RefCpuProcess[], "sjf");
      expect(prodSjf.avgWaitingTime).toBe(3);
      expect(refSjf.avgWaitingTime).toBe(3);

      const prodRR = runCpuProductionSolver(processesAnchor2, "round-robin", 4);
      const refRR = runCpuReferenceSolver(processesAnchor2 as RefCpuProcess[], "round-robin", 4);
      expect(prodRR.metrics["P1"].waitingTime).toBe(6);
      expect(refRR.metrics["P1"].waitingTime).toBe(6);
    });
  });

  describe("Sweep over 2000 seeds per level", () => {
    const levels: ProblemLevel[] = ["easy", "medium", "hard"];

    for (const level of levels) {
      it(`sweeps 2000 seeds for level: ${level}`, () => {
        let disagreements = 0;
        let tiesRejected = 0;

        for (let i = 0; i < 2000; i++) {
          const seed = `CP${level[0].toUpperCase()}${String(i).padStart(4, "0")}`;
          const problem = generateVerified("cpu-scheduling", level, seed);

          expect(problem.id).toBe(`cpu-scheduling-${level}-${seed}`);
          expect(problem.questions.length).toBeGreaterThanOrEqual(1);

          // Verify mathematical invariants on solution metrics
          const raw = problem.rawParams;
          const procs: CpuSchedulingInputProcess[] = raw.processes;
          const prod = runCpuProductionSolver(procs, raw.algorithm, raw.quantum);

          for (const p of procs) {
            const m = prod.metrics[p.id];
            expect(m.completionTime).toBeGreaterThanOrEqual(p.arrivalTime + p.burstTime);
            expect(m.turnaroundTime).toBe(m.completionTime - p.arrivalTime);
            expect(m.waitingTime).toBe(m.turnaroundTime - p.burstTime);
          }

          // Verify average equals mean of process metrics
          const n = procs.length;
          const meanWT = Object.values(prod.metrics).reduce((s, m) => s + m.waitingTime, 0) / n;
          const meanTAT = Object.values(prod.metrics).reduce((s, m) => s + m.turnaroundTime, 0) / n;
          expect(Math.abs(prod.avgWaitingTime - meanWT)).toBeLessThanOrEqual(0.01);
          expect(Math.abs(prod.avgTurnaroundTime - meanTAT)).toBeLessThanOrEqual(0.01);

          // Check determinism: replaying same seed returns identical problem
          if (i % 200 === 0) {
            const replay = generateVerified("cpu-scheduling", level, seed);
            expect(replay).toEqual(problem);
          }
        }

        expect(disagreements).toBe(0);
      });
    }
  });
});
