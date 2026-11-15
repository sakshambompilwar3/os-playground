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

export interface StrategyRankItem {
  strategy: FitStrategy;
  strategyName: string;
  allocatedMemory: number;
  utilizationPercent: number;
  placedCount: number;
  waitingCount: number;
  totalInternalFrag: number;
  largestFreeHole: number;
  freeHolesCount: number;
  rank: number;
  isWinner: boolean;
  isTied: boolean;
}

export interface BestMemoryVerdict {
  isTie: boolean;
  winner: FitStrategy | null;
  winnerName: string | null;
  tiedStrategies: FitStrategy[];
  ranked: StrategyRankItem[];
  explanation: string;
  explanationLines: string[];
  selectionDetails: {
    metric: string;
    tieBreakUsed: string | null;
    mode: PartitionMode;
    totalMemory: number;
  };
}

const STRATEGY_ORDER: FitStrategy[] = ["first-fit", "best-fit", "worst-fit", "next-fit"];

export function pickBest(results: MemorySimulationResult[]): BestMemoryVerdict {
  if (results.length === 0) {
    throw new Error("pickBest requires at least one simulation result");
  }

  const mode = results[0]!.mode;
  const totalMemory = results[0]!.summary.totalMemory;

  const rawStats = results.map((r) => {
    const placedCount = r.records.filter((rec) => rec.status === "allocated").length;
    const waitingCount = r.records.filter((rec) => rec.status === "waiting").length;
    return {
      strategy: r.strategy,
      strategyName: STRATEGY_META[r.strategy].label,
      allocatedMemory: r.summary.allocatedProcessMemory,
      utilizationPercent: r.summary.utilizationPercent,
      placedCount,
      waitingCount,
      totalInternalFrag: r.summary.totalInternalFrag,
      largestFreeHole: r.summary.largestFreeHole,
      freeHolesCount: r.summary.freeHoleCount,
      result: r,
    };
  });

  const sorted = [...rawStats].sort((a, b) => {
    // 1. Highest allocated memory
    if (b.allocatedMemory !== a.allocatedMemory) {
      return b.allocatedMemory - a.allocatedMemory;
    }
    // 2. More processes placed
    if (b.placedCount !== a.placedCount) {
      return b.placedCount - a.placedCount;
    }
    // 3. Mode tie-break: lower internal frag in fixed, larger hole in dynamic
    if (mode === "fixed") {
      if (a.totalInternalFrag !== b.totalInternalFrag) {
        return a.totalInternalFrag - b.totalInternalFrag;
      }
    } else {
      if (b.largestFreeHole !== a.largestFreeHole) {
        return b.largestFreeHole - a.largestFreeHole;
      }
    }
    // 4. Fixed order First, Best, Worst, Next for deterministic ranking display
    return STRATEGY_ORDER.indexOf(a.strategy) - STRATEGY_ORDER.indexOf(b.strategy);
  });

  const top = sorted[0]!;
  const topGroup = sorted.filter(
    (item) =>
      item.allocatedMemory === top.allocatedMemory &&
      item.placedCount === top.placedCount &&
      (mode === "fixed"
        ? item.totalInternalFrag === top.totalInternalFrag
        : item.largestFreeHole === top.largestFreeHole),
  );

  const isTie = topGroup.length > 1;
  const winner = isTie ? null : top.strategy;
  const winnerName = isTie ? null : top.strategyName;
  const tiedStrategies = topGroup.map((g) => g.strategy);

  // Assign ranks
  let currentRank = 1;
  const ranked: StrategyRankItem[] = sorted.map((item, index) => {
    if (index > 0) {
      const prev = sorted[index - 1]!;
      const isEquivalent =
        item.allocatedMemory === prev.allocatedMemory &&
        item.placedCount === prev.placedCount &&
        (mode === "fixed"
          ? item.totalInternalFrag === prev.totalInternalFrag
          : item.largestFreeHole === prev.largestFreeHole);
      if (!isEquivalent) {
        currentRank = index + 1;
      }
    }
    const isWinner = !isTie && item.strategy === winner;
    const isTied = isTie && tiedStrategies.includes(item.strategy);
    return {
      strategy: item.strategy,
      strategyName: item.strategyName,
      allocatedMemory: item.allocatedMemory,
      utilizationPercent: item.utilizationPercent,
      placedCount: item.placedCount,
      waitingCount: item.waitingCount,
      totalInternalFrag: item.totalInternalFrag,
      largestFreeHole: item.largestFreeHole,
      freeHolesCount: item.freeHolesCount,
      rank: currentRank,
      isWinner,
      isTied,
    };
  });

  // Determine tie-break explanation metadata
  let tieBreakUsed: string | null = null;
  const anyMemoryTie = sorted.some((s, idx) => idx > 0 && s.allocatedMemory === sorted[0]!.allocatedMemory);
  if (anyMemoryTie) {
    const anyPlacedTie = sorted.some(
      (s, idx) => idx > 0 && s.allocatedMemory === sorted[0]!.allocatedMemory && s.placedCount === sorted[0]!.placedCount,
    );
    if (anyPlacedTie) {
      tieBreakUsed = mode === "fixed" ? "Lowest internal fragmentation" : "Largest remaining free hole";
    } else {
      tieBreakUsed = "Most processes placed";
    }
  }

  // Generate 3-5 sentence explanation
  const explanationLines: string[] = [];

  if (isTie) {
    const tiedNames = topGroup.map((g) => g.strategyName).join(", ");
    explanationLines.push(
      `All tied strategies (${tiedNames}) placed ${top.placedCount} process${top.placedCount === 1 ? "" : "es"} and achieved identical memory utilization of ${top.utilizationPercent.toFixed(2)}% (${top.allocatedMemory} KB allocated).`,
    );
    if (mode === "fixed") {
      explanationLines.push(
        `Each tied strategy produced exactly ${top.totalInternalFrag} KB of internal fragmentation.`,
      );
    } else {
      explanationLines.push(
        `Each tied strategy left the largest remaining free hole at ${top.largestFreeHole} KB.`,
      );
    }
    explanationLines.push(
      "No single strategy had a distinct advantage for this input and arrival sequence.",
    );
    explanationLines.push(
      "Best here means highest memory utilization for this input and this arrival order. A different example can change the answer.",
    );
  } else {
    // Single winner
    const runnersUp = sorted.filter((s) => s.strategy !== winner);
    const runnerAllocatedSet = Array.from(new Set(runnersUp.map((r) => `${r.allocatedMemory} KB (${r.utilizationPercent.toFixed(2)}%)`)));
    const runnerPlacedSet = Array.from(new Set(runnersUp.map((r) => r.placedCount)));

    // Sentence 1: what it won by
    if (runnerPlacedSet.length === 1 && runnerAllocatedSet.length === 1) {
      explanationLines.push(
        `${top.strategyName} placed ${top.placedCount === rawStats[0]!.result.records.length ? "all " : ""}${top.placedCount} processes (utilization ${top.utilizationPercent.toFixed(2)}%), compared with ${runnerPlacedSet[0]} processes (${runnerAllocatedSet[0]}) for the other strategies.`,
      );
    } else {
      explanationLines.push(
        `${top.strategyName} achieved the highest utilization at ${top.utilizationPercent.toFixed(2)}% (${top.allocatedMemory} KB allocated, placing ${top.placedCount} processes), outperforming the other strategies.`,
      );
    }

    // Sentence 2: which processes other strategies could not place and why
    const failedProcsInOthers = new Set<string>();
    const failReasons: string[] = [];
    for (const other of runnersUp) {
      const waiting = other.result.records.filter((r) => r.status === "waiting");
      for (const w of waiting) {
        if (!failedProcsInOthers.has(w.processId)) {
          failedProcsInOthers.add(w.processId);
          failReasons.push(`${w.processId} (${w.processSize} KB) due to insufficient contiguous hole size`);
        }
      }
    }
    if (failReasons.length > 0) {
      explanationLines.push(
        `The other strategies could not allocate ${failReasons.join("; ")}, because holes were split or bypassed earlier in the run.`,
      );
    } else if (mode === "fixed" && top.totalInternalFrag < runnersUp[0]!.totalInternalFrag) {
      explanationLines.push(
        `While all compared strategies placed the same number of processes, ${top.strategyName} minimized internal fragmentation to ${top.totalInternalFrag} KB.`,
      );
    } else if (mode === "dynamic" && top.largestFreeHole > runnersUp[0]!.largestFreeHole) {
      explanationLines.push(
        `While all compared strategies placed the same number of processes, ${top.strategyName} preserved the largest contiguous free hole at ${top.largestFreeHole} KB.`,
      );
    }

    // Sentence 3: reason matching the winner's rule
    if (winner === "best-fit") {
      explanationLines.push(
        "Best Fit keeps large holes available for large processes by always selecting the tightest fitting partition.",
      );
    } else if (winner === "first-fit") {
      explanationLines.push(
        "First Fit allocates quickly from the beginning of memory, preserving intact contiguous blocks towards higher addresses.",
      );
    } else if (winner === "worst-fit") {
      explanationLines.push(
        "Worst Fit leaves large leftover remainders after placement, which can readily accommodate subsequent small requests.",
      );
    } else if (winner === "next-fit") {
      explanationLines.push(
        "Next Fit cycles through memory from the last allocated position, distributing allocations and avoiding heavy congestion at the front.",
      );
    }

    // Sentence 4: trade-off when it applies
    if (winner === "best-fit") {
      explanationLines.push(
        "However, Best Fit must inspect every free hole and tends to leave tiny slivers of memory that are difficult to reuse.",
      );
    } else if (winner === "first-fit") {
      explanationLines.push(
        "However, First Fit concentrates allocations at lower addresses and tends to accumulate small unusable holes near the start over time.",
      );
    } else if (winner === "worst-fit") {
      explanationLines.push(
        "However, Worst Fit rapidly breaks down the largest available blocks, which often causes future large processes to fail.",
      );
    } else if (winner === "next-fit") {
      explanationLines.push(
        "However, Next Fit often splits large memory blocks near the end of memory before checking smaller free holes at the front.",
      );
    }

    // Sentence 5: standard closing line
    explanationLines.push(
      "Best here means highest memory utilization for this input and this arrival order. A different example can change the answer.",
    );
  }

  const explanation = explanationLines.join(" ");

  return {
    isTie,
    winner,
    winnerName,
    tiedStrategies,
    ranked,
    explanation,
    explanationLines,
    selectionDetails: {
      metric: "Allocated memory (KB) & Memory utilization (%)",
      tieBreakUsed,
      mode,
      totalMemory,
    },
  };
}

