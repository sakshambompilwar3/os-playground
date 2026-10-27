import { describe, expect, it } from "vitest";
import { SAMPLE, requestResources, runSafety } from "@/lib/bankers";

describe("Banker's algorithm", () => {
  it("finds the textbook safe sequence P1 P3 P4 P0 P2", () => {
    const r = runSafety(SAMPLE.available, SAMPLE.max, SAMPLE.alloc);
    expect(r.safe).toBe(true);
    expect(r.sequence).toEqual([1, 3, 4, 0, 2]);
  });
  it("grants P1 request (1,0,2)", () => {
    expect(requestResources(1, [1, 0, 2], SAMPLE.available, SAMPLE.max, SAMPLE.alloc).status).toBe("granted");
  });
  it("makes P4 wait for (3,3,0) after P1 is granted", () => {
    const g = requestResources(1, [1, 0, 2], SAMPLE.available, SAMPLE.max, SAMPLE.alloc);
    if (g.status !== "granted") throw new Error();
    expect(requestResources(4, [3, 3, 0], g.available, SAMPLE.max, g.alloc).status).toBe("wait");
  });
  it("denies P0 (0,2,0) after P1 granted as unsafe", () => {
    const g = requestResources(1, [1, 0, 2], SAMPLE.available, SAMPLE.max, SAMPLE.alloc);
    if (g.status !== "granted") throw new Error();
    expect(requestResources(0, [0, 2, 0], g.available, SAMPLE.max, g.alloc).status).toBe("unsafe");
  });
  it("rejects a request beyond declared need", () => {
    expect(requestResources(3, [1, 1, 1], SAMPLE.available, SAMPLE.max, SAMPLE.alloc).status).toBe("exceeds-need");
  });
  it("records failed comparisons as well as each work calculation", () => {
    const result = runSafety(SAMPLE.available, SAMPLE.max, SAMPLE.alloc);
    expect(result.checks[0]).toEqual({ process: 0, need: [7, 4, 3], workBefore: [3, 3, 2], workAfter: [3, 3, 2], canFinish: false });
    expect(result.checks[1]).toEqual({ process: 1, need: [1, 2, 2], workBefore: [3, 3, 2], workAfter: [5, 3, 2], canFinish: true });
    expect(result.checks.filter((check) => check.canFinish).map((check) => check.process)).toEqual([1, 3, 4, 0, 2]);
    expect(result.steps.at(-1)?.workAfter).toEqual([10, 5, 7]);
  });
});
