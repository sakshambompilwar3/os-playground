import { describe, it, expect } from "vitest";
import { createRng, generateSeed, SEED_ALPHABET, normalizeSeed } from "../lib/practice/rng";
import { checkAnswer } from "../lib/practice/checker";
import { Question, Problem, PracticeGenerationError } from "../lib/practice/types";
import { generateVerified, assertNoNaNOrUndefined, VerificationCandidate } from "../lib/practice/gate";
import * as fs from "fs";
import * as path from "path";

describe("Practice Engine - Phase 1", () => {
  describe("RNG (Mulberry32 + xmur3)", () => {
    it("is strictly reproducible across instances for the same seed", () => {
      const rng1 = createRng("ABC234");
      const rng2 = createRng("ABC234");
      const seq1 = Array.from({ length: 20 }, () => rng1.next());
      const seq2 = Array.from({ length: 20 }, () => rng2.next());
      expect(seq1).toEqual(seq2);
    });

    it("generates different sequences for different seeds", () => {
      const rngA = createRng("ABC234");
      const rngB = createRng("XYZ987");
      expect(rngA.next()).not.toEqual(rngB.next());
    });

    it("int(min, max) respects bounds inclusive", () => {
      const rng = createRng("BOUNDS");
      for (let i = 0; i < 200; i++) {
        const val = rng.int(3, 7);
        expect(val).toBeGreaterThanOrEqual(3);
        expect(val).toBeLessThanOrEqual(7);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it("pick, shuffle, and sampleDistinct work correctly and preserve immutability", () => {
      const rng = createRng("HELPERS");
      const list = [10, 20, 30, 40, 50];
      const picked = rng.pick(list);
      expect(list).toContain(picked);

      const shuffled = rng.shuffle(list);
      expect(shuffled.sort()).toEqual([...list].sort());
      expect(list).toEqual([10, 20, 30, 40, 50]); // original not mutated

      const sampled = rng.sampleDistinct(1, 10, 5);
      expect(sampled.length).toBe(5);
      expect(new Set(sampled).size).toBe(5);
      sampled.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(10);
      });
    });

    it("generateSeed produces 6-character strings from SEED_ALPHABET without look-alikes", () => {
      const seed = generateSeed();
      expect(seed).toHaveLength(6);
      for (const char of seed) {
        expect(SEED_ALPHABET).toContain(char);
      }
      expect(seed).not.toMatch(/[0O1IL]/);
    });

    it("normalizeSeed cleans and normalizes user entered seeds", () => {
      expect(normalizeSeed("abc-234")).toBe("ABC234");
      expect(normalizeSeed("0o1ilx")).not.toMatch(/[0O1IL]/);
    });
  });

  describe("Checker (checkAnswer)", () => {
    it("handles decimal numbers, whitespace, and fractions", () => {
      const qNum: Question = {
        id: "q1",
        text: "Average waiting time",
        answerType: "number",
        expected: 5.75,
      };

      expect(checkAnswer(qNum, "5.75").correct).toBe(true);
      expect(checkAnswer(qNum, "5.750").correct).toBe(true);
      expect(checkAnswer(qNum, " 5.75 ").correct).toBe(true);
      expect(checkAnswer(qNum, "23/4").correct).toBe(true);

      // 5,75 is invalid (comma is not decimal point)
      const commaRes = checkAnswer(qNum, "5,75");
      expect(commaRes.status).toBe("invalid");
      expect(commaRes.correct).toBe(false);

      // empty is invalid
      const emptyRes = checkAnswer(qNum, "");
      expect(emptyRes.status).toBe("invalid");
      expect(emptyRes.correct).toBe(false);

      // 5.7 is wrong for 5.75
      const wrongRes = checkAnswer(qNum, "5.7");
      expect(wrongRes.status).toBe("incorrect");
      expect(wrongRes.correct).toBe(false);
    });

    it("handles non-integer floats with 0.01 tolerance (17/3)", () => {
      const qFloat: Question = {
        id: "q_float",
        text: "Average turnaround time",
        answerType: "number",
        expected: 17 / 3, // ~5.666666666666667
      };

      expect(checkAnswer(qFloat, "5.66").correct).toBe(true);
      expect(checkAnswer(qFloat, "5.67").correct).toBe(true);
      expect(checkAnswer(qFloat, "17/3").correct).toBe(true);
      expect(checkAnswer(qFloat, "5.65").correct).toBe(false);
      expect(checkAnswer(qFloat, "5.68").correct).toBe(false);
    });

    it("handles integer questions with exact integer match requirement", () => {
      const qInt: Question = {
        id: "q_int",
        text: "Page faults",
        answerType: "number",
        expected: 9,
      };

      expect(checkAnswer(qInt, "9").correct).toBe(true);
      expect(checkAnswer(qInt, "9.0").correct).toBe(true);
      expect(checkAnswer(qInt, "18/2").correct).toBe(true);
      expect(checkAnswer(qInt, "9.005").correct).toBe(false); // even within 0.01, integer must be exact
      expect(checkAnswer(qInt, "8.995").correct).toBe(false);
    });

    it("checks sequence with various delimiters (->, >, commas, spaces)", () => {
      const qSeq: Question = {
        id: "q_seq",
        text: "Execution sequence",
        answerType: "sequence",
        expected: ["P1", "P3"],
      };

      expect(checkAnswer(qSeq, "P1 -> P3").correct).toBe(true);
      expect(checkAnswer(qSeq, "p1,p3").correct).toBe(true);
      expect(checkAnswer(qSeq, "P1 > P3").correct).toBe(true);
      expect(checkAnswer(qSeq, "P1 P3").correct).toBe(true);
      expect(checkAnswer(qSeq, "P3, P1").correct).toBe(false);
      expect(checkAnswer(qSeq, "P1").correct).toBe(false);
    });

    it("checks set with unordered equality and forbids duplicates", () => {
      const qSet: Question = {
        id: "q_set",
        text: "Pages in memory",
        answerType: "set",
        expected: ["P1", "P3"],
      };

      expect(checkAnswer(qSet, "P3, P1").correct).toBe(true);
      expect(checkAnswer(qSet, "p1 p3").correct).toBe(true);
      expect(checkAnswer(qSet, "P1, P1, P3").correct).toBe(false); // duplicate
      expect(checkAnswer(qSet, "P1, P2").correct).toBe(false);
    });

    it("reports specific common mistakes messages", () => {
      const qMistake: Question = {
        id: "q_wt",
        text: "Waiting time of P1",
        answerType: "number",
        expected: 4,
        commonMistakes: [
          {
            value: 9,
            message: "That is the turnaround time. Waiting time = turnaround time - burst time.",
          },
        ],
      };

      const resMistake = checkAnswer(qMistake, "9");
      expect(resMistake.correct).toBe(false);
      expect(resMistake.message).toContain("That is the turnaround time");
    });
  });

  describe("Gate (generateVerified)", () => {
    const dummyProblem: Problem = {
      id: "cpu-scheduling-easy-SEED01",
      topic: "cpu-scheduling",
      level: "easy",
      seed: "SEED01",
      title: "Test Problem",
      statement: {
        intro: "Consider the following processes.",
        rules: ["FCFS scheduling"],
      },
      questions: [
        {
          id: "q1",
          text: "Average waiting time",
          answerType: "number",
          expected: 5,
        },
      ],
      solution: [
        {
          title: "Step 1",
          text: "Calculate completion times.",
        },
      ],
    };

    it("successfully verifies and returns problem when production and reference solvers agree", () => {
      const agreeingGenerator = (): VerificationCandidate => ({
        problem: dummyProblem,
        productionAnswers: { q1: 5 },
        referenceAnswers: { q1: 5 },
        isTieFree: true,
      });

      const result = generateVerified("cpu-scheduling", "easy", "MYSEED", agreeingGenerator);
      expect(result.seed).toBe("MYSEED");
      expect(result.id).toBe("cpu-scheduling-easy-MYSEED");
      expect(result.questions[0].expected).toBe(5);
    });

    it("rejects candidate when reference solver disagrees, and throws if all 50 attempts fail", () => {
      let attemptsCount = 0;
      const disagreeingGenerator = (_lvl: any, seed: string): VerificationCandidate => {
        attemptsCount++;
        return {
          problem: { ...dummyProblem, seed },
          productionAnswers: { q1: 5 },
          referenceAnswers: { q1: 6 }, // Disagreement!
          isTieFree: true,
        };
      };

      expect(() => {
        generateVerified("cpu-scheduling", "easy", "BADSEED", disagreeingGenerator);
      }).toThrow(PracticeGenerationError);
      expect(attemptsCount).toBe(50);
    });

    it("rejects tie-sensitive candidate for easy/medium level", () => {
      let attempt = 0;
      const generator = (_lvl: any, seed: string): VerificationCandidate => {
        attempt++;
        if (attempt === 1) {
          // Has ties!
          return {
            problem: { ...dummyProblem, seed },
            productionAnswers: { q1: 5 },
            referenceAnswers: { q1: 5 },
            isTieFree: false,
          };
        }
        // Second attempt is tie-free
        return {
          problem: { ...dummyProblem, seed },
          productionAnswers: { q1: 5 },
          referenceAnswers: { q1: 5 },
          isTieFree: true,
        };
      };

      const result = generateVerified("cpu-scheduling", "easy", "TIESEED", generator);
      expect(result.seed).toBe("TIESEED");
      expect(attempt).toBe(2);
    });
  });

  describe("Integrity & Reference Solver Isolation Scan", () => {
    it("assertNoNaNOrUndefined detects invalid fields", () => {
      expect(() => assertNoNaNOrUndefined({ a: 1, b: NaN })).toThrow(/NaN/);
      expect(() => assertNoNaNOrUndefined({ a: 1, b: [2, undefined] })).toThrow(/undefined/);
      expect(() => assertNoNaNOrUndefined({ a: 1, b: [2, 3] })).not.toThrow();
    });

    it("verifies that reference solvers NEVER import from production solver files", () => {
      const refDir = path.resolve(__dirname, "../lib/practice/reference");
      if (!fs.existsSync(refDir)) return;
      const files = fs.readdirSync(refDir);
      for (const file of files) {
        if (!file.endsWith(".ts")) continue;
        const content = fs.readFileSync(path.join(refDir, file), "utf-8");
        // Check for forbidden imports
        const forbiddenPatterns = [
          /from\s+["'].*\/lib\/scheduling["']/,
          /from\s+["'].*\/lib\/memory["']/,
          /from\s+["'].*\/lib\/disk["']/,
          /from\s+["'].*\/lib\/paging["']/,
          /from\s+["'].*\/lib\/bankers["']/,
        ];
        for (const pattern of forbiddenPatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });

    it("samples 3 deterministic problems per topic for reporting", () => {
      const topics: ProblemTopic[] = [
        "cpu-scheduling",
        "memory-allocation",
        "disk-scheduling",
        "page-replacement",
        "bankers",
      ];
      const levels: ProblemLevel[] = ["easy", "medium", "hard"];
      const samples: any[] = [];

      for (const topic of topics) {
        for (let i = 0; i < 3; i++) {
          const level = levels[i]!;
          const seed = `SMPL${topic.slice(0, 2).toUpperCase()}${i + 1}`;
          const problem = generateVerified(topic, level, seed);
          samples.push({
            topic,
            level,
            seed: problem.seed,
            title: problem.title,
            statement: problem.statement.intro,
            questions: problem.questions.map((q) => ({
              id: q.id,
              text: q.text,
              expected: q.expected,
            })),
          });
        }
      }
      expect(samples.length).toBe(15);
    });
  });
});
