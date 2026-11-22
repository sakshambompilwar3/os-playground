import {
  simulateMemoryAllocation,
  BlockInput,
  MemProcessInput,
  PartitionMode,
  FitStrategy,
  MemorySimulationResult,
} from "../../memory";

export interface MemoryAdapterInput {
  blocks: { id: string; size: number }[];
  processes: { id: string; size: number }[];
  mode: PartitionMode;
  strategy: FitStrategy;
}

export interface MemoryAdapterOutput {
  allocations: Record<string, string>; // processId -> blockId or "none"
  totalInternalFragmentation: number;
  totalFreeMemory: number;
  largestHoleSize: number;
  unallocatedProcessCount: number;
  memoryUtilizationPercent: number;
  rawResult: MemorySimulationResult;
}

export function runMemoryProductionSolver(input: MemoryAdapterInput): MemoryAdapterOutput {
  const blocks: BlockInput[] = input.blocks.map((b) => ({
    id: b.id,
    size: b.size,
  }));

  const processes: MemProcessInput[] = input.processes.map((p) => ({
    id: p.id,
    name: p.id,
    size: p.size,
  }));

  const result = simulateMemoryAllocation(blocks, processes, input.mode, input.strategy);

  const allocations: Record<string, string> = {};
  for (const step of result.steps) {
    if (step.record.status === "allocated" && step.record.allocatedTo) {
      // Clean label like "B2 rem" -> "B2"
      const rootBlock = step.record.allocatedTo.replace(/\s+rem.*/, "");
      allocations[step.record.processId] = rootBlock;
    } else {
      allocations[step.record.processId] = "none";
    }
  }

  const largestHole = result.summary.largestFreeHole;

  return {
    allocations,
    totalInternalFragmentation: result.summary.totalInternalFrag,
    totalFreeMemory: result.summary.totalFreeMemory,
    largestHoleSize: largestHole,
    unallocatedProcessCount: result.summary.waitingCount,
    memoryUtilizationPercent: Number(result.summary.utilizationPercent.toFixed(2)),
    rawResult: result,
  };
}
