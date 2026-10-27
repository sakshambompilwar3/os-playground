export type Matrix = number[][];

export interface SafetyStep {
  process: number;
  workBefore: number[];
  workAfter: number[];
}

export interface SafetyResult {
  safe: boolean;
  sequence: number[];
  steps: SafetyStep[];
  need: Matrix;
}

export const computeNeed = (max: Matrix, alloc: Matrix): Matrix =>
  max.map((row, i) => row.map((v, j) => v - alloc[i][j]));

export const leq = (a: number[], b: number[]) => a.every((v, i) => v <= b[i]);

export function runSafety(available: number[], max: Matrix, alloc: Matrix): SafetyResult {
  const need = computeNeed(max, alloc);
  const n = max.length;
  const work = [...available];
  const finish = Array(n).fill(false);
  const sequence: number[] = [];
  const steps: SafetyStep[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (let i = 0; i < n; i++) {
      if (!finish[i] && leq(need[i], work)) {
        const before = [...work];
        alloc[i].forEach((a, j) => (work[j] += a));
        finish[i] = true;
        sequence.push(i);
        steps.push({ process: i, workBefore: before, workAfter: [...work] });
        progressed = true;
      }
    }
  }
  return { safe: finish.every(Boolean), sequence, steps, need };
}

export type RequestOutcome =
  | { status: "exceeds-need" }
  | { status: "wait" }
  | { status: "unsafe"; result: SafetyResult }
  | { status: "granted"; result: SafetyResult; available: number[]; alloc: Matrix };

export function requestResources(
  pid: number,
  request: number[],
  available: number[],
  max: Matrix,
  alloc: Matrix,
): RequestOutcome {
  const need = computeNeed(max, alloc);
  if (!leq(request, need[pid])) return { status: "exceeds-need" };
  if (!leq(request, available)) return { status: "wait" };
  const newAvail = available.map((v, j) => v - request[j]);
  const newAlloc = alloc.map((row, i) => (i === pid ? row.map((v, j) => v + request[j]) : [...row]));
  const result = runSafety(newAvail, max, newAlloc);
  if (!result.safe) return { status: "unsafe", result };
  return { status: "granted", result, available: newAvail, alloc: newAlloc };
}

/** Classic textbook example (Silberschatz). */
export const SAMPLE = {
  resources: ["A", "B", "C"],
  available: [3, 3, 2],
  max: [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3],
  ],
  alloc: [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2],
  ],
};
