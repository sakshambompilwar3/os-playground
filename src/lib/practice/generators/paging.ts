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
import { runPagingProductionSolver, PagingAdapterInput } from "../adapters/paging";
import { runPagingReferenceSolver, PagingAlgorithm } from "../reference/paging";

const ALL_PAGING_ALGOS: PagingAlgorithm[] = ["fifo", "lru", "optimal"];

export function generatePagingCandidate(
  level: ProblemLevel,
  seed: string,
  options?: PracticeOptions,
): VerificationCandidate | null {
  const rng = createRng(seed);

  let algorithm: PagingAlgorithm;
  if (options?.sub && options.sub !== "random" && ALL_PAGING_ALGOS.includes(options.sub as PagingAlgorithm)) {
    algorithm = options.sub as PagingAlgorithm;
  } else {
    algorithm = rng.pick(ALL_PAGING_ALGOS);
  }

  let numRefs = 12;
  let maxPage = 5;
  let frameCount = 3;

  if (level === "easy") {
    numRefs = 12;
    maxPage = 5;
    frameCount = 3;
  } else if (level === "medium") {
    numRefs = rng.int(13, 15);
    maxPage = 6;
    frameCount = rng.pick([3, 4]);
  } else {
    // Hard
    numRefs = rng.int(16, 20);
    maxPage = 8;
    frameCount = rng.int(3, 5);
  }

  // Generate reference string with deliberate locality so hits occur
  const references: number[] = [];
  for (let i = 0; i < numRefs; i++) {
    // 40% chance of repeating a recent page if i >= 3
    if (i >= 3 && rng.next() < 0.4) {
      const recent = references.slice(Math.max(0, i - 4), i);
      references.push(rng.pick(recent));
    } else {
      references.push(rng.int(0, maxPage));
    }
  }

  const input: PagingAdapterInput = {
    algorithm,
    references,
    frameCount,
  };

  const prodOutput = runPagingProductionSolver(input);
  const refOutputA = runPagingReferenceSolver(references, frameCount, algorithm, "variantA");
  const refOutputB = runPagingReferenceSolver(references, frameCount, algorithm, "variantB");

  // Invariant requirement: At least 2 hits and at least 3 faults beyond initial frame fills
  if (prodOutput.hits < 2 || prodOutput.faults < frameCount + 3) {
    return null; // Reject attempt, gate will try next attempt
  }

  const algoLabels: Record<PagingAlgorithm, string> = {
    fifo: "First-In, First-Out (FIFO)",
    lru: "Least Recently Used (LRU)",
    optimal: "Optimal Page Replacement (OPT / MIN)",
  };

  const dataTable: StatementDataTable = {
    caption: "Page Reference Sequence",
    headers: ["Ref #", "Page"],
    rows: references.map((p, idx) => [idx + 1, p]),
  };

  const rules: string[] = [
    `Page replacement policy: ${algoLabels[algorithm]}.`,
    `Number of physical frames: ${frameCount}.`,
    "Frames start empty.",
    "The first loads count as page faults.",
  ];
  if (algorithm === "optimal") {
    rules.push("A page that is never used again counts as the farthest; ties go to the page loaded earliest.");
  }

  type PagingQ = "faults" | "hits" | "hit-ratio" | "eviction" | "final-pages";
  const pool: PagingQ[] = ["faults", "hits", "hit-ratio", "final-pages"];

  // Find step with an eviction if one exists
  const evictionSteps = Object.keys(prodOutput.evictedPagesByStep).map(Number);
  if (evictionSteps.length > 0) {
    pool.push("eviction");
  }

  const shuffledPool = rng.shuffle(pool);
  const qCount = level === "easy" ? 1 : 2;
  const pickedTypes = shuffledPool.slice(0, qCount);

  const questions: Question[] = [];
  const prodAnswers: Record<string, number | string | (string | number)[]> = {};
  const refAnswersA: Record<string, number | string | (string | number)[]> = {};
  const refAnswersB: Record<string, number | string | (string | number)[]> = {};

  let isTieFree = algorithm === "optimal" ? true : !refOutputA.hadTieDecision;

  for (const qType of pickedTypes) {
    let q: Question;
    let prodVal: number | string | (string | number)[];
    let refValA: number | string | (string | number)[];
    let refValB: number | string | (string | number)[];

    switch (qType) {
      case "faults": {
        const expected = prodOutput.faults;
        q = {
          id: "faults",
          text: "What is the total number of page faults that occur?",
          answerType: "number",
          expected,
          hint: "Remember to count cold-start initial loads as page faults.",
          commonMistakes: [
            {
              value: prodOutput.hits,
              message: "That is the number of hits, not the number of page faults.",
            },
            {
              value: expected - frameCount,
              message: "Initial cold loads into empty frames must also be counted as page faults.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.faults;
        refValB = refOutputB.faults;
        break;
      }

      case "hits": {
        const expected = prodOutput.hits;
        q = {
          id: "hits",
          text: "What is the total number of page hits?",
          answerType: "number",
          expected,
          hint: "A hit occurs whenever a referenced page is already present in memory.",
          commonMistakes: [
            {
              value: prodOutput.faults,
              message: "That is the number of page faults, not the number of hits.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.hits;
        refValB = refOutputB.hits;
        break;
      }

      case "hit-ratio": {
        const expected = prodOutput.hitRatioPercent;
        const faultRatio = Number(((prodOutput.faults / numRefs) * 100).toFixed(2));
        q = {
          id: "hit_ratio",
          text: "What is the hit ratio in percent? (Round to 2 decimal places)",
          answerType: "number",
          unit: "%",
          expected,
          hint: "Hit Ratio (%) = (Hits / Total References) * 100.",
          commonMistakes: [
            {
              value: faultRatio,
              message: "That is the fault ratio, not the hit ratio.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.hitRatioPercent;
        refValB = refOutputB.hitRatioPercent;
        break;
      }

      case "eviction": {
        const targetStep = rng.pick(evictionSteps);
        const expected = prodOutput.evictedPagesByStep[targetStep]!;
        // Choices: all pages 0..maxPage
        const distinctPages = Array.from(new Set(references)).sort((a, b) => a - b);
        q = {
          id: `evict_step_${targetStep}`,
          text: `Which page is evicted at reference #${targetStep} (page reference ${references[targetStep - 1]})?`,
          answerType: "choice",
          expected: String(expected),
          choices: distinctPages.map((p) => ({ id: String(p), label: `Page ${p}` })),
          hint: `Inspect the frames right before reference #${targetStep} and apply the ${algoLabels[algorithm]} eviction rule.`,
        };
        prodVal = String(expected);
        refValA = String(refOutputA.evictedPagesByStep[targetStep] ?? -1);
        refValB = String(refOutputB.evictedPagesByStep[targetStep] ?? -1);
        break;
      }

      case "final-pages": {
        const expected = prodOutput.finalPages.map(String).sort();
        q = {
          id: "final_pages",
          text: "Which pages remain in memory after all references are processed? (Enter as a comma-separated set, e.g. 1, 3, 4)",
          answerType: "set",
          expected,
          hint: "List the distinct pages present in the frames at the end of execution.",
        };
        prodVal = expected;
        refValA = refOutputA.finalPages.map(String).sort();
        refValB = refOutputB.finalPages.map(String).sort();
        break;
      }
    }

    questions.push(q);
    prodAnswers[q.id] = prodVal;
    refAnswersA[q.id] = refValA;
    refAnswersB[q.id] = refValB;

    if (JSON.stringify(refValA) !== JSON.stringify(refValB)) {
      isTieFree = false;
    }
  }

  // Solution steps
  const frameTableRows = prodOutput.rawResult.steps.map((s) => {
    const fStr = s.frames.map((p) => (p === null ? "-" : String(p))).join(" | ");
    const evictStr = s.evictedPage !== null ? ` (Evicted page ${s.evictedPage})` : "";
    return [s.stepNumber, s.page, s.hit ? "HIT" : "FAULT", fStr + evictStr];
  });

  const solutionSteps: SolutionStep[] = [
    {
      title: "Step-by-Step Frame Evolution",
      text: `Execution of ${algoLabels[algorithm]} across ${frameCount} physical frames. Total references = ${numRefs}.`,
      table: {
        caption: "Frame History",
        headers: ["Step", "Page", "Status", "Frames Content"],
        rows: frameTableRows,
      },
      visual: {
        type: "paging",
        payload: {
          result: prodOutput.rawResult,
          references,
          frameCount,
        },
      },
    },
    {
      title: "Summary Metrics",
      text: `Total Faults = ${prodOutput.faults} (including ${frameCount} initial loads).\n` +
        `Total Hits = ${prodOutput.hits}.\n` +
        `Hit Ratio = (${prodOutput.hits} / ${numRefs}) * 100 = ${prodOutput.hitRatioPercent}%.\n` +
        `Pages in memory at the end: { ${prodOutput.finalPages.join(", ")} }.`,
    },
  ];

  const shortAlgoNames: Record<PagingAlgorithm, string> = {
    fifo: "FIFO",
    lru: "LRU",
    optimal: "Optimal",
  };
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

  const problem: Problem = {
    id: `page-replacement-${level}-${seed}`,
    topic: "page-replacement",
    level,
    seed,
    title: `${shortAlgoNames[algorithm]} · ${levelLabel}`,
    subtopic: algorithm,
    statement: {
      intro: `A process generates the following sequence of ${numRefs} virtual page references into a memory space with ${frameCount} page frames.`,
      dataTables: [dataTable],
      rules,
    },
    questions,
    solution: solutionSteps,
    rawParams: {
      algorithm,
      frameCount,
      references,
    },
  };

  return {
    problem,
    productionAnswers: prodAnswers,
    referenceAnswers: refAnswersA,
    productionTrace: {
      faults: prodOutput.faults,
      hits: prodOutput.hits,
    },
    referenceTrace: {
      faults: refOutputA.faults,
      hits: refOutputA.hits,
    },
    isTieFree,
  };
}
