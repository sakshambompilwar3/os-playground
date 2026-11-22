// Reference Banker's algorithm solver written completely independently from production.
// Implements matrix loops with exact full-pass index scan (0 to n-1) order.
// Zero imports from production files.

export type Matrix = number[][];

export interface RefBankersOutput {
  need: Matrix;
  safe: boolean;
  safeSequence: string[]; // ["P1", "P3", ...]
  requestGranted?: boolean;
  requestStatus?: "exceeds-need" | "wait" | "unsafe" | "granted";
}

function leq(a: number[], b: number[]): boolean {
  return a.every((v, i) => v <= (b[i] ?? 0));
}

export function runBankersReferenceSolver(
  available: number[],
  max: Matrix,
  alloc: Matrix,
  request?: { pid: number; vector: number[] },
): RefBankersOutput {
  const n = max.length;
  const m = available.length;

  // Compute Need matrix: need[i][j] = max[i][j] - alloc[i][j]
  const need: Matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => (max[i]![j] ?? 0) - (alloc[i]![j] ?? 0)),
  );

  // Safety check implementation (Full pass in index order 0 to n-1)
  function checkSafety(curAvail: number[], curAlloc: Matrix, curNeed: Matrix): {
    safe: boolean;
    sequence: number[];
  } {
    const work = [...curAvail];
    const finish = Array(n).fill(false);
    const sequence: number[] = [];
    let progressed = true;

    while (progressed) {
      progressed = false;
      for (let i = 0; i < n; i++) {
        if (!finish[i] && leq(curNeed[i]!, work)) {
          // Allocate work
          for (let j = 0; j < m; j++) {
            work[j] = work[j]! + curAlloc[i]![j]!;
          }
          finish[i] = true;
          sequence.push(i);
          progressed = true;
        }
      }
    }

    return {
      safe: finish.every(Boolean),
      sequence,
    };
  }

  const baseSafety = checkSafety(available, alloc, need);

  let requestGranted: boolean | undefined = undefined;
  let requestStatus: "exceeds-need" | "wait" | "unsafe" | "granted" | undefined = undefined;

  if (request) {
    const { pid, vector } = request;
    const procNeed = need[pid]!;

    if (!leq(vector, procNeed)) {
      requestStatus = "exceeds-need";
      requestGranted = false;
    } else if (!leq(vector, available)) {
      requestStatus = "wait";
      requestGranted = false;
    } else {
      const trialAvail = available.map((v, j) => v - vector[j]!);
      const trialAlloc = alloc.map((row, i) =>
        i === pid ? row.map((v, j) => v + vector[j]!) : [...row],
      );
      const trialNeed = need.map((row, i) =>
        i === pid ? row.map((v, j) => v - vector[j]!) : [...row],
      );

      const trialSafety = checkSafety(trialAvail, trialAlloc, trialNeed);
      if (trialSafety.safe) {
        requestStatus = "granted";
        requestGranted = true;
      } else {
        requestStatus = "unsafe";
        requestGranted = false;
      }
    }
  }

  return {
    need,
    safe: baseSafety.safe,
    safeSequence: baseSafety.safe ? baseSafety.sequence.map((pIdx) => `P${pIdx}`) : [],
    requestGranted,
    requestStatus,
  };
}
