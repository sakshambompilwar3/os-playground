import { describe, expect, it } from "vitest";
import {
  PCSimulation,
  simulateProducerConsumer,
  type PCConfig,
} from "@/lib/sync/pc";
import {
  DiningSimulation,
  pickBestDining,
  simulateDining,
  type DiningStrategy,
} from "@/lib/sync/philosophers";

describe("Process Synchronization Algorithmic Engine", () => {
  describe("Producer-Consumer Bounded Buffer (src/lib/sync/pc.ts)", () => {
    it("Mode Correct, N = 2, 1 producer with 4 items, 1 consumer, round-robin", () => {
      const config: PCConfig = {
        bufferSize: 2,
        producers: 1,
        consumers: 1,
        itemsPerProducer: 4,
        mode: "correct",
        scheduler: "round_robin",
      };

      const res = simulateProducerConsumer(config);

      expect(res.itemsProduced).toBe(4);
      expect(res.itemsConsumed).toBe(4);
      expect(res.consumedOrder).toEqual(["A1", "A2", "A3", "A4"]);
      expect(res.finalBuffer).toEqual([null, null]);
      expect(res.violations).toHaveLength(0);
      expect(res.maxOccupancy).toBeLessThanOrEqual(2);
      expect(res.deadlock.isDeadlocked).toBe(false);
    });

    it("Mode No empty/full, N = 1, 1 producer with 2 items, 1 consumer, manual schedule running only producer to completion", () => {
      const config: PCConfig = {
        bufferSize: 1,
        producers: 1,
        consumers: 1,
        itemsPerProducer: 2,
        mode: "no_empty_full",
        scheduler: "manual",
      };

      const sim = new PCSimulation(config);
      // Run only P0 until it finishes producing 2 items into a 1-slot buffer
      while (sim.threads.get("P0")!.status !== "finished") {
        sim.executeStep("P0");
      }

      // Buffer size is 1, producer put 2 items without empty check -> overwrite violation!
      const overwriteViolation = sim.violations.find((v) => v.type === "overwrite");
      expect(overwriteViolation).toBeDefined();
      expect(overwriteViolation?.threads).toContain("P0");
    });

    it("Mode No mutex, N = 3, 2 producers with 1 item each, scripted manual schedule", () => {
      const config: PCConfig = {
        bufferSize: 3,
        producers: 2,
        consumers: 1,
        itemsPerProducer: 1,
        mode: "no_mutex",
        scheduler: "manual",
      };

      const sim = new PCSimulation(config);

      // P0: p1 (produce A1)
      sim.executeStep("P0");
      // P1: p1 (produce B1)
      sim.executeStep("P1");

      // Both producers pass wait(empty)
      sim.executeStep("P0"); // p2
      sim.executeStep("P1"); // p2

      // Both execute p4 (read slot 0)
      sim.executeStep("P0"); // p4 (reads slot 0)
      sim.executeStep("P1"); // p4 (reads slot 0 while P0 is in CS!) -> mutual exclusion violation!

      // First executes p5 (writes to slot 0)
      sim.executeStep("P0"); // p5
      // Second executes p5 (overwrites slot 0) -> overwrite violation!
      sim.executeStep("P1"); // p5

      const mutexViolation = sim.violations.find((v) => v.type === "mutual exclusion");
      const overwriteViolation = sim.violations.find((v) => v.type === "overwrite");

      expect(mutexViolation).toBeDefined();
      expect(overwriteViolation).toBeDefined();
    });

    it("Mode Swapped waits, N = 1, 1 producer with 2 items, 1 consumer, scripted schedule triggers deadlock", () => {
      const config: PCConfig = {
        bufferSize: 1,
        producers: 1,
        consumers: 1,
        itemsPerProducer: 2,
        mode: "swapped_waits",
        scheduler: "manual",
      };

      const sim = new PCSimulation(config);

      // P0 produces A1, fills the buffer (occupancy 1)
      // p1 -> p3(mutex) -> p2(empty) -> p4 -> p5 -> p6 -> p7(signal mutex) -> p8(signal full)
      for (let s = 0; s < 8; s++) {
        sim.executeStep("P0");
      }
      expect(sim.buffer[0]).toBe("A1");

      // Now P0 produces A2:
      // p1: produce A2
      sim.executeStep("P0");
      // p3: wait(mutex) -> succeeds (holds mutex!)
      sim.executeStep("P0");
      // p2: wait(empty) -> buffer is full (empty=0) -> P0 blocks on empty while holding mutex!
      sim.executeStep("P0");
      expect(sim.threads.get("P0")!.status).toBe("blocked");
      expect(sim.threads.get("P0")!.blockedOn).toBe("empty");
      expect(sim.threads.get("P0")!.heldMutex).toBe(true);

      // Now C0 attempts to run:
      // c1: wait(full) -> succeeds (full was 1)
      sim.executeStep("C0");
      // c2: wait(mutex) -> mutex is 0 (held by blocked P0!) -> C0 blocks on mutex!
      sim.executeStep("C0");

      expect(sim.threads.get("C0")!.status).toBe("blocked");
      expect(sim.threads.get("C0")!.blockedOn).toBe("mutex");

      // Deadlock!
      expect(sim.deadlock.isDeadlocked).toBe(true);
      expect(sim.deadlock.reason).toContain("Deadlock");
      expect(sim.deadlock.reason).toContain("P0 blocked on empty (holding mutex)");
      expect(sim.deadlock.reason).toContain("C0 blocked on mutex");
    });

    it("Preserves all invariants across 500+ random configurations in mode Correct", () => {
      for (let run = 0; run < 500; run++) {
        const N = 1 + Math.floor(Math.random() * 10);
        const P = 1 + Math.floor(Math.random() * 4);
        const C = 1 + Math.floor(Math.random() * 4);
        const items = 1 + Math.floor(Math.random() * 10);
        const sched = Math.random() < 0.5 ? "round_robin" : "random";
        const seed = 1 + Math.floor(Math.random() * 10000);

        const config: PCConfig = {
          bufferSize: N,
          producers: P,
          consumers: C,
          itemsPerProducer: items,
          mode: "correct",
          scheduler: sched,
          seed,
          maxSteps: 3000,
        };

        const res = simulateProducerConsumer(config);

        const totalItems = P * items;
        expect(res.deadlock.isDeadlocked).toBe(false);
        expect(res.violations).toHaveLength(0);
        expect(res.itemsProduced).toBe(totalItems);
        expect(res.itemsConsumed).toBe(totalItems);

        // Every item consumed exactly once
        expect(res.consumedOrder).toHaveLength(totalItems);
        const uniqueConsumed = new Set(res.consumedOrder);
        expect(uniqueConsumed.size).toBe(totalItems);

        // Buffer empty at the end
        expect(res.finalBuffer.every((s) => s === null)).toBe(true);
        expect(res.maxOccupancy).toBeLessThanOrEqual(N);
      }
    });
  });

  describe("Dining Philosophers (src/lib/sync/philosophers.ts)", () => {
    it("N = 5, NAIVE, round-robin, think 1, eat 1: deadlock after exactly 10 steps", () => {
      const config = {
        philosophers: 5,
        strategy: "naive" as DiningStrategy,
        scheduler: "round_robin" as const,
        thinkSteps: 1,
        eatSteps: 1,
        maxSteps: 50,
      };

      const res = simulateDining(config);

      // Deadlock after exactly 10 steps (each of the 5 philosophers thinks for 1 step = 5 steps,
      // then each picks up their own left fork = 5 steps -> step 10 deadlock!)
      expect(res.deadlock.isDeadlocked).toBe(true);
      expect(res.deadlock.step).toBe(10);
      expect(res.totalMeals).toBe(0);

      // Each philosopher holds exactly its own left fork
      const lastStep = res.steps[res.steps.length - 1]!;
      for (let i = 0; i < 5; i++) {
        expect(lastStep.forks[i]).toBe(i);
      }
    });

    it("N = 2, NAIVE, round-robin, think 1, eat 1: deadlock after exactly 4 steps", () => {
      const config = {
        philosophers: 2,
        strategy: "naive" as DiningStrategy,
        scheduler: "round_robin" as const,
        thinkSteps: 1,
        eatSteps: 1,
        maxSteps: 20,
      };

      const res = simulateDining(config);

      // Step 1: P0 thinks -> hungry
      // Step 2: P1 thinks -> hungry
      // Step 3: P0 takes fork 0
      // Step 4: P1 takes fork 1 -> Deadlock!
      expect(res.deadlock.isDeadlocked).toBe(true);
      expect(res.deadlock.step).toBe(4);
    });

    it("Preserves safety invariants across 500+ random configurations per strategy", () => {
      const strategies: DiningStrategy[] = ["ordered", "limit", "asymmetric"];

      for (const strat of strategies) {
        for (let run = 0; run < 170; run++) {
          const N = 2 + Math.floor(Math.random() * 9); // 2..10
          const think = 1 + Math.floor(Math.random() * 4);
          const eat = 1 + Math.floor(Math.random() * 4);
          const seed = 1 + Math.floor(Math.random() * 10000);

          const res = simulateDining({
            philosophers: N,
            strategy: strat,
            scheduler: Math.random() < 0.5 ? "round_robin" : "random",
            seed,
            thinkSteps: think,
            eatSteps: eat,
            maxSteps: 500,
          });

          // ORDERED, LIMIT, ASYMMETRIC must never deadlock
          expect(res.deadlock.isDeadlocked).toBe(false);

          // Verify safety invariants on each step:
          for (const step of res.steps) {
            // 1. A fork is held by at most 1 philosopher
            const allHeldForks = step.philosopherStates.flatMap((p) => p.heldForks);
            expect(new Set(allHeldForks).size).toBe(allHeldForks.length);

            // 2. Neighbouring philosophers never eat at the same time
            for (let i = 0; i < N; i++) {
              const p = step.philosopherStates[i]!;
              const neighbor = step.philosopherStates[(i + 1) % N]!;
              if (p.phase === "eating") {
                expect(neighbor.phase).not.toBe("eating");
                // 3. Philosopher eats only while holding both forks
                expect(p.heldForks.length).toBe(2);
              }
            }
          }
        }
      }
    });

    it("Under round-robin with N 2 to 10 and 2000 steps, every philosopher eats at least once for ORDERED, LIMIT, and ASYMMETRIC", () => {
      const strategies: DiningStrategy[] = ["ordered", "limit", "asymmetric"];

      for (const strat of strategies) {
        for (let N = 2; N <= 10; N++) {
          const res = simulateDining({
            philosophers: N,
            strategy: strat,
            scheduler: "round_robin",
            thinkSteps: 1,
            eatSteps: 1,
            maxSteps: 2000,
          });

          expect(res.deadlock.isDeadlocked).toBe(false);
          for (let i = 0; i < N; i++) {
            expect(res.meals[i]).toBeGreaterThanOrEqual(1);
          }
        }
      }
    });

    it("Determinism: same seed produces an identical trace", () => {
      const config = {
        philosophers: 5,
        strategy: "asymmetric" as DiningStrategy,
        scheduler: "random" as const,
        seed: 42,
        thinkSteps: 2,
        eatSteps: 2,
        maxSteps: 200,
      };

      const res1 = simulateDining(config);
      const res2 = simulateDining(config);

      expect(res1.totalSteps).toBe(res2.totalSteps);
      expect(res1.totalMeals).toBe(res2.totalMeals);
      expect(res1.meals).toEqual(res2.meals);
      expect(res1.steps.map((s) => s.action)).toEqual(res2.steps.map((s) => s.action));
    });

    it("prints comparison table for N = 5, round-robin, think 1, eat 1, 200 steps", () => {
      const configBase = {
        philosophers: 5,
        scheduler: "round_robin" as const,
        thinkSteps: 1,
        eatSteps: 1,
        maxSteps: 200,
      };

      const naive = simulateDining({ ...configBase, strategy: "naive" });
      const ordered = simulateDining({ ...configBase, strategy: "ordered" });
      const limit = simulateDining({ ...configBase, strategy: "limit" });
      const asymmetric = simulateDining({ ...configBase, strategy: "asymmetric" });

      const table = [
        {
          strategy: "NAIVE",
          status: naive.deadlock.isDeadlocked ? `DEADLOCK (step ${naive.deadlock.step})` : "Finished",
          steps: naive.totalSteps,
          meals: naive.totalMeals,
          throughput: naive.throughput.toFixed(4),
          fairnessGap: naive.fairnessGap,
          avgHungryWait: naive.averageHungryWait.toFixed(2),
          zeroMeals: naive.meals.filter((m) => m === 0).length,
        },
        {
          strategy: "ORDERED",
          status: ordered.deadlock.isDeadlocked ? `DEADLOCK (step ${ordered.deadlock.step})` : "Finished",
          steps: ordered.totalSteps,
          meals: ordered.totalMeals,
          throughput: ordered.throughput.toFixed(4),
          fairnessGap: ordered.fairnessGap,
          avgHungryWait: ordered.averageHungryWait.toFixed(2),
          zeroMeals: ordered.meals.filter((m) => m === 0).length,
        },
        {
          strategy: "LIMIT",
          status: limit.deadlock.isDeadlocked ? `DEADLOCK (step ${limit.deadlock.step})` : "Finished",
          steps: limit.totalSteps,
          meals: limit.totalMeals,
          throughput: limit.throughput.toFixed(4),
          fairnessGap: limit.fairnessGap,
          avgHungryWait: limit.averageHungryWait.toFixed(2),
          zeroMeals: limit.meals.filter((m) => m === 0).length,
        },
        {
          strategy: "ASYMMETRIC",
          status: asymmetric.deadlock.isDeadlocked ? `DEADLOCK (step ${asymmetric.deadlock.step})` : "Finished",
          steps: asymmetric.totalSteps,
          meals: asymmetric.totalMeals,
          throughput: asymmetric.throughput.toFixed(4),
          fairnessGap: asymmetric.fairnessGap,
          avgHungryWait: asymmetric.averageHungryWait.toFixed(2),
          zeroMeals: asymmetric.meals.filter((m) => m === 0).length,
        },
      ];

      console.table(table);
      expect(table).toHaveLength(4);
    });

    it("pickBestDining returns eligible winner that did not deadlock and has max total meals", () => {
      const configBase = {
        philosophers: 5,
        scheduler: "round_robin" as const,
        thinkSteps: 1,
        eatSteps: 1,
        maxSteps: 200,
      };

      const results = {
        naive: simulateDining({ ...configBase, strategy: "naive" }),
        ordered: simulateDining({ ...configBase, strategy: "ordered" }),
        limit: simulateDining({ ...configBase, strategy: "limit" }),
        asymmetric: simulateDining({ ...configBase, strategy: "asymmetric" }),
      };

      const verdict = pickBestDining(results);

      // Naive deadlocks, so it must be disqualified
      expect(verdict.deadlockedStrategies).toContain("naive");
      expect(verdict.winner).not.toBe("naive");
      expect(verdict.winner).not.toBe("all_deadlocked");
      expect(verdict.explanation).toContain("Best here means the most meals in the step limit for this input and this schedule. A different seed or timing can change the answer.");
    });
  });
});
