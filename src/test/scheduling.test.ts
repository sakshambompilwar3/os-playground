import { describe, expect, it } from "vitest";
import { assignProcessColors } from "@/lib/process-palette";
import { resolveProcessDisplayNames, runScheduling, type ProcessInput } from "@/lib/scheduling";

const CLASSIC_FOUR: ProcessInput[] = [
  { id: "P1", name: "Netflix", arrivalTime: 0, burstTime: 5 },
  { id: "P2", name: "Chrome", arrivalTime: 1, burstTime: 3 },
  { id: "P3", name: "Spotify", arrivalTime: 2, burstTime: 8 },
  { id: "P4", name: "Zoom", arrivalTime: 3, burstTime: 6 },
];

const RR_TEXTBOOK: ProcessInput[] = [
  { id: "P1", name: "Netflix", arrivalTime: 0, burstTime: 5 },
  { id: "P2", name: "Chrome", arrivalTime: 1, burstTime: 3 },
  { id: "P3", name: "Spotify", arrivalTime: 2, burstTime: 1 },
  { id: "P4", name: "Zoom", arrivalTime: 3, burstTime: 2 },
];

const PRIORITY_TEXTBOOK: ProcessInput[] = [
  { id: "P1", name: "Netflix", arrivalTime: 0, burstTime: 4, priority: 2 },
  { id: "P2", name: "Chrome", arrivalTime: 1, burstTime: 3, priority: 1 },
  { id: "P3", name: "Spotify", arrivalTime: 2, burstTime: 1, priority: 3 },
  { id: "P4", name: "Zoom", arrivalTime: 3, burstTime: 5, priority: 0 },
];

describe("CPU scheduling algorithms", () => {
  it("computes FCFS for A(0,5), B(1,3), C(2,8), D(3,6) with avg WT 5.75 and avg TAT 11.25", () => {
    const res = runScheduling(CLASSIC_FOUR, { algorithm: "fcfs" });
    expect(res.avgWaitingTime).toBeCloseTo(5.75, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(11.25, 5);
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 5],
      ["P2", 5, 8],
      ["P3", 8, 16],
      ["P4", 16, 22],
    ]);
    expect(res.decisions.some((d) => d.reason.includes("Netflix"))).toBe(true);
  });

  it("computes SJF (non-preemptive) for A(0,5), B(1,3), C(2,8), D(3,6) with avg WT 5.25 and avg TAT 10.75", () => {
    const res = runScheduling(CLASSIC_FOUR, { algorithm: "sjf" });
    expect(res.avgWaitingTime).toBeCloseTo(5.25, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(10.75, 5);
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 5],
      ["P2", 5, 8],
      ["P4", 8, 14],
      ["P3", 14, 22],
    ]);
  });

  it("computes SRTF for A(0,5), B(1,3), C(2,8), D(3,6) with avg WT 5.0 and avg TAT 10.5", () => {
    const res = runScheduling(CLASSIC_FOUR, { algorithm: "srtf" });
    expect(res.avgWaitingTime).toBeCloseTo(5.0, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(10.5, 5);
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 1],
      ["P2", 1, 4],
      ["P1", 4, 8],
      ["P4", 8, 14],
      ["P3", 14, 22],
    ]);
  });

  it("computes Round Robin with quantum=2 respecting arrival-before-requeue order", () => {
    const res = runScheduling(RR_TEXTBOOK, { algorithm: "round-robin", quantum: 2 });
    // P1:0-2, P2:2-4, P3:4-5, P1:5-7, P4:7-9, P2:9-10, P1:10-11
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 2],
      ["P2", 2, 4],
      ["P3", 4, 5],
      ["P1", 5, 7],
      ["P4", 7, 9],
      ["P2", 9, 10],
      ["P1", 10, 11],
    ]);
    expect(res.metrics.map((m) => m.completionTime)).toEqual([11, 10, 5, 9]);
    expect(res.avgWaitingTime).toBeCloseTo(4.5, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(7.25, 5);
    expect(res.avgResponseTime).toBeCloseTo(1.75, 5);
  });

  it("computes Round Robin with quantum=3 where P4 arrives at t=3 before P1 re-queues", () => {
    const res = runScheduling(RR_TEXTBOOK, { algorithm: "round-robin", quantum: 3 });
    // P1:0-3 (at t=3 P4 arrives before P1 re-queues -> queue [P2, P3, P4, P1])
    // P2:3-6, P3:6-7, P4:7-9, P1:9-11
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 3],
      ["P2", 3, 6],
      ["P3", 6, 7],
      ["P4", 7, 9],
      ["P1", 9, 11],
    ]);
    expect(res.metrics.map((m) => m.completionTime)).toEqual([11, 6, 7, 9]);
    expect(res.avgWaitingTime).toBeCloseTo(4.0, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(6.75, 5);
    expect(res.avgResponseTime).toBeCloseTo(2.5, 5);
  });

  it("computes non-preemptive Priority scheduling (lower number = higher priority)", () => {
    const res = runScheduling(PRIORITY_TEXTBOOK, { algorithm: "priority-np" });
    // P1(0..4), then P4(prio 0 -> 4..9), then P2(prio 1 -> 9..12), then P3(prio 3 -> 12..13)
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 4],
      ["P4", 4, 9],
      ["P2", 9, 12],
      ["P3", 12, 13],
    ]);
    expect(res.avgWaitingTime).toBeCloseTo(4.75, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(8.0, 5);
  });

  it("computes preemptive Priority scheduling", () => {
    const res = runScheduling(PRIORITY_TEXTBOOK, { algorithm: "priority-p" });
    // P1:0-1, P2:1-3, P4:3-8, P2:8-9, P1:9-12, P3:12-13
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 1],
      ["P2", 1, 3],
      ["P4", 3, 8],
      ["P2", 8, 9],
      ["P1", 9, 12],
      ["P3", 12, 13],
    ]);
    expect(res.metrics.map((m) => m.completionTime)).toEqual([12, 9, 13, 8]);
    expect(res.avgWaitingTime).toBeCloseTo(5.75, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(9.0, 5);
  });

  it("emits idle gaps when no process has arrived yet and updates CPU utilization", () => {
    const procs: ProcessInput[] = [
      { id: "P1", name: "Terminal", arrivalTime: 2, burstTime: 3 },
      { id: "P2", name: "Slack", arrivalTime: 8, burstTime: 2 },
    ];
    const res = runScheduling(procs, { algorithm: "fcfs", contextSwitchTime: 2 });
    expect(res.gantt.map((s) => [s.type, s.processId, s.startTime, s.endTime])).toEqual([
      ["idle", null, 0, 2],
      ["run", "P1", 2, 5],
      ["idle", null, 5, 8],
      ["run", "P2", 8, 10],
    ]);
    // No context switches when transitioning to/from idle
    expect(res.contextSwitchCount).toBe(0);
    expect(res.totalTime).toBe(10);
    expect(res.busyTime).toBe(5);
    expect(res.idleTime).toBe(5);
    expect(res.cpuUtilization).toBeCloseTo(50, 5);
    expect(res.throughput).toBeCloseTo(0.2, 5);
  });

  it("breaks equal arrival-time and equal burst-time ties by lower process id", () => {
    const procs: ProcessInput[] = [
      { id: "P1", name: "One", arrivalTime: 0, burstTime: 4 },
      { id: "P2", name: "Two", arrivalTime: 0, burstTime: 2 },
      { id: "P10", name: "Ten", arrivalTime: 0, burstTime: 2 },
    ];
    const fcfs = runScheduling(procs, { algorithm: "fcfs" });
    expect(fcfs.gantt.map((s) => s.processId)).toEqual(["P1", "P2", "P10"]);

    const sjf = runScheduling(procs, { algorithm: "sjf" });
    expect(sjf.gantt.map((s) => s.processId)).toEqual(["P2", "P10", "P1"]);
  });

  it("inserts context-switch blocks only when switching between different processes", () => {
    const procs: ProcessInput[] = [
      { id: "P1", name: "Word", arrivalTime: 0, burstTime: 3 },
      { id: "P2", name: "Excel", arrivalTime: 0, burstTime: 2 },
    ];
    const res = runScheduling(procs, { algorithm: "fcfs", contextSwitchTime: 1 });
    expect(res.gantt.map((s) => [s.type, s.processId, s.startTime, s.endTime])).toEqual([
      ["run", "P1", 0, 3],
      ["cs", null, 3, 4],
      ["run", "P2", 4, 6],
    ]);
    expect(res.contextSwitchCount).toBe(1);
    expect(res.contextSwitchTotalTime).toBe(1);
    expect(res.metrics.map((m) => m.completionTime)).toEqual([3, 6]);
    expect(res.cpuUtilization).toBeCloseTo((5 / 6) * 100, 5);

    // Single process in Round Robin continuing across quantum boundaries should NOT add CS
    const singleRR = runScheduling([procs[0]!], {
      algorithm: "round-robin",
      quantum: 1,
      contextSwitchTime: 2,
    });
    expect(singleRR.contextSwitchCount).toBe(0);
    expect(singleRR.totalTime).toBe(3);
  });

  it("prevents starvation with aging in Priority scheduling and resolves duplicate/empty names", () => {
    const procs: ProcessInput[] = [
      { id: "P1", name: "Chrome", arrivalTime: 0, burstTime: 5, priority: 1 },
      { id: "P2", name: "Chrome", arrivalTime: 0, burstTime: 2, priority: 3 },
      { id: "P3", name: "   ", arrivalTime: 4, burstTime: 3, priority: 1 },
    ];
    const names = resolveProcessDisplayNames(procs);
    expect(names).toEqual({
      P1: "Chrome",
      P2: "Chrome (2)",
      P3: "P3",
    });

    const withAging = runScheduling(procs, { algorithm: "priority-np", aging: true });
    // P1 runs 0..5. At t=4 P3 arrives (wait=1, eff=1). At t=5 P2 has waited 5 ticks -> eff = 3 - floor(5/4) = 2; P3 has eff = 1 so P3 runs 5..8, then P2 runs 8..10.
    // Wait: make P2 arrive at t=0 with prio=2 and P3 arrive at t=5 with prio=1 so aging flips P2 ahead of P3!
    const agingFlips: ProcessInput[] = [
      { id: "P1", name: "High", arrivalTime: 0, burstTime: 6, priority: 1 },
      { id: "P2", name: "Low", arrivalTime: 0, burstTime: 2, priority: 2 },
      { id: "P3", name: "NewHigh", arrivalTime: 5, burstTime: 2, priority: 1 },
    ];
    const withoutAging = runScheduling(agingFlips, { algorithm: "priority-np", aging: false });
    expect(withoutAging.gantt.map((s) => s.processId)).toEqual(["P1", "P3", "P2"]);

    const aged = runScheduling(agingFlips, { algorithm: "priority-np", aging: true });
    // At t=6, P2 has waited 6 ticks -> eff priority = 2 - floor(6/4) = 1; P3 waited 1 tick -> eff = 1; P2 arrived earlier (AT=0 < 5) so P2 runs BEFORE P3!
    expect(aged.gantt.map((s) => s.processId)).toEqual(["P1", "P2", "P3"]);
    expect(withAging.totalTime).toBe(10);
  });

  it("handles Round Robin combined with context switch time > 0", () => {
    const procs: ProcessInput[] = [
      { id: "P1", name: "Netflix", arrivalTime: 0, burstTime: 3 },
      { id: "P2", name: "Chrome", arrivalTime: 1, burstTime: 2 },
    ];
    const res = runScheduling(procs, {
      algorithm: "round-robin",
      quantum: 2,
      contextSwitchTime: 1,
    });
    // P1:0-2 (at t=1 P2 arrives; at t=2 P1 expires & re-queues [P2, P1]), CS:2-3, P2:3-5 (finishes!), CS:5-6, P1:6-7 (finishes!)
    expect(res.gantt.map((s) => [s.type, s.processId, s.startTime, s.endTime])).toEqual([
      ["run", "P1", 0, 2],
      ["cs", null, 2, 3],
      ["run", "P2", 3, 5],
      ["cs", null, 5, 6],
      ["run", "P1", 6, 7],
    ]);
    expect(res.contextSwitchCount).toBe(2);
    expect(res.metrics.map((m) => m.completionTime)).toEqual([7, 5]);
  });

  it("assigns distinct process colors with preferred hues and no collisions", () => {
    const procs: ProcessInput[] = [
      { id: "P1", name: "CustomApp", arrivalTime: 0, burstTime: 1 },
      { id: "P2", name: "Spotify", arrivalTime: 0, burstTime: 1 },
      { id: "P3", name: "WhatsApp", arrivalTime: 0, burstTime: 1 },
      { id: "P4", name: "Netflix", arrivalTime: 0, burstTime: 1 },
      { id: "P5", name: "YouTube", arrivalTime: 0, burstTime: 1 },
    ];
    const colors = assignProcessColors(procs);
    expect(colors["P2"]?.id).toBe("green");
    expect(colors["P4"]?.id).toBe("red");
    expect(colors["P5"]?.id).toBe("coral");
    // WhatsApp also prefers green, which is already taken by Spotify, so it gets another free color
    const assignedIds = Object.values(colors).map((c) => c.id);
    expect(new Set(assignedIds).size).toBe(procs.length);
  });
});
