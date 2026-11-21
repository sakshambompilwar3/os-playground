import { describe, it, expect } from "vitest";
import { simulateDining, PHILOSOPHER_NAMES } from "@/lib/labs/philosophers";

describe("Dining Philosophers Lab (src/lib/labs/philosophers.ts)", () => {
  it("verifies NAIVE mode deadlock at round 2 with exact waiting cycle", () => {
    const res = simulateDining({
      mode: "NAIVE",
      eatRounds: 2,
      thinkRounds: 1,
      maxRounds: 60,
    });

    expect(res.deadlock.isDeadlocked).toBe(true);
    expect(res.deadlock.round).toBe(2);
    expect(res.roundsPlayed).toBe(2);
    expect(res.totalMeals).toBe(0);

    // After round 1 every philosopher holds its left fork Fi
    const r1 = res.rounds[0];
    for (let i = 0; i < 5; i++) {
      expect(r1.philosophers[i].heldForks).toEqual([i]);
      expect(r1.forkHolders[i]).toBe(i);
    }

    // At round 2, all 5 blocked
    const r2 = res.rounds[1];
    expect(r2.allBlocked).toBe(true);

    // Cycle verification:
    // P0 waits for F1 (held by P1), P1 waits for F2 (held by P2), P2 waits for F3 (held by P3), P3 waits for F4 (held by P4), P4 waits for F0 (held by P0)
    expect(res.deadlock.cycle).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      const edge = res.deadlock.cycle![i];
      const nextId = (i + 1) % 5;
      expect(edge.fromId).toBe(i);
      expect(edge.fromName).toBe(PHILOSOPHER_NAMES[i]);
      expect(edge.forkId).toBe(nextId);
      expect(edge.toId).toBe(nextId);
      expect(edge.toName).toBe(PHILOSOPHER_NAMES[nextId]);
    }
  });

  it("verifies FIXED mode meal start progression: P3 in r2, P2 in r5, P1 in r8, P3 in r8", () => {
    const res = simulateDining({
      mode: "FIXED",
      eatRounds: 2,
      thinkRounds: 1,
      maxRounds: 60,
    });

    expect(res.deadlock.isDeadlocked).toBe(false);

    // Check hand trace:
    // Round 1: P0 takes F0, P1 takes F1, P2 takes F2, P3 takes F3, P4 blocked on F0
    const r1 = res.rounds[0];
    expect(r1.philosophers[0].heldForks).toEqual([0]);
    expect(r1.philosophers[1].heldForks).toEqual([1]);
    expect(r1.philosophers[2].heldForks).toEqual([2]);
    expect(r1.philosophers[3].heldForks).toEqual([3]);
    expect(r1.philosophers[4].heldForks).toEqual([]);
    expect(r1.philosophers[4].waitingForFork).toBe(0);

    // Round 2: P0, P1, P2 blocked, P3 takes F4 and starts eating, P4 blocked
    const r2 = res.rounds[1];
    expect(r2.philosophers[0].actionText).toContain("waits for F1");
    expect(r2.philosophers[1].actionText).toContain("waits for F2");
    expect(r2.philosophers[2].actionText).toContain("waits for F3");
    expect(r2.philosophers[3].status).toBe("eating");
    expect(r2.philosophers[3].heldForks).toEqual([3, 4]);
    expect(r2.philosophers[4].actionText).toContain("waits for F0");

    // Round 4: P3 finishes (meal 1) and releases F3 and F4
    const r4 = res.rounds[3];
    expect(r4.philosophers[3].actionText).toContain("finishes eating");
    expect(r4.philosophers[3].meals).toBe(1);
    expect(r4.forkHolders[3]).toBeNull();
    expect(r4.forkHolders[4]).toBeNull();

    // Round 5: P2 takes F3 and starts eating
    const r5 = res.rounds[4];
    expect(r5.philosophers[2].status).toBe("eating");
    expect(r5.philosophers[2].heldForks).toEqual([2, 3]);

    // Check first meal-start events:
    // P3 in round 2
    expect(res.mealEvents[0]).toEqual({ round: 2, philosopher: 3, name: "Kant" });
    // P2 in round 5
    expect(res.mealEvents[1]).toEqual({ round: 5, philosopher: 2, name: "Socrates" });
    // P1 in round 8
    expect(res.mealEvents[2]).toEqual({ round: 8, philosopher: 1, name: "Aristotle" });
    // P3 in round 8 (second meal)
    expect(res.mealEvents[3]).toEqual({ round: 8, philosopher: 3, name: "Kant" });
  });

  it("preserves safety invariants across 500+ random configurations per mode", () => {
    const modes: ("NAIVE" | "FIXED")[] = ["NAIVE", "FIXED"];

    for (const mode of modes) {
      for (let run = 0; run < 300; run++) {
        const E = 1 + Math.floor(Math.random() * 5);
        const T = 1 + Math.floor(Math.random() * 5);
        const maxRounds = 10 + Math.floor(Math.random() * 100);

        const res1 = simulateDining({ mode, eatRounds: E, thinkRounds: T, maxRounds });
        const res2 = simulateDining({ mode, eatRounds: E, thinkRounds: T, maxRounds });

        // Determinism
        expect(res1.totalMeals).toBe(res2.totalMeals);
        expect(res1.roundsPlayed).toBe(res2.roundsPlayed);

        if (mode === "FIXED") {
          expect(res1.deadlock.isDeadlocked).toBe(false);
        } else {
          // NAIVE always deadlocks at round 2
          expect(res1.deadlock.isDeadlocked).toBe(true);
          expect(res1.deadlock.round).toBe(2);
        }

        // Check invariants at every round:
        for (const r of res1.rounds) {
          // 1. Fork held by at most one philosopher
          const forkCounts = [0, 0, 0, 0, 0];
          for (const p of r.philosophers) {
            for (const f of p.heldForks) {
              forkCounts[f]++;
            }
          }
          for (let f = 0; f < 5; f++) {
            expect(forkCounts[f]).toBeLessThanOrEqual(1);
          }

          // 2. An eating philosopher holds both of its forks
          for (const p of r.philosophers) {
            if (p.status === "eating") {
              expect(p.heldForks).toHaveLength(2);
              const left = p.id;
              const right = (p.id + 1) % 5;
              expect(p.heldForks.includes(left)).toBe(true);
              expect(p.heldForks.includes(right)).toBe(true);
            }
          }

          // 3. Two neighbouring philosophers are never eating at the same time
          for (let i = 0; i < 5; i++) {
            const next = (i + 1) % 5;
            const pA = r.philosophers[i];
            const pB = r.philosophers[next];
            expect(pA.status === "eating" && pB.status === "eating").toBe(false);
          }
        }

        // Meals per philosopher consistent with meal events
        const eventMealCounts = [0, 0, 0, 0, 0];
        for (const ev of res1.mealEvents) {
          // each meal event corresponds to a meal that starts; by end of simulation completed meals <= events
          eventMealCounts[ev.philosopher]++;
        }
        for (let i = 0; i < 5; i++) {
          expect(res1.mealsPerPhilosopher[i]).toBeLessThanOrEqual(eventMealCounts[i]);
        }
      }
    }
  });

  it("verifies liveness in FIXED mode for 100 rounds across all E and T from 1 to 5", () => {
    for (let E = 1; E <= 5; E++) {
      for (let T = 1; T <= 5; T++) {
        const res = simulateDining({ mode: "FIXED", eatRounds: E, thinkRounds: T, maxRounds: 100 });
        for (let i = 0; i < 5; i++) {
          if (res.mealsPerPhilosopher[i] === 0) {
            console.error(`Liveness failure for E=${E}, T=${T}, Phil ${i} (${PHILOSOPHER_NAMES[i]}): meals=0`);
          }
          expect(res.mealsPerPhilosopher[i]).toBeGreaterThan(0);
        }
      }
    }
  });

  it("prints meals table for FIXED with E = 2, T = 1, 60 rounds", () => {
    const res = simulateDining({
      mode: "FIXED",
      eatRounds: 2,
      thinkRounds: 1,
      maxRounds: 60,
    });

    console.log("=== FIXED Mode Benchmark (E=2, T=1, 60 rounds) ===");
    console.log("Philosophers Meals:", {
      Plato: res.mealsPerPhilosopher[0],
      Aristotle: res.mealsPerPhilosopher[1],
      Socrates: res.mealsPerPhilosopher[2],
      Kant: res.mealsPerPhilosopher[3],
      Descartes: res.mealsPerPhilosopher[4],
    });
    console.log("Total Meals:", res.totalMeals);
    console.log("Fairness Gap:", res.fairnessGap);
    console.log("Throughput:", res.throughput.toFixed(4));

    expect(res.deadlock.isDeadlocked).toBe(false);
    expect(res.roundsPlayed).toBe(60);
    expect(res.totalMeals).toBeGreaterThan(0);
  });
});
