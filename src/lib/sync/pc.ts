/**
 * src/lib/sync/pc.ts
 * Pure algorithmic simulation engine for the Bounded-Buffer Producer-Consumer problem.
 * Decoupled from React, DOM, and UI code.
 */

import { SeededRNG } from "./rng";
import { SyncSemaphore } from "./semaphore";

export type PCMode = "correct" | "no_mutex" | "no_empty_full" | "swapped_waits";
export type PCSchedulerType = "round_robin" | "random" | "manual";

export interface PCViolation {
  type: "overwrite" | "empty read" | "mutual exclusion";
  step: number;
  threads: string[];
  message: string;
}

export type ProducerInstruction = "p1" | "p2" | "p3" | "p4" | "p5" | "p6" | "p7" | "p8";
export type ConsumerInstruction = "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c7" | "c8";

export interface PCThreadState {
  id: string;
  role: "producer" | "consumer";
  index: number;
  label: string;
  itemsRemaining: number;
  totalItems: number;
  currentInstruction: ProducerInstruction | ConsumerInstruction;
  status: "ready" | "blocked" | "finished";
  blockedOn: string | null;
  heldMutex: boolean;
  tempSlot: number | null;
  currentItem: string | null;
}

export interface PCStepRecord {
  step: number;
  threadId: string;
  instruction: string;
  description: string;
  buffer: (string | null)[];
  inPtr: number;
  outPtr: number;
  emptySem: number;
  fullSem: number;
  mutexSem: number;
  emptyQueue: string[];
  fullQueue: string[];
  mutexQueue: string[];
  occupancy: number;
  violations: PCViolation[];
  threadStates: Record<string, { status: string; blockedOn: string | null; instruction: string }>;
}

export interface PCConfig {
  bufferSize: number; // N: 1..10
  producers: number; // 1..4
  consumers: number; // 1..4
  itemsPerProducer: number; // 1..10
  mode: PCMode;
  scheduler: PCSchedulerType;
  seed?: number;
  maxSteps?: number;
}

export interface PCResult {
  config: PCConfig;
  steps: PCStepRecord[];
  totalSteps: number;
  itemsProduced: number;
  itemsConsumed: number;
  consumedOrder: string[];
  maxOccupancy: number;
  averageOccupancy: number;
  producerBlockedCount: number;
  consumerBlockedCount: number;
  throughput: number;
  violations: PCViolation[];
  deadlock: {
    isDeadlocked: boolean;
    step?: number;
    reason?: string;
  };
  finalBuffer: (string | null)[];
}

export class PCSimulation {
  public readonly config: PCConfig;
  public readonly buffer: (string | null)[];
  public inPtr: number = 0;
  public outPtr: number = 0;

  public readonly emptySem: SyncSemaphore;
  public readonly fullSem: SyncSemaphore;
  public readonly mutexSem: SyncSemaphore;

  public readonly threads: Map<string, PCThreadState> = new Map();
  public readonly threadOrder: string[] = [];

  public itemsProduced: number = 0;
  public itemsConsumed: number = 0;
  public readonly consumedOrder: string[] = [];

  public producerBlockedCount: number = 0;
  public consumerBlockedCount: number = 0;

  public maxOccupancy: number = 0;
  public occupancySum: number = 0;
  public stepCount: number = 0;

  public readonly violations: PCViolation[] = [];
  public deadlock: { isDeadlocked: boolean; step?: number; reason?: string } = {
    isDeadlocked: false,
  };

  private rng: SeededRNG;
  private rrIndex: number = 0;

  constructor(config: PCConfig) {
    this.config = config;
    const N = config.bufferSize;
    this.buffer = Array(N).fill(null);

    this.emptySem = new SyncSemaphore("empty", N);
    this.fullSem = new SyncSemaphore("full", 0);
    this.mutexSem = new SyncSemaphore("mutex", 1);

    this.rng = new SeededRNG(config.seed ?? 1);

    // Initialize producers: 'A', 'B', 'C', 'D'
    for (let p = 0; p < config.producers; p++) {
      const letter = String.fromCharCode(65 + p);
      const id = `P${p}`;
      this.threads.set(id, {
        id,
        role: "producer",
        index: p,
        label: `Producer ${letter}`,
        itemsRemaining: config.itemsPerProducer,
        totalItems: config.itemsPerProducer,
        currentInstruction: "p1",
        status: "ready",
        blockedOn: null,
        heldMutex: false,
        tempSlot: null,
        currentItem: null,
      });
      this.threadOrder.push(id);
    }

    // Initialize consumers
    const totalItems = config.producers * config.itemsPerProducer;
    const C = config.consumers;
    for (let c = 0; c < C; c++) {
      const id = `C${c}`;
      // Distribute quota: first (totalItems % C) consumers get ceil, others floor
      const quota =
        Math.floor(totalItems / C) + (c < totalItems % C ? 1 : 0);
      this.threads.set(id, {
        id,
        role: "consumer",
        index: c,
        label: `Consumer ${c + 1}`,
        itemsRemaining: quota,
        totalItems: quota,
        currentInstruction: "c1",
        status: quota === 0 ? "finished" : "ready",
        blockedOn: null,
        heldMutex: false,
        tempSlot: null,
        currentItem: null,
      });
      this.threadOrder.push(id);
    }
  }

  get occupancy(): number {
    return this.buffer.filter((slot) => slot !== null).length;
  }

  public getRunnableThreadIds(): string[] {
    const runnable: string[] = [];
    for (const id of this.threadOrder) {
      const th = this.threads.get(id)!;
      if (th.status === "ready") {
        runnable.push(id);
      }
    }
    return runnable;
  }

  public isAllFinished(): boolean {
    for (const th of this.threads.values()) {
      if (th.status !== "finished") return false;
    }
    return true;
  }

  /**
   * Selects next thread according to configured scheduler.
   */
  public pickNextThreadId(): string | null {
    const runnable = this.getRunnableThreadIds();
    if (runnable.length === 0) return null;

    if (this.config.scheduler === "round_robin") {
      for (let i = 0; i < this.threadOrder.length; i++) {
        const idx = (this.rrIndex + i) % this.threadOrder.length;
        const id = this.threadOrder[idx]!;
        if (this.threads.get(id)!.status === "ready") {
          this.rrIndex = (idx + 1) % this.threadOrder.length;
          return id;
        }
      }
      return runnable[0]!;
    } else {
      // Random
      return this.rng.pick(runnable);
    }
  }

  /**
   * Executes one instruction for the specified thread.
   */
  public executeStep(threadId: string): PCStepRecord {
    const th = this.threads.get(threadId);
    if (!th || th.status !== "ready") {
      throw new Error(`Thread ${threadId} is not runnable (status: ${th?.status})`);
    }

    this.stepCount += 1;
    const currentInst = th.currentInstruction;
    let description = "";

    const N = this.config.bufferSize;
    const mode = this.config.mode;

    // Determine sequence of instructions depending on mode
    if (th.role === "producer") {
      switch (currentInst) {
        case "p1": {
          // produce (local)
          const letter = String.fromCharCode(65 + th.index);
          const itemNum = th.totalItems - th.itemsRemaining + 1;
          th.currentItem = `${letter}${itemNum}`;
          description = `${th.id} produced item ${th.currentItem}`;

          // Next instruction:
          if (mode === "no_empty_full") {
            th.currentInstruction = "p3"; // skip wait(empty), go to mutex
          } else if (mode === "swapped_waits") {
            th.currentInstruction = "p3"; // wait(mutex) first
          } else {
            th.currentInstruction = "p2"; // wait(empty)
          }
          break;
        }

        case "p2": {
          // wait(empty)
          const passed = this.emptySem.wait(th.id);
          if (passed) {
            description = `${th.id} passed wait(empty) [empty=${this.emptySem.value}]`;
            th.currentInstruction = mode === "swapped_waits" ? "p4" : (mode === "no_mutex" ? "p4" : "p3");
          } else {
            th.status = "blocked";
            th.blockedOn = "empty";
            this.producerBlockedCount += 1;
            description = `${th.id} blocked on wait(empty)`;
          }
          break;
        }

        case "p3": {
          // wait(mutex)
          const passed = this.mutexSem.wait(th.id);
          if (passed) {
            th.heldMutex = true;
            description = `${th.id} acquired mutex [mutex=${this.mutexSem.value}]`;
            if (mode === "swapped_waits") {
              th.currentInstruction = "p2"; // now do wait(empty)
            } else {
              th.currentInstruction = "p4";
            }
          } else {
            th.status = "blocked";
            th.blockedOn = "mutex";
            this.producerBlockedCount += 1;
            description = `${th.id} blocked on wait(mutex)`;
          }
          break;
        }

        case "p4": {
          // slot = in
          // Check mutual exclusion violation
          this.checkMutualExclusion(th.id);
          th.tempSlot = this.inPtr;
          description = `${th.id} read slot = in (${th.tempSlot})`;
          th.currentInstruction = "p5";
          break;
        }

        case "p5": {
          // buffer[slot] = item
          const slot = th.tempSlot ?? this.inPtr;
          if (this.buffer[slot] !== null) {
            this.violations.push({
              type: "overwrite",
              step: this.stepCount,
              threads: [th.id],
              message: `Step ${this.stepCount}: ${th.id} overwrote slot ${slot} which already held item '${this.buffer[slot]}'!`,
            });
          }
          this.buffer[slot] = th.currentItem!;
          this.itemsProduced += 1;
          description = `${th.id} placed ${th.currentItem} in slot ${slot}`;
          th.currentInstruction = "p6";
          break;
        }

        case "p6": {
          // in = (slot + 1) mod N
          const slot = th.tempSlot ?? this.inPtr;
          this.inPtr = (slot + 1) % N;
          description = `${th.id} updated in pointer to ${this.inPtr}`;

          if (mode === "no_mutex") {
            th.currentInstruction = mode === "no_empty_full" ? "p1" : "p8";
          } else {
            th.currentInstruction = "p7"; // signal(mutex)
          }
          break;
        }

        case "p7": {
          // signal(mutex)
          th.heldMutex = false;
          const woken = this.mutexSem.signal();
          if (woken) {
            const wokenThread = this.threads.get(woken);
            if (wokenThread) {
              wokenThread.status = "ready";
              wokenThread.blockedOn = null;
              wokenThread.heldMutex = true;
              if (wokenThread.role === "producer" && mode === "swapped_waits" && wokenThread.currentInstruction === "p3") {
                wokenThread.currentInstruction = "p2";
              } else if (wokenThread.role === "producer" && wokenThread.currentInstruction === "p3") {
                wokenThread.currentInstruction = "p4";
              } else if (wokenThread.role === "consumer" && wokenThread.currentInstruction === "c2") {
                wokenThread.currentInstruction = "c3";
              }
            }
            description = `${th.id} signaled mutex, waking ${woken}`;
          } else {
            description = `${th.id} signaled mutex [mutex=${this.mutexSem.value}]`;
          }

          if (mode === "no_empty_full") {
            th.itemsRemaining -= 1;
            if (th.itemsRemaining <= 0) {
              th.status = "finished";
              description += ` (${th.id} finished)`;
            } else {
              th.currentInstruction = "p1";
            }
          } else {
            th.currentInstruction = "p8"; // signal(full)
          }
          break;
        }

        case "p8": {
          // signal(full)
          const woken = this.fullSem.signal();
          if (woken) {
            const wokenThread = this.threads.get(woken);
            if (wokenThread) {
              wokenThread.status = "ready";
              wokenThread.blockedOn = null;
              wokenThread.currentInstruction = mode === "no_mutex" ? "c3" : "c2";
            }
            description = `${th.id} signaled full, waking ${woken}`;
          } else {
            description = `${th.id} signaled full [full=${this.fullSem.value}]`;
          }

          th.itemsRemaining -= 1;
          if (th.itemsRemaining <= 0) {
            th.status = "finished";
            description += ` (${th.id} finished all items)`;
          } else {
            th.currentInstruction = "p1";
          }
          break;
        }
      }
    } else {
      // CONSUMER
      switch (currentInst) {
        case "c1": {
          // wait(full)
          if (mode === "no_empty_full") {
            th.currentInstruction = mode === "no_mutex" ? "c3" : "c2";
            description = `${th.id} skipped wait(full) (mode no empty/full)`;
          } else {
            const passed = this.fullSem.wait(th.id);
            if (passed) {
              description = `${th.id} passed wait(full) [full=${this.fullSem.value}]`;
              th.currentInstruction = mode === "no_mutex" ? "c3" : "c2";
            } else {
              th.status = "blocked";
              th.blockedOn = "full";
              this.consumerBlockedCount += 1;
              description = `${th.id} blocked on wait(full)`;
            }
          }
          break;
        }

        case "c2": {
          // wait(mutex)
          const passed = this.mutexSem.wait(th.id);
          if (passed) {
            th.heldMutex = true;
            description = `${th.id} acquired mutex [mutex=${this.mutexSem.value}]`;
            th.currentInstruction = "c3";
          } else {
            th.status = "blocked";
            th.blockedOn = "mutex";
            this.consumerBlockedCount += 1;
            description = `${th.id} blocked on wait(mutex)`;
          }
          break;
        }

        case "c3": {
          // slot = out
          this.checkMutualExclusion(th.id);
          th.tempSlot = this.outPtr;
          description = `${th.id} read slot = out (${th.tempSlot})`;
          th.currentInstruction = "c4";
          break;
        }

        case "c4": {
          // item = buffer[slot] and clear slot
          const slot = th.tempSlot ?? this.outPtr;
          const readItem = this.buffer[slot];
          if (readItem === null) {
            this.violations.push({
              type: "empty read",
              step: this.stepCount,
              threads: [th.id],
              message: `Step ${this.stepCount}: ${th.id} read empty slot ${slot}!`,
            });
          }
          th.currentItem = readItem;
          this.buffer[slot] = null;
          if (readItem !== null) {
            this.consumedOrder.push(readItem);
            this.itemsConsumed += 1;
          }
          description = `${th.id} removed item ${readItem ?? "EMPTY"} from slot ${slot}`;
          th.currentInstruction = "c5";
          break;
        }

        case "c5": {
          // out = (slot + 1) mod N
          const slot = th.tempSlot ?? this.outPtr;
          this.outPtr = (slot + 1) % N;
          description = `${th.id} updated out pointer to ${this.outPtr}`;

          if (mode === "no_mutex") {
            th.currentInstruction = mode === "no_empty_full" ? "c8" : "c7";
          } else {
            th.currentInstruction = "c6"; // signal(mutex)
          }
          break;
        }

        case "c6": {
          // signal(mutex)
          th.heldMutex = false;
          const woken = this.mutexSem.signal();
          if (woken) {
            const wokenThread = this.threads.get(woken);
            if (wokenThread) {
              wokenThread.status = "ready";
              wokenThread.blockedOn = null;
              wokenThread.heldMutex = true;
              if (wokenThread.role === "producer" && mode === "swapped_waits" && wokenThread.currentInstruction === "p3") {
                wokenThread.currentInstruction = "p2";
              } else if (wokenThread.role === "producer" && wokenThread.currentInstruction === "p3") {
                wokenThread.currentInstruction = "p4";
              } else if (wokenThread.role === "consumer" && wokenThread.currentInstruction === "c2") {
                wokenThread.currentInstruction = "c3";
              }
            }
            description = `${th.id} signaled mutex, waking ${woken}`;
          } else {
            description = `${th.id} signaled mutex [mutex=${this.mutexSem.value}]`;
          }

          if (mode === "no_empty_full") {
            th.currentInstruction = "c8";
          } else {
            th.currentInstruction = "c7"; // signal(empty)
          }
          break;
        }

        case "c7": {
          // signal(empty)
          const woken = this.emptySem.signal();
          if (woken) {
            const wokenThread = this.threads.get(woken);
            if (wokenThread) {
              wokenThread.status = "ready";
              wokenThread.blockedOn = null;
              wokenThread.currentInstruction = (mode === "swapped_waits" || mode === "no_mutex") ? "p4" : "p3";
            }
            description = `${th.id} signaled empty, waking ${woken}`;
          } else {
            description = `${th.id} signaled empty [empty=${this.emptySem.value}]`;
          }
          th.currentInstruction = "c8";
          break;
        }

        case "c8": {
          // consume (local)
          description = `${th.id} consumed item ${th.currentItem}`;
          th.itemsRemaining -= 1;
          if (th.itemsRemaining <= 0) {
            th.status = "finished";
            description += ` (${th.id} finished all items)`;
          } else {
            th.currentInstruction = "c1";
          }
          break;
        }
      }
    }

    const curOcc = this.occupancy;
    if (curOcc > this.maxOccupancy) this.maxOccupancy = curOcc;
    this.occupancySum += curOcc;

    // Check for deadlock condition: unfinished threads exist and none is runnable
    const runnable = this.getRunnableThreadIds();
    const unfinished = Array.from(this.threads.values()).filter((t) => t.status !== "finished");

    if (runnable.length === 0 && unfinished.length > 0) {
      const reasons = unfinished
        .map((t) => `${t.id} blocked on ${t.blockedOn ?? "unknown"}${t.heldMutex ? " (holding mutex)" : ""}`)
        .join("; ");
      this.deadlock = {
        isDeadlocked: true,
        step: this.stepCount,
        reason: `Deadlock at step ${this.stepCount}: no runnable threads (${reasons}).`,
      };
    }

    // Capture thread states snapshot
    const threadStates: Record<string, { status: string; blockedOn: string | null; instruction: string }> = {};
    for (const [id, t] of this.threads) {
      threadStates[id] = {
        status: t.status,
        blockedOn: t.blockedOn,
        instruction: t.currentInstruction,
      };
    }

    return {
      step: this.stepCount,
      threadId,
      instruction: currentInst,
      description,
      buffer: [...this.buffer],
      inPtr: this.inPtr,
      outPtr: this.outPtr,
      emptySem: this.emptySem.value,
      fullSem: this.fullSem.value,
      mutexSem: this.mutexSem.value,
      emptyQueue: this.emptySem.queue,
      fullQueue: this.fullSem.queue,
      mutexQueue: this.mutexSem.queue,
      occupancy: curOcc,
      violations: [...this.violations],
      threadStates,
    };
  }

  private checkMutualExclusion(executingThreadId: string) {
    // If another thread is currently between critical section steps (producer p4..p6 or consumer c3..c5)
    for (const [id, other] of this.threads) {
      if (id !== executingThreadId && other.status !== "finished") {
        const inProdCS = ["p4", "p5", "p6"].includes(other.currentInstruction);
        const inConsCS = ["c3", "c4", "c5"].includes(other.currentInstruction);
        if (inProdCS || inConsCS) {
          this.violations.push({
            type: "mutual exclusion",
            step: this.stepCount,
            threads: [executingThreadId, id],
            message: `Step ${this.stepCount}: Mutual exclusion violated! ${executingThreadId} entered critical section while ${id} was at ${other.currentInstruction}!`,
          });
        }
      }
    }
  }

  /**
   * Runs the simulation until all threads finish, deadlock occurs, or maxSteps is reached.
   */
  public runToCompletion(maxSteps: number = 2000): PCResult {
    const steps: PCStepRecord[] = [];

    while (steps.length < maxSteps) {
      if (this.isAllFinished() || this.deadlock.isDeadlocked) break;
      const nextId = this.pickNextThreadId();
      if (!nextId) break;
      const stepRecord = this.executeStep(nextId);
      steps.push(stepRecord);
    }

    const averageOccupancy = steps.length > 0 ? this.occupancySum / steps.length : 0;
    const throughput = steps.length > 0 ? this.itemsConsumed / steps.length : 0;

    return {
      config: this.config,
      steps,
      totalSteps: steps.length,
      itemsProduced: this.itemsProduced,
      itemsConsumed: this.itemsConsumed,
      consumedOrder: [...this.consumedOrder],
      maxOccupancy: this.maxOccupancy,
      averageOccupancy,
      producerBlockedCount: this.producerBlockedCount,
      consumerBlockedCount: this.consumerBlockedCount,
      throughput,
      violations: [...this.violations],
      deadlock: { ...this.deadlock },
      finalBuffer: [...this.buffer],
    };
  }
}

/**
 * Pure helper function to run a complete Producer-Consumer simulation.
 */
export function simulateProducerConsumer(config: PCConfig): PCResult {
  const sim = new PCSimulation(config);
  return sim.runToCompletion(config.maxSteps ?? 2000);
}
