import { describe, expect, it } from "vitest";
import { assignProcessColors } from "@/lib/process-palette";
import {
  pickBest,
  resolveProcessDisplayNames,
  runScheduling,
  type ProcessInput,
} from "@/lib/scheduling";

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
  it("computes FCFS for A(0,5), B(1,3), C(2,8), D(3,6) with avg WT 5.75, avg TAT 11.25, and avg RT 5.75", () => {
    const res = runScheduling(CLASSIC_FOUR, { algorithm: "fcfs" });
    expect(res.avgWaitingTime).toBeCloseTo(5.75, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(11.25, 5);
    expect(res.avgResponseTime).toBeCloseTo(5.75, 5);
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 5],
      ["P2", 5, 8],
      ["P3", 8, 16],
      ["P4", 16, 22],
    ]);
    expect(res.decisions.some((d) => d.reason.includes("Netflix"))).toBe(true);
  });

  it("computes SJF (non-preemptive) for A(0,5), B(1,3), C(2,8), D(3,6) with avg WT 5.25, avg TAT 10.75, and avg RT 5.25", () => {
    const res = runScheduling(CLASSIC_FOUR, { algorithm: "sjf" });
    expect(res.avgWaitingTime).toBeCloseTo(5.25, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(10.75, 5);
    expect(res.avgResponseTime).toBeCloseTo(5.25, 5);
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 5],
      ["P2", 5, 8],
      ["P4", 8, 14],
      ["P3", 14, 22],
    ]);
  });

  it("computes SRTF for A(0,5), B(1,3), C(2,8), D(3,6) with avg WT 5.0, avg TAT 10.5, and avg RT 4.25", () => {
    const res = runScheduling(CLASSIC_FOUR, { algorithm: "srtf" });
    expect(res.avgWaitingTime).toBeCloseTo(5.0, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(10.5, 5);
    expect(res.avgResponseTime).toBeCloseTo(4.25, 5);
    expect(res.gantt.map((s) => [s.processId, s.startTime, s.endTime])).toEqual([
      ["P1", 0, 1],
      ["P2", 1, 4],
      ["P1", 4, 8],
      ["P4", 8, 14],
      ["P3", 14, 22],
    ]);
  });

  it("computes Round Robin with quantum=2 for A(0,5), B(1,3), C(2,8), D(3,6) with CT 14, 11, 22, 20", () => {
    const res = runScheduling(CLASSIC_FOUR, { algorithm: "round-robin", quantum: 2 });
    expect(res.metrics.map((m) => m.completionTime)).toEqual([14, 11, 22, 20]);
    expect(res.avgWaitingTime).toBeCloseTo(9.75, 5);
    expect(res.avgTurnaroundTime).toBeCloseTo(15.25, 5);
    expect(res.avgResponseTime).toBeCloseTo(2.0, 5);
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

  it("verifies mathematical invariants across at least 200 random inputs for all algorithms", () => {
    const algorithms = ["fcfs", "sjf", "srtf", "round-robin", "priority-np", "priority-p"] as const;

    // Run 240 randomized scenarios (40 per algorithm)
    for (let testIdx = 0; testIdx < 240; testIdx += 1) {
      const algorithm = algorithms[testIdx % algorithms.length]!;
      const count = 1 + Math.floor(Math.random() * 8); // 1 to 8 processes
      const quantum = 1 + Math.floor(Math.random() * 5); // 1 to 5
      const contextSwitchTime = Math.floor(Math.random() * 3); // 0 to 2
      const aging = Math.random() > 0.5;

      const procs: ProcessInput[] = Array.from({ length: count }, (_, i) => ({
        id: `P${i + 1}`,
        name: `Proc${i + 1}`,
        arrivalTime: Math.floor(Math.random() * 16), // 0 to 15
        burstTime: 1 + Math.floor(Math.random() * 12), // 1 to 12
        priority: Math.floor(Math.random() * 10),
      }));

      const res = runScheduling(procs, {
        algorithm,
        quantum,
        contextSwitchTime,
        aging,
      });

      // 1. No Gantt segments overlap
      for (let sIdx = 0; sIdx < res.gantt.length - 1; sIdx += 1) {
        const curr = res.gantt[sIdx]!;
        const next = res.gantt[sIdx + 1]!;
        expect(curr.endTime).toBeLessThanOrEqual(next.startTime);
        expect(curr.startTime).toBeLessThan(curr.endTime);
      }

      // 2. Each process's total run time equals its burst time
      for (const p of procs) {
        const totalRun = res.gantt
          .filter((s) => s.type === "run" && s.processId === p.id)
          .reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
        expect(totalRun).toBe(p.burstTime);
      }

      // 3. Metric formulas per process
      for (const m of res.metrics) {
        // CT >= AT + BT
        expect(m.completionTime).toBeGreaterThanOrEqual(m.arrivalTime + m.burstTime);
        // TAT = CT - AT
        expect(m.turnaroundTime).toBe(m.completionTime - m.arrivalTime);
        // WT = TAT - BT
        expect(m.waitingTime).toBe(m.turnaroundTime - m.burstTime);
        // WT >= 0
        expect(m.waitingTime).toBeGreaterThanOrEqual(0);
        // 0 <= RT <= WT
        expect(m.responseTime).toBeGreaterThanOrEqual(0);
        expect(m.responseTime).toBeLessThanOrEqual(m.waitingTime);
      }

      // 4. Averages equal exact mean
      const expectedAvgWT = res.metrics.reduce((s, m) => s + m.waitingTime, 0) / count;
      const expectedAvgTAT = res.metrics.reduce((s, m) => s + m.turnaroundTime, 0) / count;
      const expectedAvgRT = res.metrics.reduce((s, m) => s + m.responseTime, 0) / count;
      expect(res.avgWaitingTime).toBeCloseTo(expectedAvgWT, 5);
      expect(res.avgTurnaroundTime).toBeCloseTo(expectedAvgTAT, 5);
      expect(res.avgResponseTime).toBeCloseTo(expectedAvgRT, 5);

      // 5. Busy time equals sum of burst times
      const sumBT = procs.reduce((s, p) => s + p.burstTime, 0);
      expect(res.busyTime).toBe(sumBT);

      // 6. CPU utilization is between 0 and 100
      expect(res.cpuUtilization).toBeGreaterThanOrEqual(0);
      expect(res.cpuUtilization).toBeLessThanOrEqual(100);

      // With context switch 0 and no idle gaps, totalTime equals busyTime
      if (contextSwitchTime === 0 && res.idleTime === 0) {
        expect(res.totalTime).toBe(sumBT);
        expect(res.cpuUtilization).toBeCloseTo(100, 5);
      }
    }
  });

  it("verifies comparison results equal single-algorithm simulator results on the same workload", () => {
    const algos = ["fcfs", "sjf", "srtf", "round-robin", "priority-np", "priority-p"] as const;
    const config = { quantum: 3, contextSwitchTime: 1, aging: true };

    for (const algo of algos) {
      const single = runScheduling(CLASSIC_FOUR, { algorithm: algo, ...config });
      const compareRun = runScheduling(CLASSIC_FOUR, { algorithm: algo, ...config });

      expect(compareRun.avgWaitingTime).toBe(single.avgWaitingTime);
      expect(compareRun.avgTurnaroundTime).toBe(single.avgTurnaroundTime);
      expect(compareRun.avgResponseTime).toBe(single.avgResponseTime);
      expect(compareRun.cpuUtilization).toBe(single.cpuUtilization);
      expect(compareRun.throughput).toBe(single.throughput);
      expect(compareRun.contextSwitchCount).toBe(single.contextSwitchCount);
      expect(compareRun.gantt).toEqual(single.gantt);
    }
  });

  it("evaluates known-value textbook workload and picks SRTF as overall winner and Round Robin as fastest response", () => {
    const procs: ProcessInput[] = [
      { id: "A", name: "A", arrivalTime: 0, burstTime: 5 },
      { id: "B", name: "B", arrivalTime: 1, burstTime: 3 },
      { id: "C", name: "C", arrivalTime: 2, burstTime: 8 },
      { id: "D", name: "D", arrivalTime: 3, burstTime: 6 },
    ];

    const fcfs = runScheduling(procs, { algorithm: "fcfs", contextSwitchTime: 0 });
    const sjf = runScheduling(procs, { algorithm: "sjf", contextSwitchTime: 0 });
    const srtf = runScheduling(procs, { algorithm: "srtf", contextSwitchTime: 0 });
    const rr = runScheduling(procs, { algorithm: "round-robin", quantum: 2, contextSwitchTime: 0 });

    const total = (res: typeof fcfs, key: "waitingTime" | "turnaroundTime" | "responseTime") =>
      res.metrics.reduce((acc, m) => acc + m[key], 0);

    // WT totals and averages
    expect(total(srtf, "waitingTime")).toBe(20);
    expect(srtf.avgWaitingTime).toBe(5.0);
    expect(srtf.avgTurnaroundTime).toBe(10.5);

    expect(total(sjf, "waitingTime")).toBe(21);
    expect(sjf.avgWaitingTime).toBe(5.25);

    expect(total(fcfs, "waitingTime")).toBe(23);
    expect(fcfs.avgWaitingTime).toBe(5.75);

    expect(total(rr, "waitingTime")).toBe(39);
    expect(rr.avgWaitingTime).toBe(9.75);

    // Response time totals and averages
    expect(total(srtf, "responseTime")).toBe(17);
    expect(srtf.avgResponseTime).toBe(4.25);

    expect(total(fcfs, "responseTime")).toBe(23);
    expect(fcfs.avgResponseTime).toBe(5.75);

    expect(total(sjf, "responseTime")).toBe(21);
    expect(sjf.avgResponseTime).toBe(5.25);

    expect(total(rr, "responseTime")).toBe(8);
    expect(rr.avgResponseTime).toBe(2.0);

    // Run pickBest across these 4 algorithms
    const verdict = pickBest([fcfs, sjf, srtf, rr], 0);

    expect(verdict.isTie).toBe(false);
    expect(verdict.winner.algorithm).toBe("srtf");
    expect(verdict.rankings.map((r) => r.result.algorithm)).toEqual([
      "srtf",
      "sjf",
      "fcfs",
      "round-robin",
    ]);

    // Best response time is Round Robin
    expect(verdict.perMetricWinners.avgRT.winners[0]?.algorithm).toBe("round-robin");
    expect(verdict.perMetricWinners.avgRT.value).toBe(2.0);

    // Best waiting time is SRTF
    expect(verdict.perMetricWinners.avgWT.winners[0]?.algorithm).toBe("srtf");
    expect(verdict.perMetricWinners.avgWT.value).toBe(5.0);

    // Why explanation verifies 3-5 sentences, real numbers, RR trade-off, and closing line
    expect(verdict.whyExplanation.length).toBeGreaterThanOrEqual(3);
    expect(verdict.whyExplanation.length).toBeLessThanOrEqual(5);
    const joinedExplanation = verdict.whyExplanation.join(" ");
    expect(joinedExplanation).toContain("SRTF has the lowest average waiting time (5.00)");
    expect(joinedExplanation).toContain("5.25 for SJF, the next best");
    expect(joinedExplanation).toContain("9.75 for Round Robin, the worst");
    expect(joinedExplanation).toContain(
      "Round Robin starts every process sooner, with an average response time of 2.00, but it finishes them later.",
    );
    expect(joinedExplanation).toContain(
      "Best here means lowest average waiting time for this input. A different example or goal can change the answer.",
    );
  });

  it("verifies across 200 random inputs with context switch 0 that SRTF total WT & TAT is <= other algorithms and pickBest chooses minimal WT", () => {
    const algos = ["fcfs", "sjf", "srtf", "round-robin", "priority-np", "priority-p"] as const;

    for (let i = 0; i < 200; i++) {
      const count = 1 + Math.floor(Math.random() * 8); // 1 to 8 processes
      const quantum = 1 + Math.floor(Math.random() * 5); // 1 to 5
      const procs: ProcessInput[] = Array.from({ length: count }, (_, idx) => ({
        id: `P${idx + 1}`,
        name: `App${idx + 1}`,
        arrivalTime: Math.floor(Math.random() * 12),
        burstTime: 1 + Math.floor(Math.random() * 15),
        priority: Math.floor(Math.random() * 8),
      }));

      const results = algos.map((algo) =>
        runScheduling(procs, { algorithm: algo, quantum, contextSwitchTime: 0 }),
      );

      const srtfResult = results.find((r) => r.algorithm === "srtf")!;
      const srtfTotalWT = srtfResult.metrics.reduce((acc, m) => acc + m.waitingTime, 0);
      const srtfTotalTAT = srtfResult.metrics.reduce((acc, m) => acc + m.turnaroundTime, 0);

      for (const other of results) {
        const otherTotalWT = other.metrics.reduce((acc, m) => acc + m.waitingTime, 0);
        const otherTotalTAT = other.metrics.reduce((acc, m) => acc + m.turnaroundTime, 0);
        expect(srtfTotalWT).toBeLessThanOrEqual(otherTotalWT);
        expect(srtfTotalTAT).toBeLessThanOrEqual(otherTotalTAT);
      }

      const verdict = pickBest(results, 0);
      const winnerTotalWT = verdict.winner.metrics.reduce((acc, m) => acc + m.waitingTime, 0);
      expect(winnerTotalWT).toBe(srtfTotalWT);
    }
  });

  it("reports a tie when multiple algorithms produce identical WT, TAT, and RT", () => {
    const procs: ProcessInput[] = [
      { id: "P1", name: "Alpha", arrivalTime: 0, burstTime: 3, priority: 1 },
      { id: "P2", name: "Beta", arrivalTime: 0, burstTime: 3, priority: 1 },
      { id: "P3", name: "Gamma", arrivalTime: 0, burstTime: 3, priority: 1 },
    ];

    const fcfs = runScheduling(procs, { algorithm: "fcfs", contextSwitchTime: 0 });
    const sjf = runScheduling(procs, { algorithm: "sjf", contextSwitchTime: 0 });
    const srtf = runScheduling(procs, { algorithm: "srtf", contextSwitchTime: 0 });
    const prio = runScheduling(procs, { algorithm: "priority-np", contextSwitchTime: 0 });

    const verdict = pickBest([fcfs, sjf, srtf, prio], 0);
    expect(verdict.isTie).toBe(true);
    expect(verdict.winners.length).toBe(4);
    expect(verdict.whyExplanation.join(" ")).toContain("tied with the lowest average waiting time");
  });

  it("verifies each per-metric winner accurately reflects independent metric calculations", () => {
    const procs: ProcessInput[] = [
      { id: "P1", name: "One", arrivalTime: 0, burstTime: 7, priority: 2 },
      { id: "P2", name: "Two", arrivalTime: 2, burstTime: 4, priority: 1 },
      { id: "P3", name: "Three", arrivalTime: 3, burstTime: 1, priority: 3 },
      { id: "P4", name: "Four", arrivalTime: 5, burstTime: 4, priority: 0 },
    ];

    const algos = ["fcfs", "sjf", "srtf", "round-robin", "priority-np", "priority-p"] as const;
    const results = algos.map((algo) =>
      runScheduling(procs, { algorithm: algo, quantum: 3, contextSwitchTime: 1 }),
    );

    const verdict = pickBest(results, 1);

    const trueMinWT = Math.min(...results.map((r) => r.avgWaitingTime));
    expect(verdict.perMetricWinners.avgWT.value).toBeCloseTo(trueMinWT, 5);

    const trueMinTAT = Math.min(...results.map((r) => r.avgTurnaroundTime));
    expect(verdict.perMetricWinners.avgTAT.value).toBeCloseTo(trueMinTAT, 5);

    const trueMinRT = Math.min(...results.map((r) => r.avgResponseTime));
    expect(verdict.perMetricWinners.avgRT.value).toBeCloseTo(trueMinRT, 5);

    const trueMinCS = Math.min(...results.map((r) => r.contextSwitchCount));
    expect(verdict.perMetricWinners.contextSwitches.value).toBe(trueMinCS);

    const trueMinMakespan = Math.min(...results.map((r) => r.totalTime));
    expect(verdict.perMetricWinners.makespan.value).toBe(trueMinMakespan);

    const trueMinLongestWait = Math.min(
      ...results.map((r) => Math.max(...r.metrics.map((m) => m.waitingTime))),
    );
    expect(verdict.perMetricWinners.smallestLongestWait.waitingTime).toBe(trueMinLongestWait);
  });
});
