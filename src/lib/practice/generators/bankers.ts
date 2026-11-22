import { createRng } from "../rng";
import {
  Problem,
  ProblemLevel,
  Question,
  SolutionStep,
  StatementDataTable,
  CommonMistake,
  PracticeOptions,
} from "../types";
import { VerificationCandidate } from "../gate";
import { runBankersProductionSolver, BankersAdapterInput } from "../adapters/bankers";
import { runBankersReferenceSolver, Matrix } from "../reference/bankers";

export type BankersProblemType = "safety-check" | "safe-sequence" | "resource-request";
const ALL_BANKERS_TYPES: BankersProblemType[] = ["safety-check", "safe-sequence", "resource-request"];

export function generateBankersCandidate(
  level: ProblemLevel,
  seed: string,
  options?: PracticeOptions,
): VerificationCandidate | null {
  const rng = createRng(seed);

  let problemType: BankersProblemType;
  if (options?.sub && options.sub !== "random" && ALL_BANKERS_TYPES.includes(options.sub as BankersProblemType)) {
    problemType = options.sub as BankersProblemType;
  } else {
    problemType = rng.pick(ALL_BANKERS_TYPES);
  }

  let numProcesses = 3;
  let numResources = 2;
  const resourceNames = ["A", "B", "C", "D"];

  if (level === "easy") {
    numProcesses = 3;
    numResources = 2;
  } else if (level === "medium") {
    numProcesses = rng.pick([4, 5]);
    numResources = 3;
  } else {
    // Hard
    numProcesses = 5;
    numResources = 3;
  }

  const resLabels = resourceNames.slice(0, numResources);
  // If problem type is safe-sequence, we MUST target safe!
  // For other types, target 45% so overall safe stays well within 45-75%
  const targetSafe = problemType === "safe-sequence" ? true : rng.next() < 0.45;

  // Generate Max matrix (1-9)
  const max: Matrix = Array.from({ length: numProcesses }, () =>
    Array.from({ length: numResources }, () => rng.int(1, 9)),
  );

  // Generate Allocation matrix (0 <= Alloc <= Max)
  const alloc: Matrix = max.map((row) =>
    row.map((maxVal) => rng.int(0, maxVal)),
  );

  // Trivial check: nothing allocated
  const totalAlloc = alloc.reduce((sum, row) => sum + row.reduce((s, v) => s + v, 0), 0);
  if (totalAlloc === 0) return null;

  // Generate Available (0-5)
  let available = Array.from({ length: numResources }, () => rng.int(0, 5));

  // Check initial runnable count
  const need = max.map((row, i) => row.map((mVal, j) => mVal - alloc[i]![j]!));
  const runnableInitial = need.filter((row) => row.every((nVal, j) => nVal <= available[j]!)).length;

  // Trivial check: every process runnable from the start
  if (runnableInitial === numProcesses) return null;
  // If zero runnable, system cannot start
  if (runnableInitial === 0 && targetSafe) {
    // Give enough available so at least one process can start
    const pStart = rng.pick(need);
    available = pStart.map((nVal, j) => Math.max(available[j]!, nVal));
  }

  // Pre-test candidate with reference solver
  let testOut = runBankersReferenceSolver(available, max, alloc);
  if (targetSafe && !testOut.safe) {
    // Try boosting available to find a safe state
    for (let j = 0; j < numResources; j++) {
      available[j] = Math.min(9, available[j]! + rng.int(1, 3));
    }
    testOut = runBankersReferenceSolver(available, max, alloc);
    if (!testOut.safe) return null; // Reject attempt, gate will retry
  } else if (!targetSafe && testOut.safe) {
    // Try decreasing available to reach unsafe
    for (let j = 0; j < numResources; j++) {
      available[j] = Math.max(0, available[j]! - rng.int(1, 2));
    }
    testOut = runBankersReferenceSolver(available, max, alloc);
    if (testOut.safe) return null;
  }

  // For resource-request problem type, generate a resource request
  let requestParam: { pid: number; vector: number[] } | undefined = undefined;
  if (problemType === "resource-request") {
    const pid = rng.int(0, numProcesses - 1);
    const procNeed = need[pid]!;

    const wantsGrant = rng.next() < 0.5;
    let reqVec: number[];

    if (wantsGrant && testOut.safe) {
      // Pick vector <= need and <= available
      reqVec = procNeed.map((nVal, j) => Math.min(nVal, rng.int(0, available[j]!)));
    } else {
      // Pick vector that either exceeds need or exceeds available or results in unsafe
      if (rng.next() < 0.5) {
        // Exceeds available
        reqVec = available.map((aVal, j) => Math.min(procNeed[j]!, aVal + rng.int(1, 3)));
      } else {
        // Normal vector but may lead to unsafe
        reqVec = procNeed.map((nVal) => rng.int(0, nVal));
      }
    }

    // Ensure non-zero request
    if (reqVec.every((v) => v === 0)) {
      reqVec[0] = 1;
    }

    requestParam = {
      pid,
      vector: reqVec,
    };
  }

  const input: BankersAdapterInput = {
    available,
    max,
    alloc,
    request: requestParam,
  };

  const prodOutput = runBankersProductionSolver(input);
  const refOutput = runBankersReferenceSolver(available, max, alloc, requestParam);

  const dataTables: StatementDataTable[] = [
    {
      caption: "Allocation Matrix",
      headers: ["Process", ...resLabels],
      rows: alloc.map((row, i) => [`P${i}`, ...row]),
    },
    {
      caption: "Maximum Matrix",
      headers: ["Process", ...resLabels],
      rows: max.map((row, i) => [`P${i}`, ...row]),
    },
    {
      caption: "Available Resources",
      headers: resLabels,
      rows: [available],
    },
  ];

  if (requestParam) {
    dataTables.push({
      caption: `Resource Request by Process P${requestParam.pid}`,
      headers: ["Process", ...resLabels],
      rows: [[`P${requestParam.pid} Request`, ...requestParam.vector]],
    });
  }

  const rules: string[] = [
    `Resource types: ${resLabels.join(", ")}.`,
    "Safety algorithm rule: In each round, scan processes in index order from P0 to Pn; if a process has Need <= Work, immediately allocate its held resources to Work and continue forward in the same pass.",
  ];
  if (requestParam) {
    rules.push(
      "Resource-Request algorithm: 1. Request <= Need, 2. Request <= Available, 3. Pretend to allocate and execute Safety algorithm.",
    );
  }

  type BankersQ = "need-val" | "is-safe" | "safe-sequence" | "can-grant";
  let pickedTypes: BankersQ[] = [];
  if (problemType === "resource-request") {
    pickedTypes = level === "easy" ? ["can-grant"] : ["can-grant", "need-val"];
  } else if (problemType === "safe-sequence") {
    pickedTypes = level === "easy" ? ["safe-sequence"] : ["safe-sequence", "need-val"];
  } else {
    // safety-check
    pickedTypes = level === "easy" ? ["is-safe"] : ["is-safe", "need-val"];
  }

  // Pick target process and resource for Need question
  const targetP = rng.int(0, numProcesses - 1);
  const targetR = rng.int(0, numResources - 1);
  const targetResName = resLabels[targetR]!;

  const questions: Question[] = [];
  const prodAnswers: Record<string, number | string | (string | number)[]> = {};
  const refAnswers: Record<string, number | string | (string | number)[]> = {};

  for (const qType of pickedTypes) {
    let q: Question;
    let prodVal: number | string | (string | number)[];
    let refVal: number | string | (string | number)[];

    switch (qType) {
      case "need-val": {
        const expected = prodOutput.need[targetP]![targetR]!;
        const mistakenAdd = max[targetP]![targetR]! + alloc[targetP]![targetR]!;
        q = {
          id: `need_P${targetP}_${targetResName}`,
          text: `What is the Need of process P${targetP} for resource ${targetResName}?`,
          answerType: "number",
          expected,
          hint: "Need = Max - Allocation for each resource type.",
          commonMistakes: [
            {
              value: mistakenAdd,
              message: "Need = Max - Allocation, not Max + Allocation.",
            },
            {
              value: alloc[targetP]![targetR]!,
              message: "That is the currently Allocated amount, not the remaining Need.",
            },
            {
              value: max[targetP]![targetR]!,
              message: "That is the Maximum demand, not the remaining Need.",
            },
          ],
        };
        prodVal = expected;
        refVal = refOutput.need[targetP]![targetR]!;
        break;
      }

      case "is-safe": {
        const expected = prodOutput.safe ? "yes" : "no";
        q = {
          id: "is_safe",
          text: "Is the current system state in a safe state? (yes / no)",
          answerType: "choice",
          expected,
          choices: [
            { id: "yes", label: "Yes, the system is safe" },
            { id: "no", label: "No, the system is unsafe / deadlocked" },
          ],
          hint: "Test if there exists a valid sequence of processes that can all finish with the available resources.",
        };
        prodVal = expected;
        refVal = refOutput.safe ? "yes" : "no";
        break;
      }

      case "safe-sequence": {
        const expected = prodOutput.safeSequence;
        q = {
          id: "safe_sequence",
          text: "What is the safe sequence found by the index scan rule? (e.g. P1, P3, P4, P0, P2)",
          answerType: "sequence",
          expected,
          hint: "Follow the full-pass scan starting from P0.",
        };
        prodVal = expected;
        refVal = refOutput.safeSequence;
        break;
      }

      case "can-grant": {
        const expected = prodOutput.requestGranted ? "yes" : "no";
        const reqStr = `(${requestParam!.vector.join(", ")})`;
        q = {
          id: "can_grant",
          text: `Can the request ${reqStr} by process P${requestParam!.pid} be granted immediately? (yes / no)`,
          answerType: "choice",
          expected,
          choices: [
            { id: "yes", label: "Yes, grant immediately" },
            { id: "no", label: "No, request must wait or is denied" },
          ],
          hint: "Verify Request <= Need, Request <= Available, and whether the resulting state is safe.",
        };
        prodVal = expected;
        refVal = refOutput.requestGranted ? "yes" : "no";
        break;
      }
    }

    questions.push(q);
    prodAnswers[q.id] = prodVal;
    refAnswers[q.id] = refVal;
  }

  // Solution steps
  const needTableRows = prodOutput.need.map((row, i) => [`P${i}`, ...row]);
  const stepsNarration = prodOutput.safetyResult.steps.map(
    (s) =>
      `Process P${s.process} finishes: Work before = [${s.workBefore.join(", ")}], Work after = [${s.workAfter.join(", ")}].`,
  );

  const solutionSteps: SolutionStep[] = [
    {
      title: "Need Matrix Calculation",
      text: "Need = Max - Allocation for every process and resource type.",
      table: {
        caption: "Computed Need Matrix",
        headers: ["Process", ...resLabels],
        rows: needTableRows,
      },
    },
    {
      title: "Safety Algorithm Trace",
      text: prodOutput.safe
        ? `The system is SAFE. Found safe execution sequence: ${prodOutput.safeSequence.join(" -> ")}.\n` +
          stepsNarration.join("\n")
        : "The system is UNSAFE. No full safe execution sequence exists where all processes can finish.",
      visual: {
        type: "bankers",
        payload: {
          available,
          max,
          alloc,
          need: prodOutput.need,
          safety: prodOutput.safetyResult,
        },
      },
    },
  ];

  if (requestParam && prodOutput.requestOutcome) {
    const rStat = prodOutput.requestOutcome.status;
    let rExplanation = "";
    if (rStat === "exceeds-need") {
      rExplanation = `Request exceeds process P${requestParam.pid}'s declared Need. Error!`;
    } else if (rStat === "wait") {
      rExplanation = `Not enough resources available immediately. Process P${requestParam.pid} must wait.`;
    } else if (rStat === "unsafe") {
      rExplanation = "Resources are available, but granting the request leads to an UNSAFE state. Process must wait.";
    } else {
      rExplanation = "Request is <= Need, <= Available, and the resulting state is SAFE. The request can be granted immediately!";
    }

    solutionSteps.push({
      title: "Resource-Request Algorithm Evaluation",
      text: `Evaluating Request (${requestParam.vector.join(", ")}) for P${requestParam.pid}:\n${rExplanation}`,
    });
  }

  const typeLabels: Record<BankersProblemType, string> = {
    "safety-check": "Safety Check",
    "safe-sequence": "Safe Sequence",
    "resource-request": "Resource Request",
  };
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

  const intro =
    problemType === "resource-request" && requestParam
      ? `A system has ${numProcesses} processes (P0 to P${numProcesses - 1}) and ${numResources} resource types (${resLabels.join(", ")}). Process P${requestParam.pid} requests (${requestParam.vector.join(", ")}). Determine if the request can be granted immediately under the Banker's Algorithm.`
      : `A system has ${numProcesses} processes (P0 to P${numProcesses - 1}) and ${numResources} resource types (${resLabels.join(", ")}). Examine the resource matrices and determine the safety state.`;

  const problem: Problem = {
    id: `bankers-${level}-${seed}`,
    topic: "bankers",
    level,
    seed,
    title: `${typeLabels[problemType]} · ${levelLabel}`,
    subtopic: problemType,
    statement: {
      intro,
      dataTables,
      rules,
    },
    questions,
    solution: solutionSteps,
    rawParams: {
      subtopic: problemType,
      problemType,
      numProcesses,
      numResources,
      available,
      max,
      alloc,
      requestParam,
    },
  };

  return {
    problem,
    productionAnswers: prodAnswers,
    referenceAnswers: refAnswers,
    productionTrace: {
      safe: prodOutput.safe,
      seq: prodOutput.safeSequence.join(","),
    },
    referenceTrace: {
      safe: refOutput.safe,
      seq: refOutput.safeSequence.join(","),
    },
    isTieFree: true,
  };
}
