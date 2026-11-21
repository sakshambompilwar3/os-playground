/**
 * src/lib/paging.ts
 * Pure algorithmic logic for Page Replacement algorithms: FIFO, LRU, and Optimal.
 * Decoupled from React, DOM, and UI state.
 */

export type PagingAlgorithm = "fifo" | "lru" | "optimal";

export interface PagingStep {
  /** 0-based step index */
  index: number;
  /** 1-based reference position */
  stepNumber: number;
  /** Referenced page number (0-99) */
  page: number;
  /** Snapshot of resident frames after this reference (null indicates an empty frame) */
  frames: (number | null)[];
  /** Whether the reference was already resident (hit) or caused a page fault */
  hit: boolean;
  /** Frame index (0..frames-1) where page was loaded or accessed */
  loadedFrameIndex: number;
  /** Page number that was evicted during a fault on a full frame, or null */
  evictedPage: number | null;
  /** Frame index of the evicted page, or null */
  evictedFrameIndex: number | null;
  /** For LRU: step index when each resident page was last referenced */
  lastUseMap: Record<number, number>;
  /** For Optimal: next step index when each resident page will be referenced, or "never" */
  nextUseMap: Record<number, number | "never">;
  /** Plain-language pedagogical explanation of the step transition */
  reason: string;
}

export interface PagingResult {
  algorithm: PagingAlgorithm;
  referenceString: number[];
  frameCount: number;
  steps: PagingStep[];
  faults: number;
  hits: number;
  evictions: number;
  /** Exact hits / total */
  hitRatio: number;
  /** Exact faults / total */
  faultRatio: number;
  /** List of evicted pages in chronological order */
  evictionOrder: number[];
  /** Final snapshot of resident frames */
  finalFrames: (number | null)[];
}

export interface FrameSweepEntry {
  frames: number;
  faults: number;
  hits: number;
  hitRatio: number;
  faultRatio: number;
}

export interface BeladyAnomaly {
  k: number;
  faultsK: number;
  faultsKPlus1: number;
}

export interface PagingComparisonVerdict {
  bestPossible: "optimal";
  bestPractical: "fifo" | "lru" | "tie";
  gapFifo: number;
  gapLru: number;
  beladyDetected: boolean;
  beladyFrameCounts: number[];
  explanation: string;
  howChosen: string[];
}

/**
 * Simulates a single page replacement algorithm on the given reference string and frame capacity.
 */
export function simulatePaging(
  algorithm: PagingAlgorithm,
  refs: number[],
  frameCount: number,
): PagingResult {
  if (frameCount < 1) {
    throw new Error("Frame count must be at least 1");
  }

  const n = refs.length;
  if (n === 0) {
    return {
      algorithm,
      referenceString: [],
      frameCount,
      steps: [],
      faults: 0,
      hits: 0,
      evictions: 0,
      hitRatio: 0,
      faultRatio: 0,
      evictionOrder: [],
      finalFrames: Array(frameCount).fill(null),
    };
  }

  const frames: (number | null)[] = Array(frameCount).fill(null);
  // Track step index when each frame position was loaded (for FIFO and tie-breaks)
  const frameLoadedAt: number[] = Array(frameCount).fill(-1);
  // Track last-use step index for each page (for LRU)
  const lastUse: Map<number, number> = new Map();

  const steps: PagingStep[] = [];
  const evictionOrder: number[] = [];
  let faults = 0;
  let hits = 0;

  for (let i = 0; i < n; i++) {
    const page = refs[i]!;
    const stepNumber = i + 1;

    // Check if page is currently in one of the frames
    const existingIndex = frames.indexOf(page);
    const hit = existingIndex !== -1;

    let loadedFrameIndex: number;
    let evictedPage: number | null = null;
    let evictedFrameIndex: number | null = null;
    let reason = "";

    if (hit) {
      hits++;
      loadedFrameIndex = existingIndex;
      // LRU updates last-use time
      lastUse.set(page, i);
      reason = `Reference ${page} is already in Frame ${existingIndex + 1}: page hit (no frames changed).`;
    } else {
      faults++;
      // Check for first empty frame
      const emptyIdx = frames.indexOf(null);

      if (emptyIdx !== -1) {
        // Empty frame available
        loadedFrameIndex = emptyIdx;
        frames[emptyIdx] = page;
        frameLoadedAt[emptyIdx] = i;
        lastUse.set(page, i);
        reason = `Reference ${page} is not in memory: page fault. Placed into empty Frame ${emptyIdx + 1}.`;
      } else {
        // All frames are full: must select a victim
        let victimIdx = 0;

        if (algorithm === "fifo") {
          // Earliest loaded frame
          let earliest = frameLoadedAt[0]!;
          for (let f = 1; f < frameCount; f++) {
            if (frameLoadedAt[f]! < earliest) {
              earliest = frameLoadedAt[f]!;
              victimIdx = f;
            }
          }
        } else if (algorithm === "lru") {
          // Resident page with oldest lastUse
          let oldestUse = Infinity;
          for (let f = 0; f < frameCount; f++) {
            const resident = frames[f]!;
            const lu = lastUse.get(resident) ?? -1;
            if (lu < oldestUse) {
              oldestUse = lu;
              victimIdx = f;
            } else if (lu === oldestUse) {
              // Tie-break: earliest loaded
              if (frameLoadedAt[f]! < frameLoadedAt[victimIdx]!) {
                victimIdx = f;
              }
            }
          }
        } else {
          // OPTIMAL: page whose next reference is farthest in future
          let farthestUse = -1;
          let candidateNeverPages: number[] = [];

          for (let f = 0; f < frameCount; f++) {
            const resident = frames[f]!;
            // Search next occurrence in refs after current index i
            let nextIndex = -1;
            for (let j = i + 1; j < n; j++) {
              if (refs[j] === resident) {
                nextIndex = j;
                break;
              }
            }

            if (nextIndex === -1) {
              // Never used again
              candidateNeverPages.push(f);
            } else {
              if (nextIndex > farthestUse && candidateNeverPages.length === 0) {
                farthestUse = nextIndex;
                victimIdx = f;
              }
            }
          }

          if (candidateNeverPages.length > 0) {
            // Among pages never used again, tie-break by earliest loaded
            let earliest = Infinity;
            for (const f of candidateNeverPages) {
              if (frameLoadedAt[f]! < earliest) {
                earliest = frameLoadedAt[f]!;
                victimIdx = f;
              }
            }
          }
        }

        evictedFrameIndex = victimIdx;
        evictedPage = frames[victimIdx]!;
        evictionOrder.push(evictedPage);

        loadedFrameIndex = victimIdx;
        frames[victimIdx] = page;
        frameLoadedAt[victimIdx] = i;
        lastUse.set(page, i);

        if (algorithm === "fifo") {
          reason = `Reference ${page} is not in memory: page fault. All ${frameCount} frames are full, so FIFO evicts the oldest page (${evictedPage}) from Frame ${victimIdx + 1} and loads ${page}.`;
        } else if (algorithm === "lru") {
          const victimLastUse = lastUse.get(evictedPage);
          const posText = victimLastUse !== undefined ? ` (last used at position ${victimLastUse + 1})` : "";
          reason = `Reference ${page} is not in memory: page fault. All ${frameCount} frames are full, so LRU evicts the least recently used page (${evictedPage}) from Frame ${victimIdx + 1}${posText} and loads ${page}.`;
        } else {
          // Optimal next use
          reason = `Reference ${page} is not in memory: page fault. All ${frameCount} frames are full, so Optimal evicts page (${evictedPage}) from Frame ${victimIdx + 1} and loads ${page}.`;
        }
      }
    }

    // Build lastUseMap for current resident pages
    const lastUseMap: Record<number, number> = {};
    for (const f of frames) {
      if (f !== null) {
        lastUseMap[f] = lastUse.get(f) ?? i;
      }
    }

    // Build nextUseMap for current resident pages
    const nextUseMap: Record<number, number | "never"> = {};
    for (const f of frames) {
      if (f !== null) {
        let nextIdx = -1;
        for (let j = i + 1; j < n; j++) {
          if (refs[j] === f) {
            nextIdx = j;
            break;
          }
        }
        nextUseMap[f] = nextIdx === -1 ? "never" : nextIdx;
      }
    }

    steps.push({
      index: i,
      stepNumber,
      page,
      frames: [...frames],
      hit,
      loadedFrameIndex,
      evictedPage,
      evictedFrameIndex,
      lastUseMap,
      nextUseMap,
      reason,
    });
  }

  const evictions = Math.max(0, faults - frameCount);
  const hitRatio = hits / n;
  const faultRatio = faults / n;

  return {
    algorithm,
    referenceString: [...refs],
    frameCount,
    steps,
    faults,
    hits,
    evictions,
    hitRatio,
    faultRatio,
    evictionOrder,
    finalFrames: [...frames],
  };
}

/**
 * Returns fault counts for 1..maxFrames frames for a given algorithm and reference string.
 */
export function frameSweep(
  algorithm: PagingAlgorithm,
  refs: number[],
  maxFrames: number = 10,
): FrameSweepEntry[] {
  const result: FrameSweepEntry[] = [];
  const limit = Math.max(1, Math.min(10, maxFrames));
  for (let f = 1; f <= limit; f++) {
    const sim = simulatePaging(algorithm, refs, f);
    result.push({
      frames: f,
      faults: sim.faults,
      hits: sim.hits,
      hitRatio: sim.hitRatio,
      faultRatio: sim.faultRatio,
    });
  }
  return result;
}

/**
 * Identifies frame counts k where faults(k + 1) > faults(k).
 * Typically checked on FIFO to detect Belady's Anomaly.
 */
export function findBelady(
  refs: number[],
  maxFrames: number = 10,
  algorithm: PagingAlgorithm = "fifo",
): BeladyAnomaly[] {
  const sweep = frameSweep(algorithm, refs, maxFrames);
  const anomalies: BeladyAnomaly[] = [];
  for (let i = 0; i < sweep.length - 1; i++) {
    const current = sweep[i]!;
    const next = sweep[i + 1]!;
    if (next.faults > current.faults) {
      anomalies.push({
        k: current.frames,
        faultsK: current.faults,
        faultsKPlus1: next.faults,
      });
    }
  }
  return anomalies;
}

/**
 * Calculates Effective Access Time (EAT) in nanoseconds.
 * EAT = (1 - p) * memoryAccessNs + p * (faultServiceMs * 1,000,000)
 *
 * @param p Page fault probability / ratio (0 <= p <= 1)
 * @param memoryAccessNs Main memory access time in nanoseconds (e.g. 200 ns)
 * @param faultServiceMs Page fault service overhead in milliseconds (e.g. 8 ms)
 */
export function effectiveAccessTime(
  p: number,
  memoryAccessNs: number,
  faultServiceMs: number,
): number {
  const faultServiceNs = faultServiceMs * 1_000_000;
  return (1 - p) * memoryAccessNs + p * faultServiceNs;
}

/**
 * Pure verdict function for comparing FIFO, LRU, and Optimal algorithms.
 */
export function pickBest(results: {
  fifo: PagingResult;
  lru: PagingResult;
  optimal: PagingResult;
}): PagingComparisonVerdict {
  const { fifo, lru, optimal } = results;

  let bestPractical: "fifo" | "lru" | "tie";
  if (lru.faults < fifo.faults) {
    bestPractical = "lru";
  } else if (fifo.faults < lru.faults) {
    bestPractical = "fifo";
  } else {
    bestPractical = "tie";
  }

  const gapFifo = fifo.faults - optimal.faults;
  const gapLru = lru.faults - optimal.faults;

  const beladyAnomalies = findBelady(fifo.referenceString, 10, "fifo");
  const beladyDetected = beladyAnomalies.length > 0;
  const beladyFrameCounts = beladyAnomalies.map((b) => b.k);

  // Generate 3-5 sentence template explanation from real numbers
  const sentences: string[] = [];

  if (bestPractical === "lru") {
    sentences.push(
      `LRU is the best practical algorithm for this workload with ${lru.faults} faults (${(lru.hitRatio * 100).toFixed(1)}% hit ratio), outperforming FIFO's ${fifo.faults} faults by ${fifo.faults - lru.faults} fault${fifo.faults - lru.faults === 1 ? "" : "s"}.`,
    );
    sentences.push(
      `LRU keeps pages that were used recently, effectively exploiting temporal locality, whereas FIFO evicts strictly by arrival age.`,
    );
  } else if (bestPractical === "fifo") {
    sentences.push(
      `FIFO is the best practical algorithm for this workload with ${fifo.faults} faults (${(fifo.hitRatio * 100).toFixed(1)}% hit ratio), edging out LRU (${lru.faults} faults) on this specific reference order.`,
    );
    sentences.push(
      `While FIFO evicts purely based on arrival time without recency tracking, its queue rotation matched the cyclical access pattern of this workload.`,
    );
  } else {
    sentences.push(
      `FIFO and LRU tied for best practical algorithm with exactly ${fifo.faults} faults (${(fifo.hitRatio * 100).toFixed(1)}% hit ratio) each.`,
    );
    sentences.push(
      `Both eviction orders yielded identical overall fault counts for this reference string and frame capacity.`,
    );
  }

  sentences.push(
    `Optimal achieved the theoretical lower bound with ${optimal.faults} faults (${(optimal.hitRatio * 100).toFixed(1)}% hit ratio) by evicting the page whose next access is farthest in the future; it serves as an unattainable benchmark for real operating systems.`,
  );

  if (beladyDetected) {
    sentences.push(
      `Belady's anomaly was detected on this reference string under FIFO: allocating more frames (e.g. from ${beladyAnomalies[0]!.k} to ${beladyAnomalies[0]!.k + 1} frames) paradoxically increases faults from ${beladyAnomalies[0]!.faultsK} to ${beladyAnomalies[0]!.faultsKPlus1}.`,
    );
  }

  sentences.push(
    `Best here means the fewest page faults for this string and frame count. A different string can change the answer.`,
  );

  const howChosen = [
    `1. Best possible: Optimal with ${optimal.faults} faults (${(optimal.hitRatio * 100).toFixed(1)}% hit ratio), serving as the theoretical offline benchmark.`,
    `2. Best practical: ${bestPractical === "tie" ? "TIE (both FIFO and LRU had equal faults)" : bestPractical.toUpperCase()} with ${Math.min(fifo.faults, lru.faults)} faults.`,
    `3. Overhead gap to Optimal: FIFO has ${gapFifo} extra fault${gapFifo === 1 ? "" : "s"}; LRU has ${gapLru} extra fault${gapLru === 1 ? "" : "s"}.`,
    `4. Tie-breaking rule: exact integer fault totals, then hit ratio, then tie.`,
  ];

  return {
    bestPossible: "optimal",
    bestPractical,
    gapFifo,
    gapLru,
    beladyDetected,
    beladyFrameCounts,
    explanation: sentences.join(" "),
    howChosen,
  };
}
