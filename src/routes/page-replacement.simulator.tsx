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
  EatCalculator,
  FrameSweepView,
  FrameTable,
  PagingCalculationsDialog,
  PagingResultsPanel,
} from "@/components/PagingDetails";
import { Button } from "@/components/ui/button";
import {
  findBelady,
  frameSweep,
  simulatePaging,
  type PagingAlgorithm,
} from "@/lib/paging";
import { assignPageColors } from "@/lib/palette";

export const Route = createFileRoute("/page-replacement/simulator")({
  head: () => ({
    meta: [
      { title: "Page Replacement Simulator | OS Playground" },
      {
        name: "description",
        content:
          "Simulate FIFO, LRU, and Optimal page replacement algorithms frame by frame with live fault counts and Belady anomaly detection.",
      },
      { property: "og:title", content: "Page Replacement Simulator | OS Playground" },
      {
        property: "og:description",
        content:
          "Simulate FIFO, LRU, and Optimal page replacement algorithms frame by frame with live fault counts and Belady anomaly detection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PageReplacementSimulatorPage,
});

const DEFAULT_REFS_STR = "7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1";
const DEFAULT_FRAMES = 3;
const SPEEDS = [0.5, 1, 2, 4] as const;

function parseReferenceString(raw: string): { refs: number[]; error: string | null } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { refs: [], error: "Reference string cannot be empty." };
  }
  const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) {
    return { refs: [], error: "Reference string cannot be empty." };
  }
  if (tokens.length > 40) {
    return { refs: [], error: "Reference string must have at most 40 numbers (length 1 to 40)." };
  }

  const numbers: number[] = [];
  for (const token of tokens) {
    const num = Number(token);
    if (!Number.isInteger(num) || num < 0 || num > 99) {
      return {
        refs: [],
        error: `Invalid page '${token}'. Pages must be integers between 0 and 99.`,
      };
    }
    numbers.push(num);
  }

  return { refs: numbers, error: null };
}

function generateLocalityString(length: number): number[] {
  // Use a working set of 5-7 pages with locality
  const workingSetSize = 6;
  const pool = [0, 1, 2, 3, 4, 5, 6, 7];
  const activeWorkingSet = pool.slice(0, workingSetSize);
  const result: number[] = [];

  let currentWorkingSet = [...activeWorkingSet];

  for (let i = 0; i < length; i++) {
    // 75% chance to pick from current working set (locality)
    if (Math.random() < 0.75 && currentWorkingSet.length > 0) {
      const idx = Math.floor(Math.random() * currentWorkingSet.length);
      result.push(currentWorkingSet[idx]!);
    } else {
      // 25% chance of random page or shifting working set
      const randPage = Math.floor(Math.random() * 8);
      result.push(randPage);
      if (Math.random() < 0.3) {
        // Shift working set
        currentWorkingSet[Math.floor(Math.random() * currentWorkingSet.length)] = randPage;
      }
    }
  }

  return result;
}

function PageReplacementSimulatorPage() {
  const [algorithm, setAlgorithm] = useState<PagingAlgorithm>("fifo");
  const [refsStr, setRefsStr] = useState<string>(DEFAULT_REFS_STR);
  const [frameCountStr, setFrameCountStr] = useState<string>(String(DEFAULT_FRAMES));
  const [frameCount, setFrameCount] = useState<number>(DEFAULT_FRAMES);

  const [randomLen, setRandomLen] = useState<number>(20);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [calculationsOpen, setCalculationsOpen] = useState<boolean>(false);
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);

  // EAT calculator parameters
  const [eatMemoryNs, setEatMemoryNs] = useState<number>(200);
  const [eatFaultMs, setEatFaultMs] = useState<number>(8);

  const parsed = useMemo(() => parseReferenceString(refsStr), [refsStr]);
  const isValid = parsed.error === null && parsed.refs.length > 0 && frameCount >= 1 && frameCount <= 10;

  const simulation = useMemo(() => {
    if (!isValid) return null;
    return simulatePaging(algorithm, parsed.refs, frameCount);
  }, [algorithm, parsed.refs, frameCount, isValid]);

  const colors = useMemo(() => {
    if (!parsed.refs.length) return {};
    return assignPageColors(parsed.refs);
  }, [parsed.refs]);

  const sweep = useMemo(() => {
    if (!isValid) return [];
    return frameSweep(algorithm, parsed.refs, 10);
  }, [algorithm, parsed.refs, isValid]);

  const beladyAnomalies = useMemo(() => {
    if (!isValid || algorithm !== "fifo") return [];
    return findBelady(parsed.refs, 10, "fifo");
  }, [algorithm, parsed.refs, isValid]);

  const totalSteps = simulation ? simulation.steps.length : 0;
  const isFinished = stepIndex >= totalSteps;

  const resetRun = () => {
    setPlaying(false);
    setStepIndex(0);
  };

  const handleFramesApply = () => {
    const parsedF = Math.max(1, Math.min(10, Number(frameCountStr) || 3));
    setFrameCount(parsedF);
    setFrameCountStr(String(parsedF));
    resetRun();
  };

  const handleLoadExample = () => {
    setRefsStr(DEFAULT_REFS_STR);
    setFrameCount(DEFAULT_FRAMES);
    setFrameCountStr(String(DEFAULT_FRAMES));
    resetRun();
  };

  const handleRandom = () => {
    const len = Math.max(5, Math.min(40, randomLen));
    const generated = generateLocalityString(len);
    setRefsStr(generated.join(" "));
    resetRun();
  };

  // Stepping logic
  const handleStep = () => {
    if (!simulation || isFinished) return;
    setStepIndex((s) => Math.min(totalSteps, s + 1));
  };

  // Auto-play timer
  useEffect(() => {
    if (!playing || !simulation || isFinished) {
      if (isFinished && playing) setPlaying(false);
      return;
    }
    const delay = 1000 / speed;
    const timer = setInterval(() => {
      setStepIndex((s) => {
        if (s + 1 >= totalSteps) {
          setPlaying(false);
          return totalSteps;
        }
        return s + 1;
      });
    }, delay);
    return () => clearInterval(timer);
  }, [playing, simulation, isFinished, speed, totalSteps]);

  // Current step details for live narration
  const currentStep = simulation && stepIndex > 0 ? simulation.steps[stepIndex - 1] : null;

  return (
    <div className="space-y-8">
      {/* Back link & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <Link to="/page-replacement" className="hover:underline">
          ← back to Page Replacement
        </Link>
        <span className="font-mono text-xs">Demand Paging &amp; Virtual Memory</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Page Replacement simulator</h1>
          <p className="text-muted-foreground">
            Watch pages enter and leave memory frames across FIFO, LRU, and Optimal algorithms.
          </p>
        </div>

        {/* Quick parameters input */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
          <label className="flex items-center gap-2">
            frames (1–10)
            <input
              aria-label="Number of frames"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              value={frameCountStr}
              onChange={(e) => {
                setFrameCountStr(e.target.value);
                resetRun();
              }}
              onBlur={handleFramesApply}
              className="w-16 rounded-md border-2 border-input bg-paper p-2 text-center text-base focus:border-primary focus:outline-none"
            />
          </label>
          <Button variant="outline" onClick={handleFramesApply}>
            Apply
          </Button>
          <Button variant="outline" onClick={handleLoadExample}>
            Load example
          </Button>
        </div>
      </div>

      {/* Algorithm selector */}
      <div className="paper-card p-4 space-y-3">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Select Algorithm
        </span>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            {
              id: "fifo",
              name: "FIFO",
              desc: "First-In, First-Out: evicts the page that has been in memory the longest.",
            },
            {
              id: "lru",
              name: "LRU",
              desc: "Least Recently Used: evicts the page whose last access was farthest in the past.",
            },
            {
              id: "optimal",
              name: "Optimal (MIN)",
              desc: "Optimal: evicts the page whose next access is farthest in the future (benchmark).",
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setAlgorithm(item.id as PagingAlgorithm);
                resetRun();
              }}
              className={`press paper-card flex min-h-[44px] flex-col p-3 text-left transition-colors ${
                algorithm === item.id ? "bg-highlight ring-2 ring-primary" : "hover:bg-paper/70"
              }`}
            >
              <span className="font-hand text-xl font-bold">{item.name}</span>
              <span className="mt-1 text-xs text-muted-foreground">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Reference string input & chip preview */}
      <div className="paper-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="ref-input" className="font-hand text-2xl font-bold">
            Reference String (0–99, length 1–40)
          </label>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span>random len:</span>
            <input
              type="number"
              min={5}
              max={40}
              value={randomLen}
              onChange={(e) => setRandomLen(Number(e.target.value) || 20)}
              className="w-14 rounded border border-input bg-background p-1 text-center"
            />
            <Button variant="outline" size="sm" onClick={handleRandom}>
              <Dices className="h-3.5 w-3.5 mr-1" /> Random
            </Button>
          </div>
        </div>

        <input
          id="ref-input"
          type="text"
          value={refsStr}
          onChange={(e) => {
            setRefsStr(e.target.value);
            resetRun();
          }}
          placeholder="e.g. 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1"
          className="w-full rounded-md border-2 border-input bg-background p-2.5 font-mono text-sm focus:border-primary focus:outline-none"
        />

        {parsed.error && (
          <p role="alert" className="font-mono text-xs text-destructive font-bold">
            ⚠️ {parsed.error}
          </p>
        )}

        {/* Chips preview */}
        {parsed.refs.length > 0 && !parsed.error && (
          <div className="space-y-1">
            <span className="font-mono text-xs text-muted-foreground">
              Reference sequence chips ({parsed.refs.length} references):
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parsed.refs.map((ref, idx) => {
                const color = colors[ref];
                const isCurrent = idx === stepIndex - 1;
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center justify-center rounded px-2 py-0.5 font-mono text-xs font-bold transition-all ${
                      isCurrent ? "ring-2 ring-primary scale-110" : ""
                    }`}
                    style={{
                      backgroundColor: color?.bg ?? "#e2e8f0",
                      color: color?.ink ?? "#0f172a",
                    }}
                  >
                    {ref}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Chalkboard Stage with Control Bar, Narration & Frame Table */}
      <div className="chalkboard rounded-md p-6 space-y-6">
        {/* Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={!isValid || totalSteps === 0}
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
            onClick={() => {
              setPlaying(false);
              setCalculationsOpen(true);
            }}
          >
            <Calculator className="h-4 w-4" />
            Calculations
          </Button>
          <Button
            variant="outline"
            onClick={handleStep}
            disabled={!isValid || isFinished || totalSteps === 0}
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
            <span className="px-1 text-chalk-muted">Speed:</span>
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

        {/* Live step narration */}
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-chalk-foreground/20 bg-black/30 p-3 font-hand text-2xl text-chalk-foreground"
        >
          {currentStep ? (
            <div className="space-y-1">
              <p>
                <span className="font-bold text-highlight">Step {currentStep.stepNumber}:</span>{" "}
                {currentStep.reason}
              </p>
              {algorithm === "optimal" && (
                <p className="font-mono text-xs text-chalk-foreground">
                  Resident next uses:{" "}
                  {Object.entries(currentStep.nextUseMap)
                    .map(([p, nu]) => `${p}: ${nu === "never" ? "never" : `next at position ${Number(nu) + 1}`}`)
                    .join(", ")}
                </p>
              )}
            </div>
          ) : (
            <p className="text-chalk-muted">Press Play or Step to begin simulation.</p>
          )}
        </div>

        {/* Frame Table */}
        {simulation && (
          <FrameTable
            result={simulation}
            currentStepIndex={stepIndex}
            colors={colors}
            title={`${algorithm.toUpperCase()} Frame Allocation Table (${frameCount} frames)`}
          />
        )}
      </div>

      {/* Live Results Panel */}
      {simulation && (
        <PagingResultsPanel result={simulation} currentStepIndex={stepIndex} />
      )}

      {/* Frame Sweep & Belady Anomaly View */}
      {sweep.length > 0 && (
        <FrameSweepView sweep={sweep} selectedFrames={frameCount} algorithm={algorithm} />
      )}

      {/* Effective Access Time Mini-Calculator */}
      {simulation && (
        <EatCalculator
          faultRatio={simulation.faultRatio}
          memoryNs={eatMemoryNs}
          setMemoryNs={setEatMemoryNs}
          faultMs={eatFaultMs}
          setFaultMs={setEatFaultMs}
        />
      )}

      {/* Calculations Dialog */}
      {simulation && (
        <PagingCalculationsDialog
          open={calculationsOpen}
          onOpenChange={setCalculationsOpen}
          result={simulation}
          eatMemoryNs={eatMemoryNs}
          eatFaultMs={eatFaultMs}
        />
      )}
    </div>
  );
}
