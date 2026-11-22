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
import { runDiskProductionSolver, DiskAdapterInput } from "../adapters/disk";
import { runDiskReferenceSolver, DiskAlgorithm, DiskDirection } from "../reference/disk";

const ALL_DISK_ALGOS: DiskAlgorithm[] = ["fcfs", "sstf", "scan", "c-scan", "look", "c-look"];

export function generateDiskCandidate(
  level: ProblemLevel,
  seed: string,
  options?: PracticeOptions,
): VerificationCandidate {
  const rng = createRng(seed);

  let algorithm: DiskAlgorithm;
  if (options?.sub && options.sub !== "random" && ALL_DISK_ALGOS.includes(options.sub as DiskAlgorithm)) {
    algorithm = options.sub as DiskAlgorithm;
  } else {
    algorithm = rng.pick(ALL_DISK_ALGOS);
  }

  let cylinders = 100;
  let numRequests = 5;

  if (level === "easy") {
    cylinders = 100;
    numRequests = rng.pick([4, 5]);
  } else if (level === "medium") {
    cylinders = 200;
    numRequests = rng.pick([6, 7]);
  } else {
    // Hard
    cylinders = 200;
    numRequests = rng.pick([8, 9]);
  }
  const direction: DiskDirection = rng.pick(["higher", "lower"]);

  // Sample distinct cylinders for requests
  const requestCylinders = rng.sampleDistinct(1, cylinders - 2, numRequests);

  // Generate head position
  let head = rng.int(10, cylinders - 10);
  if (level === "easy" || level === "medium") {
    while (requestCylinders.includes(head)) {
      head = rng.int(10, cylinders - 10);
    }
  }

  // Seek time per cylinder for hard mode questions
  const seekTimeMs = level === "hard" ? rng.pick([2, 3, 4, 5]) : 1;

  const input: DiskAdapterInput = {
    cylinders,
    head,
    requests: requestCylinders,
    algorithm,
    direction,
  };

  const prodOutput = runDiskProductionSolver(input);
  const refOutputA = runDiskReferenceSolver(cylinders, head, requestCylinders, algorithm, direction, "variantA");
  const refOutputB = runDiskReferenceSolver(cylinders, head, requestCylinders, algorithm, direction, "variantB");

  const algoLabels: Record<DiskAlgorithm, string> = {
    fcfs: "FCFS (First-Come, First-Served)",
    sstf: "SSTF (Shortest Seek Time First)",
    scan: "SCAN (Elevator Algorithm)",
    "c-scan": "C-SCAN (Circular SCAN)",
    look: "LOOK",
    "c-look": "C-LOOK (Circular LOOK)",
  };

  const dataTable: StatementDataTable = {
    caption: "Disk Request Queue",
    headers: ["Request ID", "Cylinder"],
    rows: requestCylinders.map((cyl, idx) => [`R${idx + 1}`, cyl]),
  };

  const rules: string[] = [
    `Disk cylinders: 0 to ${cylinders - 1} (${cylinders} total).`,
    `Initial head position: ${head}.`,
    `Initial head direction: ${direction}.`,
    `Algorithm: ${algoLabels[algorithm]}.`,
    "SCAN and C-SCAN travel to the last cylinder before reversing or jumping, LOOK and C-LOOK turn at the last request.",
    "The return jump of C-SCAN and C-LOOK is counted in the total.",
    "Ties in SSTF go to the request listed first.",
  ];

  type DiskQ = "total-movement" | "served-third" | "avg-seek" | "seek-time";
  const pool: DiskQ[] = ["total-movement", "served-third", "avg-seek"];
  if (level === "hard") pool.push("seek-time");

  const shuffledPool = rng.shuffle(pool);
  const qCount = level === "easy" ? 1 : 2;
  const pickedTypes = shuffledPool.slice(0, qCount);

  const questions: Question[] = [];
  const prodAnswers: Record<string, number | string | (string | number)[]> = {};
  const refAnswersA: Record<string, number | string | (string | number)[]> = {};
  const refAnswersB: Record<string, number | string | (string | number)[]> = {};

  let isTieFree = !refOutputA.hadTieDecision;

  for (const qType of pickedTypes) {
    let q: Question;
    let prodVal: number | string;
    let refValA: number | string;
    let refValB: number | string;

    switch (qType) {
      case "total-movement": {
        const expected = prodOutput.totalHeadMovement;
        q = {
          id: "total_movement",
          text: "What is the total head movement (in cylinders) to service all requests?",
          answerType: "number",
          unit: "cylinders",
          expected,
          hint: "Sum the absolute differences |from - to| for all head movements.",
          commonMistakes: [
            {
              value: prodOutput.averageSeekPerRequest,
              message: "That is the average seek per request, not the total head movement.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.totalHeadMovement;
        refValB = refOutputB.totalHeadMovement;
        break;
      }

      case "served-third": {
        const expected = prodOutput.cylinderServedThird;
        q = {
          id: "served_third",
          text: "Which cylinder is serviced third in the sequence?",
          answerType: "number",
          unit: "cylinder",
          expected,
          hint: `Trace the first 3 requests serviced by ${algoLabels[algorithm]}.`,
        };
        prodVal = expected;
        refValA = refOutputA.cylinderServedThird;
        refValB = refOutputB.cylinderServedThird;
        break;
      }

      case "avg-seek": {
        const expected = prodOutput.averageSeekPerRequest;
        q = {
          id: "avg_seek",
          text: "What is the average seek distance per request? (in cylinders, rounded to 2 decimals)",
          answerType: "number",
          unit: "cylinders",
          expected,
          hint: "Average Seek = Total Head Movement / Number of Requests.",
          commonMistakes: [
            {
              value: prodOutput.totalHeadMovement,
              message: "That is the total head movement, not the average.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.averageSeekPerRequest;
        refValB = refOutputB.averageSeekPerRequest;
        break;
      }

      case "seek-time": {
        const expected = prodOutput.totalHeadMovement * seekTimeMs;
        q = {
          id: "seek_time",
          text: `If the seek time is ${seekTimeMs} ms per cylinder, what is the total seek time in milliseconds?`,
          answerType: "number",
          unit: "ms",
          expected,
          hint: "Total Seek Time = Total Head Movement * Seek Time per Cylinder.",
          commonMistakes: [
            {
              value: prodOutput.totalHeadMovement,
              message: `That is the cylinder count. Multiply by ${seekTimeMs} ms.`,
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.totalHeadMovement * seekTimeMs;
        refValB = refOutputB.totalHeadMovement * seekTimeMs;
        break;
      }
    }

    questions.push(q);
    prodAnswers[q.id] = prodVal;
    refAnswersA[q.id] = refValA;
    refAnswersB[q.id] = refValB;

    if (refValA !== refValB) {
      isTieFree = false;
    }
  }

  // Worked solution steps
  const movesText = prodOutput.stepLog
    .map((s, idx) => `Step ${idx + 1}: ${s.from} -> ${s.to} (movement: |${s.from} - ${s.to}| = ${s.movement} cylinders)`)
    .join("\n");

  const solutionSteps: SolutionStep[] = [
    {
      title: "Step-by-Step Head Trajectory",
      text: movesText,
      table: {
        caption: "Head Movements",
        headers: ["Step", "From", "To", "Distance"],
        rows: prodOutput.stepLog.map((s, i) => [i + 1, s.from, s.to, s.movement]),
      },
    },
    {
      title: "Head Movement Summary",
      text: `Total head movement = ${prodOutput.totalHeadMovement} cylinders.\n` +
        `Requests serviced in order: ${prodOutput.servedSequence.join(" -> ")}.\n` +
        `Average seek per request = ${prodOutput.totalHeadMovement} / ${numRequests} = ${prodOutput.averageSeekPerRequest.toFixed(2)} cylinders.`,
      visual: {
        type: "disk",
        payload: {
          result: prodOutput.rawResult,
          cylinders,
          head,
        },
      },
    },
  ];

  const shortLabels: Record<DiskAlgorithm, string> = {
    fcfs: "FCFS",
    sstf: "SSTF",
    scan: "SCAN",
    "c-scan": "C-SCAN",
    look: "LOOK",
    "c-look": "C-LOOK",
  };
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

  const problem: Problem = {
    id: `disk-scheduling-${level}-${seed}`,
    topic: "disk-scheduling",
    level,
    seed,
    title: `${shortLabels[algorithm]} · ${levelLabel}`,
    subtopic: algorithm,
    statement: {
      intro: `A disk with ${cylinders} cylinders (0 to ${cylinders - 1}) receives ${numRequests} I/O requests. The head is currently at cylinder ${head} moving ${direction}.`,
      dataTables: [dataTable],
      rules,
    },
    questions,
    solution: solutionSteps,
    rawParams: {
      cylinders,
      head,
      direction,
      algorithm,
      requests: requestCylinders,
      seekTimeMs,
    },
  };

  return {
    problem,
    productionAnswers: prodAnswers,
    referenceAnswers: refAnswersA,
    productionTrace: {
      totalDist: prodOutput.totalHeadMovement,
      third: prodOutput.cylinderServedThird,
    },
    referenceTrace: {
      totalDist: refOutputA.totalHeadMovement,
      third: refOutputA.cylinderServedThird,
    },
    isTieFree,
  };
}
