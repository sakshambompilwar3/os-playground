import { describe, expect, it } from "vitest";
import { resourceNames, resizeMatrix, validCount } from "@/lib/simulator";
import { DEADLOCK_EXAMPLE, bankerDecision } from "@/lib/deadlock-example";
import { runSafety } from "@/lib/bankers";

describe("user-selected dimensions", () => {
  it("accepts counts beyond the old eight-process and five-resource limits", () => {
    expect(validCount(12)).toBe(true);
    expect(validCount(7)).toBe(true);
    const matrix = resizeMatrix([[3]], 12, 7);
    expect(matrix).toHaveLength(12);
    expect(matrix[11]).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(matrix[0]?.[0]).toBe(3);
    expect(resourceNames(7)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });
  it("accepts a single process and resource but rejects invalid counts", () => {
    expect(validCount(1)).toBe(true);
    expect(validCount(0)).toBe(false);
    expect(validCount(2.5)).toBe(false);
    expect(validCount(Infinity)).toBe(false);
  });
});

describe("Deadlock Lab Banker walkthrough", () => {
  it("defers P2 taking R1 because none can finish after the tentative grant", () => {
    const decision = bankerDecision();
    expect(decision.status).toBe("unsafe");
    if (decision.status !== "unsafe") throw new Error("Expected unsafe request");
    expect(decision.result.sequence).toEqual([]);
    expect(decision.result.checks.map((check) => check.canFinish)).toEqual([false, false, false]);
  });
  it("restoring the state permits P1 then P0 then P2 without preemption", () => {
    const example = DEADLOCK_EXAMPLE;
    const result = runSafety(example.available, example.max, example.alloc);
    expect(result.safe).toBe(true);
    expect(result.sequence).toEqual([1, 0, 2]);
    expect(result.steps.at(-1)?.workAfter).toEqual([1, 1, 1]);
  });
});