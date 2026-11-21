import { describe, it, expect } from "vitest";
import { simulateProducerConsumer } from "@/lib/labs/producerConsumer";

describe("Producer-Consumer Bounded Buffer Lab (src/lib/labs/producerConsumer.ts)", () => {
  it("verifies known run 1: N = 3, P = 1, C = 2, 10 ticks", () => {
    const res = simulateProducerConsumer({
      bufferSize: 3,
      producerPeriod: 1,
      consumerPeriod: 2,
      ticks: 10,
    });

    // Check specific ticks described in spec:
    // after tick 1 the buffer is empty (item 1 produced and taken)
    expect(res.logs[0].occupancy).toBe(0);
    expect(res.logs[0].buffer).toEqual([]);
    expect(res.logs[0].producerAction).toBe("produced item 1");
    expect(res.logs[0].consumerAction).toBe("took item 1");

    // after tick 3 it holds [3]
    expect(res.logs[2].buffer).toEqual([3]);

    // after tick 5 it holds [4, 5]
    expect(res.logs[4].buffer).toEqual([4, 5]);

    // after tick 6 it holds [4, 5, 6] (full)
    expect(res.logs[5].buffer).toEqual([4, 5, 6]);

    // in tick 7 the producer is blocked and consumer takes item 4
    expect(res.logs[6].producerAction).toBe("waiting because the buffer is full");
    expect(res.logs[6].consumerAction).toBe("took item 4");

    // producer is blocked again in tick 9
    expect(res.logs[8].producerAction).toBe("waiting because the buffer is full");

    // Totals after 10 ticks
    expect(res.totals.produced).toBe(8);
    expect(res.totals.consumed).toBe(5);
    expect(res.totals.inBuffer).toBe(3);
    expect(res.logs[9].buffer).toEqual([6, 7, 8]);
    expect(res.totals.peakOccupancy).toBe(3);
    expect(res.totals.producerBlockedTicks).toBe(2);
    expect(res.totals.consumerBlockedTicks).toBe(0);
    expect(res.totals.sumOccupancy).toBe(19);
    expect(res.totals.averageOccupancy).toBe(1.9);
    expect(res.totals.throughput).toBe(0.5);
    expect(res.insight).toBe("The producer is faster than the consumer, so the buffer fills up and the producer has to wait");
  });

  it("verifies known run 2: N = 2, P = 2, C = 1, 8 ticks", () => {
    const res = simulateProducerConsumer({
      bufferSize: 2,
      producerPeriod: 2,
      consumerPeriod: 1,
      ticks: 8,
    });

    expect(res.totals.produced).toBe(4);
    expect(res.totals.consumed).toBe(4);
    expect(res.totals.inBuffer).toBe(0);
    expect(res.totals.peakOccupancy).toBe(1);
    expect(res.totals.producerBlockedTicks).toBe(0);
    expect(res.totals.consumerBlockedTicks).toBe(4);
    expect(res.totals.averageOccupancy).toBe(0);
    expect(res.insight).toBe("The consumer is faster than the producer, so the buffer empties out and the consumer has to wait");
  });

  it("preserves all required invariants across 500+ random configurations", () => {
    for (let i = 0; i < 600; i++) {
      const N = 1 + Math.floor(Math.random() * 8); // 1 to 8
      const P = 1 + Math.floor(Math.random() * 10); // 1 to 10
      const C = 1 + Math.floor(Math.random() * 10); // 1 to 10
      const ticks = 1 + Math.floor(Math.random() * 200); // 1 to 200

      const run1 = simulateProducerConsumer({ bufferSize: N, producerPeriod: P, consumerPeriod: C, ticks });
      const run2 = simulateProducerConsumer({ bufferSize: N, producerPeriod: P, consumerPeriod: C, ticks });

      // Determinism
      expect(run1.totals).toEqual(run2.totals);

      // Invariants:
      // 0 <= occupancy <= N at every tick
      // produced - consumed = occupancy
      // peak occupancy <= N
      // blocked ticks <= ticks
      // consumed <= produced
      let consumedItems: number[] = [];
      let runningSum = 0;

      for (const log of run1.logs) {
        expect(log.occupancy).toBeGreaterThanOrEqual(0);
        expect(log.occupancy).toBeLessThanOrEqual(N);
        expect(log.buffer.length).toBe(log.occupancy);
        expect(log.emptySlots + log.fullSlots).toBe(N);
        if (log.consumedItem !== undefined) {
          consumedItems.push(log.consumedItem);
        }
        runningSum += log.occupancy;
      }

      expect(run1.totals.sumOccupancy).toBe(runningSum);
      expect(run1.totals.produced - run1.totals.consumed).toBe(run1.totals.inBuffer);
      expect(run1.totals.inBuffer).toBe(run1.logs[run1.logs.length - 1].occupancy);
      expect(run1.totals.consumed).toBeLessThanOrEqual(run1.totals.produced);
      expect(run1.totals.peakOccupancy).toBeLessThanOrEqual(N);
      expect(run1.totals.producerBlockedTicks).toBeLessThanOrEqual(ticks);
      expect(run1.totals.consumerBlockedTicks).toBeLessThanOrEqual(ticks);

      // Items consumed in exact production order [1, 2, 3, ...]
      for (let j = 0; j < consumedItems.length; j++) {
        expect(consumedItems[j]).toBe(j + 1);
      }
    }
  });

  it("verifies that if P = C = 1, neither side is ever blocked after the first tick", () => {
    for (let N = 1; N <= 8; N++) {
      const res = simulateProducerConsumer({ bufferSize: N, producerPeriod: 1, consumerPeriod: 1, ticks: 100 });
      // In tick 1: producer produces item 1, consumer takes item 1.
      // After tick 1, neither side ever waits.
      for (let t = 1; t < res.logs.length; t++) {
        expect(res.logs[t].producerState).not.toBe("waiting");
        expect(res.logs[t].consumerState).not.toBe("waiting");
      }
      expect(res.totals.producerBlockedTicks).toBe(0);
      expect(res.totals.consumerBlockedTicks).toBe(0);
      expect(res.insight).toBe("The two sides keep up with each other, so nobody waits");
    }
  });
});
