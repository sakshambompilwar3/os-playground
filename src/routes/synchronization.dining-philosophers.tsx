import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Dices,
  Pause,
  Play,
  RotateCcw,
  StepForward,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DiningCalculationsDialog,
  DiningTableSvg,
} from "@/components/SyncDiningDetails";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PHILOSOPHER_NAMES,
  DiningSimulation,
  type DiningConfig,
  type DiningSchedulerType,
  type DiningStepRecord,
  type DiningStrategy,
} from "@/lib/sync/philosophers";

export const Route = createFileRoute("/synchronization/dining-philosophers")({
  head: () => ({
    meta: [
      { title: "Dining Philosophers Simulator | OS Playground" },
      {
        name: "description",
        content:
          "Simulate Dijkstra's Dining Philosophers problem with round-robin and random scheduling, fork allocation strategies, and deadlock cycle detection.",
      },
      { property: "og:title", content: "Dining Philosophers Simulator | OS Playground" },
      {
        property: "og:description",
        content:
          "Simulate Dijkstra's Dining Philosophers problem with round-robin and random scheduling, fork allocation strategies, and deadlock cycle detection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiningPhilosophersSimulatorPage,
});

const SPEEDS = [0.5, 1, 2, 4] as const;

function DiningPhilosophersSimulatorPage() {
  const [philosophersCount, setPhilosophersCount] = useState<number>(5);
  const [strategy, setStrategy] = useState<DiningStrategy>("naive");
  const [scheduler, setScheduler] = useState<DiningSchedulerType>("round_robin");
  const [seed, setSeed] = useState<number>(1);
  const [thinkSteps, setThinkSteps] = useState<number>(1);
  const [eatSteps, setEatSteps] = useState<number>(1);
  const [maxSteps, setMaxSteps] = useState<number>(200);

  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [calculationsOpen, setCalculationsOpen] = useState<boolean>(false);

  // Active simulation instance
  const [sim, setSim] = useState<DiningSimulation>(() => {
    return new DiningSimulation({
      philosophers: 5,
      strategy: "naive",
      scheduler: "round_robin",
      seed: 1,
      thinkSteps: 1,
      eatSteps: 1,
      maxSteps: 200,
    });
  });

  const [lastStep, setLastStep] = useState<DiningStepRecord | null>(null);

  const isFinished = sim.deadlock.isDeadlocked || sim.stepCount >= maxSteps;

  const resetRun = (newConfig?: Partial<DiningConfig>) => {
    setPlaying(false);
    const cfg: DiningConfig = {
      philosophers: newConfig?.philosophers ?? philosophersCount,
      strategy: newConfig?.strategy ?? strategy,
      scheduler: newConfig?.scheduler ?? scheduler,
      seed: newConfig?.seed ?? seed,
      thinkSteps: newConfig?.thinkSteps ?? thinkSteps,
      eatSteps: newConfig?.eatSteps ?? eatSteps,
      maxSteps: newConfig?.maxSteps ?? maxSteps,
    };
    const newSim = new DiningSimulation(cfg);
    setSim(newSim);
    setLastStep(null);
  };

  const handleLoadExample = () => {
    setPhilosophersCount(5);
    setStrategy("naive");
    setScheduler("round_robin");
    setThinkSteps(1);
    setEatSteps(1);
    setMaxSteps(200);
    resetRun({
      philosophers: 5,
      strategy: "naive",
      scheduler: "round_robin",
      thinkSteps: 1,
      eatSteps: 1,
      maxSteps: 200,
    });
  };

  const stepForward = (explicitPhilosopher?: number) => {
    if (isFinished) return;
    const nextIdx = explicitPhilosopher ?? sim.pickNextPhilosopher();
    if (nextIdx === null) {
      sim.checkDeadlock();
      return;
    }
    const record = sim.executeStep(nextIdx);
    setLastStep(record);
  };

  // Playback timer
  useEffect(() => {
    if (!playing || isFinished) {
      if (isFinished && playing) setPlaying(false);
      return;
    }

    const delay = 1000 / speed;
    const timer = setInterval(() => {
      const nextIdx = sim.pickNextPhilosopher();
      if (nextIdx === null) {
        sim.checkDeadlock();
        setPlaying(false);
        return;
      }
      const record = sim.executeStep(nextIdx);
      setLastStep(record);

      if (sim.deadlock.isDeadlocked || sim.stepCount >= maxSteps) {
        setPlaying(false);
      }
    }, delay);

    return () => clearInterval(timer);
  }, [playing, isFinished, speed, sim, maxSteps]);

  const meals = sim.philosophers.map((p) => p.meals);
  const totalMeals = meals.reduce((a, b) => a + b, 0);
  const fairnessGap = Math.max(...meals, 0) - Math.min(...meals, 0);
  const throughput = sim.stepCount > 0 ? totalMeals / sim.stepCount : 0;

  return (
    <div className="space-y-8">
      {/* Back link & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <Link to="/synchronization" className="hover:underline">
          ← back to Process Synchronization Hub
        </Link>
        <span className="font-mono text-xs">Concurrency &amp; Resource Allocation</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Dining Philosophers simulator</h1>
          <p className="text-muted-foreground">
            Watch thinkers compete for shared forks, avoid deadlock, or fall into circular wait.
          </p>
        </div>

        <Button variant="outline" onClick={handleLoadExample}>
          Load example
        </Button>
      </div>

      {/* Strategy selector */}
      <div className="paper-card p-4 space-y-3">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Select Fork Allocation Strategy
        </span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
          {[
            {
              id: "naive",
              name: "1. Naive (Left then Right)",
              desc: "Every philosopher picks up left fork then right fork. Prone to circular deadlock!",
            },
            {
              id: "ordered",
              name: "2. Ordered (Hierarchy)",
              desc: "Pick lower-numbered fork first, then higher. Breaks circular wait condition.",
            },
            {
              id: "limit",
              name: "3. Limit (N − 1 Room)",
              desc: "At most N−1 philosophers can sit/attempt at once. Guaranteed at least 1 eats.",
            },
            {
              id: "asymmetric",
              name: "4. Asymmetric",
              desc: "Even philosophers pick left first; odd pick right first. Breaks symmetry.",
            },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setStrategy(s.id as DiningStrategy);
                resetRun({ strategy: s.id as DiningStrategy });
              }}
              className={`p-3 rounded text-left transition-colors border ${
                strategy === s.id ? "bg-highlight font-bold ring-2 ring-primary border-primary" : "hover:bg-muted"
              }`}
            >
              <p className="font-hand text-xl font-bold">{s.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground leading-normal">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Parameter Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 font-mono text-xs">
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Philosophers N (2–10):</span>
          <input
            type="number"
            min={2}
            max={10}
            value={philosophersCount}
            onChange={(e) => {
              const v = Math.max(2, Math.min(10, Number(e.target.value) || 5));
              setPhilosophersCount(v);
              resetRun({ philosophers: v });
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Think steps (1–5):</span>
          <input
            type="number"
            min={1}
            max={5}
            value={thinkSteps}
            onChange={(e) => {
              const v = Math.max(1, Math.min(5, Number(e.target.value) || 1));
              setThinkSteps(v);
              resetRun({ thinkSteps: v });
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Eat steps (1–5):</span>
          <input
            type="number"
            min={1}
            max={5}
            value={eatSteps}
            onChange={(e) => {
              const v = Math.max(1, Math.min(5, Number(e.target.value) || 1));
              setEatSteps(v);
              resetRun({ eatSteps: v });
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Scheduler:</span>
          <select
            value={scheduler}
            onChange={(e) => {
              const s = e.target.value as DiningSchedulerType;
              setScheduler(s);
              resetRun({ scheduler: s });
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          >
            <option value="round_robin">Round-Robin</option>
            <option value="random">Random (Seeded)</option>
            <option value="manual">Manual (Clicker)</option>
          </select>
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Seed:</span>
          <input
            type="number"
            value={seed}
            onChange={(e) => {
              const s = Number(e.target.value) || 1;
              setSeed(s);
              resetRun({ seed: s });
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
      </div>

      {/* Deadlock Banner */}
      {sim.deadlock.isDeadlocked ? (
        <div role="alert" className="paper-card border-2 border-destructive bg-destructive/10 p-4 space-y-1 font-mono text-xs">
          <p className="font-bold font-hand text-2xl text-destructive">
            ⛔ Deadlock Cycle Formed at Step {sim.deadlock.step}!
          </p>
          <p className="text-foreground/90 font-bold">{sim.deadlock.reason}</p>
        </div>
      ) : (
        strategy === "naive" && !isFinished && (
          <div className="paper-card bg-highlight/20 p-3 font-mono text-xs text-foreground">
            💡 Notice: If each philosopher grabs their left fork at once, a circular deadlock forms immediately!
          </div>
        )
      )}

      {strategy === "naive" && isFinished && !sim.deadlock.isDeadlocked && (
        <div className="paper-card bg-success/15 p-3 font-mono text-xs text-foreground">
          ℹ️ No deadlock in this run, but it is still possible with another schedule or timing.
        </div>
      )}

      {/* Chalkboard Stage with Control Bar, Table SVG & Narration */}
      <div className="chalkboard rounded-md p-6 space-y-6">
        {/* Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={scheduler === "manual"}
            onClick={() => {
              if (isFinished) {
                resetRun();
                setPlaying(true);
              } else {
                setPlaying(!playing);
              }
            }}
            className="bg-highlight text-foreground font-bold"
          >
            {playing ? <Pause className="h-4 w-4" /> : isFinished ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause" : isFinished ? "Replay" : "Play"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setCalculationsOpen(true)}
          >
            <Calculator className="h-4 w-4" />
            Calculations
          </Button>
          <Button
            variant="outline"
            onClick={() => stepForward()}
            disabled={isFinished}
          >
            <StepForward className="h-4 w-4" />
            Step
          </Button>
          <Button variant="outline" onClick={() => resetRun()}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 rounded border border-chalk-foreground/30 bg-black/20 p-1 font-mono text-xs text-chalk-foreground">
            <span className="px-1 text-chalk-foreground/70">Speed:</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded px-1.5 py-0.5 transition-colors ${
                  speed === s
                    ? "bg-highlight text-foreground font-bold"
                    : "hover:bg-chalk-foreground/20 text-chalk-foreground"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Live Step Narration */}
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-chalk-foreground/20 bg-black/30 p-3 font-hand text-2xl text-chalk-foreground"
        >
          {lastStep ? (
            <p>
              <span className="font-bold text-highlight">Step {lastStep.step}:</span>{" "}
              {lastStep.action}
            </p>
          ) : (
            <p className="text-chalk-foreground/70">
              Press Play or Step to seat the philosophers and begin thinking.
            </p>
          )}
        </div>

        {/* Round Table SVG */}
        <DiningTableSvg
          philosophers={sim.philosophers}
          forks={sim.forks}
          roomPermits={sim.roomPermits}
          strategy={strategy}
        />
      </div>

      {/* Live Metrics Scoreboard */}
      <div className="paper-card p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-foreground/15 pb-2">
          <h3 className="font-hand text-2xl font-bold">
            Dining Statistics ({sim.stepCount} steps)
          </h3>
          <span className="text-muted-foreground uppercase text-[10px]">
            {isFinished ? "Run Complete" : "Running"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded border border-foreground/20 bg-background/50 p-2 text-center">
            <p className="text-muted-foreground uppercase text-[10px]">Total Meals</p>
            <p className="font-hand text-3xl font-bold text-primary">{totalMeals}</p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/50 p-2 text-center">
            <p className="text-muted-foreground uppercase text-[10px]">Throughput</p>
            <p className="font-hand text-3xl font-bold">{throughput.toFixed(3)}</p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/50 p-2 text-center">
            <p className="text-muted-foreground uppercase text-[10px]">Fairness Gap</p>
            <p className="font-hand text-3xl font-bold">{fairnessGap}</p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/50 p-2 text-center">
            <p className="text-muted-foreground uppercase text-[10px]">Status</p>
            <p className={`font-hand text-2xl font-bold ${sim.deadlock.isDeadlocked ? "text-destructive" : "text-success"}`}>
              {sim.deadlock.isDeadlocked ? "DEADLOCK" : "Running Safe"}
            </p>
          </div>
        </div>

        {/* Individual Philosopher Meal Cards */}
        <div className="pt-2 space-y-1">
          <span className="text-muted-foreground">Individual Meals:</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {sim.philosophers.map((p) => (
              <div key={p.index} className="rounded border border-foreground/15 p-2 bg-background/40 text-center">
                <p className="font-bold text-foreground">{p.name}</p>
                <p className="font-hand text-2xl text-primary font-bold">{p.meals} meals</p>
                <span className="text-[10px] text-muted-foreground capitalize">{p.phase}</span>
                {scheduler === "manual" && (
                  <button
                    type="button"
                    onClick={() => stepForward(p.index)}
                    className="mt-1 w-full rounded bg-highlight px-1 py-0.5 text-[10px] font-bold"
                  >
                    Act
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calculations Dialog */}
      <DiningCalculationsDialog
        open={calculationsOpen}
        onOpenChange={setCalculationsOpen}
        result={{
          config: sim.config,
          steps: [],
          totalSteps: sim.stepCount,
          meals,
          totalMeals,
          throughput,
          fairnessGap,
          averageHungryWait: 0,
          deadlock: sim.deadlock,
        }}
      />
    </div>
  );
}
