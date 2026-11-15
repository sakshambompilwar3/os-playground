import { describe, expect, it } from "vitest";
import {
  computeLongestWait,
  FIXED_ALGORITHM_ORDER,
  pickBest,
  simulateDiskScheduling,
  type DiskAlgorithm,
  type DiskDirection,
  type DiskRequestInput,
} from "@/lib/disk";

const TEXTBOOK_CYLINDERS = 200;
const TEXTBOOK_HEAD = 53;
const TEXTBOOK_REQUESTS: DiskRequestInput[] = [
  { id: "R1", name: "R1", cylinder: 98 },
  { id: "R2", name: "R2", cylinder: 183 },
  { id: "R3", name: "R3", cylinder: 37 },
  { id: "R4", name: "R4", cylinder: 122 },
  { id: "R5", name: "R5", cylinder: 14 },
  { id: "R6", name: "R6", cylinder: 124 },
  { id: "R7", name: "R7", cylinder: 65 },
  { id: "R8", name: "R8", cylinder: 67 },
];

function getServedCylinders(
  segments: ReturnType<typeof simulateDiskScheduling>["segments"],
): number[] {
  return segments.filter((s) => s.kind === "serve").map((s) => s.to);
}

describe("Disk Scheduling - Textbook Benchmark (N=200, head=53, [98, 183, 37, 122, 14, 124, 65, 67])", () => {
  it("FCFS: total 640, average 80", () => {
    const res = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "fcfs",
    );
    expect(res.totalHeadMovement).toBe(640);
    expect(res.averageSeekPerRequest).toBe(80);
    expect(getServedCylinders(res.segments)).toEqual([98, 183, 37, 122, 14, 124, 65, 67]);
  });

  it("SSTF: order 65, 67, 37, 14, 98, 122, 124, 183, total 236, average 29.5", () => {
    const res = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "sstf",
    );
    expect(res.totalHeadMovement).toBe(236);
    expect(res.averageSeekPerRequest).toBe(29.5);
    expect(getServedCylinders(res.segments)).toEqual([65, 67, 37, 14, 98, 122, 124, 183]);
  });

  it("SCAN toward higher: order 65, 67, 98, 122, 124, 183, (end 199), 37, 14, total 331", () => {
    const res = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "scan",
      "higher",
    );
    expect(res.totalHeadMovement).toBe(331);
    expect(getServedCylinders(res.segments)).toEqual([65, 67, 98, 122, 124, 183, 37, 14]);

    const endSeg = res.segments.find((s) => s.kind === "end");
    expect(endSeg).toBeDefined();
    expect(endSeg?.to).toBe(199);
  });

  it("SCAN toward lower: order 37, 14, (end 0), 65, 67, 98, 122, 124, 183, total 236", () => {
    const res = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "scan",
      "lower",
    );
    expect(res.totalHeadMovement).toBe(236);
    expect(getServedCylinders(res.segments)).toEqual([37, 14, 65, 67, 98, 122, 124, 183]);

    const endSeg = res.segments.find((s) => s.kind === "end");
    expect(endSeg).toBeDefined();
    expect(endSeg?.to).toBe(0);
  });

  it("LOOK toward higher: total 299 (order 65, 67, 98, 122, 124, 183, 37, 14)", () => {
    const res = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "look",
      "higher",
    );
    expect(res.totalHeadMovement).toBe(299);
    expect(getServedCylinders(res.segments)).toEqual([65, 67, 98, 122, 124, 183, 37, 14]);
    expect(res.segments.some((s) => s.kind === "end")).toBe(false);
  });

  it("LOOK toward lower: total 208 (order 37, 14, 65, 67, 98, 122, 124, 183)", () => {
    const res = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "look",
      "lower",
    );
    expect(res.totalHeadMovement).toBe(208);
    expect(getServedCylinders(res.segments)).toEqual([37, 14, 65, 67, 98, 122, 124, 183]);
    expect(res.segments.some((s) => s.kind === "end")).toBe(false);
  });

  it("C-SCAN toward higher: order 65, 67, 98, 122, 124, 183, (end 199), jump to 0, 14, 37; total with jump 382, without jump 183", () => {
    const resWithJump = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "c-scan",
      "higher",
      true,
    );
    expect(resWithJump.totalHeadMovementWithJump).toBe(382);
    expect(resWithJump.totalHeadMovementWithoutJump).toBe(183);
    expect(resWithJump.totalHeadMovement).toBe(382);
    expect(getServedCylinders(resWithJump.segments)).toEqual([65, 67, 98, 122, 124, 183, 14, 37]);

    const jumpSeg = resWithJump.segments.find((s) => s.kind === "jump");
    expect(jumpSeg).toBeDefined();
    expect(jumpSeg?.from).toBe(199);
    expect(jumpSeg?.to).toBe(0);

    const resNoJump = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "c-scan",
      "higher",
      false,
    );
    expect(resNoJump.totalHeadMovement).toBe(183);
  });

  it("C-SCAN toward lower: order 37, 14, (end 0), jump to 199, 183, 124, 122, 98, 67, 65; total with jump 386, without jump 187", () => {
    const resWithJump = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "c-scan",
      "lower",
      true,
    );
    expect(resWithJump.totalHeadMovementWithJump).toBe(386);
    expect(resWithJump.totalHeadMovementWithoutJump).toBe(187);
    expect(resWithJump.totalHeadMovement).toBe(386);
    expect(getServedCylinders(resWithJump.segments)).toEqual([
      37, 14, 183, 124, 122, 98, 67, 65,
    ]);

    const jumpSeg = resWithJump.segments.find((s) => s.kind === "jump");
    expect(jumpSeg).toBeDefined();
    expect(jumpSeg?.from).toBe(0);
    expect(jumpSeg?.to).toBe(199);
  });

  it("C-LOOK toward higher: order 65, 67, 98, 122, 124, 183, jump to 14, 37; total with jump 322, without jump 153", () => {
    const resWithJump = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "c-look",
      "higher",
      true,
    );
    expect(resWithJump.totalHeadMovementWithJump).toBe(322);
    expect(resWithJump.totalHeadMovementWithoutJump).toBe(153);
    expect(resWithJump.totalHeadMovement).toBe(322);
    expect(getServedCylinders(resWithJump.segments)).toEqual([65, 67, 98, 122, 124, 183, 14, 37]);

    const jumpSeg = resWithJump.segments.find((s) => s.kind === "jump");
    expect(jumpSeg).toBeDefined();
    expect(jumpSeg?.from).toBe(183);
    expect(jumpSeg?.to).toBe(14);
  });

  it("C-LOOK toward lower: order 37, 14, jump to 183, 124, 122, 98, 67, 65; total with jump 326, without jump 157", () => {
    const resWithJump = simulateDiskScheduling(
      TEXTBOOK_CYLINDERS,
      TEXTBOOK_HEAD,
      TEXTBOOK_REQUESTS,
      "c-look",
      "lower",
      true,
    );
    expect(resWithJump.totalHeadMovementWithJump).toBe(326);
    expect(resWithJump.totalHeadMovementWithoutJump).toBe(157);
    expect(resWithJump.totalHeadMovement).toBe(326);
    expect(getServedCylinders(resWithJump.segments)).toEqual([
      37, 14, 183, 124, 122, 98, 67, 65,
    ]);

    const jumpSeg = resWithJump.segments.find((s) => s.kind === "jump");
    expect(jumpSeg).toBeDefined();
    expect(jumpSeg?.from).toBe(14);
    expect(jumpSeg?.to).toBe(183);
  });
});

describe("Disk Scheduling - Edge Cases", () => {
  it("request on cylinder h is served immediately at distance 0 before anything else", () => {
    const reqs: DiskRequestInput[] = [
      { id: "R1", name: "App1", cylinder: 100 },
      { id: "R2", name: "AtHead", cylinder: 50 },
      { id: "R3", name: "App3", cylinder: 10 },
    ];
    for (const algo of ["fcfs", "sstf", "scan", "c-scan", "look", "c-look"] as DiskAlgorithm[]) {
      const res = simulateDiskScheduling(200, 50, reqs, algo, "higher");
      expect(res.serviceOrder[0]).toBe("R2");
      expect(res.segments[0]!.from).toBe(50);
      expect(res.segments[0]!.to).toBe(50);
      expect(res.segments[0]!.distance).toBe(0);
    }
  });

  it("duplicate cylinders are served together in table order at distance 0", () => {
    const reqs: DiskRequestInput[] = [
      { id: "R1", name: "A", cylinder: 80 },
      { id: "R2", name: "B", cylinder: 80 },
      { id: "R3", name: "C", cylinder: 80 },
    ];
    const res = simulateDiskScheduling(200, 50, reqs, "fcfs");
    expect(res.serviceOrder).toEqual(["R1", "R2", "R3"]);
    expect(res.totalHeadMovement).toBe(30);
  });

  it("all requests on one side of the head (higher only)", () => {
    const reqs: DiskRequestInput[] = [
      { id: "R1", name: "A", cylinder: 100 },
      { id: "R2", name: "B", cylinder: 150 },
    ];
    // LOOK higher: 50 -> 100 -> 150 (total 100)
    const lookRes = simulateDiskScheduling(200, 50, reqs, "look", "higher");
    expect(lookRes.totalHeadMovement).toBe(100);
    expect(lookRes.serviceOrder).toEqual(["R1", "R2"]);

    // SCAN higher: 50 -> 100 -> 150 -> 199 (total 149)
    const scanRes = simulateDiskScheduling(200, 50, reqs, "scan", "higher");
    expect(scanRes.totalHeadMovement).toBe(149);
  });

  it("all requests on one side of the head when direction points away (e.g. higher but only R_down exists)", () => {
    const reqs: DiskRequestInput[] = [
      { id: "R1", name: "A", cylinder: 20 },
      { id: "R2", name: "B", cylinder: 40 },
    ];
    // Head at 50, direction higher, but all requests are < 50
    const lookRes = simulateDiskScheduling(200, 50, reqs, "look", "higher");
    expect(lookRes.servedCount).toBe(2);
    expect(lookRes.totalHeadMovement).toBe(30); // 50 -> 40 -> 20
  });

  it("single request", () => {
    const reqs: DiskRequestInput[] = [{ id: "R1", name: "Single", cylinder: 120 }];
    const res = simulateDiskScheduling(200, 50, reqs, "fcfs");
    expect(res.totalHeadMovement).toBe(70);
    expect(res.serviceOrder).toEqual(["R1"]);
  });

  it("head starts at boundary 0 and boundary E", () => {
    const reqs: DiskRequestInput[] = [
      { id: "R1", name: "A", cylinder: 50 },
      { id: "R2", name: "B", cylinder: 150 },
    ];
    const at0 = simulateDiskScheduling(200, 0, reqs, "scan", "higher");
    expect(at0.totalHeadMovement).toBe(199);

    const atE = simulateDiskScheduling(200, 199, reqs, "scan", "lower");
    expect(atE.totalHeadMovement).toBe(199);
  });
});

describe("Disk Scheduling - 250+ Randomized Invariant Tests", () => {
  it("preserves all required invariants across 250 random inputs", () => {
    let s = 987654321;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };

    const algos: DiskAlgorithm[] = ["fcfs", "sstf", "scan", "c-scan", "look", "c-look"];
    const directions: DiskDirection[] = ["higher", "lower"];

    for (let trial = 0; trial < 250; trial += 1) {
      const N = 10 + Math.floor(rng() * 490); // 10 to 500
      const E = N - 1;
      const head = Math.floor(rng() * N); // 0 to E
      const numReq = 1 + Math.floor(rng() * 15); // 1 to 15
      const reqs: DiskRequestInput[] = Array.from({ length: numReq }, (_, i) => ({
        id: `R${i + 1}`,
        name: `App${i + 1}`,
        cylinder: Math.floor(rng() * N),
      }));

      const direction = directions[trial % 2]!;
      const countJump = trial % 4 !== 0;

      for (const algo of algos) {
        const res = simulateDiskScheduling(N, head, reqs, algo, direction, countJump);

        // 1. Every request is served exactly once
        expect(res.servedCount).toBe(numReq);
        expect(new Set(res.serviceOrder).size).toBe(numReq);

        // 2. Sum of segment distances equals the total
        const expectedTotal = res.segments
          .filter((seg) => seg.countedInTotal)
          .reduce((sum, seg) => sum + seg.distance, 0);
        expect(res.totalHeadMovement).toBe(expectedTotal);

        // 3. No segment leaves the range 0 to E
        for (const seg of res.segments) {
          expect(seg.from).toBeGreaterThanOrEqual(0);
          expect(seg.from).toBeLessThanOrEqual(E);
          expect(seg.to).toBeGreaterThanOrEqual(0);
          expect(seg.to).toBeLessThanOrEqual(E);
          expect(seg.distance).toBe(Math.abs(seg.to - seg.from));
        }

        // 4. FCFS total equals sum of differences in table order
        if (algo === "fcfs") {
          let curr = head;
          let fcfsSum = 0;
          // Note: any requests at head are served at distance 0 first, then remaining
          const atHead = reqs.filter((r) => r.cylinder === head);
          const others = reqs.filter((r) => r.cylinder !== head);
          for (const _ of atHead) {
            fcfsSum += Math.abs(curr - head);
            curr = head;
          }
          for (const r of others) {
            fcfsSum += Math.abs(curr - r.cylinder);
            curr = r.cylinder;
          }
          expect(res.totalHeadMovement).toBe(fcfsSum);
        }

        // 5. With jump counted, LOOK <= SCAN and C-LOOK <= C-SCAN for the same direction
        if (algo === "look") {
          const scanSame = simulateDiskScheduling(N, head, reqs, "scan", direction, true);
          const lookSame = simulateDiskScheduling(N, head, reqs, "look", direction, true);
          expect(lookSame.totalHeadMovement).toBeLessThanOrEqual(scanSame.totalHeadMovement);
        }

        if (algo === "c-look") {
          const cScanSame = simulateDiskScheduling(N, head, reqs, "c-scan", direction, true);
          const cLookSame = simulateDiskScheduling(N, head, reqs, "c-look", direction, true);
          expect(cLookSame.totalHeadMovement).toBeLessThanOrEqual(cScanSame.totalHeadMovement);
        }
      }
    }
  });

  describe("pickBest & Comparison Verdict Verification", () => {
    it("Benchmark higher (jump counted): verdict SSTF 236, ranking: SSTF 236, LOOK 299, C-LOOK 322, SCAN 331, C-SCAN 382, FCFS 640", () => {
      const results = FIXED_ALGORITHM_ORDER.map((algo) =>
        simulateDiskScheduling(
          TEXTBOOK_CYLINDERS,
          TEXTBOOK_HEAD,
          TEXTBOOK_REQUESTS,
          algo,
          "higher",
          true,
        ),
      );

      const verdict = pickBest(results);
      expect(verdict.isTie).toBe(false);
      expect(verdict.winner).toBe("sstf");
      expect(verdict.ranked[0]!.totalHeadMovement).toBe(236);

      const rankedOrder = verdict.ranked.map((r) => `${r.algorithm} ${r.totalHeadMovement}`);
      expect(rankedOrder).toEqual([
        "sstf 236",
        "look 299",
        "c-look 322",
        "scan 331",
        "c-scan 382",
        "fcfs 640",
      ]);
    });

    it("Benchmark lower (jump counted): verdict LOOK 208, ranking: LOOK 208, SSTF 236, SCAN 236, C-LOOK 326, C-SCAN 386, FCFS 640", () => {
      const results = FIXED_ALGORITHM_ORDER.map((algo) =>
        simulateDiskScheduling(
          TEXTBOOK_CYLINDERS,
          TEXTBOOK_HEAD,
          TEXTBOOK_REQUESTS,
          algo,
          "lower",
          true,
        ),
      );

      const verdict = pickBest(results);
      expect(verdict.isTie).toBe(false);
      expect(verdict.winner).toBe("look");
      expect(verdict.ranked[0]!.totalHeadMovement).toBe(208);

      const rankedOrder = verdict.ranked.map((r) => `${r.algorithm} ${r.totalHeadMovement}`);
      expect(rankedOrder).toEqual([
        "look 208",
        "sstf 236",
        "scan 236",
        "c-look 326",
        "c-scan 386",
        "fcfs 640",
      ]);
    });

    it("Benchmark higher (jump NOT counted): verdict C-LOOK 153, C-SCAN 183", () => {
      const results = FIXED_ALGORITHM_ORDER.map((algo) =>
        simulateDiskScheduling(
          TEXTBOOK_CYLINDERS,
          TEXTBOOK_HEAD,
          TEXTBOOK_REQUESTS,
          algo,
          "higher",
          false,
        ),
      );

      const verdict = pickBest(results);
      expect(verdict.isTie).toBe(false);
      expect(verdict.winner).toBe("c-look");
      expect(verdict.ranked[0]!.totalHeadMovement).toBe(153);
      expect(verdict.ranked[1]!.algorithm).toBe("c-scan");
      expect(verdict.ranked[1]!.totalHeadMovement).toBe(183);
    });

    it("Tie test: head 100 and all requests on cylinder 100 gives total 0 for every algorithm and reports a TIE among all six", () => {
      const reqs: DiskRequestInput[] = [
        { id: "R1", name: "R1", cylinder: 100 },
        { id: "R2", name: "R2", cylinder: 100 },
        { id: "R3", name: "R3", cylinder: 100 },
      ];

      const results = FIXED_ALGORITHM_ORDER.map((algo) =>
        simulateDiskScheduling(200, 100, reqs, algo, "higher", true),
      );

      const verdict = pickBest(results);
      expect(verdict.isTie).toBe(true);
      expect(verdict.winner).toBeNull();
      expect(verdict.tiedAlgorithms).toHaveLength(6);
      expect(verdict.tiedAlgorithms).toEqual(FIXED_ALGORITHM_ORDER);
      for (const item of verdict.ranked) {
        expect(item.totalHeadMovement).toBe(0);
        expect(item.longestWait).toBe(0);
      }
    });

    it("200 random inputs: pickBest winner equals minimum total, per-algorithm totals match segments sum, longest wait verified", () => {
      let seed = 789123;
      const rng = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      for (let run = 0; run < 200; run++) {
        const N = 10 + Math.floor(rng() * 490);
        const head = Math.floor(rng() * N);
        const reqCount = 1 + Math.floor(rng() * 15);
        const direction: DiskDirection = rng() > 0.5 ? "higher" : "lower";
        const countJump = rng() > 0.5;

        const reqs: DiskRequestInput[] = Array.from({ length: reqCount }, (_, i) => ({
          id: `R${i + 1}`,
          name: `Req_${i + 1}`,
          cylinder: Math.floor(rng() * N),
        }));

        const results = FIXED_ALGORITHM_ORDER.map((algo) =>
          simulateDiskScheduling(N, head, reqs, algo, direction, countJump),
        );

        const verdict = pickBest(results);

        // 1. Independent minimum calculation
        const totals = results.map((r) => r.totalHeadMovement);
        const independentMin = Math.min(...totals);

        if (!verdict.isTie) {
          const winnerRes = results.find((r) => r.algorithm === verdict.winner)!;
          expect(winnerRes.totalHeadMovement).toBe(independentMin);
          expect(verdict.ranked[0]!.totalHeadMovement).toBe(independentMin);
        } else {
          for (const tiedAlgo of verdict.tiedAlgorithms) {
            const tiedRes = results.find((r) => r.algorithm === tiedAlgo)!;
            expect(tiedRes.totalHeadMovement).toBe(independentMin);
          }
        }

        // 2. Per-algorithm total equals sum of segment distances (accounting for jump toggle)
        for (const res of results) {
          const expectedSum = res.segments
            .filter((s) => s.countedInTotal)
            .reduce((acc, s) => acc + s.distance, 0);
          expect(res.totalHeadMovement).toBe(expectedSum);

          // 3. Longest wait equals running total at the moment the last request is served
          const lw = computeLongestWait(res);
          let lastServeIdx = -1;
          for (let i = res.segments.length - 1; i >= 0; i--) {
            if (res.segments[i]!.kind === "serve") {
              lastServeIdx = i;
              break;
            }
          }
          if (lastServeIdx >= 0) {
            const manualLw = res.segments
              .slice(0, lastServeIdx + 1)
              .filter((s) => s.countedInTotal)
              .reduce((acc, s) => acc + s.distance, 0);
            expect(lw).toBe(manualLw);
          } else {
            expect(lw).toBe(0);
          }
        }

        // 4. Invariant: LOOK total <= SCAN total and C-LOOK <= C-SCAN (when jump counted)
        if (countJump) {
          const scanRes = results.find((r) => r.algorithm === "scan")!;
          const lookRes = results.find((r) => r.algorithm === "look")!;
          expect(lookRes.totalHeadMovement).toBeLessThanOrEqual(scanRes.totalHeadMovement);

          const cScanRes = results.find((r) => r.algorithm === "c-scan")!;
          const cLookRes = results.find((r) => r.algorithm === "c-look")!;
          expect(cLookRes.totalHeadMovement).toBeLessThanOrEqual(cScanRes.totalHeadMovement);
        }
      }
    });
  });
});
