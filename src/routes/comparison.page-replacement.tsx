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
import { FrameTable, PagingCalculationsDialog } from "@/components/PagingDetails";
import { Button } from "@/components/ui/button";
import {
  findBelady,
  frameSweep,
  pickBest,
  simulatePaging,
  type FrameSweepEntry,
  type PagingComparisonVerdict,
  type PagingResult,
} from "@/lib/paging";
import { assignPageColors } from "@/lib/palette";

export const Route = createFileRoute("/comparison/page-replacement")({
  head: () => ({
    meta: [
      { title: "Page Replacement Comparison | OS Playground" },
      {
        name: "description",
        content:
          "Compare FIFO, LRU, and Optimal page replacement algorithms side by side with synchronized frame step execution and automated best algorithm verdict.",
      },
      { property: "og:title", content: "Page Replacement Comparison | OS Playground" },
      {
        property: "og:description",
        content:
          "Compare FIFO, LRU, and Optimal page replacement algorithms side by side with synchronized frame step execution and automated best algorithm verdict.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PageReplacementComparisonPage,
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
  const pool = [0, 1, 2, 3, 4, 5, 6, 7];
  const activeWorkingSet = pool.slice(0, 6);
  const result: number[] = [];
  let currentWorkingSet = [...activeWorkingSet];

  for (let i = 0; i < length; i++) {
    if (Math.random() < 0.75 && currentWorkingSet.length > 0) {
      const idx = Math.floor(Math.random() * currentWorkingSet.length);
      result.push(currentWorkingSet[idx]!);
    } else {
      const randPage = Math.floor(Math.random() * 8);
      result.push(randPage);
      if (Math.random() < 0.3) {
        currentWorkingSet[Math.floor(Math.random() * currentWorkingSet.length)] = randPage;
      }
    }
  }
  return result;
}

export function PageReplacementComparisonPage() {
  const [refsStr, setRefsStr] = useState<string>(DEFAULT_REFS_STR);
  const [frameCountStr, setFrameCountStr] = useState<string>(String(DEFAULT_FRAMES));
  const [frameCount, setFrameCount] = useState<number>(DEFAULT_FRAMES);

  const [randomLen, setRandomLen] = useState<number>(20);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [calculationsOpen, setCalculationsOpen] = useState<boolean>(false);
  const [manualVerdictShown, setManualVerdictShown] = useState<boolean>(false);

  const parsed = useMemo(() => parseReferenceString(refsStr), [refsStr]);
  const isValid = parsed.error === null && parsed.refs.length > 0 && frameCount >= 1 && frameCount <= 10;

  const results = useMemo(() => {
    if (!isValid) return null;
    return {
      fifo: simulatePaging("fifo", parsed.refs, frameCount),
      lru: simulatePaging("lru", parsed.refs, frameCount),
      optimal: simulatePaging("optimal", parsed.refs, frameCount),
    };
  }, [parsed.refs, frameCount, isValid]);

  const colors = useMemo(() => {
    if (!parsed.refs.length) return {};
    return assignPageColors(parsed.refs);
  }, [parsed.refs]);

  const verdict = useMemo(() => {
    if (!results) return null;
    return pickBest(results);
  }, [results]);

  const sweep3 = useMemo(() => {
    if (!isValid) return null;
    const fSweep = frameSweep("fifo", parsed.refs, 10);
    const lSweep = frameSweep("lru", parsed.refs, 10);
    const oSweep = frameSweep("optimal", parsed.refs, 10);
    const belady = findBelady(parsed.refs, 10, "fifo");
    return { fSweep, lSweep, oSweep, belady };
  }, [parsed.refs, isValid]);

  const totalSteps = parsed.refs.length;
  const isFinished = stepIndex >= totalSteps;
  const showVerdict = isFinished || manualVerdictShown;

  const resetRun = () => {
    setPlaying(false);
    setStepIndex(0);
    setManualVerdictShown(false);
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

  const handleStep = () => {
    if (!results || isFinished) return;
    setStepIndex((s) => Math.min(totalSteps, s + 1));
  };

  // Synchronized playback
  useEffect(() => {
    if (!playing || !results || isFinished) {
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
  }, [playing, results, isFinished, speed, totalSteps]);

  // Live metrics calculation up to current stepIndex
  const activeMetrics = useMemo(() => {
    if (!results) return null;
    const compute = (r: PagingResult) => {
      const active = r.steps.slice(0, stepIndex);
      const faults = active.filter((s) => !s.hit).length;
      const hits = active.filter((s) => s.hit).length;
      const total = active.length;
      const faultRatio = total > 0 ? (faults / total) * 100 : 0;
      const hitRatio = total > 0 ? (hits / total) * 100 : 0;
      return { faults, hits, faultRatio, hitRatio };
    };

    const fifoM = compute(results.fifo);
    const lruM = compute(results.lru);
    const optM = compute(results.optimal);

    return {
      fifo: { ...fifoM, gap: fifoM.faults - optM.faults },
      lru: { ...lruM, gap: lruM.faults - optM.faults },
      optimal: { ...optM, gap: 0 },
    };
  }, [results, stepIndex]);

  return (
    <div className="space-y-8">
      {/* Back link & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <Link to="/page-replacement" className="hover:underline">
          ← back to Page Replacement Hub
        </Link>
        <span className="font-mono text-xs">Simultaneous Tri-Algorithm Bench</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Page Replacement comparison</h1>
          <p className="text-muted-foreground">
            Run FIFO, LRU, and Optimal simultaneously on the exact same reference workload side by side.
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

      {/* Reference string input & controls */}
      <div className="paper-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="ref-input-comp" className="font-hand text-2xl font-bold">
            Workload Reference String (0–99, length 1–40)
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
          id="ref-input-comp"
          type="text"
          value={refsStr}
          onChange={(e) => {
            setRefsStr(e.target.value);
            resetRun();
          }}
          className="w-full rounded-md border-2 border-input bg-background p-2.5 font-mono text-sm focus:border-primary focus:outline-none"
        />

        {parsed.error && (
          <p role="alert" className="font-mono text-xs text-destructive font-bold">
            ⚠️ {parsed.error}
          </p>
        )}
      </div>

      {/* Scoreboard & Live comparison table */}
      {activeMetrics && (
        <div className="paper-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/15 pb-2">
            <h2 className="font-hand text-2xl font-bold">
              Algorithm Scoreboard {isFinished ? "(Final)" : `(t = ${stepIndex}/${totalSteps})`}
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
                  <th className="px-3 py-2">Algorithm</th>
                  <th className="px-3 py-2 text-center">Faults so far</th>
                  <th className="px-3 py-2 text-center">Hits</th>
                  <th className="px-3 py-2 text-center">Hit Ratio</th>
                  <th className="px-3 py-2 text-center">Fault Ratio</th>
                  <th className="px-3 py-2 text-center">Extra Faults vs Optimal</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-foreground/10">
                  <td className="px-3 py-2 font-bold">FIFO</td>
                  <td className="px-3 py-2 text-center font-bold text-primary">
                    {activeMetrics.fifo.faults}
                  </td>
                  <td className="px-3 py-2 text-center text-success">{activeMetrics.fifo.hits}</td>
                  <td className="px-3 py-2 text-center">{activeMetrics.fifo.hitRatio.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center">{activeMetrics.fifo.faultRatio.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center">
                    +{activeMetrics.fifo.gap}
                  </td>
                </tr>
                <tr className="border-b border-foreground/10">
                  <td className="px-3 py-2 font-bold">LRU</td>
                  <td className="px-3 py-2 text-center font-bold text-primary">
                    {activeMetrics.lru.faults}
                  </td>
                  <td className="px-3 py-2 text-center text-success">{activeMetrics.lru.hits}</td>
                  <td className="px-3 py-2 text-center">{activeMetrics.lru.hitRatio.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center">{activeMetrics.lru.faultRatio.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center">
                    +{activeMetrics.lru.gap}
                  </td>
                </tr>
                <tr className="bg-highlight/10 font-bold">
                  <td className="px-3 py-2">Optimal (Benchmark)</td>
                  <td className="px-3 py-2 text-center text-primary">
                    {activeMetrics.optimal.faults}
                  </td>
                  <td className="px-3 py-2 text-center text-success">{activeMetrics.optimal.hits}</td>
                  <td className="px-3 py-2 text-center">{activeMetrics.optimal.hitRatio.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center">{activeMetrics.optimal.faultRatio.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">0 (lower bound)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Simple Visual Bar Comparison */}
          <div className="pt-3 space-y-2">
            <span className="font-mono text-xs text-muted-foreground">Fault comparison bar:</span>
            <div className="space-y-1.5 font-mono text-xs">
              {[
                { name: "FIFO", val: activeMetrics.fifo.faults, color: "bg-primary" },
                { name: "LRU", val: activeMetrics.lru.faults, color: "bg-success" },
                { name: "Optimal", val: activeMetrics.optimal.faults, color: "bg-highlight" },
              ].map((item) => {
                const maxF = Math.max(1, totalSteps);
                const pct = (item.val / maxF) * 100;
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-16 font-bold">{item.name}:</span>
                    <div className="h-4 flex-1 rounded bg-black/10 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${item.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-bold">{item.val} faults</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Best Algorithm Verdict Card */}
      {verdict && (
        <div className="paper-card border-2 border-primary/40 bg-paper p-5 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="h-6 w-6" />
            <h2 className="font-hand text-3xl font-bold">
              Best algorithm verdict {isFinished ? "(Final)" : "(Projected from full run)"}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 font-mono text-xs">
            <div className="rounded border border-foreground/20 bg-background/60 p-3 space-y-1">
              <p className="text-muted-foreground uppercase text-[10px]">Best Possible (Theoretical)</p>
              <p className="font-hand text-2xl font-bold text-primary">Optimal Algorithm</p>
              <p className="text-muted-foreground">
                Lowest possible faults ({results?.optimal.faults}), but requires prescient future knowledge. Unusable in production OS kernels.
              </p>
            </div>
            <div className="rounded border border-foreground/20 bg-background/60 p-3 space-y-1">
              <p className="text-muted-foreground uppercase text-[10px]">Best Practical (Production)</p>
              <p className="font-hand text-2xl font-bold text-success">
                {verdict.bestPractical === "tie"
                  ? "TIE: FIFO and LRU Equal"
                  : `${verdict.bestPractical.toUpperCase()} Algorithm`}
              </p>
              <p className="text-muted-foreground">
                {verdict.bestPractical === "lru"
                  ? `LRU wins with ${results?.lru.faults} faults (outperforming FIFO by ${verdict.gapFifo - verdict.gapLru} faults).`
                  : verdict.bestPractical === "fifo"
                    ? `FIFO wins with ${results?.fifo.faults} faults.`
                    : `Both algorithms produced exactly ${results?.fifo.faults} faults.`}
              </p>
            </div>
          </div>

          <div className="rounded border border-foreground/20 bg-background/50 p-4 font-mono text-xs text-foreground/90 space-y-2">
            <p className="font-bold text-primary font-hand text-xl">Why this algorithm won:</p>
            <p className="leading-relaxed">{verdict.explanation}</p>
          </div>
        </div>
      )}

      {/* Synchronized 3-Algorithm Chalkboard Stage */}
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

        {/* Playhead status */}
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-chalk-foreground/20 bg-black/30 p-3 font-hand text-2xl text-chalk-foreground"
        >
          {stepIndex > 0 ? (
            <p>
              Synchronized Playhead at Reference{" "}
              <span className="text-highlight font-bold">{stepIndex}</span> of {totalSteps}: Page{" "}
              <span className="text-highlight font-bold">{parsed.refs[stepIndex - 1]}</span>
            </p>
          ) : (
            <p className="text-chalk-foreground/70">Press Play or Step to advance all three algorithms synchronously.</p>
          )}
        </div>

        {/* 3 Stacked Frame Tables */}
        {results && (
          <div className="space-y-6">
            <FrameTable
              result={results.fifo}
              currentStepIndex={stepIndex}
              colors={colors}
              title="1. FIFO (First-In, First-Out)"
            />
            <FrameTable
              result={results.lru}
              currentStepIndex={stepIndex}
              colors={colors}
              title="2. LRU (Least Recently Used)"
            />
            <FrameTable
              result={results.optimal}
              currentStepIndex={stepIndex}
              colors={colors}
              title="3. Optimal (Theoretical Benchmark)"
            />
          </div>
        )}
      </div>

      {/* Side-by-side Frame Sweep Table across all 3 algorithms */}
      {sweep3 && (
        <div className="paper-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-foreground/15 pb-2">
            <h3 className="font-hand text-2xl font-bold">
              Multi-Algorithm Frame Sweep (1 to 10 Frames)
            </h3>
            <span className="font-mono text-xs text-muted-foreground">
              Fault sensitivity comparison
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-foreground/20 text-muted-foreground text-left">
                  <th className="px-2 py-1">Frames</th>
                  <th className="px-2 py-1 text-center">FIFO Faults</th>
                  <th className="px-2 py-1 text-center">LRU Faults</th>
                  <th className="px-2 py-1 text-center">Optimal Faults</th>
                  <th className="px-2 py-1 text-left">Belady Check (FIFO)</th>
                </tr>
              </thead>
              <tbody>
                {sweep3.fSweep.map((row, idx) => {
                  const lRow = sweep3.lSweep[idx]!;
                  const oRow = sweep3.oSweep[idx]!;
                  const isSelected = row.frames === frameCount;
                  const prevF = idx > 0 ? sweep3.fSweep[idx - 1] : null;
                  const isBelady = prevF !== null && row.faults > prevF.faults;

                  return (
                    <tr
                      key={row.frames}
                      className={`border-b border-foreground/10 ${
                        isSelected ? "bg-highlight/20 font-bold" : ""
                      }`}
                    >
                      <td className="px-2 py-1 font-bold">
                        Frame {row.frames} {isSelected && "← active"}
                      </td>
                      <td className="px-2 py-1 text-center text-primary">{row.faults}</td>
                      <td className="px-2 py-1 text-center text-success">{lRow.faults}</td>
                      <td className="px-2 py-1 text-center font-bold text-foreground">
                        {oRow.faults}
                      </td>
                      <td className="px-2 py-1">
                        {isBelady ? (
                          <span className="rounded bg-destructive/20 px-1.5 py-0.5 font-bold text-destructive">
                            ⚠️ Belady's Anomaly (+{row.faults - prevF!.faults})
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calculations Dialog */}
      {results && (
        <PagingCalculationsDialog
          open={calculationsOpen}
          onOpenChange={setCalculationsOpen}
          result={results[verdict?.bestPractical === "lru" ? "lru" : "fifo"]}
          eatMemoryNs={200}
          eatFaultMs={8}
        />
      )}
    </div>
  );
}
