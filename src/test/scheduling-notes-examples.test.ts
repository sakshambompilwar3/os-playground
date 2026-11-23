import { describe, it, expect } from "vitest";
import { runCpuProductionSolver, CpuSchedulingInputProcess } from "../lib/practice/adapters/cpu";
import { runCpuReferenceSolver, RefCpuProcess } from "../lib/practice/reference/cpu";

describe("CPU Scheduling Notes - Worked Examples Verification", () => {
  const exampleProcesses: CpuSchedulingInputProcess[] = [
    { id: "P1", arrivalTime: 0, burstTime: 7 },
    { id: "P2", arrivalTime: 2, burstTime: 4 },
    { id: "P3", arrivalTime: 4, burstTime: 1 },
    { id: "P4", arrivalTime: 5, burstTime: 4 },
  ];

  it("SJF non-preemptive on P1(0,7), P2(2,4), P3(4,1), P4(5,4) produces average WT = 4", () => {
    const prod = runCpuProductionSolver(exampleProcesses, "sjf");
    const ref = runCpuReferenceSolver(exampleProcesses as RefCpuProcess[], "sjf");

    expect(prod.avgWaitingTime).toBe(4);
    expect(ref.avgWaitingTime).toBe(4);
  });

  it("SRTF preemptive on P1(0,7), P2(2,4), P3(4,1), P4(5,4) produces average WT = 3", () => {
    const prod = runCpuProductionSolver(exampleProcesses, "srtf");
    const ref = runCpuReferenceSolver(exampleProcesses as RefCpuProcess[], "srtf");

    expect(prod.avgWaitingTime).toBe(3);
    expect(ref.avgWaitingTime).toBe(3);
  });

  it("Round Robin (q=20) on P1(53), P2(17), P3(68), P4(24) at 0 produces avg WT = 73, avg TAT = 113.5, avg RT = 28.5", () => {
    const rrProcesses: CpuSchedulingInputProcess[] = [
      { id: "P1", arrivalTime: 0, burstTime: 53 },
      { id: "P2", arrivalTime: 0, burstTime: 17 },
      { id: "P3", arrivalTime: 0, burstTime: 68 },
      { id: "P4", arrivalTime: 0, burstTime: 24 },
    ];

    const prod = runCpuProductionSolver(rrProcesses, "round-robin", 20);
    const ref = runCpuReferenceSolver(rrProcesses as RefCpuProcess[], "round-robin", 20);

    expect(prod.avgWaitingTime).toBe(73);
    expect(prod.avgTurnaroundTime).toBe(113.5);
    expect(prod.avgResponseTime).toBe(28.5);

    expect(ref.avgWaitingTime).toBe(73);
    expect(ref.avgTurnaroundTime).toBe(113.5);
    expect(ref.avgResponseTime).toBe(28.5);
  });
});
