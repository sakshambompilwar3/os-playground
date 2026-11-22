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
import { runCpuProductionSolver, CpuSchedulingInputProcess } from "../adapters/cpu";
import { runCpuReferenceSolver, RefCpuProcess, CpuAlgorithm } from "../reference/cpu";
import { SchedulingAlgorithm } from "../../scheduling";

const ALL_CPU_ALGOS: CpuAlgorithm[] = [
  "fcfs",
  "sjf",
  "srtf",
  "round-robin",
  "priority-np",
  "priority-p",
];

export function generateCpuCandidate(
  level: ProblemLevel,
  seed: string,
  options?: PracticeOptions,
): VerificationCandidate {
  const rng = createRng(seed);

  const requestedSub =
    options?.sub === "rr" ? "round-robin" : options?.sub;

  let algorithm: CpuAlgorithm;
  if (
    requestedSub &&
    requestedSub !== "random" &&
    ALL_CPU_ALGOS.includes(requestedSub as CpuAlgorithm)
  ) {
    algorithm = requestedSub as CpuAlgorithm;
  } else {
    algorithm = rng.pick(ALL_CPU_ALGOS);
  }

  let numProcesses = 3;
  let arrivalMax = 3;
  let burstMax = 6;
  let burstMin = 2;

  if (level === "easy") {
    numProcesses = 3;
    arrivalMax = 3;
    burstMin = 2;
    burstMax = 6;
  } else if (level === "medium") {
    numProcesses = rng.pick([4, 5]);
    arrivalMax = 6;
    burstMin = 2;
    burstMax = 8;
  } else {
    // Hard
    numProcesses = rng.pick([5, 6]);
    arrivalMax = 9;
    burstMin = 2;
    burstMax = 10;
  }

  let quantum: number | undefined = undefined;
  if (algorithm === "round-robin") {
    quantum = level === "hard" ? rng.pick([2, 3, 4, 5]) : level === "medium" ? rng.pick([2, 3, 4]) : rng.pick([2, 3]);
  }

  // Generate processes
  const processes: CpuSchedulingInputProcess[] = [];
  const distinctPriorities = rng.shuffle(Array.from({ length: numProcesses }, (_, i) => i + 1));
  const distinctBursts =
    (level === "easy" || level === "medium") && (algorithm === "sjf" || algorithm === "srtf")
      ? rng.sampleDistinct(burstMin, burstMax, numProcesses)
      : null;

  for (let i = 0; i < numProcesses; i++) {
    const id = `P${i + 1}`;
    // At least one process arrives at 0
    let arrivalTime = 0;
    if (i === 0) {
      arrivalTime = 0;
    } else {
      arrivalTime = rng.int(0, arrivalMax);
    }
    const burstTime = distinctBursts ? distinctBursts[i]! : rng.int(burstMin, burstMax);
    const priority = distinctPriorities[i];

    processes.push({
      id,
      name: id,
      arrivalTime,
      burstTime,
      priority,
    });
  }

  // Sort processes by arrival time or keep in order P1..Pn
  // Textbook style lists processes in P1..Pn order

  // Build statement
  const hasPriority = algorithm === "priority-np" || algorithm === "priority-p";
  const algoLabels: Record<CpuAlgorithm, string> = {
    fcfs: "First-Come, First-Served (FCFS)",
    sjf: "Shortest Job First (SJF, non-preemptive)",
    srtf: "Shortest Remaining Time First (SRTF, preemptive)",
    "round-robin": `Round Robin (RR, quantum = ${quantum})`,
    "priority-np": "Priority (non-preemptive)",
    "priority-p": "Priority (preemptive)",
  };

  const headers = ["Process", "Arrival Time", "Burst Time"];
  if (hasPriority) headers.push("Priority");

  const rows = processes.map((p) => {
    const r: (string | number)[] = [p.id, p.arrivalTime, p.burstTime];
    if (hasPriority) r.push(p.priority ?? 1);
    return r;
  });

  const dataTable: StatementDataTable = {
    caption: "Process Set",
    headers,
    rows,
  };

  const rules = [
    `Scheduling algorithm: ${algoLabels[algorithm]}.`,
    "Context switch time is 0 ms.",
  ];
  if (hasPriority) {
    rules.push("A smaller priority number means a higher priority.");
  }
  rules.push("Ties: the process that arrived earlier goes first, then the lower process number.");
  if (algorithm === "round-robin") {
    rules.push("A process that arrives at the same moment another process is preempted enters the queue first.");
  }

  // Run Solvers
  const prodOutput = runCpuProductionSolver(processes, algorithm as SchedulingAlgorithm, quantum);

  const refProcesses: RefCpuProcess[] = processes.map((p) => ({
    id: p.id,
    arrivalTime: p.arrivalTime,
    burstTime: p.burstTime,
    priority: p.priority,
  }));

  const refOutputA = runCpuReferenceSolver(refProcesses, algorithm, quantum, "variantA");
  const refOutputB = runCpuReferenceSolver(refProcesses, algorithm, quantum, "variantB");
  const refOutputC =
    algorithm === "round-robin"
      ? runCpuReferenceSolver(refProcesses, algorithm, quantum, "variantC")
      : refOutputA;

  // Build candidate questions
  type QuestionTypeCandidate =
    | "avg-wt"
    | "avg-tat"
    | "first-finished"
    | "completion-time"
    | "waiting-time"
    | "response-time";

  const questionPool: QuestionTypeCandidate[] = [
    "avg-wt",
    "avg-tat",
    "first-finished",
    "completion-time",
    "waiting-time",
    "response-time",
  ];

  const shuffledPool = rng.shuffle(questionPool);
  const qCount = level === "easy" ? 1 : level === "medium" ? rng.pick([1, 2]) : 2;
  const pickedTypes = shuffledPool.slice(0, qCount);

  // Pick target process for single-process questions
  const targetProc = rng.pick(processes);

  const questions: Question[] = [];
  const prodAnswers: Record<string, number | string | (string | number)[]> = {};
  const refAnswersA: Record<string, number | string | (string | number)[]> = {};
  const refAnswersB: Record<string, number | string | (string | number)[]> = {};
  const refAnswersC: Record<string, number | string | (string | number)[]> = {};

  let isTieFree = true;

  for (const qType of pickedTypes) {
    let q: Question;
    let prodVal: number | string;
    let refValA: number | string;
    let refValB: number | string;
    let refValC: number | string;

    const commonWT: CommonMistake[] = [
      {
        value: prodOutput.metrics[targetProc.id].turnaroundTime,
        message: "That is the turnaround time. Waiting time = Turnaround Time - Burst Time.",
      },
      {
        value: prodOutput.metrics[targetProc.id].completionTime,
        message: "That is the completion time, not the waiting time.",
      },
    ];

    const commonTAT: CommonMistake[] = [
      {
        value: prodOutput.metrics[targetProc.id].waitingTime,
        message: "That is the waiting time. Turnaround Time = Completion Time - Arrival Time.",
      },
      {
        value: prodOutput.metrics[targetProc.id].completionTime,
        message: "That is the completion time. Turnaround Time = Completion Time - Arrival Time.",
      },
    ];

    switch (qType) {
      case "avg-wt": {
        const expected = Number(prodOutput.avgWaitingTime.toFixed(2));
        const sumWT = Object.values(prodOutput.metrics).reduce((s, m) => s + m.waitingTime, 0);
        q = {
          id: "avg_wt",
          text: "What is the average waiting time across all processes?",
          answerType: "number",
          unit: "ms",
          expected,
          hint: "Average Waiting Time = Sum of Waiting Times / Number of Processes.",
          commonMistakes: [
            {
              value: sumWT,
              message: "That is the sum of waiting times, not the average.",
            },
            {
              value: Number(prodOutput.avgTurnaroundTime.toFixed(2)),
              message: "That is the average turnaround time, not the average waiting time.",
            },
          ],
        };
        prodVal = expected;
        refValA = Number(refOutputA.avgWaitingTime.toFixed(2));
        refValB = Number(refOutputB.avgWaitingTime.toFixed(2));
        refValC = Number(refOutputC.avgWaitingTime.toFixed(2));
        break;
      }

      case "avg-tat": {
        const expected = Number(prodOutput.avgTurnaroundTime.toFixed(2));
        const sumTAT = Object.values(prodOutput.metrics).reduce((s, m) => s + m.turnaroundTime, 0);
        q = {
          id: "avg_tat",
          text: "What is the average turnaround time across all processes?",
          answerType: "number",
          unit: "ms",
          expected,
          hint: "Average Turnaround Time = Sum of Turnaround Times / Number of Processes.",
          commonMistakes: [
            {
              value: sumTAT,
              message: "That is the sum of turnaround times, not the average.",
            },
            {
              value: Number(prodOutput.avgWaitingTime.toFixed(2)),
              message: "That is the average waiting time, not the average turnaround time.",
            },
          ],
        };
        prodVal = expected;
        refValA = Number(refOutputA.avgTurnaroundTime.toFixed(2));
        refValB = Number(refOutputB.avgTurnaroundTime.toFixed(2));
        refValC = Number(refOutputC.avgTurnaroundTime.toFixed(2));
        break;
      }

      case "first-finished": {
        q = {
          id: "first_finished",
          text: "Which process finishes execution first?",
          answerType: "choice",
          expected: prodOutput.firstFinishedProcessId,
          choices: processes.map((p) => ({ id: p.id, label: p.id })),
          hint: "Look for the process with the earliest completion time.",
        };
        prodVal = prodOutput.firstFinishedProcessId;
        refValA = refOutputA.firstFinishedProcessId;
        refValB = refOutputB.firstFinishedProcessId;
        refValC = refOutputC.firstFinishedProcessId;
        break;
      }

      case "completion-time": {
        const expected = prodOutput.metrics[targetProc.id].completionTime;
        q = {
          id: `ct_${targetProc.id}`,
          text: `What is the completion time (CT) of process ${targetProc.id}?`,
          answerType: "number",
          unit: "ms",
          expected,
          hint: "The completion time is the moment the process finishes its final burst.",
          commonMistakes: [
            {
              value: prodOutput.metrics[targetProc.id].turnaroundTime,
              message: "That is the turnaround time. Completion time is the clock time it finished.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.metrics[targetProc.id]?.completionTime ?? -1;
        refValB = refOutputB.metrics[targetProc.id]?.completionTime ?? -1;
        refValC = refOutputC.metrics[targetProc.id]?.completionTime ?? -1;
        break;
      }

      case "waiting-time": {
        const expected = prodOutput.metrics[targetProc.id].waitingTime;
        q = {
          id: `wt_${targetProc.id}`,
          text: `What is the waiting time (WT) of process ${targetProc.id}?`,
          answerType: "number",
          unit: "ms",
          expected,
          hint: "WT = Turnaround Time - Burst Time = (Completion Time - Arrival Time) - Burst Time.",
          commonMistakes: commonWT,
        };
        prodVal = expected;
        refValA = refOutputA.metrics[targetProc.id]?.waitingTime ?? -1;
        refValB = refOutputB.metrics[targetProc.id]?.waitingTime ?? -1;
        refValC = refOutputC.metrics[targetProc.id]?.waitingTime ?? -1;
        break;
      }

      case "response-time": {
        const expected = prodOutput.metrics[targetProc.id].responseTime;
        q = {
          id: `rt_${targetProc.id}`,
          text: `What is the response time (RT) of process ${targetProc.id}?`,
          answerType: "number",
          unit: "ms",
          expected,
          hint: "RT = Time when the process first gets the CPU - Arrival Time.",
          commonMistakes: [
            {
              value: prodOutput.metrics[targetProc.id].waitingTime,
              message: "That is the waiting time. Response time is time to first CPU allocation.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.metrics[targetProc.id]?.responseTime ?? -1;
        refValB = refOutputB.metrics[targetProc.id]?.responseTime ?? -1;
        refValC = refOutputC.metrics[targetProc.id]?.responseTime ?? -1;
        break;
      }
    }

    questions.push(q);
    prodAnswers[q.id] = prodVal;
    refAnswersA[q.id] = refValA;
    refAnswersB[q.id] = refValB;
    refAnswersC[q.id] = refValC;

    // Check tie freedom
    if (refValA !== refValB || refValA !== refValC) {
      isTieFree = false;
    }
  }

  // Build worked solution
  const solutionHeaders = ["Process", "AT", "BT", "CT", "TAT (CT - AT)", "WT (TAT - BT)", "RT"];
  const solutionRows = processes.map((p) => {
    const m = prodOutput.metrics[p.id];
    return [
      p.id,
      p.arrivalTime,
      p.burstTime,
      m.completionTime,
      `${m.completionTime} - ${p.arrivalTime} = ${m.turnaroundTime}`,
      `${m.turnaroundTime} - ${p.burstTime} = ${m.waitingTime}`,
      m.responseTime,
    ];
  });

  const solutionSteps: SolutionStep[] = [
    {
      title: "Gantt Chart & Execution Timeline",
      text: `Execution follows the ${algoLabels[algorithm]} policy with 0 ms context switch overhead.`,
      visual: {
        type: "gantt",
        payload: {
          gantt: prodOutput.gantt,
        },
      },
    },
    {
      title: "Detailed Process Metrics Table",
      text: "Formulas used: Turnaround Time (TAT) = Completion Time (CT) - Arrival Time (AT). Waiting Time (WT) = TAT - Burst Time (BT). Response Time (RT) = First CPU Time - AT.",
      table: {
        caption: "Computed Metrics",
        headers: solutionHeaders,
        rows: solutionRows,
      },
    },
    {
      title: "Averages Summary",
      text: `Average Waiting Time = (${Object.values(prodOutput.metrics).map((m) => m.waitingTime).join(" + ")}) / ${numProcesses} = ${prodOutput.avgWaitingTime.toFixed(2)} ms.\n` +
        `Average Turnaround Time = (${Object.values(prodOutput.metrics).map((m) => m.turnaroundTime).join(" + ")}) / ${numProcesses} = ${prodOutput.avgTurnaroundTime.toFixed(2)} ms.`,
    },
  ];

  const shortAlgoNames: Record<CpuAlgorithm, string> = {
    fcfs: "FCFS",
    sjf: "SJF",
    srtf: "SRTF",
    "round-robin": quantum ? `Round Robin (q=${quantum})` : "Round Robin",
    "priority-np": "Priority (non-preemptive)",
    "priority-p": "Priority (preemptive)",
  };
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

  const problem: Problem = {
    id: `cpu-scheduling-${level}-${seed}`,
    topic: "cpu-scheduling",
    level,
    seed,
    title: `${shortAlgoNames[algorithm]} · ${levelLabel}`,
    subtopic: algorithm === "round-robin" ? "rr" : algorithm,
    statement: {
      intro: `A set of ${numProcesses} processes arrives at the ready queue with the specified arrival and burst times. Compute the scheduling metrics using the ${algoLabels[algorithm]} algorithm.`,
      dataTables: [dataTable],
      rules,
    },
    questions,
    solution: solutionSteps,
    rawParams: {
      algorithm,
      quantum: quantum ?? null,
      processes,
    },
  };

  return {
    problem,
    productionAnswers: prodAnswers,
    referenceAnswers: refAnswersA,
    productionTrace: {
      avgWT: prodOutput.avgWaitingTime,
      avgTAT: prodOutput.avgTurnaroundTime,
    },
    referenceTrace: {
      avgWT: refOutputA.avgWaitingTime,
      avgTAT: refOutputA.avgTurnaroundTime,
    },
    isTieFree,
  };
}
