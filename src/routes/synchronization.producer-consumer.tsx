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
  PcBufferRing,
  PcCalculationsDialog,
  PcSemaphoreGauges,
  PcThreadCard,
} from "@/components/SyncPcDetails";
import { Button } from "@/components/ui/button";
import {
  PCSimulation,
  type PCConfig,
  type PCMode,
  type PCSchedulerType,
  type PCStepRecord,
} from "@/lib/sync/pc";

export const Route = createFileRoute("/synchronization/producer-consumer")({
  head: () => ({
    meta: [
      { title: "Producer-Consumer Simulator | OS Playground" },
      {
        name: "description",
        content:
          "Simulate the classical bounded buffer producer-consumer problem with counting and binary semaphores, race condition detection, and deadlocks.",
      },
      { property: "og:title", content: "Producer-Consumer Simulator | OS Playground" },
      {
        property: "og:description",
        content:
          "Simulate the classical bounded buffer producer-consumer problem with counting and binary semaphores, race condition detection, and deadlocks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProducerConsumerSimulatorPage,
});

const SPEEDS = [0.5, 1, 2, 4] as const;

function ProducerConsumerSimulatorPage() {
  const [bufferSize, setBufferSize] = useState<number>(3);
  const [producers, setProducers] = useState<number>(2);
  const [consumers, setConsumers] = useState<number>(2);
  const [itemsPerProducer, setItemsPerProducer] = useState<number>(4);
  const [mode, setMode] = useState<PCMode>("correct");
  const [scheduler, setScheduler] = useState<PCSchedulerType>("random");
  const [seed, setSeed] = useState<number>(1);

  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [calculationsOpen, setCalculationsOpen] = useState<boolean>(false);

  // Active running simulation instance
  const [sim, setSim] = useState<PCSimulation>(() => {
    return new PCSimulation({
      bufferSize: 3,
      producers: 2,
      consumers: 2,
      itemsPerProducer: 4,
      mode: "correct",
      scheduler: "random",
      seed: 1,
    });
  });

  const [history, setHistory] = useState<PCStepRecord[]>([]);
  const [lastStep, setLastStep] = useState<PCStepRecord | null>(null);

  const isFinished = sim.isAllFinished() || sim.deadlock.isDeadlocked;

  const resetRun = (newConfig?: Partial<PCConfig>) => {
    setPlaying(false);
    const cfg: PCConfig = {
      bufferSize: newConfig?.bufferSize ?? bufferSize,
      producers: newConfig?.producers ?? producers,
      consumers: newConfig?.consumers ?? consumers,
      itemsPerProducer: newConfig?.itemsPerProducer ?? itemsPerProducer,
      mode: newConfig?.mode ?? mode,
      scheduler: newConfig?.scheduler ?? scheduler,
      seed: newConfig?.seed ?? seed,
    };
    const newSim = new PCSimulation(cfg);
    setSim(newSim);
    setHistory([]);
    setLastStep(null);
  };

  const handleLoadExample = () => {
    setBufferSize(3);
    setProducers(2);
    setConsumers(2);
    setItemsPerProducer(4);
    setMode("correct");
    setScheduler("random");
    setSeed(1);
    resetRun({
      bufferSize: 3,
      producers: 2,
      consumers: 2,
      itemsPerProducer: 4,
      mode: "correct",
      scheduler: "random",
      seed: 1,
    });
  };

  const stepForward = (explicitThreadId?: string) => {
    if (isFinished) return;
    const nextId = explicitThreadId ?? sim.pickNextThreadId();
    if (!nextId) return;

    const record = sim.executeStep(nextId);
    setHistory((prev) => [...prev, record]);
    setLastStep(record);
  };

  // Playback interval
  useEffect(() => {
    if (!playing || isFinished) {
      if (isFinished && playing) setPlaying(false);
      return;
    }

    const delay = 1000 / speed;
    const timer = setInterval(() => {
      const nextId = sim.pickNextThreadId();
      if (!nextId) {
        setPlaying(false);
        return;
      }
      const record = sim.executeStep(nextId);
      setHistory((prev) => [...prev, record]);
      setLastStep(record);

      if (sim.isAllFinished() || sim.deadlock.isDeadlocked) {
        setPlaying(false);
      }
    }, delay);

    return () => clearInterval(timer);
  }, [playing, isFinished, speed, sim]);

  const allThreadsList = Array.from(sim.threads.values());

  return (
    <div className="space-y-8">
      {/* Back link & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <Link to="/synchronization" className="hover:underline">
          ← back to Process Synchronization Hub
        </Link>
        <span className="font-mono text-xs">Bounded Buffer Synchronization</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Producer-Consumer simulator</h1>
          <p className="text-muted-foreground">
            Step through counting semaphores (empty/full) and mutual exclusion locks on a shared buffer.
          </p>
        </div>

        <Button variant="outline" onClick={handleLoadExample}>
          Load example
        </Button>
      </div>

      {/* Configuration Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Buffer size N (1–10):</span>
          <input
            type="number"
            min={1}
            max={10}
            value={bufferSize}
            onChange={(e) => {
              const v = Math.max(1, Math.min(10, Number(e.target.value) || 3));
              setBufferSize(v);
              resetRun({ bufferSize: v });
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Producers (1–4):</span>
          <input
            type="number"
            min={1}
            max={4}
            value={producers}
            onChange={(e) => {
              const v = Math.max(1, Math.min(4, Number(e.target.value) || 1));
              setProducers(v);
              resetRun({ producers: v });
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Consumers (1–4):</span>
          <input
            type="number"
            min={1}
            max={4}
            value={consumers}
            onChange={(e) => {
              const v = Math.max(1, Math.min(4, Number(e.target.value) || 1));
              setConsumers(v);
              resetRun({ consumers: v });
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
        <label className="paper-card p-3 space-y-1">
          <span className="text-muted-foreground">Items per producer (1–10):</span>
          <input
            type="number"
            min={1}
            max={10}
            value={itemsPerProducer}
            onChange={(e) => {
              const v = Math.max(1, Math.min(10, Number(e.target.value) || 1));
              setItemsPerProducer(v);
              resetRun({ itemsPerProducer: v });
            }}
            className="w-full rounded border border-input bg-background p-1.5 text-sm"
          />
        </label>
      </div>

      {/* Mode & Scheduler selector */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="paper-card p-4 space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Synchronization Mode
          </span>
          <div className="space-y-1.5 text-xs font-mono">
            {[
              { id: "correct", name: "1. Correct Semaphores", desc: "Standard Dijkstra empty, full, mutex implementation (no bugs)." },
              { id: "no_mutex", name: "2. No Mutex", desc: "Omits mutex lock: allows concurrent buffer writes/reads (race condition)." },
              { id: "no_empty_full", name: "3. No Empty / Full", desc: "Omits empty & full semaphores: allows buffer overflow & empty reads." },
              { id: "swapped_waits", name: "4. Swapped Waits", desc: "Producer does wait(mutex) before wait(empty): causes deadlock when full!" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id as PCMode);
                  resetRun({ mode: m.id as PCMode });
                }}
                className={`w-full text-left p-2 rounded transition-colors ${
                  mode === m.id ? "bg-highlight font-bold ring-1 ring-primary" : "hover:bg-muted"
                }`}
              >
                <p className="font-bold">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="paper-card p-4 space-y-3 font-mono text-xs">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Thread Scheduler
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "round_robin", label: "Round-Robin" },
              { id: "random", label: "Random (Seeded)" },
              { id: "manual", label: "Manual (Click Steps)" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setScheduler(s.id as PCSchedulerType);
                  resetRun({ scheduler: s.id as PCSchedulerType });
                }}
                className={`press paper-card px-3 py-1.5 text-xs font-bold ${
                  scheduler === s.id ? "bg-highlight" : ""
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <span className="text-muted-foreground">Seed:</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => {
                const s = Number(e.target.value) || 1;
                setSeed(s);
                resetRun({ seed: s });
              }}
              className="w-20 rounded border border-input bg-background p-1 text-center"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const s = Math.floor(Math.random() * 10000) + 1;
                setSeed(s);
                resetRun({ seed: s });
              }}
            >
              <Dices className="h-3.5 w-3.5 mr-1" /> New Seed
            </Button>
          </div>
        </div>
      </div>

      {/* Violation Banner */}
      {sim.violations.length > 0 && (
        <div role="alert" className="paper-card border-2 border-primary bg-highlight/30 p-4 space-y-1 font-mono text-xs">
          <p className="font-bold font-hand text-2xl text-foreground">
            ⚠️ Synchronization Bug Detected ({sim.violations.length} violation{sim.violations.length === 1 ? "" : "s"})
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {sim.violations.slice(-3).map((v, idx) => (
              <li key={idx}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Deadlock Banner */}
      {sim.deadlock.isDeadlocked && (
        <div role="alert" className="paper-card border-2 border-destructive bg-destructive/10 p-4 space-y-1 font-mono text-xs">
          <p className="font-bold font-hand text-2xl text-destructive">
            ⛔ Deadlock Formed at Step {sim.deadlock.step}!
          </p>
          <p className="text-foreground/90">{sim.deadlock.reason}</p>
        </div>
      )}

      {/* Chalkboard Stage with Control Bar, Gauges, Buffer & Narration */}
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
              <span className="font-bold text-highlight">Step {lastStep.step} ({lastStep.threadId}):</span>{" "}
              {lastStep.description}
            </p>
          ) : (
            <p className="text-chalk-foreground/70">
              Press Play or Step to start thread scheduling. Buffer is empty.
            </p>
          )}
        </div>

        {/* Semaphore Gauges */}
        <PcSemaphoreGauges
          empty={sim.emptySem.value}
          full={sim.fullSem.value}
          mutex={sim.mutexSem.value}
          emptyQueue={sim.emptySem.queue}
          fullQueue={sim.fullSem.queue}
          mutexQueue={sim.mutexSem.queue}
        />

        {/* Buffer Ring Visual */}
        <PcBufferRing
          buffer={sim.buffer}
          inPtr={sim.inPtr}
          outPtr={sim.outPtr}
        />
      </div>

      {/* Threads Overview Cards */}
      <div className="space-y-3">
        <h2 className="font-hand text-3xl font-bold">Active Thread Micro-Programs</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {allThreadsList.map((th) => (
            <PcThreadCard
              key={th.id}
              thread={th}
              isManual={scheduler === "manual"}
              onRunStep={(tid) => stepForward(tid)}
            />
          ))}
        </div>
      </div>

      {/* Calculations Dialog */}
      <PcCalculationsDialog
        open={calculationsOpen}
        onOpenChange={setCalculationsOpen}
        itemsProduced={sim.itemsProduced}
        itemsConsumed={sim.itemsConsumed}
        totalSteps={sim.stepCount}
        maxOccupancy={sim.maxOccupancy}
        averageOccupancy={sim.stepCount > 0 ? sim.occupancySum / sim.stepCount : 0}
        violations={sim.violations}
      />
    </div>
  );
}
