export type DiskAlgorithm =
  | "fcfs"
  | "sstf"
  | "scan"
  | "c-scan"
  | "look"
  | "c-look";

export type DiskDirection = "higher" | "lower";

export interface DiskAlgorithmMeta {
  id: DiskAlgorithm;
  label: string;
  shortDesc: string;
  usesDirection: boolean;
  infoNote?: string;
}

export const DISK_ALGORITHMS: DiskAlgorithmMeta[] = [
  {
    id: "fcfs",
    label: "FCFS",
    shortDesc: "First-Come, First-Served: serves requests strictly in arrival order.",
    usesDirection: false,
    infoNote: "FCFS is fair and avoids starvation, but can cause excessive head travel when requests jump between distant cylinders.",
  },
  {
    id: "sstf",
    label: "SSTF",
    shortDesc: "Shortest Seek Time First: selects the request closest to the current head position.",
    usesDirection: false,
    infoNote: "SSTF reduces total head movement, but can cause starvation for requests located far from the current head cluster.",
  },
  {
    id: "scan",
    label: "SCAN",
    shortDesc: "Elevator algorithm: sweeps toward one disk boundary, then reverses direction.",
    usesDirection: true,
    infoNote: "SCAN visits the physical disk boundary (0 or E) before reversing, which can waste seeks if no requests lie near the edge.",
  },
  {
    id: "c-scan",
    label: "C-SCAN",
    shortDesc: "Circular SCAN: sweeps in one direction to the end, then jumps directly to the opposite end without serving on return.",
    usesDirection: true,
    infoNote: "C-SCAN provides more uniform waiting times than SCAN by returning directly to the opposite end.",
  },
  {
    id: "look",
    label: "LOOK",
    shortDesc: "Sweeps in one direction up to the furthest request (does not travel to disk ends), then reverses.",
    usesDirection: true,
    infoNote: "LOOK turns around immediately at the last request in the current direction, avoiding unnecessary seeks to cylinder 0 or E.",
  },
  {
    id: "c-look",
    label: "C-LOOK",
    shortDesc: "Circular LOOK: sweeps in one direction to the furthest request, then jumps directly to the furthest request on the other side.",
    usesDirection: true,
    infoNote: "C-LOOK combines circular uniform wait times with look-ahead turnaround, never traveling past the outermost requests.",
  },
];

export const DISK_ALGORITHM_MAP = Object.fromEntries(
  DISK_ALGORITHMS.map((a) => [a.id, a]),
) as Record<DiskAlgorithm, DiskAlgorithmMeta>;

export interface DiskRequestInput {
  id: string;
  name: string;
  cylinder: number;
}

export interface DiskSegment {
  stepIndex: number;
  from: number;
  to: number;
  distance: number;
  kind: "serve" | "end" | "jump";
  requestId?: string;
  requestName?: string;
  cylinder?: number;
  countedInTotal: boolean;
  narration: string;
}

export interface DiskStepLog {
  stepIndex: number;
  headPosition: number;
  pendingRequestIds: string[];
  segment: DiskSegment;
  runningTotal: number;
}

export interface DiskSimulationResult {
  algorithm: DiskAlgorithm;
  direction: DiskDirection;
  countReturnJump: boolean;
  totalCylinders: number;
  lastCylinder: number;
  startHead: number;
  seekTimePerCylinderMs: number;
  segments: DiskSegment[];
  steps: DiskStepLog[];
  serviceOrder: string[]; // Request IDs in service order
  totalHeadMovement: number; // respects countReturnJump toggle
  totalHeadMovementWithJump: number;
  totalHeadMovementWithoutJump: number;
  averageSeekPerRequest: number;
  totalSeekTimeMs: number;
  servedCount: number;
}

export const DEFAULT_EXAMPLE_CYLINDERS = 200;
export const DEFAULT_EXAMPLE_HEAD = 53;
export const DEFAULT_EXAMPLE_REQUEST_CYLINDERS = [98, 183, 37, 122, 14, 124, 65, 67];

/**
 * Pure simulation of disk scheduling algorithms following strict textbook specifications.
 */
export function simulateDiskScheduling(
  totalCylinders: number,
  startHead: number,
  requests: DiskRequestInput[],
  algorithm: DiskAlgorithm,
  direction: DiskDirection = "higher",
  countReturnJump: boolean = true,
  seekTimePerCylinderMs: number = 1,
): DiskSimulationResult {
  const E = Math.max(1, totalCylinders - 1);
  const h = Math.max(0, Math.min(E, Math.round(startHead)));
  const pendingRequests = requests.map((r, idx) => ({
    id: r.id || `R${idx + 1}`,
    name: r.name || `R${idx + 1}`,
    cylinder: Math.max(0, Math.min(E, Math.round(r.cylinder))),
    tableIndex: idx,
  }));

  const segments: DiskSegment[] = [];
  const steps: DiskStepLog[] = [];
  const serviceOrder: string[] = [];
  let currentHead = h;
  let remaining = [...pendingRequests];

  // Helper to record a move
  const addSegment = (
    to: number,
    kind: "serve" | "end" | "jump",
    servedReq?: (typeof pendingRequests)[0],
    customNarration?: string,
  ) => {
    const from = currentHead;
    const distance = Math.abs(to - from);
    const isJump = kind === "jump";
    const countedInTotal = isJump ? countReturnJump : true;
    const stepIndex = segments.length;

    let narration = customNarration || "";
    if (!narration) {
      if (kind === "serve" && servedReq) {
        narration = `${servedReq.name} is on cylinder ${to}. Head moves from ${from} to ${to} (distance ${distance}).`;
      } else if (kind === "end") {
        narration = `Head continues sweep to disk boundary at ${to} (distance ${distance}).`;
      } else if (kind === "jump") {
        narration = `Head jumps from ${from} to ${to} (distance ${distance}, ${countedInTotal ? "counted in total" : "not counted"}).`;
      }
    }

    const seg: DiskSegment = {
      stepIndex,
      from,
      to,
      distance,
      kind,
      requestId: servedReq?.id,
      requestName: servedReq?.name,
      cylinder: servedReq?.cylinder,
      countedInTotal,
      narration,
    };

    segments.push(seg);
    currentHead = to;

    if (servedReq) {
      serviceOrder.push(servedReq.id);
      remaining = remaining.filter((r) => r.id !== servedReq.id);
    }

    const runningTotal = segments
      .filter((s) => s.countedInTotal)
      .reduce((sum, s) => sum + s.distance, 0);

    steps.push({
      stepIndex,
      headPosition: currentHead,
      pendingRequestIds: remaining.map((r) => r.id),
      segment: seg,
      runningTotal,
    });
  };

  // Rule: "h = head start. A request on cylinder h is served immediately at distance 0 before anything else, in every algorithm."
  const atHead = remaining.filter((r) => r.cylinder === h);
  for (const req of atHead) {
    addSegment(
      h,
      "serve",
      req,
      `${req.name} is at cylinder ${h} (current head position). Served immediately with 0 seek distance.`,
    );
  }

  // If all requests were on h, we are done
  if (remaining.length === 0) {
    return assembleResult(
      algorithm,
      direction,
      countReturnJump,
      totalCylinders,
      E,
      h,
      seekTimePerCylinderMs,
      segments,
      steps,
      serviceOrder,
      requests.length,
    );
  }

  // Partition remaining requests into R_up (> h) and R_down (< h)
  const R_up = remaining
    .filter((r) => r.cylinder > h)
    .sort((a, b) => a.cylinder - b.cylinder || a.tableIndex - b.tableIndex);

  const R_down = remaining
    .filter((r) => r.cylinder < h)
    .sort((a, b) => b.cylinder - a.cylinder || a.tableIndex - b.tableIndex);

  if (algorithm === "fcfs") {
    // Serve remaining in original table arrival order
    const sortedByArrival = [...remaining].sort((a, b) => a.tableIndex - b.tableIndex);
    for (const req of sortedByArrival) {
      addSegment(
        req.cylinder,
        "serve",
        req,
        `FCFS serves next arrival ${req.name} at cylinder ${req.cylinder} (from ${currentHead}, distance ${Math.abs(req.cylinder - currentHead)}).`,
      );
    }
  } else if (algorithm === "sstf") {
    while (remaining.length > 0) {
      // Find request with smallest distance from current head.
      // Ties go to request earlier in table.
      let bestReq = remaining[0]!;
      let minDistance = Math.abs(bestReq.cylinder - currentHead);

      for (let i = 1; i < remaining.length; i += 1) {
        const req = remaining[i]!;
        const dist = Math.abs(req.cylinder - currentHead);
        if (dist < minDistance) {
          minDistance = dist;
          bestReq = req;
        } else if (dist === minDistance && req.tableIndex < bestReq.tableIndex) {
          bestReq = req;
        }
      }

      addSegment(
        bestReq.cylinder,
        "serve",
        bestReq,
        `${bestReq.name} is at cylinder ${bestReq.cylinder}, the nearest pending request to head at ${currentHead} (distance ${minDistance}), so SSTF serves it next.`,
      );
    }
  } else if (algorithm === "scan") {
    if (direction === "higher") {
      // SCAN toward higher:
      // If R_up is empty at start, head goes straight to R_down's first request as a normal move
      if (R_up.length === 0) {
        for (const req of R_down) {
          addSegment(req.cylinder, "serve", req);
        }
      } else {
        // serve R_up ascending
        for (const req of R_up) {
          addSegment(req.cylinder, "serve", req);
        }
        // always continue to last cylinder E
        if (currentHead !== E) {
          addSegment(E, "end");
        }
        // if R_down not empty, reverse and serve R_down descending
        if (R_down.length > 0) {
          for (const req of R_down) {
            addSegment(req.cylinder, "serve", req);
          }
        }
      }
    } else {
      // SCAN toward lower:
      if (R_down.length === 0) {
        // If R_down is empty at start, head goes straight to R_up's first request (ascending)
        for (const req of R_up) {
          addSegment(req.cylinder, "serve", req);
        }
      } else {
        // serve R_down descending
        for (const req of R_down) {
          addSegment(req.cylinder, "serve", req);
        }
        // always continue to cylinder 0
        if (currentHead !== 0) {
          addSegment(0, "end");
        }
        // if R_up not empty, reverse and serve R_up ascending
        if (R_up.length > 0) {
          for (const req of R_up) {
            addSegment(req.cylinder, "serve", req);
          }
        }
      }
    }
  } else if (algorithm === "c-scan") {
    if (direction === "higher") {
      if (R_up.length === 0) {
        // If one side is empty at start, head goes straight to other side's first request as a jump segment
        const firstDown = R_down[R_down.length - 1]!; // ascending lowest is last in R_down descending
        const R_down_asc = [...R_down].sort(
          (a, b) => a.cylinder - b.cylinder || a.tableIndex - b.tableIndex,
        );
        addSegment(R_down_asc[0]!.cylinder, "jump", undefined, `Head jumps straight to cylinder ${R_down_asc[0]!.cylinder}.`);
        for (const req of R_down_asc) {
          addSegment(req.cylinder, "serve", req);
        }
      } else {
        // serve R_up ascending
        for (const req of R_up) {
          addSegment(req.cylinder, "serve", req);
        }
        // go to E
        if (currentHead !== E) {
          addSegment(E, "end");
        }
        // if R_down not empty, jump to 0 and serve R_down ascending
        if (R_down.length > 0) {
          addSegment(0, "jump");
          const R_down_asc = [...R_down].sort(
            (a, b) => a.cylinder - b.cylinder || a.tableIndex - b.tableIndex,
          );
          for (const req of R_down_asc) {
            addSegment(req.cylinder, "serve", req);
          }
        }
      }
    } else {
      // C-SCAN toward lower:
      if (R_down.length === 0) {
        const R_up_desc = [...R_up].sort(
          (a, b) => b.cylinder - a.cylinder || a.tableIndex - b.tableIndex,
        );
        addSegment(R_up_desc[0]!.cylinder, "jump", undefined, `Head jumps straight to cylinder ${R_up_desc[0]!.cylinder}.`);
        for (const req of R_up_desc) {
          addSegment(req.cylinder, "serve", req);
        }
      } else {
        // serve R_down descending
        for (const req of R_down) {
          addSegment(req.cylinder, "serve", req);
        }
        // go to 0
        if (currentHead !== 0) {
          addSegment(0, "end");
        }
        // if R_up not empty, jump from 0 to E and serve R_up descending
        if (R_up.length > 0) {
          addSegment(E, "jump");
          const R_up_desc = [...R_up].sort(
            (a, b) => b.cylinder - a.cylinder || a.tableIndex - b.tableIndex,
          );
          for (const req of R_up_desc) {
            addSegment(req.cylinder, "serve", req);
          }
        }
      }
    }
  } else if (algorithm === "look") {
    if (direction === "higher") {
      if (R_up.length === 0) {
        for (const req of R_down) {
          addSegment(req.cylinder, "serve", req);
        }
      } else {
        // serve R_up ascending up to highest
        for (const req of R_up) {
          addSegment(req.cylinder, "serve", req);
        }
        // then if R_down not empty, reverse and serve R_down descending
        if (R_down.length > 0) {
          for (const req of R_down) {
            addSegment(req.cylinder, "serve", req);
          }
        }
      }
    } else {
      // LOOK toward lower:
      if (R_down.length === 0) {
        for (const req of R_up) {
          addSegment(req.cylinder, "serve", req);
        }
      } else {
        // serve R_down descending up to lowest
        for (const req of R_down) {
          addSegment(req.cylinder, "serve", req);
        }
        // then if R_up not empty, reverse and serve R_up ascending
        if (R_up.length > 0) {
          for (const req of R_up) {
            addSegment(req.cylinder, "serve", req);
          }
        }
      }
    }
  } else if (algorithm === "c-look") {
    if (direction === "higher") {
      if (R_up.length === 0) {
        const R_down_asc = [...R_down].sort(
          (a, b) => a.cylinder - b.cylinder || a.tableIndex - b.tableIndex,
        );
        addSegment(
          R_down_asc[0]!.cylinder,
          "jump",
          undefined,
          `Head jumps straight to lowest request at cylinder ${R_down_asc[0]!.cylinder}.`,
        );
        for (const req of R_down_asc) {
          addSegment(req.cylinder, "serve", req);
        }
      } else {
        // serve R_up ascending up to highest
        for (const req of R_up) {
          addSegment(req.cylinder, "serve", req);
        }
        // if R_down not empty, jump to lowest of R_down and serve R_down ascending
        if (R_down.length > 0) {
          const R_down_asc = [...R_down].sort(
            (a, b) => a.cylinder - b.cylinder || a.tableIndex - b.tableIndex,
          );
          const lowest = R_down_asc[0]!.cylinder;
          addSegment(lowest, "jump", undefined, `Head jumps from ${currentHead} to lowest pending request at ${lowest}.`);
          for (const req of R_down_asc) {
            addSegment(req.cylinder, "serve", req);
          }
        }
      }
    } else {
      // C-LOOK toward lower:
      if (R_down.length === 0) {
        const R_up_desc = [...R_up].sort(
          (a, b) => b.cylinder - a.cylinder || a.tableIndex - b.tableIndex,
        );
        addSegment(
          R_up_desc[0]!.cylinder,
          "jump",
          undefined,
          `Head jumps straight to highest request at cylinder ${R_up_desc[0]!.cylinder}.`,
        );
        for (const req of R_up_desc) {
          addSegment(req.cylinder, "serve", req);
        }
      } else {
        // serve R_down descending up to lowest
        for (const req of R_down) {
          addSegment(req.cylinder, "serve", req);
        }
        // if R_up not empty, jump to highest of R_up and serve R_up descending
        if (R_up.length > 0) {
          const R_up_desc = [...R_up].sort(
            (a, b) => b.cylinder - a.cylinder || a.tableIndex - b.tableIndex,
          );
          const highest = R_up_desc[0]!.cylinder;
          addSegment(highest, "jump", undefined, `Head jumps from ${currentHead} to highest pending request at ${highest}.`);
          for (const req of R_up_desc) {
            addSegment(req.cylinder, "serve", req);
          }
        }
      }
    }
  }

  return assembleResult(
    algorithm,
    direction,
    countReturnJump,
    totalCylinders,
    E,
    h,
    seekTimePerCylinderMs,
    segments,
    steps,
    serviceOrder,
    requests.length,
  );
}

function assembleResult(
  algorithm: DiskAlgorithm,
  direction: DiskDirection,
  countReturnJump: boolean,
  totalCylinders: number,
  lastCylinder: number,
  startHead: number,
  seekTimePerCylinderMs: number,
  segments: DiskSegment[],
  steps: DiskStepLog[],
  serviceOrder: string[],
  reqCount: number,
): DiskSimulationResult {
  const totalHeadMovementWithJump = segments.reduce((sum, s) => sum + s.distance, 0);
  const totalHeadMovementWithoutJump = segments
    .filter((s) => s.kind !== "jump")
    .reduce((sum, s) => sum + s.distance, 0);

  const totalHeadMovement = countReturnJump
    ? totalHeadMovementWithJump
    : totalHeadMovementWithoutJump;

  const validReqCount = Math.max(1, reqCount);
  const averageSeekPerRequest = totalHeadMovement / validReqCount;
  const totalSeekTimeMs = totalHeadMovement * seekTimePerCylinderMs;

  return {
    algorithm,
    direction,
    countReturnJump,
    totalCylinders,
    lastCylinder,
    startHead,
    seekTimePerCylinderMs,
    segments,
    steps,
    serviceOrder,
    totalHeadMovement,
    totalHeadMovementWithJump,
    totalHeadMovementWithoutJump,
    averageSeekPerRequest,
    totalSeekTimeMs,
    servedCount: serviceOrder.length,
  };
}

export interface DiskRankingItem {
  algorithm: DiskAlgorithm;
  algorithmName: string;
  totalHeadMovement: number;
  longestWait: number;
  averageSeekPerRequest: number;
  totalSeekTimeMs: number;
  rank: number;
  isWinner: boolean;
  tieBreakUsed?: string;
  result: DiskSimulationResult;
}

export interface BestDiskVerdict {
  isTie: boolean;
  winner: DiskAlgorithm | null;
  winnerName: string | null;
  tiedAlgorithms: DiskAlgorithm[];
  ranked: DiskRankingItem[];
  perMetricWinners: {
    lowestMovement: {
      algorithm: DiskAlgorithm;
      value: number;
      isTie: boolean;
      tied: DiskAlgorithm[];
    };
    lowestLongestWait: {
      algorithm: DiskAlgorithm;
      value: number;
      isTie: boolean;
      tied: DiskAlgorithm[];
    };
  };
  explanation: string;
  explanationLines: string[];
  selectionDetails: {
    metric: string;
    tieBreakUsed: string | null;
    currentDirection: DiskDirection;
    countReturnJump: boolean;
  };
}

export const FIXED_ALGORITHM_ORDER: DiskAlgorithm[] = [
  "fcfs",
  "sstf",
  "scan",
  "c-scan",
  "look",
  "c-look",
];

/**
 * Computes the longest wait (cylinders the head moved before the last request was served).
 */
export function computeLongestWait(result: DiskSimulationResult): number {
  let lastServeIdx = -1;
  for (let i = result.segments.length - 1; i >= 0; i--) {
    if (result.segments[i]!.kind === "serve") {
      lastServeIdx = i;
      break;
    }
  }
  if (lastServeIdx === -1) return 0;
  return result.segments
    .slice(0, lastServeIdx + 1)
    .filter((s) => s.countedInTotal)
    .reduce((sum, s) => sum + s.distance, 0);
}

/**
 * Pure function to determine the best disk scheduling algorithm based on simulation results.
 * Follows strict rules: lowest total head movement, ties broken by lower longest wait,
 * and if still equal, reports a TIE without naming a single winner.
 */
export function pickBest(results: DiskSimulationResult[]): BestDiskVerdict {
  if (results.length === 0) {
    throw new Error("pickBest requires at least one simulation result");
  }

  const rawStats = results.map((r) => {
    const longestWait = computeLongestWait(r);
    return {
      algorithm: r.algorithm,
      algorithmName: DISK_ALGORITHM_MAP[r.algorithm].label,
      totalHeadMovement: r.totalHeadMovement,
      longestWait,
      averageSeekPerRequest: r.averageSeekPerRequest,
      totalSeekTimeMs: r.totalSeekTimeMs,
      result: r,
    };
  });

  const getOrderIndex = (algo: DiskAlgorithm) => FIXED_ALGORITHM_ORDER.indexOf(algo);

  // Sort by:
  // 1. Lowest total head movement
  // 2. Lowest longest wait
  // 3. Fixed order: FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK
  const sorted = [...rawStats].sort((a, b) => {
    if (a.totalHeadMovement !== b.totalHeadMovement) {
      return a.totalHeadMovement - b.totalHeadMovement;
    }
    if (a.longestWait !== b.longestWait) {
      return a.longestWait - b.longestWait;
    }
    return getOrderIndex(a.algorithm) - getOrderIndex(b.algorithm);
  });

  const minMovement = sorted[0]!.totalHeadMovement;
  const sameMovement = sorted.filter((s) => s.totalHeadMovement === minMovement);
  const minLongestWaitAmongMin = Math.min(...sameMovement.map((s) => s.longestWait));
  const tiedTop = sameMovement.filter((s) => s.longestWait === minLongestWaitAmongMin);

  const isTie = tiedTop.length > 1;
  const winner = isTie ? null : sorted[0]!.algorithm;
  const winnerName = isTie ? null : DISK_ALGORITHM_MAP[sorted[0]!.algorithm].label;
  const tiedAlgorithms = isTie ? tiedTop.map((s) => s.algorithm) : [];

  // Per-metric winners
  const minMove = Math.min(...rawStats.map((s) => s.totalHeadMovement));
  const minMoveAlgos = rawStats.filter((s) => s.totalHeadMovement === minMove).map((s) => s.algorithm);

  const minWait = Math.min(...rawStats.map((s) => s.longestWait));
  const minWaitAlgos = rawStats.filter((s) => s.longestWait === minWait).map((s) => s.algorithm);

  const perMetricWinners = {
    lowestMovement: {
      algorithm: minMoveAlgos[0]!,
      value: minMove,
      isTie: minMoveAlgos.length > 1,
      tied: minMoveAlgos,
    },
    lowestLongestWait: {
      algorithm: minWaitAlgos[0]!,
      value: minWait,
      isTie: minWaitAlgos.length > 1,
      tied: minWaitAlgos,
    },
  };

  // Build ranked items with ranks & tieBreak notes
  let currentRank = 1;
  const ranked: DiskRankingItem[] = sorted.map((item, idx) => {
    if (idx > 0) {
      const prev = sorted[idx - 1]!;
      if (
        item.totalHeadMovement !== prev.totalHeadMovement ||
        item.longestWait !== prev.longestWait
      ) {
        currentRank = idx + 1;
      }
    }

    let tieBreakUsed: string | undefined;
    const sameMoveItems = sorted.filter(
      (other) => other.algorithm !== item.algorithm && other.totalHeadMovement === item.totalHeadMovement,
    );
    if (sameMoveItems.length > 0) {
      tieBreakUsed = `Tied on total (${item.totalHeadMovement} cyl); longest wait: ${item.longestWait} cyl`;
    }

    const isWinnerItem = isTie
      ? tiedAlgorithms.includes(item.algorithm)
      : item.algorithm === winner;

    return {
      algorithm: item.algorithm,
      algorithmName: item.algorithmName,
      totalHeadMovement: item.totalHeadMovement,
      longestWait: item.longestWait,
      averageSeekPerRequest: item.averageSeekPerRequest,
      totalSeekTimeMs: item.totalSeekTimeMs,
      rank: currentRank,
      isWinner: isWinnerItem,
      tieBreakUsed,
      result: item.result,
    };
  });

  // Build 3 to 5 sentence why explanation
  const explanationLines: string[] = [];

  if (isTie) {
    const tiedNames = tiedAlgorithms.map((a) => DISK_ALGORITHM_MAP[a].label).join(", ");
    explanationLines.push(
      `All ${tiedAlgorithms.length} tied algorithms (${tiedNames}) completed with ${minMovement} cylinders of total head movement.`,
    );
    explanationLines.push(
      `Because every algorithm serviced the workload with identical movement and identical longest wait, no single algorithm outperforms the others.`,
    );
  } else {
    const winnerLabel = DISK_ALGORITHM_MAP[winner!].label;
    const nextBest = sorted[1]!;
    const worst = sorted[sorted.length - 1]!;

    // Sentence 1: What it won by
    explanationLines.push(
      `${winnerLabel} moved the head ${sorted[0]!.totalHeadMovement} cylinders in total, compared with ${nextBest.totalHeadMovement} for ${DISK_ALGORITHM_MAP[nextBest.algorithm].label}, the next best, and ${worst.totalHeadMovement} for ${DISK_ALGORITHM_MAP[worst.algorithm].label}, the worst.`,
    );

    // Sentence 2: Reason matching winner's rule
    switch (winner) {
      case "sstf":
        explanationLines.push(`SSTF always serves the nearest request, so each hop is short.`);
        break;
      case "look":
        explanationLines.push(
          `LOOK turns at the last request in the current direction and skips the trip to the disk end.`,
        );
        break;
      case "c-look":
        explanationLines.push(
          `C-LOOK turns at the last request and skips traveling to the physical boundaries.`,
        );
        break;
      case "scan":
        explanationLines.push(
          `SCAN sweeps continuously to the disk end before reversing direction.`,
        );
        break;
      case "c-scan":
        explanationLines.push(
          `C-SCAN sweeps to the boundary and returns in one jump for uniform waiting.`,
        );
        break;
      case "fcfs":
        explanationLines.push(
          `FCFS ignores cylinder positions and serves requests in arrival order, causing zigzag travel.`,
        );
        break;
    }

    // Sentence 3: Extra distance worst algorithm travelled
    const extraCyl = worst.totalHeadMovement - sorted[0]!.totalHeadMovement;
    const extraMs = (extraCyl * sorted[0]!.result.seekTimePerCylinderMs).toFixed(1);
    explanationLines.push(
      `The least efficient algorithm (${DISK_ALGORITHM_MAP[worst.algorithm].label}) travelled an extra ${extraCyl} cylinders (${extraMs} ms of seek time).`,
    );

    // Sentence 4: Trade-off when it applies
    if (winner === "sstf") {
      explanationLines.push(
        `While SSTF minimizes seek distance here, it can starve distant requests if closer ones keep arriving; sweep algorithms trade a bit of distance for guaranteed fairness.`,
      );
    } else if (
      perMetricWinners.lowestLongestWait.algorithm !== winner &&
      !perMetricWinners.lowestLongestWait.isTie
    ) {
      const waitWinnerLabel = DISK_ALGORITHM_MAP[perMetricWinners.lowestLongestWait.algorithm].label;
      explanationLines.push(
        `Notably, ${waitWinnerLabel} achieved a lower longest wait (${perMetricWinners.lowestLongestWait.value} cylinders vs ${sorted[0]!.longestWait} cylinders for ${winnerLabel}).`,
      );
    }
  }

  // Final closing line (always present)
  explanationLines.push(
    `Best here means the least head movement for this input and direction. A different example or direction can change the answer.`,
  );

  let tieBreakUsed: string | null = null;
  if (!isTie && sameMovement.length > 1) {
    tieBreakUsed = `Total head movement tied at ${minMovement} cylinders; broken by lower longest wait (${sorted[0]!.longestWait} cylinders).`;
  } else if (isTie) {
    tieBreakUsed = `All tied contenders have identical total movement (${minMovement} cyl) and identical longest wait (${minLongestWaitAmongMin} cyl).`;
  }

  return {
    isTie,
    winner,
    winnerName,
    tiedAlgorithms,
    ranked,
    perMetricWinners,
    explanation: explanationLines.join(" "),
    explanationLines,
    selectionDetails: {
      metric: "Lowest Total Head Movement (cylinders)",
      tieBreakUsed,
      currentDirection: results[0]!.direction,
      countReturnJump: results[0]!.countReturnJump,
    },
  };
}

export interface DirectionSensitivityItem {
  algorithm: DiskAlgorithm;
  label: string;
  higherTotal: number;
  lowerTotal: number;
  difference: number;
}

export interface DirectionSensitivityReport {
  items: DirectionSensitivityItem[];
  higherWinner: { algorithm: DiskAlgorithm; label: string; total: number };
  lowerWinner: { algorithm: DiskAlgorithm; label: string; total: number };
}

/**
 * Evaluates direction sensitivity for all six algorithms by running higher vs lower on identical workloads.
 */
export function computeDirectionSensitivity(
  totalCylinders: number,
  startHead: number,
  requests: DiskRequestInput[],
  countReturnJump: boolean = true,
  seekTimePerCylinderMs: number = 1,
): DirectionSensitivityReport {
  const higherResults = FIXED_ALGORITHM_ORDER.map((algo) =>
    simulateDiskScheduling(
      totalCylinders,
      startHead,
      requests,
      algo,
      "higher",
      countReturnJump,
      seekTimePerCylinderMs,
    ),
  );

  const lowerResults = FIXED_ALGORITHM_ORDER.map((algo) =>
    simulateDiskScheduling(
      totalCylinders,
      startHead,
      requests,
      algo,
      "lower",
      countReturnJump,
      seekTimePerCylinderMs,
    ),
  );

  const higherVerdict = pickBest(higherResults);
  const lowerVerdict = pickBest(lowerResults);

  const items: DirectionSensitivityItem[] = FIXED_ALGORITHM_ORDER.map((algo, idx) => {
    const hRes = higherResults[idx]!;
    const lRes = lowerResults[idx]!;
    return {
      algorithm: algo,
      label: DISK_ALGORITHM_MAP[algo].label,
      higherTotal: hRes.totalHeadMovement,
      lowerTotal: lRes.totalHeadMovement,
      difference: Math.abs(hRes.totalHeadMovement - lRes.totalHeadMovement),
    };
  });

  const higherWinAlgo = higherVerdict.winner || higherVerdict.ranked[0]!.algorithm;
  const lowerWinAlgo = lowerVerdict.winner || lowerVerdict.ranked[0]!.algorithm;

  return {
    items,
    higherWinner: {
      algorithm: higherWinAlgo,
      label: DISK_ALGORITHM_MAP[higherWinAlgo].label,
      total: higherVerdict.ranked[0]!.totalHeadMovement,
    },
    lowerWinner: {
      algorithm: lowerWinAlgo,
      label: DISK_ALGORITHM_MAP[lowerWinAlgo].label,
      total: lowerVerdict.ranked[0]!.totalHeadMovement,
    },
  };
}
