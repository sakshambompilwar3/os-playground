/**
 * src/lib/sync/philosophers.ts
 * Pure algorithmic simulation engine for the Dining Philosophers Problem.
 * Decoupled from React, DOM, and UI code.
 */

import { SeededRNG } from "./rng";

export type DiningStrategy = "naive" | "ordered" | "limit" | "asymmetric";
export type DiningSchedulerType = "round_robin" | "random" | "manual";

export interface DiningConfig {
  philosophers: number; // N: 2..10
  strategy: DiningStrategy;
  scheduler: DiningSchedulerType;
  seed?: number;
  thinkSteps: number; // 1..5
  eatSteps: number; // 1..5
  maxSteps?: number; // 10..1000, default 200
  names?: string[];
}

export type PhilosopherPhase = "thinking" | "hungry" | "eating";

export interface PhilosopherState {
  index: number;
  name: string;
  phase: PhilosopherPhase;
  thinkRemaining: number;
  eatRemaining: number;
  heldForks: number[];
  hasRoomPermit: boolean;
  meals: number;
  waitingForFork: number | null;
  waitingForPermit: boolean;
  hungrySinceStep: number | null;
}

export interface DiningStepRecord {
  step: number;
  philosopherIndex: number;
  action: string;
  forks: (number | null)[]; // forkIndex -> philosopherIndex who holds it
  roomPermitsAvailable?: number;
  philosopherStates: {
    index: number;
    phase: PhilosopherPhase;
    heldForks: number[];
    hasRoomPermit: boolean;
    waitingForFork: number | null;
    waitingForPermit: boolean;
    meals: number;
  }[];
  deadlock: {
    isDeadlocked: boolean;
    step?: number;
    cycle?: string[];
    reason?: string;
  };
}

export interface DiningResult {
  config: DiningConfig;
  steps: DiningStepRecord[];
  totalSteps: number;
  meals: number[]; // meals per philosopher
  totalMeals: number;
  throughput: number;
  fairnessGap: number;
  averageHungryWait: number;
  deadlock: {
    isDeadlocked: boolean;
    step?: number;
    cycle?: string[];
    reason?: string;
  };
}

export const DEFAULT_PHILOSOPHER_NAMES = [
  "Plato",
  "Aristotle",
  "Socrates",
  "Kant",
  "Descartes",
  "Hume",
  "Locke",
  "Hegel",
  "Nietzsche",
  "Confucius",
];

export class DiningSimulation {
  public readonly config: DiningConfig;
  public readonly N: number;
  public readonly forks: (number | null)[]; // fork index -> philosopher holding it
  public roomPermits: number; // for LIMIT strategy: N - 1 permits
  public readonly philosophers: PhilosopherState[];

  public stepCount: number = 0;
  public deadlock: {
    isDeadlocked: boolean;
    step?: number;
    cycle?: string[];
    reason?: string;
  } = { isDeadlocked: false };

  private rng: SeededRNG;
  private rrIndex: number = 0;
  private hungryWaitTimes: number[] = [];

  constructor(config: DiningConfig) {
    this.config = config;
    this.N = config.philosophers;
    this.forks = Array(this.N).fill(null);
    this.roomPermits = this.N - 1;
    this.rng = new SeededRNG(config.seed ?? 1);

    const names = config.names ?? DEFAULT_PHILOSOPHER_NAMES.slice(0, this.N);

    this.philosophers = Array.from({ length: this.N }, (_, i) => ({
      index: i,
      name: names[i] ?? `Phil ${i}`,
      phase: "thinking",
      thinkRemaining: config.thinkSteps,
      eatRemaining: config.eatSteps,
      heldForks: [],
      hasRoomPermit: false,
      meals: 0,
      waitingForFork: null,
      waitingForPermit: false,
      hungrySinceStep: null,
    }));
  }

  /**
   * Returns the sequence of resource acquires needed by philosopher i.
   */
  public getAcquireOrder(i: number): ("permit" | number)[] {
    const left = i;
    const right = (i + 1) % this.N;

    switch (this.config.strategy) {
      case "naive":
        return [left, right];

      case "ordered": {
        const lower = Math.min(left, right);
        const higher = Math.max(left, right);
        return [lower, higher];
      }

      case "limit":
        return ["permit", left, right];

      case "asymmetric":
        if (i % 2 === 0) {
          return [left, right];
        } else {
          return [right, left];
        }
    }
  }

  /**
   * Checks if a philosopher can take their next action right now without blocking.
   */
  public canAct(i: number): boolean {
    const p = this.philosophers[i]!;

    if (p.phase === "thinking") {
      return true; // Can always decrement think counter or transition to hungry
    }

    if (p.phase === "eating") {
      return true; // Can decrement eat counter or finish eating
    }

    // Phase is "hungry": check next acquire
    const order = this.getAcquireOrder(i);

    if (this.config.strategy === "limit" && !p.hasRoomPermit) {
      return this.roomPermits > 0;
    }

    // Which fork are we waiting for?
    const forksNeeded = order.filter((x): x is number => typeof x === "number");
    if (p.heldForks.length === 0) {
      // First fork
      const firstFork = forksNeeded[0]!;
      return this.forks[firstFork] === null;
    } else if (p.heldForks.length === 1) {
      // Second fork
      const secondFork = forksNeeded[1]!;
      return this.forks[secondFork] === null;
    }

    return true;
  }

  /**
   * Checks if a deadlock has occurred.
   * Deadlock = every philosopher is in the hungry phase and none can act.
   */
  public checkDeadlock(): boolean {
    if (this.deadlock.isDeadlocked) return true;

    // Every philosopher must be in hungry phase
    for (const p of this.philosophers) {
      if (p.phase !== "hungry") return false;
      if (this.canAct(p.index)) return false;
    }

    // All philosophers are hungry and cannot act -> Deadlock
    // Construct waiting cycle
    const cycle: string[] = [];
    for (let i = 0; i < this.N; i++) {
      const p = this.philosophers[i]!;
      cycle.push(p.name);
    }
    cycle.push(this.philosophers[0]!.name);

    this.deadlock = {
      isDeadlocked: true,
      step: this.stepCount,
      cycle,
      reason: `Deadlock at step ${this.stepCount}: All ${this.N} philosophers are hungry and waiting for forks in a cycle (${cycle.join(" → ")}).`,
    };

    return true;
  }

  public getRunnableIndices(): number[] {
    const runnable: number[] = [];
    for (let i = 0; i < this.N; i++) {
      if (this.canAct(i)) runnable.push(i);
    }
    return runnable;
  }

  public pickNextPhilosopher(): number | null {
    if (this.deadlock.isDeadlocked) return null;

    if (this.config.scheduler === "round_robin") {
      // Check each philosopher starting from rrIndex
      for (let offset = 0; offset < this.N; offset++) {
        const idx = (this.rrIndex + offset) % this.N;
        if (this.canAct(idx)) {
          this.rrIndex = (idx + 1) % this.N;
          return idx;
        }
      }
      return null;
    } else {
      // Random
      const runnable = this.getRunnableIndices();
      if (runnable.length === 0) return null;
      return this.rng.pick(runnable);
    }
  }

  /**
   * Executes one atomic action for philosopher i.
   */
  public executeStep(i: number): DiningStepRecord {
    const p = this.philosophers[i]!;
    this.stepCount += 1;
    let action = "";

    if (p.phase === "thinking") {
      p.thinkRemaining -= 1;
      if (p.thinkRemaining <= 0) {
        p.phase = "hungry";
        p.hungrySinceStep = this.stepCount;
        action = `${p.name} finished thinking and became hungry`;
      } else {
        action = `${p.name} is thinking (${p.thinkRemaining} think steps left)`;
      }
    } else if (p.phase === "hungry") {
      const order = this.getAcquireOrder(i);

      if (this.config.strategy === "limit" && !p.hasRoomPermit) {
        if (this.roomPermits > 0) {
          this.roomPermits -= 1;
          p.hasRoomPermit = true;
          p.waitingForPermit = false;
          action = `${p.name} acquired room permit (${this.roomPermits} remaining)`;
        } else {
          p.waitingForPermit = true;
          action = `${p.name} is waiting for room permit`;
        }
      } else {
        const forksNeeded = order.filter((x): x is number => typeof x === "number");

        if (p.heldForks.length === 0) {
          const firstFork = forksNeeded[0]!;
          if (this.forks[firstFork] === null) {
            this.forks[firstFork] = i;
            p.heldForks.push(firstFork);
            p.waitingForFork = null;
            action = `${p.name} picked up fork ${firstFork}`;
          } else {
            p.waitingForFork = firstFork;
            action = `${p.name} wants fork ${firstFork} (held by ${this.philosophers[this.forks[firstFork]!]!.name})`;
          }
        } else if (p.heldForks.length === 1) {
          const secondFork = forksNeeded[1]!;
          if (this.forks[secondFork] === null) {
            this.forks[secondFork] = i;
            p.heldForks.push(secondFork);
            p.waitingForFork = null;
            p.phase = "eating";
            p.eatRemaining = this.config.eatSteps;

            if (p.hungrySinceStep !== null) {
              this.hungryWaitTimes.push(this.stepCount - p.hungrySinceStep);
              p.hungrySinceStep = null;
            }

            action = `${p.name} picked up fork ${secondFork} and started eating!`;
          } else {
            p.waitingForFork = secondFork;
            action = `${p.name} wants fork ${secondFork} (held by ${this.philosophers[this.forks[secondFork]!]!.name})`;
          }
        }
      }
    } else if (p.phase === "eating") {
      p.eatRemaining -= 1;
      if (p.eatRemaining <= 0) {
        // Atomic release of all held forks and permit
        for (const f of p.heldForks) {
          this.forks[f] = null;
        }
        p.heldForks = [];

        if (p.hasRoomPermit) {
          this.roomPermits += 1;
          p.hasRoomPermit = false;
        }

        p.meals += 1;
        p.phase = "thinking";
        p.thinkRemaining = this.config.thinkSteps;
        action = `${p.name} finished meal #${p.meals}, put down both forks and resumed thinking`;
      } else {
        action = `${p.name} is eating (${p.eatRemaining} eat steps left)`;
      }
    }

    // Check if system is now deadlocked
    this.checkDeadlock();

    const snapshotStates = this.philosophers.map((ph) => ({
      index: ph.index,
      phase: ph.phase,
      heldForks: [...ph.heldForks],
      hasRoomPermit: ph.hasRoomPermit,
      waitingForFork: ph.waitingForFork,
      waitingForPermit: ph.waitingForPermit,
      meals: ph.meals,
    }));

    return {
      step: this.stepCount,
      philosopherIndex: i,
      action,
      forks: [...this.forks],
      roomPermitsAvailable: this.roomPermits,
      philosopherStates: snapshotStates,
      deadlock: { ...this.deadlock },
    };
  }

  public runToCompletion(maxSteps: number = 200): DiningResult {
    const steps: DiningStepRecord[] = [];

    while (steps.length < maxSteps) {
      if (this.deadlock.isDeadlocked) break;
      const nextId = this.pickNextPhilosopher();
      if (nextId === null) {
        this.checkDeadlock();
        break;
      }
      const record = this.executeStep(nextId);
      steps.push(record);
    }

    const meals = this.philosophers.map((p) => p.meals);
    const totalMeals = meals.reduce((a, b) => a + b, 0);
    const throughput = steps.length > 0 ? totalMeals / steps.length : 0;
    const maxMeals = Math.max(...meals, 0);
    const minMeals = Math.min(...meals, 0);
    const fairnessGap = maxMeals - minMeals;

    const averageHungryWait =
      this.hungryWaitTimes.length > 0
        ? this.hungryWaitTimes.reduce((a, b) => a + b, 0) / this.hungryWaitTimes.length
        : 0;

  return {
      config: this.config,
      steps,
      totalSteps: steps.length,
      meals,
      totalMeals,
      throughput,
      fairnessGap,
      averageHungryWait,
      deadlock: { ...this.deadlock },
    };
  }
}

/**
 * Runs a complete simulation for Dining Philosophers.
 */
export function simulateDining(config: DiningConfig): DiningResult {
  const sim = new DiningSimulation(config);
  return sim.runToCompletion(config.maxSteps ?? 200);
}

export interface DiningComparisonVerdict {
  winner: DiningStrategy | "tie" | "all_deadlocked";
  deadlockedStrategies: DiningStrategy[];
  explanation: string;
  howChosen: string[];
}

/**
 * Pure verdict function to compare all 4 Dining Philosophers strategies.
 */
export function pickBestDining(
  results: Record<DiningStrategy, DiningResult>,
): DiningComparisonVerdict {
  const deadlocked: DiningStrategy[] = [];
  const nonDeadlocked: { strategy: DiningStrategy; res: DiningResult }[] = [];

  const strategies: DiningStrategy[] = ["naive", "ordered", "limit", "asymmetric"];

  for (const s of strategies) {
    const r = results[s];
    if (r.deadlock.isDeadlocked) {
      deadlocked.push(s);
    } else {
      nonDeadlocked.push({ strategy: s, res: r });
    }
  }

  if (nonDeadlocked.length === 0) {
    return {
      winner: "all_deadlocked",
      deadlockedStrategies: deadlocked,
      explanation: "Every strategy deadlocked under this schedule and input configuration.",
      howChosen: ["All strategies deadlocked. No winner can be determined."],
    };
  }

  // Sort by: most meals, then smaller fairness gap, then lower average hungry wait
  nonDeadlocked.sort((a, b) => {
    if (b.res.totalMeals !== a.res.totalMeals) {
      return b.res.totalMeals - a.res.totalMeals;
    }
    if (a.res.fairnessGap !== b.res.fairnessGap) {
      return a.res.fairnessGap - b.res.fairnessGap;
    }
    return a.res.averageHungryWait - b.res.averageHungryWait;
  });

  const top = nonDeadlocked[0]!;
  // Check for tie
  const contenders = nonDeadlocked.filter(
    (c) =>
      c.res.totalMeals === top.res.totalMeals &&
      c.res.fairnessGap === top.res.fairnessGap &&
      Math.abs(c.res.averageHungryWait - top.res.averageHungryWait) < 0.001,
  );

  const winner: DiningStrategy | "tie" = contenders.length > 1 ? "tie" : top.strategy;

  const sentences: string[] = [];

  if (deadlocked.length > 0) {
    const deadlockedNames = deadlocked.map((s) => s.toUpperCase()).join(", ");
    sentences.push(
      `${deadlockedNames} suffered deadlock during execution (e.g. NAIVE entered circular wait), eliminating ${deadlocked.length === 1 ? "it" : "them"} from contention.`,
    );
  }

  if (winner !== "tie") {
    sentences.push(
      `${winner.toUpperCase()} achieved the best performance with ${top.res.totalMeals} total meals and a fairness gap of ${top.res.fairnessGap}.`,
    );
  } else {
    sentences.push(
      `Multiple strategies tied with ${top.res.totalMeals} meals and identical fairness metrics.`,
    );
  }

  // Explain strategy mechanisms
  sentences.push(
    `ORDERED prevents circular wait by requiring lower-numbered forks first, LIMIT permits at most N−1 philosophers to enter the room simultaneously, and ASYMMETRIC inverts the pick order for odd philosophers.`,
  );

  if (top.res.fairnessGap > 0) {
    sentences.push(
      `A fairness gap of ${top.res.fairnessGap} meal${top.res.fairnessGap === 1 ? "" : "s"} occurred between the most-fed and least-fed philosophers.`,
    );
  }

  sentences.push(
    `Best here means the most meals in the step limit for this input and this schedule. A different seed or timing can change the answer.`,
  );

  const howChosen = [
    `1. Eligibility filter: Only strategies that did NOT deadlock are considered (${nonDeadlocked.map((n) => n.strategy.toUpperCase()).join(", ")}).`,
    `2. Primary criterion: Maximum total meals served (${top.res.totalMeals} meals).`,
    `3. Secondary criterion: Minimum fairness gap (${top.res.fairnessGap} meal gap).`,
    `4. Tertiary criterion: Lower average hungry wait time (${top.res.averageHungryWait.toFixed(2)} steps).`,
  ];

  return {
    winner,
    deadlockedStrategies: deadlocked,
    explanation: sentences.join(" "),
    howChosen,
  };
}
