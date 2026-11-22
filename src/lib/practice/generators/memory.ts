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
import { runMemoryProductionSolver, MemoryAdapterInput } from "../adapters/memory";
import { runMemoryReferenceSolver, PartitionMode, FitStrategy } from "../reference/memory";

const ALL_MODES: PartitionMode[] = ["fixed", "dynamic"];
const ALL_STRATEGIES: FitStrategy[] = ["first-fit", "best-fit", "worst-fit", "next-fit"];

export function generateMemoryCandidate(
  level: ProblemLevel,
  seed: string,
  options?: PracticeOptions,
): VerificationCandidate {
  const rng = createRng(seed);

  let mode: PartitionMode;
  if (options?.mode && options.mode !== "random" && ALL_MODES.includes(options.mode as PartitionMode)) {
    mode = options.mode as PartitionMode;
  } else if (options?.sub && options.sub !== "random" && ALL_MODES.includes(options.sub as PartitionMode)) {
    mode = options.sub as PartitionMode;
  } else {
    mode = rng.pick(ALL_MODES);
  }

  let strategy: FitStrategy;
  if (options?.strategy && options.strategy !== "random" && ALL_STRATEGIES.includes(options.strategy as FitStrategy)) {
    strategy = options.strategy as FitStrategy;
  } else if (options?.sub && options.sub !== "random" && ALL_STRATEGIES.includes(options.sub as FitStrategy)) {
    strategy = options.sub as FitStrategy;
  } else {
    strategy = rng.pick(ALL_STRATEGIES);
  }

  let numBlocks = 4;
  let numProcesses = 3;

  if (level === "easy") {
    numBlocks = 4;
    numProcesses = 3;
  } else if (level === "medium") {
    numBlocks = 5;
    numProcesses = 4;
  } else {
    // Hard
    numBlocks = rng.pick([6, 7]);
    numProcesses = rng.pick([5, 6]);
  }

  // Generate block sizes (distinct on easy/medium to prevent ties)
  let blocks: { id: string; size: number }[];
  if (level === "easy" || level === "medium") {
    const distinctSizes = rng.sampleDistinct(8, 55, numBlocks).map((s) => s * 10);
    blocks = distinctSizes.map((size, i) => ({
      id: `B${i + 1}`,
      size,
    }));
  } else {
    blocks = Array.from({ length: numBlocks }, (_, i) => ({
      id: `B${i + 1}`,
      size: rng.int(5, 60) * 10,
    }));
  }

  // Generate process sizes (multiples of 10)
  const processes = Array.from({ length: numProcesses }, (_, i) => ({
    id: `P${i + 1}`,
    size: rng.int(level === "easy" ? 4 : 3, level === "easy" ? 35 : 45) * 10,
  }));

  // In Hard mode: require that at least one process fails to fit if possible, or attempt loop
  const inputAdapter: MemoryAdapterInput = {
    blocks,
    processes,
    mode,
    strategy,
  };

  const prodOutput = runMemoryProductionSolver(inputAdapter);
  const refOutputA = runMemoryReferenceSolver(blocks, processes, mode, strategy, "variantA");
  const refOutputB = runMemoryReferenceSolver(blocks, processes, mode, strategy, "variantB");

  if (level === "hard" && prodOutput.unallocatedProcessCount === 0) {
    // We prefer hard mode to have at least one unallocated process; if none, reject attempt
    // (gate will continue)
  }

  const strategyNames: Record<FitStrategy, string> = {
    "first-fit": "First Fit",
    "best-fit": "Best Fit",
    "worst-fit": "Worst Fit",
    "next-fit": "Next Fit",
  };

  const modeNames: Record<PartitionMode, string> = {
    fixed: "Fixed Partitioning",
    dynamic: "Dynamic Partitioning",
  };

  const dataTables: StatementDataTable[] = [
    {
      caption: "Initial Memory Blocks",
      headers: ["Block", "Size (KB)"],
      rows: blocks.map((b) => [b.id, `${b.size} KB`]),
    },
    {
      caption: "Incoming Processes",
      headers: ["Process", "Size (KB)"],
      rows: processes.map((p) => [p.id, `${p.size} KB`]),
    },
  ];

  const rules: string[] = [
    `Partitioning Mode: ${modeNames[mode]}.`,
    `Allocation Strategy: ${strategyNames[strategy]}.`,
    "Processes are placed in the order listed.",
    "A process that does not fit anywhere waits and does not block later processes.",
    "Ties go to the lowest address.",
    "Free memory is the total size of blocks or holes that hold no process; unused space inside an occupied fixed block is internal fragmentation, not free memory; utilization = allocated memory / total memory x 100.",
  ];
  if (strategy === "next-fit") {
    rules.push("Scanning starts at the block of the previous allocation (including it).");
  }
  if (mode === "dynamic") {
    rules.push("The leftover of an allocated block remains in place as a free hole.");
  }

  // Question pool
  type MemQ =
    | "which-block"
    | "internal-frag"
    | "total-free"
    | "largest-hole"
    | "unallocated-count"
    | "utilization";

  const pool: MemQ[] = ["which-block", "total-free", "unallocated-count", "utilization"];
  if (mode === "fixed") pool.push("internal-frag");
  if (mode === "dynamic") pool.push("largest-hole");

  const shuffledPool = rng.shuffle(pool);
  const qCount = level === "easy" ? 1 : 2;
  const pickedTypes = shuffledPool.slice(0, qCount);

  const targetProc = rng.pick(processes);

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
      case "which-block": {
        const expected = prodOutput.allocations[targetProc.id] ?? "none";
        const choices = [...blocks.map((b) => ({ id: b.id, label: b.id })), { id: "none", label: "none (waits)" }];
        q = {
          id: `block_${targetProc.id}`,
          text: `Which block is allocated to process ${targetProc.id}? (Select block ID or "none" if it waits)`,
          answerType: "choice",
          expected,
          choices,
          hint: `Follow ${strategyNames[strategy]} rules starting in order.`,
        };
        prodVal = expected;
        refValA = refOutputA.allocations[targetProc.id] ?? "none";
        refValB = refOutputB.allocations[targetProc.id] ?? "none";
        break;
      }

      case "internal-frag": {
        const expected = prodOutput.totalInternalFragmentation;
        q = {
          id: "internal_frag",
          text: "What is the total internal fragmentation across all allocated blocks (in KB)?",
          answerType: "number",
          unit: "KB",
          expected,
          hint: "Internal fragmentation is block size minus process size for each allocated block.",
          commonMistakes: [
            {
              value: prodOutput.totalFreeMemory,
              message: "That is the total free memory, which includes unallocated blocks.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.totalInternalFragmentation;
        refValB = refOutputB.totalInternalFragmentation;
        break;
      }

      case "total-free": {
        const expected = prodOutput.totalFreeMemory;
        q = {
          id: "total_free",
          text: "What is the total free memory remaining after all allocations (in KB)?",
          answerType: "number",
          unit: "KB",
          expected,
          hint: "Sum all unallocated holes and unused partition space.",
          commonMistakes: [
            {
              value: prodOutput.largestHoleSize,
              message: "That is the size of the single largest hole, not the total free memory.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.totalFreeMemory;
        refValB = refOutputB.totalFreeMemory;
        break;
      }

      case "largest-hole": {
        const expected = prodOutput.largestHoleSize;
        q = {
          id: "largest_hole",
          text: "What is the size of the largest available free hole after all allocations (in KB)?",
          answerType: "number",
          unit: "KB",
          expected,
          hint: "Inspect all remaining free holes and find the maximum.",
          commonMistakes: [
            {
              value: prodOutput.totalFreeMemory,
              message: "That is the total free memory, not the largest individual hole.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.largestHoleSize;
        refValB = refOutputB.largestHoleSize;
        break;
      }

      case "unallocated-count": {
        const expected = prodOutput.unallocatedProcessCount;
        q = {
          id: "unallocated_count",
          text: "How many processes could not be allocated and must wait?",
          answerType: "number",
          expected,
          hint: "Count how many processes received 'none'.",
        };
        prodVal = expected;
        refValA = refOutputA.unallocatedProcessCount;
        refValB = refOutputB.unallocatedProcessCount;
        break;
      }

      case "utilization": {
        const expected = prodOutput.memoryUtilizationPercent;
        q = {
          id: "utilization",
          text: "What is the memory utilization percentage after all allocations? (Round to 2 decimal places)",
          answerType: "number",
          unit: "%",
          expected,
          hint: "Utilization (%) = (Total Allocated Process Memory / Total Initial Memory) * 100.",
          commonMistakes: [
            {
              value: Number((100 - expected).toFixed(2)),
              message: "That is the percentage of free memory, not the utilization.",
            },
          ],
        };
        prodVal = expected;
        refValA = refOutputA.memoryUtilizationPercent;
        refValB = refOutputB.memoryUtilizationPercent;
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

  // Build solution steps
  const stepLogs = prodOutput.rawResult.steps.map((s, idx) => {
    const p = processes[idx]!;
    const allocTo = s.record.allocated ? s.record.allocatedTo : "None (waits)";
    const note = mode === "fixed"
      ? s.record.allocated
        ? `Internal fragmentation = ${s.record.internalFrag} KB`
        : "Does not fit in any free block"
      : s.record.allocated
        ? `Leftover hole = ${s.record.leftoverHole} KB`
        : "Does not fit in any free hole";
    return `${p.id} (${p.size} KB) -> ${allocTo} [${note}]`;
  });

  const solutionSteps: SolutionStep[] = [
    {
      title: "Allocation Step Log",
      text: stepLogs.join("\n"),
    },
    {
      title: "Memory State Map",
      text: `Final state under ${strategyNames[strategy]} (${modeNames[mode]}): Total Free = ${prodOutput.totalFreeMemory} KB, Utilization = ${prodOutput.memoryUtilizationPercent}%.`,
      visual: {
        type: "memory",
        payload: {
          segments: prodOutput.rawResult.finalSegments,
          initialSegments: prodOutput.rawResult.steps[0]?.segmentsBefore ?? prodOutput.rawResult.finalSegments,
          summary: prodOutput.rawResult.summary,
        },
      },
    },
  ];

  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

  const problem: Problem = {
    id: `memory-allocation-${level}-${seed}`,
    topic: "memory-allocation",
    level,
    seed,
    title: `${strategyNames[strategy]} (${modeNames[mode]}) · ${levelLabel}`,
    subtopic: `${mode}:${strategy}`,
    statement: {
      intro: `Given an initial memory configuration of ${numBlocks} blocks and ${numProcesses} incoming processes, simulate memory allocation using ${strategyNames[strategy]} under ${modeNames[mode]}.`,
      dataTables,
      rules,
    },
    questions,
    solution: solutionSteps,
    rawParams: {
      mode,
      strategy,
      blocks,
      processes,
    },
  };

  return {
    problem,
    productionAnswers: prodAnswers,
    referenceAnswers: refAnswersA,
    productionTrace: {
      totalFree: prodOutput.totalFreeMemory,
      totalFrag: prodOutput.totalInternalFragmentation,
      unallocated: prodOutput.unallocatedProcessCount,
    },
    referenceTrace: {
      totalFree: refOutputA.totalFreeMemory,
      totalFrag: refOutputA.totalInternalFragmentation,
      unallocated: refOutputA.unallocatedProcessCount,
    },
    isTieFree,
  };
}
