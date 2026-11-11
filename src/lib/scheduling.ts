export type SchedulingAlgorithm =
  "fcfs" | "sjf" | "srtf" | "round-robin" | "priority-np" | "priority-p";

export interface ProcessInput {
  id: string;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority?: number | undefined;
}

export interface SchedulingConfig {
  algorithm: SchedulingAlgorithm;
  quantum?: number | undefined;
  contextSwitchTime?: number | undefined;
  aging?: boolean | undefined;
}

export interface GanttSegment {
  processId: string | null;
  displayName: string;
  startTime: number;
  endTime: number;
  type: "run" | "idle" | "cs";
}

export interface ProcessMetrics {
  id: string;
  name: string;
  displayName: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  firstCpuTime: number;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
}

export interface DecisionStep {
  id: number;
  time: number;
  processId: string | null;
  type: "run" | "idle" | "cs" | "preempt" | "done";
  reason: string;
}

export interface TimeSliceSnapshot {
  time: number;
  runningProcessId: string | null;
  segmentType: "run" | "idle" | "cs" | "done";
  readyQueueIds: string[];
  remainingById: Record<string, number>;
  narration: string;
  decisionId: number;
}

export interface SchedulingResult {
  algorithm: SchedulingAlgorithm;
  gantt: GanttSegment[];
  metrics: ProcessMetrics[];
  decisions: DecisionStep[];
  timeline: TimeSliceSnapshot[];
  displayNames: Record<string, string>;
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  cpuUtilization: number;
  throughput: number;
  busyTime: number;
  idleTime: number;
  contextSwitchTotalTime: number;
  contextSwitchCount: number;
  totalTime: number;
  warnings: string[];
}

export interface AlgorithmMeta {
  id: SchedulingAlgorithm;
  label: string;
  shortLabel: string;
  preemptive: boolean;
  description: string;
}

export const ALGORITHM_META: Record<SchedulingAlgorithm, AlgorithmMeta> = {
  fcfs: {
    id: "fcfs",
    label: "FCFS",
    shortLabel: "FCFS",
    preemptive: false,
    description: "Picks whichever ready process arrived first, and runs it until it finishes.",
  },
  sjf: {
    id: "sjf",
    label: "SJF (non-preemptive)",
    shortLabel: "SJF",
    preemptive: false,
    description:
      "Picks the ready process with the smallest total burst time, running it to completion.",
  },
  srtf: {
    id: "srtf",
    label: "SRTF (preemptive SJF)",
    shortLabel: "SRTF",
    preemptive: true,
    description:
      "Always runs the ready process with the least remaining CPU time, preempting if a shorter job arrives.",
  },
  "round-robin": {
    id: "round-robin",
    label: "Round Robin",
    shortLabel: "Round Robin",
    preemptive: true,
    description:
      "Cycles through the FIFO ready queue, giving each process up to one time quantum per turn.",
  },
  "priority-np": {
    id: "priority-np",
    label: "Priority (non-preemptive)",
    shortLabel: "Priority",
    preemptive: false,
    description:
      "Picks the ready process with the lowest priority number and runs it until it completes.",
  },
  "priority-p": {
    id: "priority-p",
    label: "Priority (preemptive)",
    shortLabel: "Priority",
    preemptive: true,
    description:
      "Always runs the ready process with the lowest priority number, preempting when a higher-priority job arrives.",
  },
};

export function compareProcessIds(a: string, b: string): number {
  const ma = /^([A-Za-z]*)(\d+)$/.exec(a);
  const mb = /^([A-Za-z]*)(\d+)$/.exec(b);
  if (ma && mb && ma[1] === mb[1]) {
    return Number(ma[2]) - Number(mb[2]);
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Resolves display names so empty names fall back to the process id
 * and duplicate names receive "(2)", "(3)", ... suffixes.
 */
export function resolveProcessDisplayNames(processes: ProcessInput[]): Record<string, string> {
  const rawNames = processes.map((p) => {
    const trimmed = p.name.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 14) : p.id;
  });

  const totals = new Map<string, number>();
  for (const name of rawNames) {
    totals.set(name, (totals.get(name) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  const used = new Set<string>();
  const resolved: Record<string, string> = {};

  processes.forEach((p, idx) => {
    const base = rawNames[idx] ?? p.id;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);

    let candidate = count === 1 ? base : `${base} (${count})`;
    let suffix = count;
    while (used.has(candidate)) {
      suffix += 1;
      candidate = `${base} (${suffix})`;
    }
    used.add(candidate);
    resolved[p.id] = candidate;
  });

  return resolved;
}

interface SimProc {
  id: string;
  name: string;
  displayName: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  remaining: number;
  firstCpuTime: number | null;
  completionTime: number | null;
  waitingTicks: number;
  inReadyQueue: boolean;
  arrivalHandled: boolean;
}

const AGING_INTERVAL = 4;

function effectivePriority(proc: SimProc, aging: boolean): number {
  if (!aging) return proc.priority;
  return proc.priority - Math.floor(proc.waitingTicks / AGING_INTERVAL);
}

function compareByArrivalThenId(a: SimProc, b: SimProc): number {
  if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
  return compareProcessIds(a.id, b.id);
}

function makeComparator(
  algorithm: SchedulingAlgorithm,
  aging: boolean,
): (a: SimProc, b: SimProc) => number {
  switch (algorithm) {
    case "fcfs":
      return compareByArrivalThenId;
    case "sjf":
      return (a, b) => {
        if (a.burstTime !== b.burstTime) return a.burstTime - b.burstTime;
        return compareByArrivalThenId(a, b);
      };
    case "srtf":
      return (a, b) => {
        if (a.remaining !== b.remaining) return a.remaining - b.remaining;
        return compareByArrivalThenId(a, b);
      };
    case "priority-np":
    case "priority-p":
      return (a, b) => {
        const pa = effectivePriority(a, aging);
        const pb = effectivePriority(b, aging);
        if (pa !== pb) return pa - pb;
        return compareByArrivalThenId(a, b);
      };
    case "round-robin":
      return compareByArrivalThenId;
  }
}

function buildWhyReason(
  algorithm: SchedulingAlgorithm,
  picked: SimProc,
  readyCount: number,
  aging: boolean,
  quantum: number,
  preemptedFrom?: { proc: SimProc; effPrio?: number } | null,
  expiredFrom?: SimProc | null,
): string {
  const name = picked.displayName;
  switch (algorithm) {
    case "fcfs":
      return readyCount > 1
        ? `${name} arrived earliest (AT=${picked.arrivalTime}), so it runs next.`
        : `${name} is ready (AT=${picked.arrivalTime}), so it runs next.`;
    case "sjf":
      return readyCount > 1
        ? `${name} has the shortest burst time (BT=${picked.burstTime}), so it runs next.`
        : `${name} is the only ready process (BT=${picked.burstTime}), so it runs next.`;
    case "srtf":
      if (preemptedFrom) {
        return `${name} has shorter remaining time (${picked.remaining} < ${preemptedFrom.proc.remaining}), preempting ${preemptedFrom.proc.displayName}.`;
      }
      return `${name} has the shortest remaining time (${picked.remaining}), so it runs next.`;
    case "round-robin":
      if (expiredFrom && expiredFrom.id !== picked.id) {
        return `${expiredFrom.displayName}'s quantum (${quantum}) expired; ${name} is next in the ready queue.`;
      }
      return `${name} is at the front of the ready queue (quantum=${quantum}), so it runs next.`;
    case "priority-np":
    case "priority-p": {
      const eff = effectivePriority(picked, aging);
      const agedNote = aging && eff !== picked.priority ? `, aged from ${picked.priority}` : "";
      if (preemptedFrom) {
        const prevEff = preemptedFrom.effPrio ?? preemptedFrom.proc.priority;
        return `${name} has higher priority (${eff}${agedNote} < ${prevEff}), preempting ${preemptedFrom.proc.displayName}.`;
      }
      return `${name} has the highest priority (priority=${eff}${agedNote}), so it runs next.`;
    }
  }
}

function buildWarnings(
  algorithm: SchedulingAlgorithm,
  metrics: ProcessMetrics[],
  avgWT: number,
  avgRT: number,
  busyTime: number,
  gantt: GanttSegment[],
  quantum: number,
  aging: boolean,
  csTime: number,
  csCount: number,
): string[] {
  if (metrics.length === 0) return [];
  const notes: string[] = [];

  if (algorithm === "fcfs" && metrics.length > 1) {
    const first = [...metrics].sort((a, b) => a.firstCpuTime - b.firstCpuTime)[0];
    const delayed = metrics.filter(
      (m) => m.id !== first?.id && m.burstTime < (first?.burstTime ?? 0) && m.waitingTime > 0,
    );
    if (
      first &&
      delayed.length > 0 &&
      first.burstTime >= Math.max(...delayed.map((d) => d.burstTime)) * 1.5
    ) {
      const names = delayed.map((d) => d.displayName).join(", ");
      notes.push(
        `Convoy effect: shorter process(es) (${names}) waited behind ${first.displayName} (BT=${first.burstTime}).`,
      );
    } else {
      notes.push(
        "FCFS is simple and starvation-free, though long early jobs can trigger a convoy effect.",
      );
    }
  }

  if (algorithm === "sjf" || algorithm === "srtf") {
    const longestWait = [...metrics].sort((a, b) => b.waitingTime - a.waitingTime)[0];
    if (longestWait && metrics.length > 2 && longestWait.waitingTime >= Math.max(6, avgWT * 1.6)) {
      notes.push(
        `Starvation risk: ${longestWait.displayName} (BT=${longestWait.burstTime}) waited ${longestWait.waitingTime} time units while shorter jobs ran ahead.`,
      );
    } else {
      notes.push(
        `${ALGORITHM_META[algorithm].shortLabel} minimizes average waiting time, though long jobs can starve if short jobs keep arriving.`,
      );
    }
  }

  if (algorithm === "priority-np" || algorithm === "priority-p") {
    if (aging) {
      notes.push(
        `Aging enabled: waiting processes gain +1 priority level every ${AGING_INTERVAL} waiting units to prevent starvation.`,
      );
    } else {
      const longestWait = [...metrics].sort((a, b) => b.waitingTime - a.waitingTime)[0];
      if (longestWait && longestWait.waitingTime >= Math.max(5, avgWT * 1.4)) {
        notes.push(
          `Starvation risk: lower-priority ${longestWait.displayName} (priority=${longestWait.priority}) waited ${longestWait.waitingTime} units. Enable aging to mitigate.`,
        );
      } else {
        notes.push(
          "Priority scheduling without aging can starve low-priority processes if high-priority jobs keep arriving.",
        );
      }
    }
  }

  if (algorithm === "round-robin") {
    const maxBT = Math.max(...metrics.map((m) => m.burstTime));
    const runSegments = gantt.filter((s) => s.type === "run").length;
    const preemptions = Math.max(0, runSegments - metrics.length);
    if (quantum >= maxBT) {
      notes.push(
        `Quantum (${quantum}) ≥ max burst (${maxBT}), so Round Robin behaved like FCFS with ${preemptions} preemption(s).`,
      );
    } else if (quantum <= 2 && preemptions > 0) {
      notes.push(
        `Small quantum (q=${quantum}) keeps response time low (avg RT=${Number(avgRT.toFixed(2))}) with ${preemptions} preemption(s).`,
      );
    } else {
      notes.push(
        `Quantum q=${quantum} balanced response time (avg RT=${Number(avgRT.toFixed(2))}) with ${preemptions} preemption(s).`,
      );
    }
  }

  if (csTime > 0) {
    notes.push(
      `Context switches: ${csCount} switch(es) × ${csTime} = ${csCount * csTime} overhead unit(s) out of ${busyTime} busy CPU unit(s).`,
    );
  }

  return notes;
}

export function runScheduling(
  processes: ProcessInput[],
  config: SchedulingConfig,
): SchedulingResult {
  const algorithm = config.algorithm;
  const quantum = Math.max(1, Math.floor(config.quantum ?? 2));
  const csTime = Math.max(0, Math.floor(config.contextSwitchTime ?? 0));
  const aging =
    Boolean(config.aging) && (algorithm === "priority-np" || algorithm === "priority-p");

  const displayNames = resolveProcessDisplayNames(processes);

  if (processes.length === 0) {
    return {
      algorithm,
      gantt: [],
      metrics: [],
      decisions: [],
      timeline: [],
      displayNames,
      avgWaitingTime: 0,
      avgTurnaroundTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      busyTime: 0,
      idleTime: 0,
      contextSwitchTotalTime: 0,
      contextSwitchCount: 0,
      totalTime: 0,
      warnings: [],
    };
  }

  const procs: SimProc[] = processes.map((p) => ({
    id: p.id,
    name: p.name,
    displayName: displayNames[p.id] ?? p.id,
    arrivalTime: Math.max(0, Math.floor(p.arrivalTime)),
    burstTime: Math.max(1, Math.floor(p.burstTime)),
    priority: Math.max(0, Math.floor(p.priority ?? 0)),
    remaining: Math.max(1, Math.floor(p.burstTime)),
    firstCpuTime: null,
    completionTime: null,
    waitingTicks: 0,
    inReadyQueue: false,
    arrivalHandled: false,
  }));

  const byId = new Map<string, SimProc>(procs.map((p) => [p.id, p]));
  const cmp = makeComparator(algorithm, aging);

  const decisions: DecisionStep[] = [];
  const timeline: TimeSliceSnapshot[] = [];
  const gantt: GanttSegment[] = [];

  let currentId: string | null = null;
  let lastCpuOwner: string | null = null;
  let quantumLeft = 0;
  let justExpiredRR: SimProc | null = null;

  let csRemaining = 0;
  let csTargetId: string | null = null;
  let contextSwitchCount = 0;
  let skipPreemptThisTick = false;

  const rrQueue: string[] = [];

  let activeDecisionId = -1;
  let activeNarration = "Ready to start.";

  const recordDecision = (
    time: number,
    processId: string | null,
    type: DecisionStep["type"],
    reason: string,
  ) => {
    const id = decisions.length;
    decisions.push({ id, time, processId, type, reason });
    activeDecisionId = id;
    activeNarration = reason;
  };

  const pushSegmentTick = (time: number, type: "run" | "idle" | "cs", processId: string | null) => {
    const last = gantt.at(-1);
    const label =
      type === "run" && processId
        ? (displayNames[processId] ?? processId)
        : type === "cs"
          ? "CS"
          : "idle";
    if (last && last.type === type && last.processId === processId && last.endTime === time) {
      last.endTime = time + 1;
    } else {
      gantt.push({
        processId,
        displayName: label,
        startTime: time,
        endTime: time + 1,
        type,
      });
    }
  };

  const remainingSnapshot = (): Record<string, number> => {
    const rec: Record<string, number> = {};
    for (const p of procs) rec[p.id] = p.remaining;
    return rec;
  };

  let t = 0;
  const maxSafeTicks =
    procs.reduce((acc, p) => acc + p.arrivalTime + p.burstTime, 0) +
    procs.length * (csTime + 2) +
    50;

  while (procs.some((p) => p.remaining > 0) && t < maxSafeTicks) {
    // 1. Arrivals exactly at time t (sorted deterministically by id)
    if (algorithm === "round-robin") {
      const arrivals = procs
        .filter((p) => !p.arrivalHandled && p.arrivalTime <= t)
        .sort((a, b) => compareProcessIds(a.id, b.id));
      for (const a of arrivals) {
        a.arrivalHandled = true;
        rrQueue.push(a.id);
        a.inReadyQueue = true;
      }
      // Re-queue process whose quantum expired at boundary t AFTER newly arrived processes at t
      if (justExpiredRR) {
        rrQueue.push(justExpiredRR.id);
        justExpiredRR.inReadyQueue = true;
      }
    }

    const readyNonRunning = (): SimProc[] => {
      if (algorithm === "round-robin") {
        return rrQueue.map((id) => byId.get(id)!).filter(Boolean);
      }
      return procs
        .filter(
          (p) => p.arrivalTime <= t && p.remaining > 0 && p.id !== currentId && p.id !== csTargetId,
        )
        .sort(cmp);
    };

    const advanceCsTick = () => {
      csRemaining -= 1;
      const queueOrderIds = readyNonRunning().map((p) => p.id);
      timeline.push({
        time: t,
        runningProcessId: null,
        segmentType: "cs",
        readyQueueIds: queueOrderIds,
        remainingById: remainingSnapshot(),
        narration: activeNarration,
        decisionId: activeDecisionId,
      });
      pushSegmentTick(t, "cs", null);

      if (aging) {
        for (const p of procs) {
          if (p.arrivalTime <= t && p.remaining > 0 && p.id !== csTargetId) {
            p.waitingTicks += 1;
          }
        }
      }

      if (csRemaining === 0 && csTargetId) {
        currentId = csTargetId;
        csTargetId = null;
        quantumLeft = quantum;
        lastCpuOwner = currentId;
        skipPreemptThisTick = true;
      }
      justExpiredRR = null;
      t += 1;
    };

    // 2. If currently mid-context-switch, advance CS first
    if (csRemaining > 0 && csTargetId) {
      advanceCsTick();
      continue;
    }

    // 3. Check preemption when a process is already on CPU (SRTF or Priority-P)
    if (
      currentId !== null &&
      !skipPreemptThisTick &&
      (algorithm === "srtf" || algorithm === "priority-p")
    ) {
      const currentProc = byId.get(currentId)!;
      const candidates = readyNonRunning();
      const best = candidates[0];
      if (best && cmp(best, currentProc) < 0) {
        const prevEff = effectivePriority(currentProc, aging);
        const reason = buildWhyReason(algorithm, best, candidates.length + 1, aging, quantum, {
          proc: currentProc,
          effPrio: prevEff,
        });
        if (csTime > 0 && lastCpuOwner !== null && lastCpuOwner !== best.id) {
          contextSwitchCount += 1;
          csRemaining = csTime;
          csTargetId = best.id;
          currentId = null;
          recordDecision(
            t,
            best.id,
            "preempt",
            `${reason} Switching context from ${currentProc.displayName} to ${best.displayName} (${csTime} unit${csTime > 1 ? "s" : ""}).`,
          );
          advanceCsTick();
          continue;
        } else {
          currentId = best.id;
          lastCpuOwner = best.id;
          recordDecision(t, best.id, "preempt", reason);
        }
      }
    }

    // 4. If CPU has no current process, pick from ready queue
    if (currentId === null) {
      let picked: SimProc | undefined;
      let readyCount = 0;

      if (algorithm === "round-robin") {
        readyCount = rrQueue.length;
        const nextId = rrQueue.shift();
        if (nextId) {
          picked = byId.get(nextId);
          if (picked) picked.inReadyQueue = false;
        }
      } else {
        const candidates = readyNonRunning();
        readyCount = candidates.length;
        picked = candidates[0];
      }

      if (!picked) {
        const prevSlice = timeline.at(-1);
        if (!prevSlice || prevSlice.segmentType !== "idle") {
          recordDecision(t, null, "idle", `No process is ready at t=${t} — CPU stays idle.`);
        }
        lastCpuOwner = null;
        justExpiredRR = null;
        skipPreemptThisTick = false;

        timeline.push({
          time: t,
          runningProcessId: null,
          segmentType: "idle",
          readyQueueIds: [],
          remainingById: remainingSnapshot(),
          narration: activeNarration,
          decisionId: activeDecisionId,
        });
        pushSegmentTick(t, "idle", null);
        t += 1;
        continue;
      }

      // Check if switching from a different non-idle process requires CS
      if (csTime > 0 && lastCpuOwner !== null && lastCpuOwner !== picked.id) {
        const prevProc = byId.get(lastCpuOwner)!;
        const why = buildWhyReason(
          algorithm,
          picked,
          readyCount,
          aging,
          quantum,
          null,
          justExpiredRR,
        );
        contextSwitchCount += 1;
        csRemaining = csTime;
        csTargetId = picked.id;
        justExpiredRR = null;
        skipPreemptThisTick = false;

        recordDecision(
          t,
          picked.id,
          "cs",
          `${why} Context switch: ${prevProc.displayName} → ${picked.displayName} (${csTime} unit${csTime > 1 ? "s" : ""}).`,
        );

        advanceCsTick();
        continue;
      }

      // Direct switch (start of run, after idle, or continuing same process)
      const sameAsLast = lastCpuOwner === picked.id;
      const reason =
        justExpiredRR && justExpiredRR.id === picked.id && sameAsLast
          ? `${picked.displayName} is the only ready process — keeps the CPU for another quantum (${quantum}).`
          : buildWhyReason(algorithm, picked, readyCount, aging, quantum, null, justExpiredRR);
      currentId = picked.id;
      lastCpuOwner = picked.id;
      quantumLeft = quantum;
      justExpiredRR = null;
      skipPreemptThisTick = false;
      recordDecision(t, picked.id, "run", reason);
    }

    justExpiredRR = null;
    skipPreemptThisTick = false;

    // 5. Execute currentId for 1 time unit [t, t + 1)
    const running = byId.get(currentId)!;
    if (running.firstCpuTime === null) {
      running.firstCpuTime = t;
    }

    const readyBeforeExec = readyNonRunning().map((p) => p.id);
    timeline.push({
      time: t,
      runningProcessId: running.id,
      segmentType: "run",
      readyQueueIds: readyBeforeExec,
      remainingById: remainingSnapshot(),
      narration: activeNarration,
      decisionId: activeDecisionId,
    });
    pushSegmentTick(t, "run", running.id);

    // Aging: increment waitingTicks for all OTHER ready processes
    if (aging) {
      for (const p of procs) {
        if (p.arrivalTime <= t && p.remaining > 0 && p.id !== running.id) {
          p.waitingTicks += 1;
        }
      }
    }

    running.remaining -= 1;
    if (algorithm === "round-robin") {
      quantumLeft -= 1;
    }

    const nextT = t + 1;
    if (running.remaining === 0) {
      running.completionTime = nextT;
      currentId = null;
      quantumLeft = 0;
    } else if (algorithm === "round-robin" && quantumLeft === 0) {
      justExpiredRR = running;
      currentId = null;
    }

    t = nextT;
  }

  const totalTime = t;
  const busyTime = procs.reduce((acc, p) => acc + p.burstTime, 0);
  const contextSwitchTotalTime = contextSwitchCount * csTime;
  const idleTime = Math.max(0, totalTime - busyTime - contextSwitchTotalTime);

  recordDecision(
    totalTime,
    null,
    "done",
    `All ${procs.length} process${procs.length === 1 ? "" : "es"} finished at t=${totalTime}.`,
  );

  timeline.push({
    time: totalTime,
    runningProcessId: null,
    segmentType: "done",
    readyQueueIds: [],
    remainingById: remainingSnapshot(),
    narration: activeNarration,
    decisionId: activeDecisionId,
  });

  const metrics: ProcessMetrics[] = procs.map((p) => {
    const ct = p.completionTime ?? totalTime;
    const first = p.firstCpuTime ?? ct;
    const tat = ct - p.arrivalTime;
    const wt = tat - p.burstTime;
    const rt = first - p.arrivalTime;
    return {
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      firstCpuTime: first,
      completionTime: ct,
      turnaroundTime: tat,
      waitingTime: wt,
      responseTime: rt,
    };
  });

  const n = metrics.length;
  const avgWaitingTime = metrics.reduce((s, m) => s + m.waitingTime, 0) / n;
  const avgTurnaroundTime = metrics.reduce((s, m) => s + m.turnaroundTime, 0) / n;
  const avgResponseTime = metrics.reduce((s, m) => s + m.responseTime, 0) / n;
  const cpuUtilization = totalTime > 0 ? (busyTime / totalTime) * 100 : 0;
  const throughput = totalTime > 0 ? n / totalTime : 0;

  const warnings = buildWarnings(
    algorithm,
    metrics,
    avgWaitingTime,
    avgResponseTime,
    busyTime,
    gantt,
    quantum,
    aging,
    csTime,
    contextSwitchCount,
  );

  return {
    algorithm,
    gantt,
    metrics,
    decisions,
    timeline,
    displayNames,
    avgWaitingTime,
    avgTurnaroundTime,
    avgResponseTime,
    cpuUtilization,
    throughput,
    busyTime,
    idleTime,
    contextSwitchTotalTime,
    contextSwitchCount,
    totalTime,
    warnings,
  };
}

export const FIXED_ALGORITHM_ORDER: SchedulingAlgorithm[] = [
  "fcfs",
  "sjf",
  "srtf",
  "round-robin",
  "priority-np",
  "priority-p",
];

export interface AlgorithmRanking {
  rank: number;
  result: SchedulingResult;
  totalWT: number;
  totalTAT: number;
  totalRT: number;
  contextSwitches: number;
  avgWT: number;
  avgTAT: number;
  avgRT: number;
  n: number;
  tieBreakReason: string;
}

export interface MetricWinner {
  winners: SchedulingResult[];
  value: number;
  isTie: boolean;
  formattedValue: string;
}

export interface SmallestLongestWaitItem {
  result: SchedulingResult;
  processName: string;
  processId: string;
  waitingTime: number;
}

export interface SmallestLongestWaitWinner {
  winners: SmallestLongestWaitItem[];
  waitingTime: number;
  isTie: boolean;
}

export interface BestVerdict {
  isTie: boolean;
  tiedAlgorithms: SchedulingAlgorithm[];
  winner: SchedulingResult;
  winners: SchedulingResult[];
  rankings: AlgorithmRanking[];
  perMetricWinners: {
    avgWT: MetricWinner;
    avgTAT: MetricWinner;
    avgRT: MetricWinner;
    contextSwitches: MetricWinner;
    makespan: MetricWinner;
    smallestLongestWait: SmallestLongestWaitWinner;
  };
  whyExplanation: string[];
  tieBreakReason: string;
}

function buildWhyExplanation(params: {
  isTie: boolean;
  winners: SchedulingResult[];
  winner: SchedulingResult;
  rankings: AlgorithmRanking[];
  perMetricWinners: BestVerdict["perMetricWinners"];
  contextSwitchTime: number;
  results: SchedulingResult[];
}): string[] {
  const { isTie, winners, winner, rankings, perMetricWinners, contextSwitchTime } = params;
  const lines: string[] = [];

  const winnerLabel = ALGORITHM_META[winner.algorithm].shortLabel;

  // Sentence 1: What it won by, with real numbers
  if (!isTie) {
    const nextBest = rankings[1];
    const worst = rankings[rankings.length - 1];
    const nextBestLabel = ALGORITHM_META[nextBest.result.algorithm].shortLabel;
    const worstLabel = ALGORITHM_META[worst.result.algorithm].shortLabel;

    if (rankings.length > 2 && nextBest.totalWT !== worst.totalWT) {
      lines.push(
        `${winnerLabel} has the lowest average waiting time (${winner.avgWaitingTime.toFixed(2)}), compared with ${nextBest.avgWT.toFixed(2)} for ${nextBestLabel}, the next best, and ${worst.avgWT.toFixed(2)} for ${worstLabel}, the worst.`,
      );
    } else if (rankings.length > 1) {
      lines.push(
        `${winnerLabel} has the lowest average waiting time (${winner.avgWaitingTime.toFixed(2)}), compared with ${nextBest.avgWT.toFixed(2)} for ${nextBestLabel}.`,
      );
    } else {
      lines.push(
        `${winnerLabel} achieved an average waiting time of ${winner.avgWaitingTime.toFixed(2)}.`,
      );
    }
  } else {
    const tiedNames = winners.map((w) => ALGORITHM_META[w.algorithm].shortLabel).join(" and ");
    const nonTied = rankings.filter(
      (r) => !winners.some((w) => w.algorithm === r.result.algorithm),
    );
    if (nonTied.length > 0) {
      const worst = nonTied[nonTied.length - 1];
      const worstLabel = ALGORITHM_META[worst.result.algorithm].shortLabel;
      lines.push(
        `${tiedNames} tied with the lowest average waiting time (${winner.avgWaitingTime.toFixed(2)}), compared with ${worst.avgWT.toFixed(2)} for ${worstLabel}, the worst.`,
      );
    } else {
      lines.push(
        `${tiedNames} tied with the lowest average waiting time (${winner.avgWaitingTime.toFixed(2)}).`,
      );
    }
  }

  // Sentence 2: Reason that matches the algorithm's rule
  if (!isTie) {
    switch (winner.algorithm) {
      case "fcfs":
        lines.push(
          "FCFS runs in arrival order with no reordering, eliminating scheduling decisions and preemption overhead.",
        );
        break;
      case "sjf":
        lines.push(
          "SJF always starts the shortest waiting job, which cuts total waiting time.",
        );
        break;
      case "srtf":
        lines.push(
          "SRTF always runs the process with the least remaining time and preempts for shorter arrivals, which minimizes total waiting when switching is free.",
        );
        break;
      case "round-robin":
        lines.push(
          "Round Robin shares the CPU in equal slices, which gives fast first responses but makes long jobs wait longer overall.",
        );
        break;
      case "priority-np":
        lines.push(
          "Priority (non-preemptive) runs by priority, not by length, so it does not aim to minimize waiting.",
        );
        break;
      case "priority-p":
        lines.push(
          "Priority (preemptive) runs by priority, not by length, so it does not aim to minimize waiting.",
        );
        break;
    }
  } else {
    lines.push(
      "These algorithms tied because the arrival times and burst lengths caused them to schedule the ready processes in equivalent order without extra delays.",
    );
  }

  // Sentence 3: Trade-off drawn from the data
  const bestRTWinner = perMetricWinners.avgRT.winners[0];
  const isRTDifferent =
    bestRTWinner &&
    !winners.some((w) => w.algorithm === bestRTWinner.algorithm) &&
    bestRTWinner.avgResponseTime < winner.avgResponseTime;

  if (isRTDifferent) {
    const rtLabel = ALGORITHM_META[bestRTWinner.algorithm].shortLabel;
    lines.push(
      `${rtLabel} starts every process sooner, with an average response time of ${bestRTWinner.avgResponseTime.toFixed(2)}, but it finishes them later.`,
    );
  } else {
    let winnerMaxProc = winner.metrics[0];
    for (const m of winner.metrics) {
      if (m.waitingTime > winnerMaxProc.waitingTime) {
        winnerMaxProc = m;
      }
    }
    const bestPeak = perMetricWinners.smallestLongestWait;
    if (bestPeak.waitingTime < winnerMaxProc.waitingTime) {
      const peakProc = bestPeak.winners[0];
      const peakLabel = ALGORITHM_META[peakProc.result.algorithm].shortLabel;
      lines.push(
        `Under ${winnerLabel}, ${winnerMaxProc.name} waited the longest (${winnerMaxProc.waitingTime} ms), compared with a lower peak wait of ${bestPeak.waitingTime} ms for ${peakProc.processName} under ${peakLabel}.`,
      );
    } else if (winner.contextSwitchCount > 0) {
      const fewestCS = perMetricWinners.contextSwitches.value;
      lines.push(
        `${winnerLabel} required ${winner.contextSwitchCount} context switch${winner.contextSwitchCount === 1 ? "" : "es"}${fewestCS < winner.contextSwitchCount ? ` (compared with ${fewestCS} for non-preemptive algorithms)` : ""}.`,
      );
    } else {
      lines.push(
        `Under ${winnerLabel}, ${winnerMaxProc.name} waited the longest at ${winnerMaxProc.waitingTime} ms, while keeping overall queue delays to a minimum.`,
      );
    }
  }

  // Sentence 4: Context switch cost note if CS > 0
  if (contextSwitchTime > 0) {
    lines.push(
      `Switching costs of ${contextSwitchTime} ms per context switch were included, meaning preemptive algorithms paid extra overhead that can erode their theoretical advantages.`,
    );
  }

  // Sentence 5: Closing line
  lines.push(
    "Best here means lowest average waiting time for this input. A different example or goal can change the answer.",
  );

  return lines;
}

export function pickBest(
  results: SchedulingResult[],
  contextSwitchTime: number = 0,
): BestVerdict {
  if (results.length === 0) {
    throw new Error("pickBest requires at least one scheduling result");
  }

  interface ComputedStats {
    result: SchedulingResult;
    totalWT: number;
    totalTAT: number;
    totalRT: number;
    contextSwitches: number;
    avgWT: number;
    avgTAT: number;
    avgRT: number;
    n: number;
  }

  const computed: ComputedStats[] = results.map((r) => {
    const totalWT = r.metrics.reduce((acc, m) => acc + m.waitingTime, 0);
    const totalTAT = r.metrics.reduce((acc, m) => acc + m.turnaroundTime, 0);
    const totalRT = r.metrics.reduce((acc, m) => acc + m.responseTime, 0);
    const n = Math.max(1, r.metrics.length);
    return {
      result: r,
      totalWT,
      totalTAT,
      totalRT,
      contextSwitches: r.contextSwitchCount,
      avgWT: totalWT / n,
      avgTAT: totalTAT / n,
      avgRT: totalRT / n,
      n,
    };
  });

  // Sort by the strict rule:
  // 1. totalWT (asc)
  // 2. totalTAT (asc)
  // 3. totalRT (asc)
  // 4. contextSwitches (asc)
  // 5. FIXED_ALGORITHM_ORDER (asc)
  const sorted = [...computed].sort((a, b) => {
    if (a.totalWT !== b.totalWT) return a.totalWT - b.totalWT;
    if (a.totalTAT !== b.totalTAT) return a.totalTAT - b.totalTAT;
    if (a.totalRT !== b.totalRT) return a.totalRT - b.totalRT;
    if (a.contextSwitches !== b.contextSwitches) return a.contextSwitches - b.contextSwitches;
    return (
      FIXED_ALGORITHM_ORDER.indexOf(a.result.algorithm) -
      FIXED_ALGORITHM_ORDER.indexOf(b.result.algorithm)
    );
  });

  const minWT = sorted[0].totalWT;
  const wtTies = sorted.filter((c) => c.totalWT === minWT);

  let isTie = false;
  let topCandidates = wtTies;
  let tieBreakReason = "Decided by lowest total waiting time.";

  if (wtTies.length > 1) {
    const minTAT = Math.min(...wtTies.map((c) => c.totalTAT));
    const tatTies = wtTies.filter((c) => c.totalTAT === minTAT);

    if (tatTies.length === 1) {
      topCandidates = tatTies;
      tieBreakReason = "Tied on total waiting time; broken by lowest total turnaround time.";
    } else {
      const minRT = Math.min(...tatTies.map((c) => c.totalRT));
      const rtTies = tatTies.filter((c) => c.totalRT === minRT);

      if (rtTies.length === 1) {
        topCandidates = rtTies;
        tieBreakReason =
          "Tied on total waiting time and turnaround time; broken by lowest total response time.";
      } else {
        isTie = true;
        topCandidates = rtTies;
        tieBreakReason = `Tie on total waiting time (${minWT}), turnaround time (${minTAT}), and response time (${minRT}).`;
      }
    }
  }

  const winner = topCandidates[0].result;
  const winners = topCandidates.map((c) => c.result);
  const tiedAlgorithms = winners.map((w) => w.algorithm);

  const rankings: AlgorithmRanking[] = sorted.map((item, idx) => {
    const rank = idx + 1;
    let itemReason = "";

    if (idx === 0) {
      itemReason = isTie ? "Tied for 1st place" : tieBreakReason;
    } else {
      const prev = sorted[idx - 1];
      if (
        item.totalWT === prev.totalWT &&
        item.totalTAT === prev.totalTAT &&
        item.totalRT === prev.totalRT
      ) {
        itemReason = `Tied with ${ALGORITHM_META[prev.result.algorithm].shortLabel} on WT, TAT, and RT`;
      } else if (item.totalWT !== prev.totalWT) {
        itemReason = `Higher total WT (+${item.totalWT - prev.totalWT})`;
      } else if (item.totalTAT !== prev.totalTAT) {
        itemReason = `Tied on WT; higher total TAT (+${item.totalTAT - prev.totalTAT})`;
      } else {
        itemReason = `Tied on WT and TAT; higher total RT (+${item.totalRT - prev.totalRT})`;
      }
    }

    return {
      rank,
      result: item.result,
      totalWT: item.totalWT,
      totalTAT: item.totalTAT,
      totalRT: item.totalRT,
      contextSwitches: item.contextSwitches,
      avgWT: item.avgWT,
      avgTAT: item.avgTAT,
      avgRT: item.avgRT,
      n: item.n,
      tieBreakReason: itemReason,
    };
  });

  const minAvgWT = Math.min(...computed.map((c) => c.totalWT));
  const wtWinners = computed.filter((c) => c.totalWT === minAvgWT).map((c) => c.result);

  const minAvgTAT = Math.min(...computed.map((c) => c.totalTAT));
  const tatWinners = computed.filter((c) => c.totalTAT === minAvgTAT).map((c) => c.result);

  const minAvgRT = Math.min(...computed.map((c) => c.totalRT));
  const rtWinners = computed.filter((c) => c.totalRT === minAvgRT).map((c) => c.result);

  const minCS = Math.min(...computed.map((c) => c.contextSwitches));
  const csWinners = computed.filter((c) => c.contextSwitches === minCS).map((c) => c.result);

  const minMakespan = Math.min(...results.map((r) => r.totalTime));
  const makespanWinners = results.filter((r) => r.totalTime === minMakespan);

  const longestPerAlgo = results.map((r) => {
    let maxProc = r.metrics[0];
    for (const m of r.metrics) {
      if (m.waitingTime > maxProc.waitingTime) {
        maxProc = m;
      }
    }
    return {
      result: r,
      processName: maxProc ? maxProc.name : "None",
      processId: maxProc ? maxProc.id : "P0",
      waitingTime: maxProc ? maxProc.waitingTime : 0,
    };
  });

  const minLongestWait = Math.min(...longestPerAlgo.map((l) => l.waitingTime));
  const smallestLongestWaitWinners = longestPerAlgo.filter(
    (l) => l.waitingTime === minLongestWait,
  );

  const perMetricWinners = {
    avgWT: {
      winners: wtWinners,
      value: minAvgWT / computed[0].n,
      isTie: wtWinners.length > 1,
      formattedValue: (minAvgWT / computed[0].n).toFixed(2),
    },
    avgTAT: {
      winners: tatWinners,
      value: minAvgTAT / computed[0].n,
      isTie: tatWinners.length > 1,
      formattedValue: (minAvgTAT / computed[0].n).toFixed(2),
    },
    avgRT: {
      winners: rtWinners,
      value: minAvgRT / computed[0].n,
      isTie: rtWinners.length > 1,
      formattedValue: (minAvgRT / computed[0].n).toFixed(2),
    },
    contextSwitches: {
      winners: csWinners,
      value: minCS,
      isTie: csWinners.length > 1,
      formattedValue: String(minCS),
    },
    makespan: {
      winners: makespanWinners,
      value: minMakespan,
      isTie: makespanWinners.length > 1,
      formattedValue: `${minMakespan} ms`,
    },
    smallestLongestWait: {
      winners: smallestLongestWaitWinners,
      waitingTime: minLongestWait,
      isTie: smallestLongestWaitWinners.length > 1,
    },
  };

  const whyExplanation = buildWhyExplanation({
    isTie,
    winners,
    winner,
    rankings,
    perMetricWinners,
    contextSwitchTime,
    results,
  });

  return {
    isTie,
    tiedAlgorithms,
    winner,
    winners,
    rankings,
    perMetricWinners,
    whyExplanation,
    tieBreakReason,
  };
}
