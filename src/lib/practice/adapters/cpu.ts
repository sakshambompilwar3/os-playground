import { runScheduling, ProcessInput, SchedulingConfig, SchedulingAlgorithm } from "../../scheduling";

export interface CpuSchedulingInputProcess {
  id: string;
  name?: string;
  arrivalTime: number;
  burstTime: number;
  priority?: number;
}

export interface CpuSchedulingResultMetrics {
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
}

export interface CpuSchedulingProductionOutput {
  metrics: Record<string, CpuSchedulingResultMetrics>;
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  firstFinishedProcessId: string;
  gantt: {
    processId: string | null;
    displayName: string;
    startTime: number;
    endTime: number;
    type: "run" | "idle" | "cs";
  }[];
}

export function runCpuProductionSolver(
  processes: CpuSchedulingInputProcess[],
  algorithm: SchedulingAlgorithm,
  quantum?: number,
): CpuSchedulingProductionOutput {
  const inputs: ProcessInput[] = processes.map((p) => ({
    id: p.id,
    name: p.name ?? p.id,
    arrivalTime: p.arrivalTime,
    burstTime: p.burstTime,
    priority: p.priority,
  }));

  const config: SchedulingConfig = {
    algorithm,
    quantum: quantum ?? 2,
    contextSwitchTime: 0,
    aging: false,
  };

  const res = runScheduling(inputs, config);

  const metrics: Record<string, CpuSchedulingResultMetrics> = {};
  for (const m of res.metrics) {
    metrics[m.id] = {
      completionTime: m.completionTime,
      turnaroundTime: m.turnaroundTime,
      waitingTime: m.waitingTime,
      responseTime: m.responseTime,
    };
  }

  // Find first finished process (lowest completionTime; ties broken by process ID)
  let firstFinished = res.metrics[0]?.id ?? "";
  let minCT = res.metrics[0]?.completionTime ?? Infinity;
  for (const m of res.metrics) {
    if (m.completionTime < minCT) {
      minCT = m.completionTime;
      firstFinished = m.id;
    } else if (m.completionTime === minCT) {
      if (m.id.localeCompare(firstFinished, undefined, { numeric: true }) < 0) {
        firstFinished = m.id;
      }
    }
  }

  return {
    metrics,
    avgWaitingTime: res.avgWaitingTime,
    avgTurnaroundTime: res.avgTurnaroundTime,
    avgResponseTime: res.avgResponseTime,
    firstFinishedProcessId: firstFinished,
    gantt: res.gantt.map((g) => ({
      processId: g.processId,
      displayName: g.displayName,
      startTime: g.startTime,
      endTime: g.endTime,
      type: g.type,
    })),
  };
}
