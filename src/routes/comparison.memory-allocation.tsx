import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Dices,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  StepForward,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MemoryMap } from "@/components/MemoryMap";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildInitialSegments,
  DEFAULT_EXAMPLE_BLOCKS,
  DEFAULT_EXAMPLE_MEM_PROCESSES,
  MODE_META,
  pickBest,
  simulateMemoryAllocation,
  STRATEGY_META,
  type BlockInput,
  type FitStrategy,
  type MemProcessInput,
  type MemorySimulationResult,
  type PartitionMode,
} from "@/lib/memory";
import { pickUniqueAppNames } from "@/lib/names";
import { assignProcessColors } from "@/lib/palette";

export const Route = createFileRoute("/comparison/memory-allocation")({
  head: () => ({
    meta: [
      { title: "Memory Allocation Comparison | OS Playground" },
      {
        name: "description",
        content:
          "Compare First Fit, Best Fit, Worst Fit, and Next Fit side by side on memory utilization, allocation failures, and external fragmentation.",
      },
      { property: "og:title", content: "Memory Allocation Comparison | OS Playground" },
      {
        property: "og:description",
        content:
          "Compare First Fit, Best Fit, Worst Fit, and Next Fit side by side on memory utilization, allocation failures, and external fragmentation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryAllocationComparisonPage,
});

interface EditableBlock {
  id: string;
  sizeStr: string;
}

interface EditableMemProcess {
  id: string;
  name: string;
  sizeStr: string;
}

const ALL_STRATEGIES: FitStrategy[] = ["first-fit", "best-fit", "worst-fit", "next-fit"];
const SPEEDS = [0.5, 1, 2, 4] as const;

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  if (raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function isValidPositiveInt(raw: string, min = 1, max = 99999): boolean {
  if (raw.trim() === "") return false;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max;
}

function resolveUniqueDisplayNames(rows: EditableMemProcess[]): Record<string, string> {
  const counts = new Map<string, number>();
  const resolved: Record<string, string> = {};
  for (const row of rows) {
    const trimmed = row.name.trim().slice(0, 14);
    const base = trimmed.length > 0 ? trimmed : row.id;
    const key = base.toLowerCase();
    const seen = counts.get(key) ?? 0;
    counts.set(key, seen + 1);
    resolved[row.id] = seen === 0 ? base : `${base} (${row.id})`;
  }
  return resolved;
}

function MemoryAllocationComparisonPage() {
  const [mode, setMode] = useState<PartitionMode>("dynamic");

  const [blocks, setBlocks] = useState<EditableBlock[]>(() =>
    DEFAULT_EXAMPLE_BLOCKS.map((b) => ({ id: b.id, sizeStr: String(b.size) })),
  );
  const [processes, setProcesses] = useState<EditableMemProcess[]>(() =>
    DEFAULT_EXAMPLE_MEM_PROCESSES.map((p) => ({
      id: p.id,
      name: p.name,
      sizeStr: String(p.size),
    })),
  );

  const [blockCountStr, setBlockCountStr] = useState(String(DEFAULT_EXAMPLE_BLOCKS.length));
  const [processCountStr, setProcessCountStr] = useState(
    String(DEFAULT_EXAMPLE_MEM_PROCESSES.length),
  );

  // Playback state
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 to processes.length
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [userShowVerdict, setUserShowVerdict] = useState(false);

  // Dialog & Collapsible notes
  const [calculationsOpen, setCalculationsOpen] = useState(false);
  const [calcTab, setCalcTab] = useState<string>("verdict");
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resetRun = () => {
    setPlaying(false);
    setStarted(false);
    setCurrentStep(0);
    setUserShowVerdict(false);
  };

  // Validation
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    blocks.forEach((b) => {
      if (!isValidPositiveInt(b.sizeStr, 1, 99999)) {
        errs.push(`${b.id} size must be an integer between 1 and 99,999 KB.`);
      }
    });
    processes.forEach((p) => {
      if (!isValidPositiveInt(p.sizeStr, 1, 99999)) {
        errs.push(`${p.id} size must be an integer between 1 and 99,999 KB.`);
      }
    });
    return errs;
  }, [blocks, processes]);

  const isValid = validationErrors.length === 0;

  const displayNames = useMemo(() => resolveUniqueDisplayNames(processes), [processes]);

  const colors = useMemo(
    () =>
      assignProcessColors(
        processes.map((p) => ({ id: p.id, name: displayNames[p.id] ?? p.id })),
      ),
    [processes, displayNames],
  );

  const parsedBlocks: BlockInput[] = useMemo(
    () => blocks.map((b) => ({ id: b.id, size: clampInt(b.sizeStr, 1, 99999, 100) })),
    [blocks],
  );

  const parsedProcesses: MemProcessInput[] = useMemo(
    () =>
      processes.map((p) => ({
        id: p.id,
        name: displayNames[p.id] ?? p.id,
        size: clampInt(p.sizeStr, 1, 99999, 100),
      })),
    [processes, displayNames],
  );

  const blockAddresses = useMemo(() => buildInitialSegments(parsedBlocks), [parsedBlocks]);
  const totalMemory = useMemo(
    () => parsedBlocks.reduce((acc, b) => acc + b.size, 0),
    [parsedBlocks],
  );

  // Full simulations for all 4 strategies
  const fullResults: Record<FitStrategy, MemorySimulationResult> = useMemo(() => {
    const map = {} as Record<FitStrategy, MemorySimulationResult>;
    for (const s of ALL_STRATEGIES) {
      map[s] = simulateMemoryAllocation(parsedBlocks, parsedProcesses, mode, s);
    }
    return map;
  }, [parsedBlocks, parsedProcesses, mode]);

  const allSimResultsList = useMemo(
    () => ALL_STRATEGIES.map((s) => fullResults[s]),
    [fullResults],
  );

  // Pure verdict calculation
  const verdict = useMemo(() => pickBest(allSimResultsList), [allSimResultsList]);

  const totalSteps = parsedProcesses.length;
  const isFinished = started && currentStep >= totalSteps;
  const showVerdict = isFinished || userShowVerdict;

  // Synced timer for playback
  useEffect(() => {
    if (!playing) return;
    if (currentStep >= totalSteps) {
      setPlaying(false);
      return;
    }
    const delayMs = prefersReducedMotion ? 160 : Math.max(120, Math.round(900 / speed));
    const timer = window.setTimeout(() => {
      setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [playing, currentStep, totalSteps, speed, prefersReducedMotion]);

  // Input editing handlers
  const resizeBlocks = (nextCount: number) => {
    resetRun();
    setBlocks((prev) => {
      if (nextCount === prev.length) return prev;
      if (nextCount < prev.length) return prev.slice(0, nextCount);
      const extra: EditableBlock[] = Array.from(
        { length: nextCount - prev.length },
        (_, idx) => ({
          id: `B${prev.length + idx + 1}`,
          sizeStr: "200",
        }),
      );
      return [...prev, ...extra];
    });
  };

  const resizeProcesses = (nextCount: number) => {
    resetRun();
    setProcesses((prev) => {
      if (nextCount === prev.length) return prev;
      if (nextCount < prev.length) return prev.slice(0, nextCount);
      const needed = nextCount - prev.length;
      const newNames = pickUniqueAppNames(
        needed,
        prev.map((p) => p.name),
      );
      const extra: EditableMemProcess[] = Array.from({ length: needed }, (_, idx) => ({
        id: `P${prev.length + idx + 1}`,
        name: newNames[idx] ?? `App ${prev.length + idx + 1}`,
        sizeStr: "150",
      }));
      return [...prev, ...extra];
    });
  };

  const handleBlockCountChange = (valStr: string) => {
    setBlockCountStr(valStr);
    if (valStr.trim() === "") return;
    const val = Number(valStr);
    if (Number.isInteger(val) && val >= 1 && val <= 12) {
      resizeBlocks(val);
    }
  };

  const handleBlockCountBlur = () => {
    const val = clampInt(blockCountStr, 1, 12, blocks.length || 5);
    setBlockCountStr(String(val));
    resizeBlocks(val);
  };

  const handleProcessCountChange = (valStr: string) => {
    setProcessCountStr(valStr);
    if (valStr.trim() === "") return;
    const val = Number(valStr);
    if (Number.isInteger(val) && val >= 1 && val <= 12) {
      resizeProcesses(val);
    }
  };

  const handleProcessCountBlur = () => {
    const val = clampInt(processCountStr, 1, 12, processes.length || 4);
    setProcessCountStr(String(val));
    resizeProcesses(val);
  };

  const randomize = () => {
    resetRun();
    const names = pickUniqueAppNames(processes.length);
    setBlocks((prev) =>
      prev.map((b) => ({
        ...b,
        sizeStr: String((Math.floor(Math.random() * 10) + 2) * 50),
      })),
    );
    setProcesses((prev) =>
      prev.map((p, idx) => ({
        ...p,
        name: names[idx] ?? p.name,
        sizeStr: String(Math.floor(Math.random() * 400) + 50),
      })),
    );
  };

  const shuffleNames = () => {
    resetRun();
    const names = pickUniqueAppNames(processes.length);
    setProcesses((prev) => prev.map((p, idx) => ({ ...p, name: names[idx] ?? p.name })));
  };

  const loadExample = () => {
    resetRun();
    setBlocks(DEFAULT_EXAMPLE_BLOCKS.map((b) => ({ id: b.id, sizeStr: String(b.size) })));
    setProcesses(
      DEFAULT_EXAMPLE_MEM_PROCESSES.map((p) => ({
        id: p.id,
        name: p.name,
        sizeStr: String(p.size),
      })),
    );
    setBlockCountStr(String(DEFAULT_EXAMPLE_BLOCKS.length));
    setProcessCountStr(String(DEFAULT_EXAMPLE_MEM_PROCESSES.length));
  };

  const handlePlayToggle = () => {
    if (!isValid || totalSteps === 0) return;
    if (isFinished) {
      setCurrentStep(0);
      setUserShowVerdict(false);
      setStarted(true);
      setPlaying(true);
      return;
    }
    if (!started) {
      setStarted(true);
      setCurrentStep(0);
    }
    setPlaying((p) => !p);
  };

  const handleStep = () => {
    if (!isValid || totalSteps === 0) return;
    setPlaying(false);
    if (!started) {
      setStarted(true);
      setCurrentStep(1);
      return;
    }
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const handleShowVerdictNow = () => {
    if (!isValid) return;
    setPlaying(false);
    setStarted(true);
    setCurrentStep(totalSteps);
    setUserShowVerdict(true);
  };

  // Derive per-strategy live state based on currentStep
  const liveStrategyState = useMemo(() => {
    return ALL_STRATEGIES.map((strat) => {
      const full = fullResults[strat];
      if (!started || currentStep === 0) {
        return {
          strategy: strat,
          segments: blockAddresses,
          summary: full.summary,
          placedCount: 0,
          waitingCount: 0,
          allocatedMemory: 0,
          freeMemory: totalMemory,
          freeHolesCount: parsedBlocks.length,
          largestHole: Math.max(...parsedBlocks.map((b) => b.size), 0),
          utilizationPercent: 0,
          totalInternalFrag: 0,
          externalFragApplies: false,
          activeStepNarration: "Waiting to start...",
        };
      }

      const stepIndex = Math.min(currentStep - 1, full.steps.length - 1);
      const step = full.steps[stepIndex]!;
      const recordsSoFar = full.records.slice(0, currentStep);
      const placed = recordsSoFar.filter((r) => r.status === "allocated").length;
      const waiting = recordsSoFar.filter((r) => r.status === "waiting").length;
      const sum = step.summaryAfter;

      return {
        strategy: strat,
        segments: step.segmentsAfter,
        summary: sum,
        placedCount: placed,
        waitingCount: waiting,
        allocatedMemory: sum.allocatedProcessMemory,
        freeMemory: sum.totalFreeMemory,
        freeHolesCount: sum.freeHoleCount,
        largestHole: sum.largestFreeHole,
        utilizationPercent: sum.utilizationPercent,
        totalInternalFrag: sum.totalInternalFrag,
        externalFragApplies: sum.externalFragApplies,
        activeStepNarration: step.narration,
      };
    });
  }, [
    ALL_STRATEGIES,
    fullResults,
    started,
    currentStep,
    blockAddresses,
    totalMemory,
    parsedBlocks,
  ]);

  const activeProcess = currentStep > 0 && currentStep <= parsedProcesses.length
    ? parsedProcesses[currentStep - 1]
    : null;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/memory-allocation" className="text-sm text-muted-foreground hover:underline">
          ← back to Memory Allocation
        </Link>
      </div>

      {/* Header + counts & quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Memory Allocation comparison</h1>
          <p className="text-muted-foreground">
            Run First Fit, Best Fit, Worst Fit, and Next Fit simultaneously on the exact same workload.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
          <label className="flex items-center gap-2">
            blocks
            <input
              aria-label="Number of memory blocks"
              type="number"
              min={1}
              max={12}
              step={1}
              value={blockCountStr}
              onChange={(e) => handleBlockCountChange(e.target.value)}
              onBlur={handleBlockCountBlur}
              className="w-20 rounded-md border-2 border-input bg-paper p-2 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex items-center gap-2">
            processes
            <input
              aria-label="Number of processes"
              type="number"
              min={1}
              max={12}
              step={1}
              value={processCountStr}
              onChange={(e) => handleProcessCountChange(e.target.value)}
              onBlur={handleProcessCountBlur}
              className="w-20 rounded-md border-2 border-input bg-paper p-2 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button
            variant="outline"
            onClick={() => {
              handleBlockCountBlur();
              handleProcessCountBlur();
            }}
          >
            Apply counts
          </Button>
          <Button variant="outline" onClick={randomize}>
            <Shuffle />
            Random
          </Button>
          <Button variant="outline" onClick={shuffleNames}>
            <Dices />
            Shuffle names
          </Button>
          <Button variant="outline" onClick={loadExample}>
            Load example
          </Button>
        </div>
      </div>

      {/* Mode Selector Card */}
      <section className="paper-card p-4 space-y-3" aria-label="Partitioning mode selector">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase text-muted-foreground mr-1">Partitioning:</span>
            <Button
              variant={mode === "dynamic" ? "default" : "outline"}
              size="sm"
              aria-pressed={mode === "dynamic"}
              onClick={() => {
                resetRun();
                setMode("dynamic");
              }}
              className={mode === "dynamic" ? "font-bold" : ""}
            >
              Dynamic partitioning
            </Button>
            <Button
              variant={mode === "fixed" ? "default" : "outline"}
              size="sm"
              aria-pressed={mode === "fixed"}
              onClick={() => {
                resetRun();
                setMode("fixed");
              }}
              className={mode === "fixed" ? "font-bold" : ""}
            >
              Fixed partitioning
            </Button>
          </div>

          <span className="rounded-md border border-foreground/25 bg-highlight/50 px-2.5 py-1 font-mono text-xs font-bold">
            Mode: {MODE_META[mode].label}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-foreground/15 pt-2 text-xs text-muted-foreground">
          <p>{MODE_META[mode].shortDesc}</p>
          <button
            type="button"
            onClick={() => setRulesOpen((o) => !o)}
            className="inline-flex cursor-pointer items-center gap-1 font-mono text-xs font-bold text-primary hover:underline"
          >
            {rulesOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Rules used on this page
          </button>
        </div>

        {rulesOpen && (
          <div className="rounded-md border border-foreground/15 bg-background p-3 font-mono text-xs space-y-1 text-muted-foreground">
            <p>• All 4 strategies receive the exact same initial memory blocks and process arrival sequence.</p>
            <p>• Stepping or playing moves all four allocators forward synchronously, one process at a time.</p>
            <p>• Best strategy verdict: 1st priority = highest allocated memory (utilization); 2nd priority = more processes placed; 3rd priority = lower internal fragmentation (fixed mode) or larger remaining free hole (dynamic mode).</p>
          </div>
        )}
      </section>

      {/* Validation error banner */}
      {!isValid && (
        <div
          role="alert"
          className="rounded-md border-2 border-destructive bg-destructive/10 p-3 font-mono text-xs text-destructive"
        >
          <p className="font-bold">Fix input errors before running:</p>
          <ul className="mt-1 list-disc pl-4">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Editable Inputs Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Blocks Table */}
        <div className="paper-card overflow-hidden">
          <div className="border-b border-foreground/15 bg-paper px-4 py-3">
            <h2 className="font-hand text-3xl font-bold">Memory blocks (KB)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="border-b border-foreground/15 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">Block</th>
                  <th className="px-3 py-2 text-center">Size (KB)</th>
                  <th className="px-3 py-2 text-right">Address range</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block, idx) => {
                  const addr = blockAddresses[idx];
                  const invalid = !isValidPositiveInt(block.sizeStr, 1, 99999);
                  return (
                    <tr key={block.id} className="border-t border-foreground/10">
                      <td className="px-3 py-2 font-bold text-muted-foreground">{block.id}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          max={99999}
                          step={1}
                          aria-label={`Size for ${block.id}`}
                          value={block.sizeStr}
                          onChange={(e) => {
                            resetRun();
                            const val = e.target.value;
                            setBlocks((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, sizeStr: val } : b)),
                            );
                          }}
                          className={`w-24 rounded border-2 bg-background px-2 py-1 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            invalid ? "border-destructive" : "border-input focus:border-primary"
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {addr ? `${addr.start} – ${addr.end} KB` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Processes Table */}
        <div className="paper-card overflow-hidden">
          <div className="border-b border-foreground/15 bg-paper px-4 py-3">
            <h2 className="font-hand text-3xl font-bold">Processes (KB)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="border-b border-foreground/15 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-center">Size (KB)</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc, idx) => {
                  const color = colors[proc.id];
                  const resolved = displayNames[proc.id] ?? proc.id;
                  const trimmedInput = proc.name.trim().slice(0, 14);
                  const showsResolved = resolved !== trimmedInput;
                  const invalid = !isValidPositiveInt(proc.sizeStr, 1, 99999);
                  const isCurrent = started && currentStep === idx + 1;

                  return (
                    <tr
                      key={proc.id}
                      className={`border-t border-foreground/10 transition-colors ${
                        isCurrent ? "bg-highlight/50" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-bold text-muted-foreground">{proc.id}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 shrink-0 rounded-sm border-2 border-foreground"
                            style={{ backgroundColor: color?.bg }}
                            aria-hidden="true"
                          />
                          <input
                            type="text"
                            maxLength={14}
                            aria-label={`Process name for ${proc.id}`}
                            value={proc.name}
                            onChange={(e) => {
                              resetRun();
                              const val = e.target.value;
                              setProcesses((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, name: val } : p)),
                              );
                            }}
                            className="w-32 rounded border-2 border-input bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          {showsResolved && (
                            <span className="text-xs text-muted-foreground">→ {resolved}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          max={99999}
                          step={1}
                          aria-label={`Size for ${resolved}`}
                          value={proc.sizeStr}
                          onChange={(e) => {
                            resetRun();
                            const val = e.target.value;
                            setProcesses((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, sizeStr: val } : p)),
                            );
                          }}
                          className={`w-24 rounded border-2 bg-background px-2 py-1 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            invalid ? "border-destructive" : "border-input focus:border-primary"
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chalkboard Stage with Stacked Memory Maps */}
      <div className="chalkboard rounded-md p-6 space-y-6">
        {/* Synchronized Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={!isValid || totalSteps === 0}
            onClick={handlePlayToggle}
            className="bg-highlight text-foreground font-bold"
          >
            {playing ? <Pause /> : isFinished ? <RotateCcw /> : <Play />}
            {playing ? "Pause" : isFinished ? "Replay" : "Play"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPlaying(false);
              setCalculationsOpen(true);
            }}
          >
            <Calculator />
            Calculations
          </Button>
          <Button
            variant="outline"
            onClick={handleStep}
            disabled={!isValid || isFinished || totalSteps === 0}
          >
            <StepForward />
            Step
          </Button>
          <Button variant="outline" onClick={resetRun}>
            <RotateCcw />
            Reset
          </Button>
          {!isFinished && (
            <Button variant="outline" onClick={handleShowVerdictNow} disabled={!isValid}>
              <Trophy />
              Show verdict now
            </Button>
          )}

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs sm:ml-auto">
            <span className="opacity-80">speed</span>
            <div className="inline-flex rounded-md border border-chalk-foreground/40 p-0.5">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  aria-pressed={speed === s}
                  className={`cursor-pointer rounded px-2 py-1 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight ${
                    speed === s
                      ? "bg-highlight text-foreground"
                      : "text-chalk-foreground hover:bg-white/10"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <span className="ml-1 min-w-[5.5rem] text-right font-mono text-sm">
              process {currentStep} / {totalSteps}
            </span>
          </div>
        </div>

        {/* Four Stacked Memory Maps */}
        <div className="space-y-6">
          {liveStrategyState.map((item) => {
            const isWinner = showVerdict && !verdict.isTie && verdict.winner === item.strategy;
            const isTiedWinner = showVerdict && verdict.isTie && verdict.tiedStrategies.includes(item.strategy);

            return (
              <div
                key={item.strategy}
                className={`rounded border p-3 transition-colors ${
                  isWinner || isTiedWinner
                    ? "border-highlight bg-highlight/10 ring-2 ring-highlight"
                    : "border-chalk-foreground/30 bg-black/10"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-hand text-2xl font-bold text-chalk-foreground">
                      {STRATEGY_META[item.strategy].label}
                    </span>
                    {isWinner && (
                      <span className="rounded bg-highlight px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                        ★ Winner
                      </span>
                    )}
                    {isTiedWinner && (
                      <span className="rounded bg-highlight/80 px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                        ★ Tied Winner
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-chalk-foreground/80">
                    Util: {item.utilizationPercent.toFixed(2)}% · Placed: {item.placedCount} / {parsedProcesses.length}
                  </span>
                </div>

                <MemoryMap
                  segments={item.segments}
                  totalMemory={totalMemory}
                  colors={colors}
                  mode={mode}
                />
              </div>
            );
          })}
        </div>

        {/* Step Narration Bar */}
        <div className="rounded border border-chalk-foreground/30 bg-black/15 px-4 py-3">
          <p className="font-hand text-2xl text-chalk-foreground">
            {!started
              ? "Press Play or Step to watch all four strategies place processes synchronously."
              : currentStep === 0
                ? "Initial memory state. Press Step or Play to place the first process."
                : activeProcess
                  ? `Placed ${activeProcess.id} (${activeProcess.name}, ${activeProcess.size} KB) across all four strategies.`
                  : "All processes have been evaluated!"}
          </p>
        </div>
      </div>

      {/* Best Strategy Verdict (shown when finished or when user clicked Show verdict now) */}
      {showVerdict && (
        <section
          aria-label="Best strategy verdict"
          className="paper-card border-primary/50 bg-highlight/20 p-6 space-y-4 animate-rise"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-foreground/20 pb-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Overall Verdict
              </p>
              <h2 className="font-hand text-4xl sm:text-5xl font-bold text-foreground mt-1">
                {verdict.isTie
                  ? `Verdict: Tie between ${verdict.tiedStrategies.map((s) => STRATEGY_META[s].label).join(", ")} (${verdict.ranked[0]?.utilizationPercent.toFixed(2)}% utilization)`
                  : `Verdict: Best strategy is ${verdict.winnerName} (${verdict.ranked[0]?.utilizationPercent.toFixed(2)}% utilization)`}
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="rounded bg-primary px-3 py-1 font-bold text-primary-foreground">
                Ranked #1
              </span>
            </div>
          </div>

          <div className="font-sans text-sm leading-relaxed space-y-2 text-foreground">
            {verdict.explanationLines.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>

          <details className="mt-3 rounded border border-foreground/20 bg-background/60 p-3 text-xs font-mono">
            <summary className="cursor-pointer font-bold text-foreground">
              How is &quot;best&quot; decided?
            </summary>
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p>1. <b>Overall best</b> = Highest allocated process memory (and highest memory utilization percentage).</p>
              <p>2. <b>Ties broken by:</b> More processes placed (fewer processes waiting).</p>
              <p>
                3. <b>Further tie-break:</b> In fixed mode, lowest total internal fragmentation; in dynamic mode, larger remaining free hole.
              </p>
              <p>4. If all metrics remain identical, a <b>TIE</b> is formally declared and all tied strategies are listed.</p>
            </div>
          </details>
        </section>
      )}

      {/* Live Comparison Table */}
      <section className="paper-card overflow-hidden" aria-label="Comparison matrix">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/15 bg-paper px-4 py-3">
          <h2 className="font-hand text-3xl font-bold">
            Comparison matrix{" "}
            <span className="font-sans text-xs font-normal text-muted-foreground">
              ({started ? `after ${currentStep} of ${totalSteps} processes` : "initial state"})
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-foreground/15 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2.5">Strategy</th>
                <th className="px-3 py-2.5 text-center">Placed</th>
                <th className="px-3 py-2.5 text-center">Waiting</th>
                <th className="px-3 py-2.5 text-right">Allocated</th>
                <th className="px-3 py-2.5 text-right">Free</th>
                <th className="px-3 py-2.5 text-center">Holes</th>
                <th className="px-3 py-2.5 text-right">Largest hole</th>
                <th className="px-3 py-2.5 text-right">Utilization</th>
                {mode === "fixed" && <th className="px-3 py-2.5 text-right">Internal frag</th>}
                <th className="px-3 py-2.5 text-center">External frag?</th>
              </tr>
            </thead>
            <tbody>
              {liveStrategyState.map((row) => {
                const isWinner = showVerdict && !verdict.isTie && verdict.winner === row.strategy;
                const isTiedWinner = showVerdict && verdict.isTie && verdict.tiedStrategies.includes(row.strategy);

                return (
                  <tr
                    key={row.strategy}
                    className={`border-t border-foreground/10 transition-colors ${
                      isWinner || isTiedWinner ? "bg-highlight/40 font-semibold" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{STRATEGY_META[row.strategy].label}</span>
                        {(isWinner || isTiedWinner) && (
                          <span className="rounded bg-primary px-1.5 py-0.2 font-mono text-[10px] text-primary-foreground font-bold">
                            WIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">{row.placedCount}</td>
                    <td className="px-3 py-2.5 text-center">{row.waitingCount}</td>
                    <td className="px-3 py-2.5 text-right">{row.allocatedMemory} KB</td>
                    <td className="px-3 py-2.5 text-right">{row.freeMemory} KB</td>
                    <td className="px-3 py-2.5 text-center">{row.freeHolesCount}</td>
                    <td className="px-3 py-2.5 text-right">{row.largestHole} KB</td>
                    <td className="px-3 py-2.5 text-right font-bold text-primary">
                      {row.utilizationPercent.toFixed(2)}%
                    </td>
                    {mode === "fixed" && (
                      <td className="px-3 py-2.5 text-right">{row.totalInternalFrag} KB</td>
                    )}
                    <td className="px-3 py-2.5 text-center">
                      {row.externalFragApplies ? (
                        <span className="text-destructive font-bold">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Small Chalk-Style Utilization Bar Comparison */}
        <div className="border-t border-foreground/15 p-4 bg-paper/50 space-y-2">
          <p className="font-mono text-xs uppercase font-bold text-muted-foreground">
            Memory Utilization comparison:
          </p>
          <div className="space-y-1.5">
            {liveStrategyState.map((row) => (
              <div key={`bar-${row.strategy}`} className="flex items-center gap-3 font-mono text-xs">
                <span className="w-24 shrink-0 truncate">{STRATEGY_META[row.strategy].label}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-muted/70">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, row.utilizationPercent))}%` }}
                  />
                </div>
                <span className="w-14 text-right font-bold">{row.utilizationPercent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculations Dialog with full working by strategy + verdict breakdown */}
      <Dialog open={calculationsOpen} onOpenChange={setCalculationsOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto bg-paper">
          <DialogHeader>
            <DialogTitle className="font-hand text-4xl">Memory Allocation calculations</DialogTitle>
            <DialogDescription>
              Complete per-process arithmetic formulas and ranking breakdown for every strategy.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={calcTab} onValueChange={setCalcTab} className="mt-2">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1">
              <TabsTrigger
                value="verdict"
                className="font-mono text-xs data-[state=active]:bg-highlight data-[state=active]:text-foreground font-bold"
              >
                ★ Best verdict breakdown
              </TabsTrigger>
              {ALL_STRATEGIES.map((strat) => (
                <TabsTrigger
                  key={strat}
                  value={strat}
                  className="font-mono text-xs data-[state=active]:bg-highlight data-[state=active]:text-foreground"
                >
                  {STRATEGY_META[strat].label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Verdict Tab */}
            <TabsContent value="verdict" className="pt-2 space-y-4 font-mono text-xs">
              <div className="rounded-md border-2 border-foreground/20 bg-background/60 p-4 space-y-3">
                <h3 className="font-hand text-2xl font-bold text-foreground">
                  How the best strategy was chosen
                </h3>
                <p className="text-muted-foreground">
                  Strategies are evaluated first by total allocated memory (utilization). Ties are broken by placed processes count, then lower internal fragmentation in fixed mode or larger largest hole in dynamic mode.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-foreground/20 text-muted-foreground">
                        <th className="py-2 px-2">Rank</th>
                        <th className="py-2 px-2">Strategy</th>
                        <th className="py-2 px-2 text-center">Placed</th>
                        <th className="py-2 px-2 text-right">Allocated</th>
                        <th className="py-2 px-2 text-right">Utilization</th>
                        {mode === "fixed" ? (
                          <th className="py-2 px-2 text-right">Internal Frag</th>
                        ) : (
                          <th className="py-2 px-2 text-right">Largest Hole</th>
                        )}
                        <th className="py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verdict.ranked.map((r) => (
                        <tr
                          key={r.strategy}
                          className={`border-t border-foreground/10 ${
                            r.isWinner || r.isTied ? "bg-highlight/30 font-bold" : ""
                          }`}
                        >
                          <td className="py-2 px-2">#{r.rank}</td>
                          <td className="py-2 px-2">{r.strategyName}</td>
                          <td className="py-2 px-2 text-center">{r.placedCount} / {parsedProcesses.length}</td>
                          <td className="py-2 px-2 text-right">{r.allocatedMemory} KB</td>
                          <td className="py-2 px-2 text-right">
                            ({r.allocatedMemory} / {totalMemory || 1}) × 100 = {r.utilizationPercent.toFixed(2)}%
                          </td>
                          <td className="py-2 px-2 text-right">
                            {mode === "fixed" ? `${r.totalInternalFrag} KB` : `${r.largestFreeHole} KB`}
                          </td>
                          <td className="py-2 px-2">
                            {r.isWinner ? "Winner" : r.isTied ? "Tied Winner" : "Runner-up"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {verdict.selectionDetails.tieBreakUsed && (
                  <p className="text-muted-foreground pt-1">
                    <b>Tie-break applied:</b> {verdict.selectionDetails.tieBreakUsed}
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Individual Strategy Tabs */}
            {ALL_STRATEGIES.map((strat) => {
              const res = fullResults[strat];
              const stepsToDisplay = started
                ? res.steps.slice(0, Math.max(1, currentStep))
                : res.steps;

              return (
                <TabsContent key={strat} value={strat} className="pt-2 space-y-4 font-mono text-xs">
                  <div className="rounded-md border border-foreground/20 bg-background p-3 space-y-1.5">
                    <p className="font-bold text-sm">{STRATEGY_META[strat].label} summary formulas</p>
                    <p>Total memory = {res.summary.totalMemory} KB</p>
                    <p>Allocated process memory = {res.summary.allocatedProcessMemory} KB</p>
                    <p>
                      Memory utilization = ({res.summary.allocatedProcessMemory} / {res.summary.totalMemory || 1}) × 100 ={" "}
                      <span className="font-bold">{res.summary.utilizationPercent.toFixed(2)}%</span>
                    </p>
                    {mode === "fixed" ? (
                      <p>
                        Total internal fragmentation = Σ(Block − Process) ={" "}
                        <span className="font-bold">{res.summary.totalInternalFrag} KB</span>
                      </p>
                    ) : (
                      <p>
                        Total free memory = <span className="font-bold">{res.summary.totalFreeMemory} KB</span> across{" "}
                        {res.summary.freeHoleCount} hole(s) (largest = {res.summary.largestFreeHole} KB)
                      </p>
                    )}
                    <p>
                      External fragmentation:{" "}
                      {res.summary.waitingCount === 0
                        ? "0 KB — all processes placed."
                        : res.summary.externalFragApplies
                          ? `Applies — ${res.summary.totalFreeMemory} KB total free memory exists, but largest hole (${res.summary.largestFreeHole} KB) is smaller than waiting process (${res.summary.smallestWaitingSize} KB).`
                          : "Does not apply."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-sm">Step-by-step arithmetic</p>
                    {stepsToDisplay.map((step) => {
                      const name = displayNames[step.processId] ?? step.processName;
                      return (
                        <div
                          key={`${strat}-${step.stepIndex}`}
                          className="rounded-md border border-foreground/15 bg-background p-3 space-y-1"
                        >
                          <p className="font-bold">
                            Step {step.stepIndex + 1}: {name} ({step.processId}) — needs {step.processSize} KB
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                            {step.candidates.map((c) => (
                              <li
                                key={`${strat}-${step.stepIndex}-${c.segmentId}`}
                                className={c.chosen ? "font-bold text-foreground" : ""}
                              >
                                {c.reason}
                              </li>
                            ))}
                          </ul>
                          <p className="pt-1 text-foreground">{step.narration}</p>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
