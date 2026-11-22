// Reference memory allocation solver written completely independently from production.
// Implements fixed and dynamic partitioning using plain arrays.
// Zero imports from production files.

export type PartitionMode = "fixed" | "dynamic";
export type FitStrategy = "first-fit" | "best-fit" | "worst-fit" | "next-fit";
export type TieVariant = "variantA" | "variantB";

export interface RefBlock {
  id: string;
  size: number;
}

export interface RefProcess {
  id: string;
  size: number;
}

export interface RefMemoryOutput {
  allocations: Record<string, string>; // processId -> blockId or "none"
  totalInternalFragmentation: number;
  totalFreeMemory: number;
  largestHoleSize: number;
  unallocatedProcessCount: number;
  memoryUtilizationPercent: number;
  hadTieDecision: boolean;
}

interface Segment {
  kind: "free" | "allocated";
  blockId: string;
  size: number;
  processId?: string;
  processSize?: number;
  internalFrag: number;
}

export function runMemoryReferenceSolver(
  blocks: RefBlock[],
  processes: RefProcess[],
  mode: PartitionMode,
  strategy: FitStrategy,
  variant: TieVariant = "variantA",
): RefMemoryOutput {
  const totalMemory = blocks.reduce((sum, b) => sum + b.size, 0);

  let segments: Segment[] = blocks.map((b) => ({
    kind: "free",
    blockId: b.id,
    size: b.size,
    internalFrag: 0,
  }));

  let pointerIdx = 0;
  const allocations: Record<string, string> = {};
  let hadTie = false;

  const findNextFree = (segs: Segment[], start: number): number => {
    const n = segs.length;
    for (let offset = 0; offset < n; offset++) {
      const idx = (start + offset) % n;
      if (segs[idx]!.kind === "free") return idx;
    }
    return 0;
  };

  for (const proc of processes) {
    let chosenIdx: number | null = null;
    const n = segments.length;

    if (strategy === "first-fit") {
      for (let i = 0; i < n; i++) {
        const seg = segments[i]!;
        if (seg.kind === "free" && seg.size >= proc.size) {
          chosenIdx = i;
          break;
        }
      }
    } else if (strategy === "next-fit") {
      for (let offset = 0; offset < n; offset++) {
        const idx = (pointerIdx + offset) % n;
        const seg = segments[idx]!;
        if (seg.kind === "free" && seg.size >= proc.size) {
          chosenIdx = idx;
          break;
        }
      }
    } else if (strategy === "best-fit" || strategy === "worst-fit") {
      const candidates: number[] = [];
      for (let i = 0; i < n; i++) {
        const seg = segments[i]!;
        if (seg.kind === "free" && seg.size >= proc.size) {
          candidates.push(i);
        }
      }

      if (candidates.length > 0) {
        if (strategy === "best-fit") {
          let minSize = Infinity;
          for (const idx of candidates) {
            if (segments[idx]!.size < minSize) {
              minSize = segments[idx]!.size;
            }
          }
          const tied = candidates.filter((idx) => segments[idx]!.size === minSize);
          if (tied.length > 1) hadTie = true;
          chosenIdx = variant === "variantB" ? tied[tied.length - 1]! : tied[0]!;
        } else {
          // Worst fit
          let maxSize = -1;
          for (const idx of candidates) {
            if (segments[idx]!.size > maxSize) {
              maxSize = segments[idx]!.size;
            }
          }
          const tied = candidates.filter((idx) => segments[idx]!.size === maxSize);
          if (tied.length > 1) hadTie = true;
          chosenIdx = variant === "variantB" ? tied[tied.length - 1]! : tied[0]!;
        }
      }
    }

    if (chosenIdx === null) {
      allocations[proc.id] = "none";
      if (strategy === "next-fit") {
        pointerIdx = findNextFree(segments, pointerIdx);
      }
    } else {
      const target = segments[chosenIdx]!;
      allocations[proc.id] = target.blockId;

      if (mode === "fixed") {
        const frag = target.size - proc.size;
        segments[chosenIdx] = {
          kind: "allocated",
          blockId: target.blockId,
          size: target.size,
          processId: proc.id,
          processSize: proc.size,
          internalFrag: frag,
        };
        if (strategy === "next-fit") {
          pointerIdx = findNextFree(segments, (chosenIdx + 1) % segments.length);
        }
      } else {
        // Dynamic mode
        const leftover = target.size - proc.size;
        const allocatedSeg: Segment = {
          kind: "allocated",
          blockId: target.blockId,
          size: proc.size,
          processId: proc.id,
          processSize: proc.size,
          internalFrag: 0,
        };

        if (leftover > 0) {
          const leftoverSeg: Segment = {
            kind: "free",
            blockId: target.blockId,
            size: leftover,
            internalFrag: 0,
          };
          segments = [
            ...segments.slice(0, chosenIdx),
            allocatedSeg,
            leftoverSeg,
            ...segments.slice(chosenIdx + 1),
          ];
          if (strategy === "next-fit") {
            pointerIdx = chosenIdx + 1; // points to leftover hole
          }
        } else {
          segments = [
            ...segments.slice(0, chosenIdx),
            allocatedSeg,
            ...segments.slice(chosenIdx + 1),
          ];
          if (strategy === "next-fit") {
            pointerIdx = findNextFree(segments, (chosenIdx + 1) % segments.length);
          }
        }
      }
    }
  }

  // Calculate summary metrics
  let totalAllocatedBytes = 0;
  let totalInternalFrag = 0;
  let totalFreeMem = 0;
  let largestHole = 0;

  for (const seg of segments) {
    if (seg.kind === "allocated") {
      totalAllocatedBytes += seg.processSize ?? seg.size;
      totalInternalFrag += seg.internalFrag;
    } else {
      totalFreeMem += seg.size;
      if (seg.size > largestHole) {
        largestHole = seg.size;
      }
    }
  }

  const unallocatedCount = Object.values(allocations).filter((b) => b === "none").length;
  const util = totalMemory > 0 ? (totalAllocatedBytes / totalMemory) * 100 : 0;

  return {
    allocations,
    totalInternalFragmentation: totalInternalFrag,
    totalFreeMemory: totalFreeMem,
    largestHoleSize: largestHole,
    unallocatedProcessCount: unallocatedCount,
    memoryUtilizationPercent: Number(util.toFixed(2)),
    hadTieDecision: hadTie,
  };
}
