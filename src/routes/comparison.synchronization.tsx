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
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DiningCalculationsDialog, DiningTableSvg } from "@/components/SyncDiningDetails";
import { Button } from "@/components/ui/button";
import {
  DiningSimulation,
  pickBestDining,
  simulateDining,
  type DiningComparisonVerdict,
  type DiningConfig,
  type DiningResult,
  type DiningSchedulerType,
  type DiningStrategy,
} from "@/lib/sync/philosophers";

export const Route = createFileRoute("/comparison/synchronization")({
  head: () => ({
    meta: [
      { title: "Process Synchronization Comparison | OS Playground" },
      {
        name: "description",
        content:
          "Compare Naive, Ordered Hierarchy, Room Limit, and Asymmetric Dining Philosophers strategies side by side with deadlock detection and best strategy verdict.",
      },
      { property: "og:title", content: "Process Synchronization Comparison | OS Playground" },
      {
        property: "og:description",
        content:
          "Compare Naive, Ordered Hierarchy, Room Limit, and Asymmetric Dining Philosophers strategies side by side with deadlock detection and best strategy verdict.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SynchronizationComparisonPage,
});

const SPEEDS = [0.5, 1, 2, 4] as const;

export function SynchronizationComparisonPage() {
  const [philosophersCount, setPhilosophersCount] = useState<number>(5);
  const [scheduler, setScheduler] = useState<DiningSchedulerType>("round_robin");
  const [seed, setSeed] = useState<number>(1);
  const [thinkSteps, setThinkSteps] = useState<number>(1);
  const [eatSteps, setEatSteps] = useState<number>(1);
  const [maxSteps, setMaxSteps] = useState<number>(200);

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [calculationsOpen, setCalculationsOpen] = useState<boolean>(false);
  const [manualVerdictShown, setManualVerdictShown] = useState<boolean>(false);

  // Pre-run complete simulations for all 4 strategies so synchronized playhead steps through
  const fullRuns = useMemo(() => {
    const base = {
      philosophers: philosophersCount,
      scheduler,
      seed,
      thinkSteps,
      eatSteps,
      maxSteps,
    };
    return {
      naive: simulateDining({ ...base, strategy: "naive" }),
      ordered: simulateDining({ ...base, strategy: "ordered" }),
      limit: simulateDining({ ...base, strategy: "limit" }),
      asymmetric: simulateDining({ ...base, strategy: "asymmetric" }),
    };
  }, [philosophersCount, scheduler, seed, thinkSteps, eatSteps, maxSteps]);

  const verdict = useMemo(() => {
    return pickBestDining(fullRuns);
  }, [fullRuns]);

  const totalPossibleSteps = maxSteps;
  const isFinished = stepIndex >= totalPossibleSteps;
  const showVerdict = isFinished || manualVerdictShown;

  const resetRun = () => {
    setPlaying(false);
    setStepIndex(0);
    setManualVerdictShown(false);
  };

  const handleLoadExample = () => {
    setPhilosophersCount(5);
    setScheduler("round_robin");
    setSeed(1);
    setThinkSteps(1);
    setEatSteps(1);
    setMaxSteps(200);
    resetRun();
  };

  const handleStep = () => {
    if (isFinished) return;
    setStepIndex((s) => Math.min(totalPossibleSteps, s + 1));
  };

  // Synchronized playback
  useEffect(() => {
    if (!playing || isFinished) {
      if (isFinished && playing) setPlaying(false);
      return;
    }

    const delay = 1000 / speed;
    const timer = setInterval(() => {
      setStepIndex((s) => {
        if (s + 1 >= totalPossibleSteps) {
          setPlaying(false);
          return totalPossibleSteps;
        }
        return s + 1;
      });
    }, delay);

    return () => clearInterval(timer);
  }, [playing, isFinished, speed, totalPossibleSteps]);

  // Derive metrics at current playhead step
  const getSliceMetrics = (res: DiningResult) => {
    // If deadlocked before stepIndex, it stopped at deadlock.step
    const dl = res.deadlock.isDeadlocked && res.deadlock.step! <= stepIndex;
    const activeSteps = res.steps.slice(0, stepIndex);
    const lastRecord = activeSteps.length > 0 ? activeSteps[activeSteps.length - 1] : null;

    let meals = Array(philosophersCount).fill(0);
    if (lastRecord) {
      meals = lastRecord.philosopherStates.map((p) => p.meals);
    }
    const totalMeals = meals.reduce((a, b) => a + b, 0);
    const stepsRun = Math.min(stepIndex, res.steps.length);
    const throughput = stepsRun > 0 ? totalMeals / stepsRun : 0;
    const fairnessGap = Math.max(...meals, 0) - Math.min(...meals, 0);
    const zeroMeals = meals.filter((m) => m === 0).length;

    let status = "Running";
    if (dl) status = `DEADLOCK at step ${res.deadlock.step}`;
    else if (stepIndex >= maxSteps) status = "Finished";

    return {
      status,
      isDeadlocked: dl,
      deadlockStep: res.deadlock.step,
      stepsRun,
      meals,
      totalMeals,
      throughput,
      fairnessGap,
      zeroMeals,
      lastRecord,
    };
  };

  const currentMetrics = {
    naive: getSliceMetrics(fullRuns.naive),
    ordered: getSliceMetrics(fullRuns.ordered),
    limit: getSliceMetrics(fullRuns.limit),
    asymmetric: getSliceMetrics(fullRuns.asymmetric),
  };

  return (
    <div className="space-y-8">
      {/* Back link & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <Link to="/synchronization" className="hover:underline">
          ← back to Process Synchronization Hub
        </Link>
        <span className="font-mono text-xs">Multi-Strategy Concurrency Bench</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Process Synchronization comparison</h1>
          <p className="text-muted-foreground">
            Compare all 4 Dining Philosophers deadlock prevention strategies side by side on identical schedules.
          </p>
        </div>

        <Button variant="outline" onClick={handleLoadExample}>
          Load example
        </Button>
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
              setPhilosophersCount(Math.max(2, Math.min(10, Number(e.target.value) || 5)));
              resetRun();
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Think steps:</span>
          <input
            type="number"
            min={1}
            max={5}
            value={thinkSteps}
            onChange={(e) => {
              setThinkSteps(Math.max(1, Math.min(5, Number(e.target.value) || 1)));
              resetRun();
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Eat steps:</span>
          <input
            type="number"
            min={1}
            max={5}
            value={eatSteps}
            onChange={(e) => {
              setEatSteps(Math.max(1, Math.min(5, Number(e.target.value) || 1)));
              resetRun();
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Scheduler:</span>
          <select
            value={scheduler}
            onChange={(e) => {
              setScheduler(e.target.value as DiningSchedulerType);
              resetRun();
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          >
            <option value="round_robin">Round-Robin</option>
            <option value="random">Random (Seeded)</option>
          </select>
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Seed:</span>
          <input
            type="number"
            value={seed}
            onChange={(e) => {
              setSeed(Number(e.target.value) || 1);
              resetRun();
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
      </div>

      {/* Live Table: one row per strategy */}
      <div className="paper-card p-4 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/15 pb-2">
          <h2 className="font-hand text-2xl font-bold">
            Live Strategy Scoreboard {isFinished ? "(Final)" : `(Step ${stepIndex}/${totalPossibleSteps})`}
          </h2>
          {!showVerdict && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManualVerdictShown(true)}
              className="font-bold text-xs"
            >
              Show verdict now
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-foreground/20 text-muted-foreground text-left">
                <th className="px-3 py-2">Strategy</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Total Meals</th>
                <th className="px-3 py-2 text-center">Throughput</th>
                <th className="px-3 py-2 text-center">Fairness Gap</th>
                <th className="px-3 py-2 text-center">Zero Meals</th>
              </tr>
            </thead>
            <tbody>
              {(["naive", "ordered", "limit", "asymmetric"] as const).map((sKey) => {
                const met = currentMetrics[sKey];
                const isDl = met.isDeadlocked;

                return (
                  <tr
                    key={sKey}
                    className={`border-b border-foreground/10 ${
                      isDl ? "bg-destructive/10" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-bold uppercase">{sKey}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          isDl
                            ? "bg-destructive/20 text-destructive"
                            : met.status === "Finished"
                              ? "bg-success/20 text-success"
                              : "bg-highlight/30 text-foreground"
                        }`}
                      >
                        {met.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-primary">
                      {met.totalMeals}
                    </td>
                    <td className="px-3 py-2 text-center">{met.throughput.toFixed(4)}</td>
                    <td className="px-3 py-2 text-center">{met.fairnessGap}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">
                      {met.zeroMeals}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Visual Bar Comparison of Meals */}
        <div className="pt-3 space-y-2">
          <span className="text-muted-foreground">Meals Comparison Bar:</span>
          <div className="space-y-1.5">
            {(["naive", "ordered", "limit", "asymmetric"] as const).map((sKey) => {
              const met = currentMetrics[sKey];
              const maxPossible = Math.max(1, fullRuns.ordered.totalMeals, fullRuns.asymmetric.totalMeals);
              const pct = (met.totalMeals / maxPossible) * 100;
              return (
                <div key={sKey} className="flex items-center gap-2">
                  <span className="w-24 font-bold uppercase">{sKey}:</span>
                  <div className="h-4 flex-1 rounded bg-black/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        met.isDeadlocked ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-bold">{met.totalMeals} meals</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Best Strategy Verdict Card */}
      {verdict && (
        <div className="paper-card border-2 border-primary/40 bg-paper p-5 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="h-6 w-6" />
            <h2 className="font-hand text-3xl font-bold">
              Best strategy verdict {isFinished ? "(Final)" : "(Projected from full run)"}
            </h2>
          </div>

          <div className="rounded border border-foreground/20 bg-background/60 p-3 space-y-1 font-mono text-xs">
            <p className="text-muted-foreground uppercase text-[10px]">Winning Strategy</p>
            <p className="font-hand text-3xl font-bold text-success">
              {verdict.winner === "all_deadlocked"
                ? "All Strategies Deadlocked"
                : verdict.winner === "tie"
                  ? "TIE between top non-deadlocked strategies"
                  : `${verdict.winner.toUpperCase()} Strategy`}
            </p>
          </div>

          <div className="rounded border border-foreground/20 bg-background/50 p-4 font-mono text-xs text-foreground/90 space-y-2">
            <p className="font-bold text-primary font-hand text-xl">Why this strategy won:</p>
            <p className="leading-relaxed">{verdict.explanation}</p>
          </div>
        </div>
      )}

      {/* Synchronized 4-Table Chalkboard Grid */}
      <div className="chalkboard rounded-md p-6 space-y-6">
        {/* Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
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
            onClick={handleStep}
            disabled={isFinished}
          >
            <StepForward className="h-4 w-4" />
            Step
          </Button>
          <Button variant="outline" onClick={resetRun}>
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

        {/* Synchronized Step Label */}
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-chalk-foreground/20 bg-black/30 p-3 font-hand text-2xl text-chalk-foreground"
        >
          <p>
            Synchronized Step <span className="text-highlight font-bold">{stepIndex}</span> of {totalPossibleSteps}
          </p>
        </div>

        {/* 4 Small Tables in a 2x2 Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {(["naive", "ordered", "limit", "asymmetric"] as const).map((sKey) => {
            const met = currentMetrics[sKey];
            const forks = met.lastRecord?.forks ?? Array(philosophersCount).fill(null);
            const phils =
              met.lastRecord?.philosopherStates ??
              Array.from({ length: philosophersCount }, (_, i) => ({
                index: i,
                phase: "thinking",
                heldForks: [],
                waitingForFork: null,
                waitingForPermit: false,
                meals: 0,
              }));

            return (
              <div
                key={sKey}
                className="rounded border border-chalk-foreground/20 bg-black/25 p-3 space-y-2 text-center"
              >
                <div className="flex items-center justify-between text-chalk-foreground">
                  <span className="font-hand text-xl font-bold uppercase">{sKey}</span>
                  <span
                    className={`font-mono text-[10px] rounded px-1.5 py-0.5 ${
                      met.isDeadlocked
                        ? "bg-destructive text-destructive-foreground font-bold"
                        : "bg-chalk-foreground/20 text-chalk-foreground"
                    }`}
                  >
                    {met.totalMeals} meals
                  </span>
                </div>

                <DiningTableSvg
                  philosophers={phils}
                  forks={forks}
                  roomPermits={sKey === "limit" ? met.lastRecord?.roomPermitsAvailable ?? philosophersCount - 1 : undefined}
                  strategy={sKey}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Calculations Dialog */}
      <DiningCalculationsDialog
        open={calculationsOpen}
        onOpenChange={setCalculationsOpen}
        result={fullRuns.ordered}
      />
    </div>
  );
}
