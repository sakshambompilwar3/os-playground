// Reference CPU scheduling solver written completely independently from production.
// Implements unit-by-unit (tick-by-tick) simulation.
// Zero imports from production files.

export type CpuAlgorithm =
  | "fcfs"
  | "sjf"
  | "srtf"
  | "round-robin"
  | "priority-np"
  | "priority-p";

export type TieVariant = "variantA" | "variantB" | "variantC";

export interface RefCpuProcess {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority?: number;
}

export interface RefCpuResultMetrics {
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
}

export interface RefCpuOutput {
  metrics: Record<string, RefCpuResultMetrics>;
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  firstFinishedProcessId: string;
  gantt: {
    processId: string | null;
    startTime: number;
    endTime: number;
  }[];
}

function parseIdNumber(id: string): number {
  const m = /\d+$/.exec(id);
  return m ? parseInt(m[0], 10) : 0;
}

function compareIds(a: string, b: string, variant: TieVariant): number {
  const numA = parseIdNumber(a);
  const numB = parseIdNumber(b);
  if (numA !== numB) {
    return variant === "variantB" ? numB - numA : numA - numB;
  }
  return variant === "variantB" ? b.localeCompare(a) : a.localeCompare(b);
}

export function runCpuReferenceSolver(
  processes: RefCpuProcess[],
  algorithm: CpuAlgorithm,
  quantum = 2,
  variant: TieVariant = "variantA",
): RefCpuOutput {
  if (processes.length === 0) {
    return {
      metrics: {},
      avgWaitingTime: 0,
      avgTurnaroundTime: 0,
      avgResponseTime: 0,
      firstFinishedProcessId: "",
      gantt: [],
    };
  }

  interface InternalProc {
    id: string;
    arrivalTime: number;
    burstTime: number;
    priority: number;
    remaining: number;
    firstRun: number | null;
    completionTime: number | null;
  }

  const procs: InternalProc[] = processes.map((p) => ({
    id: p.id,
    arrivalTime: p.arrivalTime,
    burstTime: p.burstTime,
    priority: p.priority ?? 0,
    remaining: p.burstTime,
    firstRun: null,
    completionTime: null,
  }));

  const byId = new Map<string, InternalProc>(procs.map((p) => [p.id, p]));

  let readyQueue: string[] = [];
  let currentRunning: string | null = null;
  let currentSlice = 0;
  let currentTime = 0;
  const ganttTicks: (string | null)[] = [];

  const totalRemaining = () => procs.reduce((sum, p) => sum + p.remaining, 0);

  // Helper to sort newly arrived processes according to variant
  const sortNewArrivals = (ids: string[]) => {
    return [...ids].sort((aId, bId) => {
      const pa = byId.get(aId)!;
      const pb = byId.get(bId)!;
      if (pa.arrivalTime !== pb.arrivalTime) {
        return variant === "variantB"
          ? pb.arrivalTime - pa.arrivalTime
          : pa.arrivalTime - pb.arrivalTime;
      }
      return compareIds(aId, bId, variant);
    });
  };

  // Helper to select best process for non-preemptive SJF and Priority-NP
  const pickBestFromQueue = (candidates: string[]) => {
    if (candidates.length <= 1) return candidates[0] ?? null;

    let bestId = candidates[0];
    let bestProc = byId.get(bestId)!;

    for (let i = 1; i < candidates.length; i++) {
      const candId = candidates[i];
      const candProc = byId.get(candId)!;

      let cmp = 0;
      if (algorithm === "sjf") {
        cmp = candProc.burstTime - bestProc.burstTime;
      } else if (algorithm === "priority-np") {
        cmp = candProc.priority - bestProc.priority;
      } else {
        // FCFS
        cmp = candProc.arrivalTime - bestProc.arrivalTime;
      }

      if (cmp < 0) {
        bestId = candId;
        bestProc = candProc;
      } else if (cmp === 0) {
        // Tie break
        let tie = 0;
        if (candProc.arrivalTime !== bestProc.arrivalTime) {
          tie = variant === "variantB"
            ? bestProc.arrivalTime - candProc.arrivalTime
            : candProc.arrivalTime - bestProc.arrivalTime;
        } else {
          tie = compareIds(candId, bestId, variant);
        }
        if (tie < 0) {
          bestId = candId;
          bestProc = candProc;
        }
      }
    }
    return bestId;
  };

  // Helper to select best for SRTF and Priority-P across all available processes (ready queue + running)
  const pickBestPreemptive = (candidates: string[]) => {
    if (candidates.length === 0) return null;
    let bestId = candidates[0];
    let bestProc = byId.get(bestId)!;

    for (let i = 1; i < candidates.length; i++) {
      const candId = candidates[i];
      const candProc = byId.get(candId)!;

      let cmp = 0;
      if (algorithm === "srtf") {
        cmp = candProc.remaining - bestProc.remaining;
      } else if (algorithm === "priority-p") {
        cmp = candProc.priority - bestProc.priority;
      }

      if (cmp < 0) {
        bestId = candId;
        bestProc = candProc;
      } else if (cmp === 0) {
        let tie = 0;
        if (candProc.arrivalTime !== bestProc.arrivalTime) {
          tie = variant === "variantB"
            ? bestProc.arrivalTime - candProc.arrivalTime
            : candProc.arrivalTime - bestProc.arrivalTime;
        } else {
          tie = compareIds(candId, bestId, variant);
        }
        if (tie < 0) {
          bestId = candId;
          bestProc = candProc;
        }
      }
    }
    return bestId;
  };

  const MAX_TICKS = 10000;

  while (totalRemaining() > 0 && currentTime < MAX_TICKS) {
    // 1. Identify newly arrived processes at currentTime
    const newArrivals = procs.filter((p) => p.arrivalTime === currentTime).map((p) => p.id);
    const sortedNew = sortNewArrivals(newArrivals);

    if (algorithm === "round-robin") {
      let preemptedProcId: string | null = null;
      if (currentRunning) {
        const running = byId.get(currentRunning)!;
        if (running.remaining === 0) {
          running.completionTime = currentTime;
          currentRunning = null;
          currentSlice = 0;
        } else if (currentSlice >= quantum) {
          preemptedProcId = currentRunning;
          currentRunning = null;
          currentSlice = 0;
        }
      }

      if (variant === "variantC") {
        // Preempted process enters before new arrivals
        if (preemptedProcId) readyQueue.push(preemptedProcId);
        readyQueue.push(...sortedNew);
      } else {
        // Stated rule: newly arrived processes enter queue first, then preempted
        readyQueue.push(...sortedNew);
        if (preemptedProcId) readyQueue.push(preemptedProcId);
      }

      if (!currentRunning && readyQueue.length > 0) {
        currentRunning = readyQueue.shift()!;
        currentSlice = 0;
      }
    } else if (algorithm === "fcfs" || algorithm === "sjf" || algorithm === "priority-np") {
      // Non-preemptive
      if (currentRunning) {
        const running = byId.get(currentRunning)!;
        if (running.remaining === 0) {
          running.completionTime = currentTime;
          currentRunning = null;
        }
      }

      readyQueue.push(...sortedNew);

      if (!currentRunning && readyQueue.length > 0) {
        const best = pickBestFromQueue(readyQueue);
        if (best) {
          currentRunning = best;
          readyQueue = readyQueue.filter((id) => id !== best);
        }
      }
    } else if (algorithm === "srtf" || algorithm === "priority-p") {
      // Preemptive
      if (currentRunning) {
        const running = byId.get(currentRunning)!;
        if (running.remaining === 0) {
          running.completionTime = currentTime;
          currentRunning = null;
        }
      }

      readyQueue.push(...sortedNew);

      const allActive = currentRunning ? [...readyQueue, currentRunning] : [...readyQueue];
      if (allActive.length > 0) {
        const best = pickBestPreemptive(allActive);
        if (best) {
          currentRunning = best;
          readyQueue = allActive.filter((id) => id !== best);
        }
      }
    }

    // Record tick
    ganttTicks.push(currentRunning);

    if (currentRunning) {
      const running = byId.get(currentRunning)!;
      if (running.firstRun === null) {
        running.firstRun = currentTime;
      }
      running.remaining -= 1;
      currentSlice += 1;
    }

    currentTime += 1;
  }

  // Handle any process completing at final tick
  if (currentRunning) {
    const running = byId.get(currentRunning)!;
    if (running.remaining === 0 && running.completionTime === null) {
      running.completionTime = currentTime;
    }
  }

  // Build Gantt segments
  const gantt: { processId: string | null; startTime: number; endTime: number }[] = [];
  if (ganttTicks.length > 0) {
    let segStart = 0;
    let segProc = ganttTicks[0];
    for (let t = 1; t <= ganttTicks.length; t++) {
      if (t === ganttTicks.length || ganttTicks[t] !== segProc) {
        gantt.push({
          processId: segProc,
          startTime: segStart,
          endTime: t,
        });
        if (t < ganttTicks.length) {
          segStart = t;
          segProc = ganttTicks[t];
        }
      }
    }
  }

  // Compute metrics
  const metrics: Record<string, RefCpuResultMetrics> = {};
  let totalWT = 0;
  let totalTAT = 0;
  let totalRT = 0;
  let firstFinishedId = procs[0]?.id ?? "";
  let minCT = Infinity;

  for (const p of procs) {
    const ct = p.completionTime ?? currentTime;
    const tat = ct - p.arrivalTime;
    const wt = tat - p.burstTime;
    const rt = (p.firstRun ?? p.arrivalTime) - p.arrivalTime;

    metrics[p.id] = {
      completionTime: ct,
      turnaroundTime: tat,
      waitingTime: wt,
      responseTime: rt,
    };

    totalWT += wt;
    totalTAT += tat;
    totalRT += rt;

    if (ct < minCT) {
      minCT = ct;
      firstFinishedId = p.id;
    } else if (ct === minCT) {
      if (compareIds(p.id, firstFinishedId, variant) < 0) {
        firstFinishedId = p.id;
      }
    }
  }

  const n = procs.length;
  return {
    metrics,
    avgWaitingTime: totalWT / n,
    avgTurnaroundTime: totalTAT / n,
    avgResponseTime: totalRT / n,
    firstFinishedProcessId: firstFinishedId,
    gantt,
  };
}
