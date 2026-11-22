// Reference disk scheduling solver written completely independently from production.
// Implements direct sequence construction.
// Zero imports from production files.

export type DiskAlgorithm = "fcfs" | "sstf" | "scan" | "c-scan" | "look" | "c-look";
export type DiskDirection = "higher" | "lower";
export type TieVariant = "variantA" | "variantB";

export interface RefDiskOutput {
  totalHeadMovement: number;
  cylinderServedThird: number;
  averageSeekPerRequest: number;
  servedSequence: number[];
  stepLog: { from: number; to: number; movement: number }[];
  hadTieDecision: boolean;
}

export function runDiskReferenceSolver(
  cylinders: number,
  startHead: number,
  requests: number[],
  algorithm: DiskAlgorithm,
  direction: DiskDirection = "higher",
  variant: TieVariant = "variantA",
): RefDiskOutput {
  const E = Math.max(1, cylinders - 1);
  let current = startHead;
  let totalDist = 0;
  const served: number[] = [];
  const log: { from: number; to: number; movement: number }[] = [];
  let hadTie = false;

  const move = (to: number, isServed = true) => {
    const dist = Math.abs(to - current);
    totalDist += dist;
    log.push({ from: current, to, movement: dist });
    current = to;
    if (isServed) {
      served.push(to);
    }
  };

  // Rule: A request on cylinder h is served immediately at distance 0 before anything else, in every algorithm.
  const atHead = requests.filter((c) => c === startHead);
  for (const c of atHead) move(c, true);
  const remaining = requests.filter((c) => c !== startHead);

  if (algorithm === "fcfs") {
    for (const req of remaining) {
      move(req, true);
    }
  } else if (algorithm === "sstf") {
    const pending = requests
      .map((cyl, originalIdx) => ({ cyl, originalIdx }))
      .filter((r) => r.cyl !== startHead);

    while (pending.length > 0) {
      let bestIdx = 0;
      let minDist = Math.abs(pending[0]!.cyl - current);
      const candidates: number[] = [0];

      for (let i = 1; i < pending.length; i++) {
        const dist = Math.abs(pending[i]!.cyl - current);
        if (dist < minDist) {
          minDist = dist;
          bestIdx = i;
          candidates.length = 0;
          candidates.push(i);
        } else if (dist === minDist) {
          candidates.push(i);
        }
      }

      if (candidates.length > 1) {
        hadTie = true;
        if (variant === "variantB") {
          let maxOrig = -1;
          for (const idx of candidates) {
            if (pending[idx]!.originalIdx > maxOrig) {
              maxOrig = pending[idx]!.originalIdx;
              bestIdx = idx;
            }
          }
        } else {
          let minOrig = Infinity;
          for (const idx of candidates) {
            if (pending[idx]!.originalIdx < minOrig) {
              minOrig = pending[idx]!.originalIdx;
              bestIdx = idx;
            }
          }
        }
      }

      const chosen = pending.splice(bestIdx, 1)[0]!;
      move(chosen.cyl, true);
    }
  } else {
    const up = remaining.filter((c) => c > startHead).sort((a, b) => a - b);
    const down = remaining.filter((c) => c < startHead).sort((a, b) => b - a);

    if (algorithm === "scan") {
      if (direction === "higher") {
        if (up.length === 0) {
          for (const c of down) move(c, true);
        } else {
          for (const c of up) move(c, true);
          if (current !== E) move(E, false);
          if (down.length > 0) {
            for (const c of down) move(c, true);
          }
        }
      } else {
        // Lower
        if (down.length === 0) {
          for (const c of up) move(c, true);
        } else {
          for (const c of down) move(c, true);
          if (current !== 0) move(0, false);
          if (up.length > 0) {
            for (const c of up) move(c, true);
          }
        }
      }
    } else if (algorithm === "c-scan") {
      const downAsc = remaining.filter((c) => c < startHead).sort((a, b) => a - b);

      if (direction === "higher") {
        if (up.length === 0) {
          if (downAsc.length > 0) {
            move(downAsc[0]!, true);
            for (let i = 1; i < downAsc.length; i++) move(downAsc[i]!, true);
          }
        } else {
          for (const c of up) move(c, true);
          if (current !== E) move(E, false);
          if (downAsc.length > 0) {
            move(0, false);
            for (const c of downAsc) move(c, true);
          }
        }
      } else {
        // Lower
        const upDesc = remaining.filter((c) => c > startHead).sort((a, b) => b - a);

        if (down.length === 0) {
          if (upDesc.length > 0) {
            move(upDesc[0]!, true);
            for (let i = 1; i < upDesc.length; i++) move(upDesc[i]!, true);
          }
        } else {
          for (const c of down) move(c, true);
          if (current !== 0) move(0, false);
          if (upDesc.length > 0) {
            move(E, false);
            for (const c of upDesc) move(c, true);
          }
        }
      }
    } else if (algorithm === "look") {
      const upAsc = remaining.filter((c) => c > startHead).sort((a, b) => a - b);

      if (direction === "higher") {
        if (up.length === 0) {
          for (const c of down) move(c, true);
        } else {
          for (const c of up) move(c, true);
          if (down.length > 0) {
            for (const c of down) move(c, true);
          }
        }
      } else {
        // Lower
        if (down.length === 0) {
          for (const c of upAsc) move(c, true);
        } else {
          for (const c of down) move(c, true);
          if (up.length > 0) {
            for (const c of upAsc) move(c, true);
          }
        }
      }
    } else if (algorithm === "c-look") {
      const downAsc = remaining.filter((c) => c < startHead).sort((a, b) => a - b);
      const upDesc = remaining.filter((c) => c > startHead).sort((a, b) => b - a);

      if (direction === "higher") {
        if (up.length === 0) {
          if (downAsc.length > 0) {
            move(downAsc[0]!, true);
            for (let i = 1; i < downAsc.length; i++) move(downAsc[i]!, true);
          }
        } else {
          for (const c of up) move(c, true);
          if (downAsc.length > 0) {
            move(downAsc[0]!, true);
            for (let i = 1; i < downAsc.length; i++) move(downAsc[i]!, true);
          }
        }
      } else {
        // Lower
        if (down.length === 0) {
          if (upDesc.length > 0) {
            move(upDesc[0]!, true);
            for (let i = 1; i < upDesc.length; i++) move(upDesc[i]!, true);
          }
        } else {
          for (const c of down) move(c, true);
          if (upDesc.length > 0) {
            move(upDesc[0]!, true);
            for (let i = 1; i < upDesc.length; i++) move(upDesc[i]!, true);
          }
        }
      }
    }
  }

  const third = served[2] ?? served[served.length - 1] ?? 0;
  const avgSeek = requests.length > 0 ? totalDist / requests.length : 0;

  return {
    totalHeadMovement: totalDist,
    cylinderServedThird: third,
    averageSeekPerRequest: Number(avgSeek.toFixed(2)),
    servedSequence: served,
    stepLog: log,
    hadTieDecision: hadTie,
  };
}
