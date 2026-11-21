import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Dices,
  StepForward,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MemoryCalculationsDialog, MemoryResultsPanel } from "@/components/MemoryDetails";
import { MemoryMap } from "@/components/MemoryMap";
import { Button } from "@/components/ui/button";
import {
  buildInitialSegments,
  compactMemory,
  DEFAULT_EXAMPLE_BLOCKS,
  DEFAULT_EXAMPLE_MEM_PROCESSES,
  MODE_META,
  retryWaitingAfterCompaction,
  simulateMemoryAllocation,
  STRATEGY_META,
  type BlockInput,
  type CompactionResult,
  type FitStrategy,
  type MemProcessInput,
  type PartitionMode,
} from "@/lib/memory";
import { pickUniqueAppNames } from "@/lib/names";
import { assignProcessColors } from "@/lib/palette";

export const Route = createFileRoute("/memory-allocation/simulator")({
  head: () => ({
    meta: [
      { title: "Memory Allocation Simulator | OS Playground" },
      {
        name: "description",
        content:
          "Step-by-step memory allocation simulator for First Fit, Best Fit, Worst Fit, and Next Fit with dynamic hole splitting and compaction.",
      },
      { property: "og:title", content: "Memory Allocation Simulator | OS Playground" },
      {
        property: "og:description",
        content:
          "Step-by-step memory allocation simulator for First Fit, Best Fit, Worst Fit, and Next Fit with dynamic hole splitting and compaction.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryAllocationSimulatorPage,
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

const MODES: PartitionMode[] = ["fixed", "dynamic"];
const STRATEGIES: FitStrategy[] = ["first-fit", "best-fit", "worst-fit", "next-fit"];
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

interface PlaybackFrame {
  stepIndex: number;
  kind: "scan" | "place";
  scanSegmentId: string | null;
  chosenSegmentId: string | null;
  caption: string;
}

function MemoryAllocationSimulatorPage() {
  const [mode, setMode] = useState<PartitionMode>("dynamic");
  const [strategy, setStrategy] = useState<FitStrategy>("first-fit");

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
  const [equalBlockSizeStr, setEqualBlockSizeStr] = useState("250");

  const [rulesOpen, setRulesOpen] = useState(false);
  const [calculationsOpen, setCalculationsOpen] = useState(false);

  // Playback state
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Compaction state (Dynamic mode only, after run finishes)
  const [compaction, setCompaction] = useState<CompactionResult | null>(null);
  const [retriedAfterCompaction, setRetriedAfterCompaction] = useState<ReturnType<
    typeof retryWaitingAfterCompaction
  > | null>(null);

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
    setFrameIdx(0);
    setCompaction(null);
    setRetriedAfterCompaction(null);
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

  // Sanitized inputs for simulation (falls back to 1 only when invalid so pure math never receives NaN)
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

  // Computed block addresses for the Blocks table
  const blockAddresses = useMemo(() => buildInitialSegments(parsedBlocks), [parsedBlocks]);

  const simulation = useMemo(
    () => simulateMemoryAllocation(parsedBlocks, parsedProcesses, mode, strategy),
    [parsedBlocks, parsedProcesses, mode, strategy],
  );

  // Build scan + placement frames for playback
  const frames: PlaybackFrame[] = useMemo(() => {
    const list: PlaybackFrame[] = [];
    for (const step of simulation.steps) {
      if (!prefersReducedMotion) {
        for (const cand of step.candidates) {
          list.push({
            stepIndex: step.stepIndex,
            kind: "scan",
            scanSegmentId: cand.segmentId,
            chosenSegmentId: null,
            caption: `${step.processId} (${step.processSize} KB) — ${cand.reason}`,
          });
        }
      }
      list.push({
        stepIndex: step.stepIndex,
        kind: "place",
        scanSegmentId: null,
        chosenSegmentId: step.chosenSegmentId,
        caption: step.narration,
      });
    }
    return list;
  }, [simulation.steps, prefersReducedMotion]);

  const finished = started && frames.length > 0 && frameIdx >= frames.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (frames.length === 0 || frameIdx >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const baseMs = frames[frameIdx]?.kind === "scan" ? 550 : 850;
    const delayMs = prefersReducedMotion ? 120 : Math.max(90, Math.round(baseMs / speed));
    const timer = window.setTimeout(() => {
      setFrameIdx((prev) => Math.min(frames.length - 1, prev + 1));
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [playing, frameIdx, frames, speed, prefersReducedMotion]);

  // Resizing helpers
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

  const applyEqualBlocks = () => {
    resetRun();
    const size = clampInt(equalBlockSizeStr, 1, 99999, 250);
    setEqualBlockSizeStr(String(size));
    setBlocks((prev) => prev.map((b) => ({ ...b, sizeStr: String(size) })));
  };

  const randomize = () => {
    resetRun();
    const names = pickUniqueAppNames(processes.length);
    setBlocks((prev) =>
      prev.map((b) => ({
        ...b,
        sizeStr: String((Math.floor(Math.random() * 12) + 2) * 50),
      })),
    );
    setProcesses((prev) =>
      prev.map((p, idx) => ({
        ...p,
        name: names[idx] ?? p.name,
        sizeStr: String(Math.floor(Math.random() * 450) + 50),
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
    if (!isValid || frames.length === 0) return;
    if (finished) {
      setCompaction(null);
      setRetriedAfterCompaction(null);
      setStarted(true);
      setFrameIdx(0);
      setPlaying(true);
      return;
    }
    if (!started) {
      setStarted(true);
      setFrameIdx(0);
    }
    setPlaying((p) => !p);
  };

  const handleStep = () => {
    if (!isValid || frames.length === 0) return;
    setPlaying(false);
    if (!started) {
      setStarted(true);
      const firstPlace = frames.findIndex((f) => f.kind === "place");
      setFrameIdx(firstPlace >= 0 ? firstPlace : 0);
      return;
    }
    const currentStep = frames[frameIdx]?.stepIndex ?? 0;
    const nextPlace = frames.findIndex(
      (f, idx) => idx > frameIdx && f.kind === "place" && f.stepIndex >= currentStep,
    );
    if (nextPlace >= 0) {
      setFrameIdx(nextPlace);
    } else {
      setFrameIdx(frames.length - 1);
    }
  };

  const handleCompact = () => {
    if (mode !== "dynamic" || !finished) return;
    const result = compactMemory(simulation.finalSegments, simulation.records);
    setCompaction(result);
    setRetriedAfterCompaction(null);
  };

  const handleRetryWaiting = () => {
    if (!compaction) return;
    const retried = retryWaitingAfterCompaction(
      compaction.segmentsAfter,
      simulation.records,
      strategy,
    );
    setRetriedAfterCompaction(retried);
  };

  // Current live view based on playback frame
  const activeFrame = started ? frames[frameIdx] : undefined;
  const activeStep = activeFrame ? simulation.steps[activeFrame.stepIndex] : undefined;

  const liveSegments = !started
    ? blockAddresses
    : activeFrame?.kind === "scan"
      ? (activeStep?.segmentsBefore ?? blockAddresses)
      : (activeStep?.segmentsAfter ?? simulation.finalSegments);

  const livePointerSegmentId =
    strategy === "next-fit"
      ? !started
        ? blockAddresses[0]?.segmentId ?? null
        : activeFrame?.kind === "scan"
          ? activeStep?.pointerBeforeIndex !== null && activeStep?.pointerBeforeIndex !== undefined
            ? activeStep.segmentsBefore[activeStep.pointerBeforeIndex]?.segmentId ?? null
            : null
          : activeStep?.pointerAfterIndex !== null && activeStep?.pointerAfterIndex !== undefined
            ? activeStep.segmentsAfter[activeStep.pointerAfterIndex]?.segmentId ?? null
            : null
      : null;

  const completedStepsCount = !started
    ? 0
    : activeFrame?.kind === "place"
      ? (activeStep?.stepIndex ?? 0) + 1
      : activeStep?.stepIndex ?? 0;

  const stepsShown = simulation.steps.slice(0, completedStepsCount);

  const liveRecords = retriedAfterCompaction
    ? retriedAfterCompaction.records
    : simulation.records.slice(0, completedStepsCount);

  const liveSummary = retriedAfterCompaction
    ? retriedAfterCompaction.summary
    : compaction
      ? compaction.summaryAfter
      : stepsShown.length > 0
        ? stepsShown[stepsShown.length - 1]!.summaryAfter
        : simulation.summary;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/memory-allocation" className="text-sm text-muted-foreground hover:underline">
          ← back to Memory Allocation
        </Link>
      </div>

      {/* Header + count & quick-action controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Memory Allocation simulator</h1>
          <p className="text-muted-foreground">
            Pick a partitioning mode and fit strategy, edit blocks and processes, then press play.
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

      {/* Mode & Strategy Selector Card */}
      <section className="paper-card p-4 space-y-4" aria-label="Memory allocation selector">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase text-muted-foreground mr-1">Mode:</span>
            {MODES.map((m) => {
              const active = mode === m;
              return (
                <Button
                  key={m}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  aria-pressed={active}
                  onClick={() => {
                    resetRun();
                    setMode(m);
                  }}
                  className={active ? "font-bold" : ""}
                >
                  {MODE_META[m].label}
                </Button>
              );
            })}
          </div>

          <span className="rounded-md border border-foreground/25 bg-highlight/50 px-2.5 py-1 font-mono text-xs font-bold">
            Active: {MODE_META[mode].label} + {STRATEGY_META[strategy].label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase text-muted-foreground mr-1">Strategy:</span>
          {STRATEGIES.map((s) => {
            const active = strategy === s;
            return (
              <Button
                key={s}
                variant={active ? "default" : "outline"}
                size="sm"
                aria-pressed={active}
                onClick={() => {
                  resetRun();
                  setStrategy(s);
                }}
                className={active ? "font-bold" : ""}
              >
                {STRATEGY_META[s].label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-foreground/15 pt-2.5 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">{MODE_META[mode].label}:</strong>{" "}
            {MODE_META[mode].shortDesc}{" "}
            <strong className="text-foreground">{STRATEGY_META[strategy].label}:</strong>{" "}
            {STRATEGY_META[strategy].shortDesc}
          </p>

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
            <p>• Memory blocks are contiguous starting at address 0 KB.</p>
            <p>
              • Processes are tried in table order; an unallocated process is marked{" "}
              <strong className="text-foreground">Waiting</strong> and does not block later processes.
            </p>
            <p>
              • <strong className="text-foreground">Fixed partitioning:</strong> max 1 process per block, never split; unused space inside is internal fragmentation.
            </p>
            <p>
              • <strong className="text-foreground">Dynamic partitioning:</strong> takes exact process size; leftover space stays as a hole in place (0 KB leftovers disappear).
            </p>
            <p>
              • <strong className="text-foreground">First Fit:</strong> first hole ≥ size.{" "}
              <strong className="text-foreground">Best Fit:</strong> smallest hole ≥ size (ties → lowest address).{" "}
              <strong className="text-foreground">Worst Fit:</strong> largest hole ≥ size (ties → lowest address).{" "}
              <strong className="text-foreground">Next Fit:</strong> starts from previous pointer (inclusive) and wraps around once.
            </p>
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

      {/* Editable Blocks & Processes Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Memory Blocks Table */}
        <div className="paper-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/15 bg-paper px-4 py-3">
            <h2 className="font-hand text-3xl font-bold">Memory blocks (KB)</h2>
            <div className="flex items-center gap-2 font-mono text-xs">
              <input
                type="number"
                min={1}
                max={99999}
                aria-label="Equal block size in KB"
                value={equalBlockSizeStr}
                onChange={(e) => setEqualBlockSizeStr(e.target.value)}
                className="w-20 rounded border-2 border-input bg-background px-2 py-1 text-center"
              />
              <Button variant="outline" size="sm" onClick={applyEqualBlocks}>
                Equal-size blocks
              </Button>
            </div>
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
                            invalid
                              ? "border-destructive"
                              : "border-input focus:border-primary"
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
                  const isCurrentRow =
                    started && activeStep?.processId === proc.id && !finished;

                  return (
                    <tr
                      key={proc.id}
                      className={`border-t border-foreground/10 transition-colors ${
                        isCurrentRow ? "bg-highlight/50" : ""
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
                            placeholder={proc.id}
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
                            invalid
                              ? "border-destructive"
                              : "border-input focus:border-primary"
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

      {/* Chalkboard Stage */}
      <div className="chalkboard rounded-md p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={!isValid || frames.length === 0}
            onClick={handlePlayToggle}
            className="bg-highlight text-foreground"
          >
            {playing ? <Pause /> : finished ? <RotateCcw /> : <Play />}
            {playing ? "Pause" : finished ? "Replay" : "Play"}
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
            disabled={!isValid || finished || frames.length === 0}
          >
            <StepForward />
            Step
          </Button>
          <Button variant="outline" onClick={resetRun}>
            <RotateCcw />
            Reset
          </Button>
          <Button
            variant="outline"
            disabled={mode !== "dynamic" || !finished}
            title={
              mode !== "dynamic"
                ? "Compaction only applies to dynamic partitioning."
                : !finished
                  ? "Finish the allocation run first to compact memory."
                  : "Move allocated processes to start and merge all free holes."
            }
            onClick={handleCompact}
          >
            <Layers />
            Compact memory
          </Button>

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
              step {completedStepsCount} / {simulation.steps.length}
            </span>
          </div>
        </div>

        {/* Memory Map */}
        {!compaction ? (
          <MemoryMap
            segments={liveSegments}
            totalMemory={liveSummary.totalMemory}
            colors={colors}
            mode={mode}
            scanSegmentId={activeFrame?.scanSegmentId ?? null}
            chosenSegmentId={activeFrame?.chosenSegmentId ?? null}
            pointerSegmentId={livePointerSegmentId}
          />
        ) : (
          <div className="space-y-4">
            <MemoryMap
              title="Before compaction"
              segments={compaction.segmentsBefore}
              totalMemory={liveSummary.totalMemory}
              colors={colors}
              mode="dynamic"
            />
            <MemoryMap
              title={
                retriedAfterCompaction
                  ? "After compaction + retrying waiting processes"
                  : `After compaction (merged ${compaction.mergedHoleCount} hole(s) into ${compaction.mergedHoleSize} KB)`
              }
              segments={
                retriedAfterCompaction
                  ? retriedAfterCompaction.finalSegments
                  : compaction.segmentsAfter
              }
              totalMemory={liveSummary.totalMemory}
              colors={colors}
              mode="dynamic"
            />
            {simulation.summary.waitingCount > 0 && !retriedAfterCompaction && (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={handleRetryWaiting} className="bg-highlight text-foreground">
                  Try waiting processes again
                </Button>
                <span className="font-mono text-xs text-chalk-foreground/80">
                  Merged free space: {compaction.mergedHoleSize} KB at the end of memory.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Handwritten Step Narration */}
        <div className="rounded border border-chalk-foreground/30 bg-black/15 px-4 py-3">
          <p className="font-hand text-2xl text-chalk-foreground">
            {!started
              ? "Press Play or Step to watch each process scan the free holes."
              : compaction
                ? retriedAfterCompaction
                  ? `Compacted memory and retried waiting processes — ${retriedAfterCompaction.summary.waitingCount} waiting.`
                  : `Compacted ${compaction.movedCount} segment(s) to address 0 and merged ${compaction.mergedHoleCount} free hole(s) into ${compaction.mergedHoleSize} KB.`
                : activeFrame?.caption ?? ""}
          </p>
        </div>
      </div>

      {/* Results & Summary */}
      <MemoryResultsPanel
        records={liveRecords}
        summary={liveSummary}
        mode={mode}
        colors={colors}
        displayNames={displayNames}
      />

      {/* Calculations Dialog */}
      <MemoryCalculationsDialog
        open={calculationsOpen}
        onOpenChange={setCalculationsOpen}
        mode={mode}
        strategy={strategy}
        stepsShown={stepsShown}
        summary={liveSummary}
        displayNames={displayNames}
      />
    </div>
  );
}
