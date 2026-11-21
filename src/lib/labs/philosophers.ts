/**
 * src/lib/labs/philosophers.ts
 * Pure deterministic simulation engine for the Dining Philosophers lab.
 *
 * Rules:
 * - 5 philosophers (P0..P4) sit in a circle.
 * - Fork Fi lies between P(i-1) and Pi.
 *   Pi has left fork Fi and right fork F((i+1)%5).
 * - Philosophers: Plato (P0), Aristotle (P1), Socrates (P2), Kant (P3), Descartes (P4).
 * - Parameters: mode ("NAIVE" | "FIXED"), eatRounds E (1 to 5), thinkRounds T (1 to 5), maxRounds (default 60, max 200).
 * - Modes:
 *   NAIVE: all philosophers take left fork first, then right fork.
 *   FIXED: P0..P3 take left fork first, P4 takes right fork F0 first then left fork F4.
 * - Every philosopher starts HUNGRY holding 0 forks.
 * - In each round, philosophers act in order P0, P1, P2, P3, P4.
 *   HUNGRY with 0 forks: if first fork is free, take it; else blocked.
 *   HUNGRY with 1 fork: if second fork is free, take it and become EATING with eatLeft = E (meal starts); else blocked.
 *   EATING: eatLeft = eatLeft - 1; when 0, release both forks, meals++, become THINKING with thinkLeft = T.
 *   THINKING: thinkLeft = thinkLeft - 1; when 0, become HUNGRY.
 * - Deadlock: at end of round where all 5 actions were "blocked", run stops and reports deadlock & cycle.
 */

export type DiningMode = "NAIVE" | "FIXED";

export interface DiningParams {
  mode: DiningMode;
  eatRounds: number; // E: 1 to 5
  thinkRounds: number; // T: 1 to 5
  maxRounds?: number; // default 60, max 200
}

export const PHILOSOPHER_NAMES = [
  "Plato",
  "Aristotle",
  "Socrates",
  "Kant",
  "Descartes",
] as const;

export type PhilosopherStatus = "hungry" | "eating" | "thinking";

export interface PhilosopherRoundState {
  id: number;
  name: string;
  status: PhilosopherStatus;
  heldForks: number[];
  waitingForFork?: number;
  heldBy?: number;
  eatLeft: number;
  thinkLeft: number;
  meals: number;
  actionText: string;
}

export interface WaitingEdge {
  fromId: number;
  fromName: string;
  forkId: number;
  toId: number;
  toName: string;
}

export interface DiningRoundLog {
  round: number;
  actions: string[];
  philosophers: PhilosopherRoundState[];
  forkHolders: (number | null)[]; // 5 elements: which philosopher holds fork Fi
  allBlocked: boolean;
  narration: string;
}

export interface MealEvent {
  round: number;
  philosopher: number;
  name: string;
}

export interface DiningResult {
  params: {
    mode: DiningMode;
    eatRounds: number;
    thinkRounds: number;
    maxRounds: number;
  };
  rounds: DiningRoundLog[];
  mealEvents: MealEvent[];
  mealsPerPhilosopher: number[];
  totalMeals: number;
  roundsPlayed: number;
  deadlock: {
    isDeadlocked: boolean;
    round?: number;
    cycle?: WaitingEdge[];
  };
  throughput: number;
  fairnessGap: number;
}

export function simulateDining(params: DiningParams): DiningResult {
  const mode = params.mode;
  const E = Math.max(1, Math.min(5, Math.floor(params.eatRounds)));
  const T = Math.max(1, Math.min(5, Math.floor(params.thinkRounds)));
  const maxRounds = Math.max(1, Math.min(200, Math.floor(params.maxRounds ?? 60)));

  // State of the 5 philosophers
  const phils = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    name: PHILOSOPHER_NAMES[i],
    status: "hungry" as PhilosopherStatus,
    heldForks: [] as number[],
    eatLeft: 0,
    thinkLeft: 0,
    meals: 0,
    waitingForFork: undefined as number | undefined,
    heldBy: undefined as number | undefined,
  }));

  // State of the 5 forks: forkHolders[i] = philosopher index holding Fi or null
  const forkHolders: (number | null)[] = [null, null, null, null, null];

  // Helper to determine first and second fork
  const getForksForPhilosopher = (id: number): { first: number; second: number } => {
    const left = id;
    const right = (id + 1) % 5;
    if (mode === "FIXED" && id === 4) {
      // P4 in FIXED mode takes right fork F0 first, then left fork F4
      return { first: right, second: left };
    }
    return { first: left, second: right };
  };

  const rounds: DiningRoundLog[] = [];
  const mealEvents: MealEvent[] = [];

  let deadlocked = false;
  let deadlockRound: number | undefined;
  let deadlockCycle: WaitingEdge[] | undefined;

  for (let r = 1; r <= maxRounds; r++) {
    const roundActions: string[] = [];
    let blockedCount = 0;

    for (let i = 0; i < 5; i++) {
      const p = phils[i];
      const { first, second } = getForksForPhilosopher(i);
      p.waitingForFork = undefined;
      p.heldBy = undefined;

      if (p.status === "hungry") {
        if (p.heldForks.length === 0) {
          // Needs first fork
          if (forkHolders[first] === null) {
            forkHolders[first] = i;
            p.heldForks.push(first);
            const action = `${p.name} takes fork F${first}`;
            roundActions.push(action);
          } else {
            blockedCount++;
            const holderId = forkHolders[first]!;
            p.waitingForFork = first;
            p.heldBy = holderId;
            const action = `${p.name} waits for F${first} (held by ${PHILOSOPHER_NAMES[holderId]})`;
            roundActions.push(action);
          }
        } else if (p.heldForks.length === 1) {
          // Needs second fork
          if (forkHolders[second] === null) {
            forkHolders[second] = i;
            p.heldForks.push(second);
            p.status = "eating";
            p.eatLeft = E;
            mealEvents.push({ round: r, philosopher: i, name: p.name });
            const action = `${p.name} takes fork F${second} and starts eating`;
            roundActions.push(action);
          } else {
            blockedCount++;
            const holderId = forkHolders[second]!;
            p.waitingForFork = second;
            p.heldBy = holderId;
            const action = `${p.name} waits for F${second} (held by ${PHILOSOPHER_NAMES[holderId]})`;
            roundActions.push(action);
          }
        }
      } else if (p.status === "eating") {
        p.eatLeft = p.eatLeft - 1;
        if (p.eatLeft === 0) {
          // Release both forks
          for (const f of p.heldForks) {
            forkHolders[f] = null;
          }
          p.heldForks = [];
          p.meals = p.meals + 1;
          p.status = "thinking";
          p.thinkLeft = T;
          const action = `${p.name} finishes eating (meal ${p.meals}), releases forks, and starts thinking`;
          roundActions.push(action);
        } else {
          const action = `${p.name} continues eating (${p.eatLeft} round${p.eatLeft > 1 ? "s" : ""} left)`;
          roundActions.push(action);
        }
      } else if (p.status === "thinking") {
        p.thinkLeft = p.thinkLeft - 1;
        if (p.thinkLeft === 0) {
          p.status = "hungry";
          const action = `${p.name} becomes hungry`;
          roundActions.push(action);
        } else {
          const action = `${p.name} is thinking (${p.thinkLeft} round${p.thinkLeft > 1 ? "s" : ""} left)`;
          roundActions.push(action);
        }
      }
    }

    const roundPhils: PhilosopherRoundState[] = phils.map((p, idx) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      heldForks: [...p.heldForks],
      waitingForFork: p.waitingForFork,
      heldBy: p.heldBy,
      eatLeft: p.eatLeft,
      thinkLeft: p.thinkLeft,
      meals: p.meals,
      actionText: roundActions[idx],
    }));

    // Round narration
    const eatingNow = phils.filter((p) => p.status === "eating");
    let narration = `Round ${r}: `;
    if (blockedCount === 5) {
      narration += `All 5 philosophers are blocked waiting for forks! Circular wait forms a deadlock.`;
    } else if (eatingNow.length > 0) {
      narration += `${eatingNow.map((p) => p.name).join(" and ")} ${eatingNow.length > 1 ? "are" : "is"} eating.`;
    } else {
      narration += roundActions.slice(0, 2).join("; ") + "...";
    }

    rounds.push({
      round: r,
      actions: roundActions,
      philosophers: roundPhils,
      forkHolders: [...forkHolders],
      allBlocked: blockedCount === 5,
      narration,
    });

    if (blockedCount === 5) {
      deadlocked = true;
      deadlockRound = r;
      // Compute cycle
      const cycle: WaitingEdge[] = [];
      for (let i = 0; i < 5; i++) {
        const p = phils[i];
        if (p.waitingForFork !== undefined && p.heldBy !== undefined) {
          cycle.push({
            fromId: i,
            fromName: p.name,
            forkId: p.waitingForFork,
            toId: p.heldBy,
            toName: PHILOSOPHER_NAMES[p.heldBy],
          });
        }
      }
      deadlockCycle = cycle;
      break;
    }
  }

  const mealsPerPhilosopher = phils.map((p) => p.meals);
  const totalMeals = mealsPerPhilosopher.reduce((a, b) => a + b, 0);
  const roundsPlayed = rounds.length;
  const throughput = roundsPlayed > 0 ? totalMeals / roundsPlayed : 0;
  const minMeals = Math.min(...mealsPerPhilosopher);
  const maxMeals = Math.max(...mealsPerPhilosopher);
  const fairnessGap = maxMeals - minMeals;

  return {
    params: { mode, eatRounds: E, thinkRounds: T, maxRounds },
    rounds,
    mealEvents,
    mealsPerPhilosopher,
    totalMeals,
    roundsPlayed,
    deadlock: {
      isDeadlocked: deadlocked,
      round: deadlockRound,
      cycle: deadlockCycle,
    },
    throughput,
    fairnessGap,
  };
}
