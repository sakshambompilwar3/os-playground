/**
 * src/lib/labs/producerConsumer.ts
 * Pure deterministic simulation engine for the basic Bounded Buffer Producer-Consumer lab.
 *
 * Rules:
 * - One producer, one consumer, bounded FIFO buffer of capacity N.
 * - Producer period P, Consumer period C.
 * - Items are numbered 1, 2, 3... in the order produced.
 * - Each tick runs the producer first, then the consumer:
 *   Producer:
 *     if pCool > 0 then pCool = pCool - 1
 *     else if occupancy < N then append next item, produced++, pCool = P - 1
 *     else pBlocked++
 *   Consumer:
 *     if cCool > 0 then cCool = cCool - 1
 *     else if occupancy > 0 then take oldest item, consumed++, cCool = C - 1
 *     else cBlocked++
 *   peak = max(peak, occupancy) updated after each action.
 *   After the tick, occupancy is added to the running sum.
 */

export interface ProducerConsumerParams {
  bufferSize: number; // N: 1 to 8
  producerPeriod: number; // P: 1 to 10
  consumerPeriod: number; // C: 1 to 10
  ticks: number; // 1 to 200, default 40
}

export type ThreadState = "working" | "resting" | "waiting";

export interface TickLog {
  tick: number;
  producerAction: string;
  consumerAction: string;
  producerState: ThreadState;
  consumerState: ThreadState;
  producedItem?: number;
  consumedItem?: number;
  occupancy: number;
  buffer: number[];
  emptySlots: number;
  fullSlots: number;
  narration: string;
}

export interface ProducerConsumerResult {
  params: ProducerConsumerParams;
  logs: TickLog[];
  totals: {
    produced: number;
    consumed: number;
    inBuffer: number;
    peakOccupancy: number;
    sumOccupancy: number;
    averageOccupancy: number;
    producerBlockedTicks: number;
    consumerBlockedTicks: number;
    producerBlockedPercent: number;
    consumerBlockedPercent: number;
    throughput: number;
    ticks: number;
  };
  insight: string;
}

export function simulateProducerConsumer(params: ProducerConsumerParams): ProducerConsumerResult {
  const N = Math.max(1, Math.min(8, Math.floor(params.bufferSize)));
  const P = Math.max(1, Math.min(10, Math.floor(params.producerPeriod)));
  const C = Math.max(1, Math.min(10, Math.floor(params.consumerPeriod)));
  const totalTicks = Math.max(1, Math.min(200, Math.floor(params.ticks)));

  const buffer: number[] = [];
  let produced = 0;
  let consumed = 0;
  let pCool = 0;
  let cCool = 0;
  let pBlocked = 0;
  let cBlocked = 0;
  let peak = 0;
  let sumOccupancy = 0;

  const logs: TickLog[] = [];

  for (let tick = 1; tick <= totalTicks; tick++) {
    let pAction = "";
    let pState: ThreadState = "resting";
    let prodItem: number | undefined;

    // --- PRODUCER ACTION ---
    if (pCool > 0) {
      pCool = pCool - 1;
      pAction = "resting";
      pState = "resting";
    } else if (buffer.length < N) {
      produced = produced + 1;
      prodItem = produced;
      buffer.push(prodItem);
      pCool = P - 1;
      pAction = `produced item ${prodItem}`;
      pState = "working";
    } else {
      pBlocked = pBlocked + 1;
      pAction = "waiting because the buffer is full";
      pState = "waiting";
    }
    peak = Math.max(peak, buffer.length);

    // --- CONSUMER ACTION ---
    let cAction = "";
    let cState: ThreadState = "resting";
    let consItem: number | undefined;

    if (cCool > 0) {
      cCool = cCool - 1;
      cAction = "resting";
      cState = "resting";
    } else if (buffer.length > 0) {
      consItem = buffer.shift()!;
      consumed = consumed + 1;
      cCool = C - 1;
      cAction = `took item ${consItem}`;
      cState = "working";
    } else {
      cBlocked = cBlocked + 1;
      cAction = "waiting because the buffer is empty";
      cState = "waiting";
    }
    peak = Math.max(peak, buffer.length);

    // End-of-tick stats
    const endOccupancy = buffer.length;
    sumOccupancy += endOccupancy;

    // Narration construction with real numbers
    let narrP = "";
    if (pAction.startsWith("produced")) {
      narrP = `The producer puts item ${prodItem} in the buffer.`;
    } else if (pState === "waiting") {
      narrP = `the buffer is full (${N} of ${N}), so the producer waits.`;
    } else {
      narrP = "the producer rests.";
    }

    let narrC = "";
    if (cAction.startsWith("took")) {
      narrC = `The consumer takes item ${consItem}.`;
    } else if (cState === "waiting") {
      narrC = "the buffer is empty (0 of " + N + "), so the consumer waits.";
    } else {
      narrC = "the consumer rests.";
    }

    let narration = "";
    if (pState === "waiting") {
      narration = `Tick ${tick}: ${narrP} ${narrC}`;
    } else if (cState === "waiting") {
      narration = `Tick ${tick}: ${narrP} ${narrC}`;
    } else {
      narration = `Tick ${tick}: ${narrP} ${narrC}`;
    }

    logs.push({
      tick,
      producerAction: pAction,
      consumerAction: cAction,
      producerState: pState,
      consumerState: cState,
      producedItem: prodItem,
      consumedItem: consItem,
      occupancy: endOccupancy,
      buffer: [...buffer],
      emptySlots: N - endOccupancy,
      fullSlots: endOccupancy,
      narration,
    });
  }

  const inBuffer = produced - consumed;
  const averageOccupancy = sumOccupancy / totalTicks;
  const throughput = consumed / totalTicks;
  const producerBlockedPercent = (pBlocked / totalTicks) * 100;
  const consumerBlockedPercent = (cBlocked / totalTicks) * 100;

  let insight = "The two sides keep up with each other, so nobody waits";
  if (pBlocked > cBlocked) {
    insight = "The producer is faster than the consumer, so the buffer fills up and the producer has to wait";
  } else if (cBlocked > pBlocked) {
    insight = "The consumer is faster than the producer, so the buffer empties out and the consumer has to wait";
  }

  return {
    params: { bufferSize: N, producerPeriod: P, consumerPeriod: C, ticks: totalTicks },
    logs,
    totals: {
      produced,
      consumed,
      inBuffer,
      peakOccupancy: peak,
      sumOccupancy,
      averageOccupancy,
      producerBlockedTicks: pBlocked,
      consumerBlockedTicks: cBlocked,
      producerBlockedPercent,
      consumerBlockedPercent,
      throughput,
      ticks: totalTicks,
    },
    insight,
  };
}
