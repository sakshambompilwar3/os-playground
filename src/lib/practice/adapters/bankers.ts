import { runSafety, requestResources, computeNeed, Matrix, SafetyResult, RequestOutcome } from "../../bankers";

export interface BankersAdapterInput {
  available: number[];
  max: Matrix;
  alloc: Matrix;
  request?: {
    pid: number;
    vector: number[];
  };
}

export interface BankersAdapterOutput {
  need: Matrix;
  safe: boolean;
  safeSequence: string[]; // e.g. ["P1", "P3", "P4", "P0", "P2"]
  requestGranted?: boolean;
  requestStatus?: string;
  safetyResult: SafetyResult;
  requestOutcome?: RequestOutcome;
}

export function runBankersProductionSolver(input: BankersAdapterInput): BankersAdapterOutput {
  const safety = runSafety(input.available, input.max, input.alloc);
  const need = computeNeed(input.max, input.alloc);

  let requestGranted: boolean | undefined = undefined;
  let requestStatus: string | undefined = undefined;
  let requestOutcome: RequestOutcome | undefined = undefined;

  if (input.request) {
    const outcome = requestResources(
      input.request.pid,
      input.request.vector,
      input.available,
      input.max,
      input.alloc,
    );
    requestOutcome = outcome;
    requestGranted = outcome.status === "granted";
    requestStatus = outcome.status;
  }

  return {
    need,
    safe: safety.safe,
    safeSequence: safety.safe ? safety.sequence.map((pIdx) => `P${pIdx}`) : [],
    requestGranted,
    requestStatus,
    safetyResult: safety,
    requestOutcome,
  };
}
