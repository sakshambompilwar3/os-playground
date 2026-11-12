export type PartitionMode = "fixed" | "dynamic";
export type FitStrategy = "first-fit" | "best-fit" | "worst-fit" | "next-fit";

export interface ModeMeta {
  id: PartitionMode;
  label: string;
  shortDesc: string;
}

export interface StrategyMeta {
  id: FitStrategy;
  label: string;
  shortDesc: string;
}

export const MODE_META: Record<PartitionMode, ModeMeta> = {
  fixed: {
    id: "fixed",
    label: "Fixed partitioning",
    shortDesc: "Each block holds at most 1 process; unused space inside is internal fragmentation.",
  },
  dynamic: {
    id: "dynamic",
    label: "Dynamic partitioning",
    shortDesc: "Takes exact process size; leftover space becomes a smaller free hole.",
  },
};

export const STRATEGY_META: Record<FitStrategy, StrategyMeta> = {
  "first-fit": {
    id: "first-fit",
    label: "First Fit",
    shortDesc: "Scans from address 0 and picks the first free hole large enough.",
  },
  "best-fit": {
    id: "best-fit",
    label: "Best Fit",
    shortDesc: "Checks all free holes and picks the smallest one that fits (ties → lowest address).",
  },
  "worst-fit": {
    id: "worst-fit",
    label: "Worst Fit",
    shortDesc: "Checks all free holes and picks the largest one (ties → lowest address).",
  },
  "next-fit": {
    id: "next-fit",
    label: "Next Fit",
    shortDesc: "Starts from the previous allocation pointer, wrapping around once for the first fit.",
  },
};

export const DEFAULT_EXAMPLE_BLOCKS: BlockInput[] = [
  { id: "B1", size: 100 },
  { id: "B2", size: 500 },
  { id: "B3", size: 200 },
  { id: "B4", size: 300 },
  { id: "B5", size: 600 },
];

export const DEFAULT_EXAMPLE_MEM_PROCESSES: MemProcessInput[] = [
  { id: "P1", name: "Netflix", size: 212 },
  { id: "P2", name: "Chrome", size: 417 },
  { id: "P3", name: "Spotify", size: 112 },
  { id: "P4", name: "Zoom", size: 426 },
];

export interface BlockInput {
  id: string;
  size: number;
}

export interface MemProcessInput {
  id: string;
  name: string;
  size: number;
}

export interface MemorySegment {
  segmentId: string;
  kind: "free" | "allocated";
  /** Original block label (e.g. "B2") or hole label. */
  label: string;
  start: number;
  end: number;
  size: number;
  processId?: string;
  processName?: string;
  processSize?: number;
  internalFrag: number;
}

export interface ScanCandidate {
  segmentId: string;
  label: string;
  start: number;
  end: number;
  size: number;
  fits: boolean;
  chosen: boolean;
  reason: string;
}

export interface AllocationRecord {
  processId: string;
  processName: string;
  processSize: number;
  status: "allocated" | "waiting";
  allocatedTo: string | null;
  start: number | null;
  end: number | null;
  internalFrag: number;
  leftoverHole: number;
  waitReason: string | null;
}

export interface MemorySummary {
  totalMemory: number;
  allocatedProcessMemory: number;
  totalInternalFrag: number;
  totalFreeMemory: number;
  freeHoleCount: number;
  largestFreeHole: number;
  utilizationPercent: number;
  waitingCount: number;
  externalFragApplies: boolean;
  smallestWaitingSize: number | null;
}

export interface AllocationStep {
  stepIndex: number;
  processId: string;
  processName: string;
  processSize: number;
  pointerBeforeIndex: number | null;
  pointerAfterIndex: number | null;
  segmentsBefore: MemorySegment[];
  candidates: ScanCandidate[];
  chosenSegmentId: string | null;
  record: AllocationRecord;
  segmentsAfter: MemorySegment[];
  summaryAfter: MemorySummary;
  narration: string;
}

export interface MemorySimulationResult {
  mode: PartitionMode;
  strategy: FitStrategy;
  steps: AllocationStep[];
  records: AllocationRecord[];
  finalSegments: MemorySegment[];
  summary: MemorySummary;
}

export interface CompactionResult {
  segmentsBefore: MemorySegment[];
  segmentsAfter: MemorySegment[];
  summaryAfter: MemorySummary;
  movedCount: number;
  mergedHoleCount: number;
  mergedHoleSize: number;
}

export function buildInitialSegments(blocks: BlockInput[]): MemorySegment[] {
  let cursor = 0;
  return blocks.map((b) => {
    const start = cursor;
    const end = cursor + b.size;
    cursor = end;
    return {
      segmentId: b.id,
      kind: "free",
      label: b.id,
      start,
      end,
      size: b.size,
      internalFrag: 0,
    };
  });
}

export function computeMemorySummary(
  segments: MemorySegment[],
  records: AllocationRecord[],
): MemorySummary {
  const totalMemory = segments.reduce((acc, seg) => acc + seg.size, 0);
  let allocatedProcessMemory = 0;
  let totalInternalFrag = 0;
  let totalFreeMemory = 0;
  let freeHoleCount = 0;
  let largestFreeHole = 0;

  for (const seg of segments) {
    if (seg.kind === "allocated") {
      allocatedProcessMemory += seg.processSize ?? seg.size;
      totalInternalFrag += seg.internalFrag;
    } else {
      totalFreeMemory += seg.size;
      freeHoleCount += 1;
      if (seg.size > largestFreeHole) {
        largestFreeHole = seg.size;
      }
    }
  }

  const waiting = records.filter((r) => r.status === "waiting");
  const smallestWaitingSize =
    waiting.length > 0 ? Math.min(...waiting.map((r) => r.processSize)) : null;

  const externalFragApplies =
    smallestWaitingSize !== null &&
    totalFreeMemory >= smallestWaitingSize &&
    largestFreeHole < smallestWaitingSize;

  const utilizationPercent =
    totalMemory > 0 ? (allocatedProcessMemory / totalMemory) * 100 : 0;

  return {
    totalMemory,
    allocatedProcessMemory,
    totalInternalFrag,
    totalFreeMemory,
    freeHoleCount,
    largestFreeHole,
    utilizationPercent,
    waitingCount: waiting.length,
    externalFragApplies,
    smallestWaitingSize,
  };
}

function findNextFreeIndex(segments: MemorySegment[], fromIndex: number): number | null {
  if (segments.length === 0) return null;
  const n = segments.length;
  for (let offset = 0; offset < n; offset += 1) {
    const idx = (fromIndex + offset) % n;
    if (segments[idx]!.kind === "free") {
      return idx;
    }
  }
  return null;
}

function buildWaitReason(processSize: number, segments: MemorySegment[]): string {
  const freeSegs = segments.filter((s) => s.kind === "free");
  if (freeSegs.length === 0) {
    return `needs ${processSize} KB, no free blocks/holes remain`;
  }
  const largest = Math.max(...freeSegs.map((s) => s.size));
  return `needs ${processSize} KB, largest free hole is ${largest} KB`;
}

function runProcessPlacement(
  proc: MemProcessInput,
  stepIndex: number,
  segmentsBefore: MemorySegment[],
  pointerIndex: number | null,
  mode: PartitionMode,
  strategy: FitStrategy,
  priorRecords: AllocationRecord[],
  holeSeqCounter: { value: number },
): {
  step: AllocationStep;
  nextSegments: MemorySegment[];
  nextPointerIndex: number | null;
} {
  const n = segmentsBefore.length;
  const candidates: ScanCandidate[] = [];
  let chosenIdx: number | null = null;

  if (strategy === "first-fit") {
    for (let i = 0; i < n; i += 1) {
      const seg = segmentsBefore[i]!;
      if (seg.kind !== "free") continue;
      const fits = seg.size >= proc.size;
      const chosen = fits;
      candidates.push({
        segmentId: seg.segmentId,
        label: seg.label,
        start: seg.start,
        end: seg.end,
        size: seg.size,
        fits,
        chosen,
        reason: fits
          ? `${seg.label}: ${seg.size} KB ≥ ${proc.size} KB — fits (first fit)`
          : `${seg.label}: ${seg.size} KB < ${proc.size} KB, too small, skip`,
      });
      if (fits) {
        chosenIdx = i;
        break;
      }
    }
  } else if (strategy === "next-fit") {
    const startIdx = pointerIndex ?? findNextFreeIndex(segmentsBefore, 0);
    if (startIdx !== null) {
      for (let offset = 0; offset < n; offset += 1) {
        const i = (startIdx + offset) % n;
        const seg = segmentsBefore[i]!;
        if (seg.kind !== "free") continue;
        const fits = seg.size >= proc.size;
        const chosen = fits;
        candidates.push({
          segmentId: seg.segmentId,
          label: seg.label,
          start: seg.start,
          end: seg.end,
          size: seg.size,
          fits,
          chosen,
          reason: fits
            ? `${seg.label}: ${seg.size} KB ≥ ${proc.size} KB — fits (next fit)`
            : `${seg.label}: ${seg.size} KB < ${proc.size} KB, too small, skip`,
        });
        if (fits) {
          chosenIdx = i;
          break;
        }
      }
    }
  } else {
    // Best Fit or Worst Fit: scan ALL free holes in address order
    let bestIdx: number | null = null;
    for (let i = 0; i < n; i += 1) {
      const seg = segmentsBefore[i]!;
      if (seg.kind !== "free") continue;
      const fits = seg.size >= proc.size;
      let reason = "";
      if (!fits) {
        reason = `${seg.label}: ${seg.size} KB < ${proc.size} KB, too small, skip`;
      } else if (bestIdx === null) {
        bestIdx = i;
        reason = `${seg.label}: ${seg.size} KB ≥ ${proc.size} KB — fits (initial best candidate)`;
      } else {
        const currentBest = segmentsBefore[bestIdx]!;
        const isBetter =
          strategy === "best-fit"
            ? seg.size < currentBest.size
            : seg.size > currentBest.size;
        if (isBetter) {
          bestIdx = i;
          reason =
            strategy === "best-fit"
              ? `${seg.label}: ${seg.size} KB — smaller fit (${seg.size} < ${currentBest.size})`
              : `${seg.label}: ${seg.size} KB — larger fit (${seg.size} > ${currentBest.size})`;
        } else {
          reason =
            strategy === "best-fit"
              ? `${seg.label}: ${seg.size} KB fits, not smaller than ${currentBest.size} KB`
              : `${seg.label}: ${seg.size} KB fits, not larger than ${currentBest.size} KB`;
        }
      }
      candidates.push({
        segmentId: seg.segmentId,
        label: seg.label,
        start: seg.start,
        end: seg.end,
        size: seg.size,
        fits,
        chosen: false,
        reason,
      });
    }
    if (bestIdx !== null) {
      chosenIdx = bestIdx;
      const chosenId = segmentsBefore[bestIdx]!.segmentId;
      for (const c of candidates) {
        if (c.segmentId === chosenId) {
          c.chosen = true;
        }
      }
    }
  }

  let segmentsAfter: MemorySegment[];
  let record: AllocationRecord;
  let nextPointerIndex: number | null = pointerIndex;
  let narration = "";

  if (chosenIdx === null) {
    segmentsAfter = segmentsBefore.map((s) => ({ ...s }));
    const waitReason = buildWaitReason(proc.size, segmentsBefore);
    record = {
      processId: proc.id,
      processName: proc.name,
      processSize: proc.size,
      status: "waiting",
      allocatedTo: null,
      start: null,
      end: null,
      internalFrag: 0,
      leftoverHole: 0,
      waitReason,
    };
    narration = `${proc.id} (${proc.name}, ${proc.size} KB) could not be placed: ${waitReason}. Marked as waiting.`;
    if (strategy === "next-fit") {
      nextPointerIndex = findNextFreeIndex(segmentsAfter, pointerIndex ?? 0);
    }
  } else {
    const target = segmentsBefore[chosenIdx]!;
    if (mode === "fixed") {
      const internalFrag = target.size - proc.size;
      const allocatedSeg: MemorySegment = {
        segmentId: `${target.segmentId}::${proc.id}`,
        kind: "allocated",
        label: target.label,
        start: target.start,
        end: target.end,
        size: target.size,
        processId: proc.id,
        processName: proc.name,
        processSize: proc.size,
        internalFrag,
      };
      segmentsAfter = [
        ...segmentsBefore.slice(0, chosenIdx),
        allocatedSeg,
        ...segmentsBefore.slice(chosenIdx + 1),
      ];
      record = {
        processId: proc.id,
        processName: proc.name,
        processSize: proc.size,
        status: "allocated",
        allocatedTo: target.label,
        start: target.start,
        end: target.end,
        internalFrag,
        leftoverHole: 0,
        waitReason: null,
      };
      if (strategy === "next-fit") {
        nextPointerIndex = findNextFreeIndex(segmentsAfter, (chosenIdx + 1) % segmentsAfter.length);
      }
      narration = `${proc.id} (${proc.name}, ${proc.size} KB) placed in ${target.label} (${target.size} KB at ${target.start}–${target.end} KB). Internal fragmentation = ${target.size} − ${proc.size} = ${internalFrag} KB.`;
    } else {
      // Dynamic partitioning
      const leftover = target.size - proc.size;
      const allocStart = target.start;
      const allocEnd = target.start + proc.size;
      const allocatedSeg: MemorySegment = {
        segmentId: `${target.segmentId}::${proc.id}`,
        kind: "allocated",
        label: target.label,
        start: allocStart,
        end: allocEnd,
        size: proc.size,
        processId: proc.id,
        processName: proc.name,
        processSize: proc.size,
        internalFrag: 0,
      };

      if (leftover > 0) {
        holeSeqCounter.value += 1;
        const holeLabel = target.label.startsWith("Hole")
          ? target.label
          : `${target.label} rem`;
        const leftoverSeg: MemorySegment = {
          segmentId: `hole-${holeSeqCounter.value}`,
          kind: "free",
          label: holeLabel,
          start: allocEnd,
          end: target.end,
          size: leftover,
          internalFrag: 0,
        };
        segmentsAfter = [
          ...segmentsBefore.slice(0, chosenIdx),
          allocatedSeg,
          leftoverSeg,
          ...segmentsBefore.slice(chosenIdx + 1),
        ];
        if (strategy === "next-fit") {
          nextPointerIndex = chosenIdx + 1; // points to leftover hole
        }
        narration = `${proc.id} (${proc.name}, ${proc.size} KB) placed in ${target.label} (${target.size} KB) at ${allocStart}–${allocEnd} KB. Leftover hole = ${target.size} − ${proc.size} = ${leftover} KB (${allocEnd}–${target.end} KB).`;
      } else {
        segmentsAfter = [
          ...segmentsBefore.slice(0, chosenIdx),
          allocatedSeg,
          ...segmentsBefore.slice(chosenIdx + 1),
        ];
        if (strategy === "next-fit") {
          nextPointerIndex = findNextFreeIndex(
            segmentsAfter,
            segmentsAfter.length > 0 ? chosenIdx % segmentsAfter.length : 0,
          );
        }
        narration = `${proc.id} (${proc.name}, ${proc.size} KB) fit ${target.label} (${target.size} KB) exactly at ${allocStart}–${allocEnd} KB — 0 KB leftover.`;
      }

      record = {
        processId: proc.id,
        processName: proc.name,
        processSize: proc.size,
        status: "allocated",
        allocatedTo: target.label,
        start: allocStart,
        end: allocEnd,
        internalFrag: 0,
        leftoverHole: leftover,
        waitReason: null,
      };
    }
  }

  const allRecordsSoFar = [...priorRecords, record];
  const summaryAfter = computeMemorySummary(segmentsAfter, allRecordsSoFar);

  return {
    step: {
      stepIndex,
      processId: proc.id,
      processName: proc.name,
      processSize: proc.size,
      pointerBeforeIndex: strategy === "next-fit" ? pointerIndex : null,
      pointerAfterIndex: strategy === "next-fit" ? nextPointerIndex : null,
      segmentsBefore: segmentsBefore.map((s) => ({ ...s })),
      candidates,
      chosenSegmentId: chosenIdx !== null ? segmentsBefore[chosenIdx]!.segmentId : null,
      record,
      segmentsAfter,
      summaryAfter,
      narration,
    },
    nextSegments: segmentsAfter,
    nextPointerIndex,
  };
}

export function simulateMemoryAllocation(
  blocks: BlockInput[],
  processes: MemProcessInput[],
  mode: PartitionMode,
  strategy: FitStrategy,
): MemorySimulationResult {
  let currentSegments = buildInitialSegments(blocks);
  let pointerIndex: number | null = strategy === "next-fit" && currentSegments.length > 0 ? 0 : null;
  const steps: AllocationStep[] = [];
  const records: AllocationRecord[] = [];
  const holeSeqCounter = { value: 0 };

  for (let i = 0; i < processes.length; i += 1) {
    const { step, nextSegments, nextPointerIndex } = runProcessPlacement(
      processes[i]!,
      i,
      currentSegments,
      pointerIndex,
      mode,
      strategy,
      records,
      holeSeqCounter,
    );
    steps.push(step);
    records.push(step.record);
    currentSegments = nextSegments;
    pointerIndex = nextPointerIndex;
  }

  return {
    mode,
    strategy,
    steps,
    records,
    finalSegments: currentSegments,
    summary: computeMemorySummary(currentSegments, records),
  };
}

/**
 * Compacts dynamic memory: slides all allocated segments to address 0 in their
 * current address order and merges all free holes into one free hole at the end.
 */
export function compactMemory(
  segments: MemorySegment[],
  records: AllocationRecord[],
): CompactionResult {
  const allocated = segments.filter((s) => s.kind === "allocated");
  const free = segments.filter((s) => s.kind === "free");
  const totalFree = free.reduce((acc, s) => acc + s.size, 0);

  let cursor = 0;
  let movedCount = 0;
  const segmentsAfter: MemorySegment[] = [];

  for (const seg of allocated) {
    if (seg.start !== cursor) {
      movedCount += 1;
    }
    const nextSeg: MemorySegment = {
      ...seg,
      start: cursor,
      end: cursor + seg.size,
    };
    segmentsAfter.push(nextSeg);
    cursor += seg.size;
  }

  if (totalFree > 0) {
    segmentsAfter.push({
      segmentId: "compacted-free",
      kind: "free",
      label: "Compacted free",
      start: cursor,
      end: cursor + totalFree,
      size: totalFree,
      internalFrag: 0,
    });
  }

  return {
    segmentsBefore: segments.map((s) => ({ ...s })),
    segmentsAfter,
    summaryAfter: computeMemorySummary(segmentsAfter, records),
    movedCount,
    mergedHoleCount: free.length,
    mergedHoleSize: totalFree,
  };
}

/**
 * Retries any waiting processes against compacted dynamic memory using the chosen strategy.
 */
export function retryWaitingAfterCompaction(
  compactedSegments: MemorySegment[],
  priorRecords: AllocationRecord[],
  strategy: FitStrategy,
): {
  steps: AllocationStep[];
  records: AllocationRecord[];
  finalSegments: MemorySegment[];
  summary: MemorySummary;
} {
  let currentSegments = compactedSegments.map((s) => ({ ...s }));
  const updatedRecords = priorRecords.map((r) => ({ ...r }));
  let pointerIndex: number | null =
    strategy === "next-fit" ? findNextFreeIndex(currentSegments, 0) : null;
  const steps: AllocationStep[] = [];
  const holeSeqCounter = { value: 1000 };

  for (let i = 0; i < updatedRecords.length; i += 1) {
    const rec = updatedRecords[i]!;
    if (rec.status !== "waiting") continue;

    const proc: MemProcessInput = {
      id: rec.processId,
      name: rec.processName,
      size: rec.processSize,
    };

    const { step, nextSegments, nextPointerIndex } = runProcessPlacement(
      proc,
      steps.length,
      currentSegments,
      pointerIndex,
      "dynamic",
      strategy,
      updatedRecords.filter((_, idx) => idx !== i),
      holeSeqCounter,
    );
    updatedRecords[i] = step.record;
    step.summaryAfter = computeMemorySummary(nextSegments, updatedRecords);
    steps.push(step);
    currentSegments = nextSegments;
    pointerIndex = nextPointerIndex;
  }

  return {
    steps,
    records: updatedRecords,
    finalSegments: currentSegments,
    summary: computeMemorySummary(currentSegments, updatedRecords),
  };
}
