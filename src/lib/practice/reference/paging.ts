// Reference page replacement solver written completely independently from production.
// Implements recomputation per reference string.
// Zero imports from production files.

export type PagingAlgorithm = "fifo" | "lru" | "optimal";
export type TieVariant = "variantA" | "variantB";

export interface RefPagingOutput {
  faults: number;
  hits: number;
  hitRatioPercent: number;
  finalPages: number[];
  evictedPagesByStep: Record<number, number>; // 1-based step -> evicted page
  hadTieDecision: boolean;
}

export function runPagingReferenceSolver(
  refs: number[],
  frameCount: number,
  algorithm: PagingAlgorithm,
  variant: TieVariant = "variantA",
): RefPagingOutput {
  const n = refs.length;
  if (n === 0 || frameCount <= 0) {
    return {
      faults: 0,
      hits: 0,
      hitRatioPercent: 0,
      finalPages: [],
      evictedPagesByStep: {},
      hadTieDecision: false,
    };
  }

  const frames: (number | null)[] = Array(frameCount).fill(null);
  const frameLoadedAt: number[] = Array(frameCount).fill(-1);
  const lastUse = new Map<number, number>();

  let faults = 0;
  let hits = 0;
  const evictedPagesByStep: Record<number, number> = {};
  let hadTie = false;

  for (let i = 0; i < n; i++) {
    const page = refs[i]!;
    const stepNumber = i + 1;
    const existingIndex = frames.indexOf(page);
    const isHit = existingIndex !== -1;

    if (isHit) {
      hits += 1;
      lastUse.set(page, i);
    } else {
      faults += 1;
      const emptyIndex = frames.indexOf(null);

      if (emptyIndex !== -1) {
        frames[emptyIndex] = page;
        frameLoadedAt[emptyIndex] = i;
        lastUse.set(page, i);
      } else {
        // Eviction needed
        let victimIdx = 0;

        if (algorithm === "fifo") {
          let earliest = Infinity;
          for (let f = 0; f < frameCount; f++) {
            if (frameLoadedAt[f]! < earliest) {
              earliest = frameLoadedAt[f]!;
              victimIdx = f;
            }
          }
        } else if (algorithm === "lru") {
          let oldest = Infinity;
          for (let f = 0; f < frameCount; f++) {
            const resident = frames[f]!;
            const lu = lastUse.get(resident) ?? -1;
            if (lu < oldest) {
              oldest = lu;
              victimIdx = f;
            } else if (lu === oldest) {
              if (frameLoadedAt[f]! < frameLoadedAt[victimIdx]!) {
                victimIdx = f;
              }
            }
          }
        } else {
          // Optimal
          let farthest = -1;
          const neverPages: number[] = [];

          for (let f = 0; f < frameCount; f++) {
            const resident = frames[f]!;
            let nextUse = -1;
            for (let j = i + 1; j < n; j++) {
              if (refs[j] === resident) {
                nextUse = j;
                break;
              }
            }

            if (nextUse === -1) {
              neverPages.push(f);
            } else {
              if (nextUse > farthest && neverPages.length === 0) {
                farthest = nextUse;
                victimIdx = f;
              }
            }
          }

          if (neverPages.length > 0) {
            if (neverPages.length > 1) {
              hadTie = true;
            }
            if (variant === "variantB") {
              // latest loaded
              let latest = -1;
              for (const f of neverPages) {
                if (frameLoadedAt[f]! > latest) {
                  latest = frameLoadedAt[f]!;
                  victimIdx = f;
                }
              }
            } else {
              // earliest loaded
              let earliest = Infinity;
              for (const f of neverPages) {
                if (frameLoadedAt[f]! < earliest) {
                  earliest = frameLoadedAt[f]!;
                  victimIdx = f;
                }
              }
            }
          }
        }

        const evictedPage = frames[victimIdx]!;
        evictedPagesByStep[stepNumber] = evictedPage;

        frames[victimIdx] = page;
        frameLoadedAt[victimIdx] = i;
        lastUse.set(page, i);
      }
    }
  }

  const finalPages = frames.filter((p): p is number => p !== null);
  const hitRatio = (hits / n) * 100;

  return {
    faults,
    hits,
    hitRatioPercent: Number(hitRatio.toFixed(2)),
    finalPages,
    evictedPagesByStep,
    hadTieDecision: hadTie,
  };
}
