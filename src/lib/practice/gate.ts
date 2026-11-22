import { Problem, ProblemLevel, ProblemTopic, PracticeGenerationError, PracticeOptions } from "./types";
import { generateCpuCandidate } from "./generators/cpu";
import { generateMemoryCandidate } from "./generators/memory";
import { generateDiskCandidate } from "./generators/disk";
import { generatePagingCandidate } from "./generators/paging";
import { generateBankersCandidate } from "./generators/bankers";

export interface VerificationCandidate {
  problem: Problem;
  productionAnswers: Record<string, number | string | (string | number)[]>;
  referenceAnswers: Record<string, number | string | (string | number)[]>;
  productionTrace?: Record<string, number | string | boolean>;
  referenceTrace?: Record<string, number | string | boolean>;
  isTieFree?: boolean; // For easy and medium
}

export type CandidateGenerator = (
  level: ProblemLevel,
  seed: string,
  options?: PracticeOptions,
) => VerificationCandidate | null;

const topicRegistry = new Map<ProblemTopic, CandidateGenerator>();

export function registerTopicGenerator(topic: ProblemTopic, generator: CandidateGenerator): void {
  topicRegistry.set(topic, generator);
}

// Default topic generator registrations
registerTopicGenerator("cpu-scheduling", generateCpuCandidate);
registerTopicGenerator("memory-allocation", generateMemoryCandidate);
registerTopicGenerator("disk-scheduling", generateDiskCandidate);
registerTopicGenerator("page-replacement", generatePagingCandidate as any);
registerTopicGenerator("bankers", generateBankersCandidate as any);

export function compareAnswers(
  a: number | string | (string | number)[],
  b: number | string | (string | number)[],
): boolean {
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    if (a === b) return true;
    const diff = Math.abs(a - b);
    const denom = Math.max(Math.abs(a), Math.abs(b), 1);
    return diff / denom <= 1e-9 || diff <= 1e-9;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => String(val).trim().toLowerCase() === String(b[idx]).trim().toLowerCase());
  }

  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export function assertNoNaNOrUndefined(obj: any, path = "problem"): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === "number" && Number.isNaN(obj)) {
    throw new Error(`Invalid NaN value found at ${path}`);
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      if (item === undefined) {
        throw new Error(`Invalid undefined array element at ${path}[${idx}]`);
      }
      assertNoNaNOrUndefined(item, `${path}[${idx}]`);
    });
  } else if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      if (obj[key] === undefined) {
        delete obj[key];
      } else {
        assertNoNaNOrUndefined(obj[key], `${path}.${key}`);
      }
    }
  }
}

export function generateVerified(
  topic: ProblemTopic,
  level: ProblemLevel,
  seed: string,
  optionsOrGenerator?: PracticeOptions | CandidateGenerator,
  customGenerator?: CandidateGenerator,
): Problem {
  let options: PracticeOptions | undefined;
  let generator: CandidateGenerator | undefined;
  if (typeof optionsOrGenerator === "function") {
    generator = optionsOrGenerator;
  } else {
    options = optionsOrGenerator;
    generator = customGenerator;
  }

  generator = generator ?? topicRegistry.get(topic);
  if (!generator) {
    throw new PracticeGenerationError(`No generator registered for topic '${topic}'.`);
  }

  const maxAttempts = 50;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? seed : `${seed}~${attempt}`;
    let candidateData: VerificationCandidate | null = null;
    try {
      candidateData = generator(level, attemptSeed, options);
    } catch (err) {
      console.warn(`[Practice Generation Error] Attempt ${attempt} (${attemptSeed}):`, err);
      continue;
    }

    if (!candidateData) {
      continue;
    }

    const { problem, productionAnswers, referenceAnswers, productionTrace, referenceTrace, isTieFree } = candidateData;

    // Easy and Medium must be tie-free
    if ((level === "easy" || level === "medium") && isTieFree === false) {
      continue;
    }

    // Compare all expected answers between Production and Reference solvers
    let answersMatch = true;
    for (const q of problem.questions) {
      const prodAns = productionAnswers[q.id];
      const refAns = referenceAnswers[q.id];
      if (prodAns === undefined || refAns === undefined) {
        answersMatch = false;
        console.warn(`[Practice Verification Mismatch] Missing answer for question ${q.id} in attempt ${attemptSeed}`);
        break;
      }
      if (!compareAnswers(prodAns, refAns)) {
        answersMatch = false;
        console.warn(
          `[Practice Verification Mismatch] Question ${q.id}: prod=${prodAns}, ref=${refAns} in attempt ${attemptSeed}`,
        );
        break;
      }
    }

    if (!answersMatch) {
      continue;
    }

    // Compare key trace values if provided
    if (productionTrace && referenceTrace) {
      let tracesMatch = true;
      for (const key of Object.keys(productionTrace)) {
        const pVal = productionTrace[key];
        const rVal = referenceTrace[key];
        if (pVal !== undefined && rVal !== undefined && !compareAnswers(pVal, rVal)) {
          tracesMatch = false;
          console.warn(`[Practice Trace Mismatch] Key ${key}: prod=${pVal}, ref=${rVal} in attempt ${attemptSeed}`);
          break;
        }
      }
      if (!tracesMatch) {
        continue;
      }
    }

    // Ensure no NaN or undefined
    try {
      assertNoNaNOrUndefined(problem);
    } catch (err) {
      console.warn(`[Practice Integrity Error] In attempt ${attemptSeed}:`, err);
      continue;
    }

    // Overwrite problem.seed with original seed so replay works
    const finalProblem: Problem = {
      ...problem,
      seed,
      id: `${topic}-${level}-${seed}`,
    };

    return finalProblem;
  }

  throw new PracticeGenerationError(
    `Failed to generate a verified problem for ${topic} (${level}) with seed ${seed} after ${maxAttempts} attempts.`,
  );
}
