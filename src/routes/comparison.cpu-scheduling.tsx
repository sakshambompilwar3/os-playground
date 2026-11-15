import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Dices, Pause, Play, RotateCcw, Shuffle, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComparisonGantt, type ComparedResultItem } from "@/components/ComparisonGantt";
import { SchedulingDetails } from "@/components/SchedulingDetails";
import {
  assignProcessColors,
  DEFAULT_EXAMPLE_PROCESSES,
  pickUniqueAppNames,
} from "@/lib/process-palette";
import {
  ALGORITHM_META,
  pickBest,
  runScheduling,
  type ProcessInput,
  type SchedulingAlgorithm,
} from "@/lib/scheduling";

export const Route = createFileRoute("/comparison/cpu-scheduling")({
  head: () => ({
    meta: [
      { title: "CPU Scheduling Comparison | OS Playground" },
      {
        name: "description",
        content:
          "Compare FCFS, SJF, SRTF, Round Robin, and Priority scheduling side by side with synchronized Gantt charts and best algorithm verdicts.",
      },
      { property: "og:title", content: "CPU Scheduling Comparison | OS Playground" },
      {
        property: "og:description",
        content:
          "Compare FCFS, SJF, SRTF, Round Robin, and Priority scheduling side by side with synchronized Gantt charts and best algorithm verdicts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CpuSchedulingComparison,
});

interface EditableProcess {
  id: string;
  name: string;
  atStr: string;
  btStr: string;
  prioStr: string;
}

const ALGORITHMS_LIST: { id: SchedulingAlgorithm; label: string; short: string }[] = [
  { id: "fcfs", label: "FCFS (First-Come, First-Served)", short: "FCFS" },
  { id: "sjf", label: "SJF (Shortest Job First - Non-Preemptive)", short: "SJF" },
  { id: "srtf", label: "SRTF (Shortest Remaining Time First)", short: "SRTF" },
  { id: "round-robin", label: "Round Robin", short: "Round Robin" },
  { id: "priority-np", label: "Priority (Non-Preemptive)", short: "Priority (NP)" },
  { id: "priority-p", label: "Priority (Preemptive)", short: "Priority (P)" },
];

const SPEEDS = [0.5, 1, 2, 4] as const;

function toEditable(list: ProcessInput[]): EditableProcess[] {
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    atStr: String(p.arrivalTime),
    btStr: String(p.burstTime),
    prioStr: String(p.priority ?? 1),
  }));
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  if (raw.trim() === "") return fallback;
  const num = Number(raw);
  if (Number.isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

export function CpuSchedulingComparison() {
  const [rows, setRows] = useState<EditableProcess[]>(() => toEditable(DEFAULT_EXAMPLE_PROCESSES));
  const [processCountStr, setProcessCountStr] = useState(String(DEFAULT_EXAMPLE_PROCESSES.length));
  const [quantumStr, setQuantumStr] = useState("2");
  const [csStr, setCsStr] = useState("0");
  const [aging, setAging] = useState(false);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [calculationsOpen, setCalculationsOpen] = useState(false);
  const [calcTab, setCalcTab] = useState<string>("best");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [userShowVerdict, setUserShowVerdict] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const quantum = clampInt(quantumStr, 1, 99, 2);
  const contextSwitchTime = clampInt(csStr, 0, 5, 0);

  const processInputs: ProcessInput[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        arrivalTime: clampInt(r.atStr, 0, 999, 0),
        burstTime: clampInt(r.btStr, 1, 999, 1),
        priority: clampInt(r.prioStr, 0, 999, 0),
      })),
    [rows],
  );

  const colors = useMemo(() => assignProcessColors(processInputs), [processInputs]);

  // Run the SAME inputs through all 6 algorithms
  const comparedItems: ComparedResultItem[] = useMemo(() => {
    return ALGORITHMS_LIST.map((algo) => ({
      meta: algo,
      result: runScheduling(processInputs, {
        algorithm: algo.id,
        quantum,
        contextSwitchTime,
        aging,
      }),
    }));
  }, [processInputs, quantum, contextSwitchTime, aging]);

  const maxTotalTime = useMemo(
    () => Math.max(...comparedItems.map((item) => item.result.totalTime), 1),
    [comparedItems],
  );

  const verdict = useMemo(
    () => pickBest(comparedItems.map((item) => item.result), contextSwitchTime),
    [comparedItems, contextSwitchTime],
  );

  const resetRun = () => {
    setPlaying(false);
    setStarted(false);
    setCurrentTime(0);
    setUserShowVerdict(false);
  };

  useEffect(() => {
    resetRun();
  }, [processInputs, quantum, contextSwitchTime, aging]);

  // Stop playing once current time reaches max total time
  useEffect(() => {
    if (playing && (maxTotalTime <= 0 || currentTime >= maxTotalTime)) {
      setPlaying(false);
    }
  }, [playing, currentTime, maxTotalTime]);

  const rafLastRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing || maxTotalTime <= 0) {
      rafLastRef.current = null;
      return;
    }

    if (prefersReducedMotion) {
      const intervalMs = Math.max(120, Math.round(700 / speed));
      const id = window.setInterval(() => {
        setCurrentTime((prev) => Math.min(maxTotalTime, Math.floor(prev) + 1));
      }, intervalMs);
      return () => window.clearInterval(id);
    }

    let frameId = 0;
    const tick = (now: number) => {
      if (rafLastRef.current === null) {
        rafLastRef.current = now;
      }
      const dt = Math.min(0.05, Math.max(0, (now - rafLastRef.current) / 1000));
      rafLastRef.current = now;

      setCurrentTime((prev) => Math.min(maxTotalTime, prev + dt * 1.6 * speed));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
      rafLastRef.current = null;
    };
  }, [playing, speed, maxTotalTime, prefersReducedMotion]);

  const resizeRows = (nextCount: number) => {
    setRows((prev) => {
      if (nextCount === prev.length) return prev;
      if (nextCount < prev.length) return prev.slice(0, nextCount);
      const needed = nextCount - prev.length;
      const newNames = pickUniqueAppNames(
        needed,
        prev.map((r) => r.name),
      );
      const extra: EditableProcess[] = Array.from({ length: needed }, (_, idx) => ({
        id: `P${prev.length + idx + 1}`,
        name: newNames[idx] ?? `App ${prev.length + idx + 1}`,
        atStr: "0",
        btStr: "4",
        prioStr: "1",
      }));
      return [...prev, ...extra];
    });
  };

  const handleProcessCountChange = (valStr: string) => {
    setProcessCountStr(valStr);
    if (valStr.trim() === "") return;
    const val = Number(valStr);
    if (!Number.isNaN(val) && Number.isInteger(val) && val >= 1 && val <= 10) {
      resizeRows(val);
    }
  };

  const handleProcessCountBlur = () => {
    const val = clampInt(processCountStr, 1, 10, rows.length || 4);
    setProcessCountStr(String(val));
    resizeRows(val);
  };

  const handleCsBlur = () => {
    const val = clampInt(csStr, 0, 5, 0);
    setCsStr(String(val));
  };

  const handleQuantumBlur = () => {
    const val = clampInt(quantumStr, 1, 99, 2);
    setQuantumStr(String(val));
  };

  const updateRowField = (idx: number, field: keyof EditableProcess, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const clampRowField = (idx: number, field: "atStr" | "btStr" | "prioStr") => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (field === "atStr") return { ...row, atStr: String(clampInt(row.atStr, 0, 999, 0)) };
        if (field === "btStr") return { ...row, btStr: String(clampInt(row.btStr, 1, 999, 1)) };
        return { ...row, prioStr: String(clampInt(row.prioStr, 0, 999, 0)) };
      }),
    );
  };

  const randomize = () => {
    resetRun();
    const names = pickUniqueAppNames(rows.length);
    setRows((prev) =>
      prev.map((row, idx) => ({
        ...row,
        name: names[idx] ?? row.name,
        atStr: String(Math.floor(Math.random() * 7)),
        btStr: String(Math.floor(Math.random() * 8) + 1),
        prioStr: String(Math.floor(Math.random() * 6)),
      })),
    );
  };

  const shuffleNames = () => {
    resetRun();
    const names = pickUniqueAppNames(rows.length);
    setRows((prev) => prev.map((row, idx) => ({ ...row, name: names[idx] ?? row.name })));
  };

  const loadExample = () => {
    resetRun();
    setRows(toEditable(DEFAULT_EXAMPLE_PROCESSES));
    setProcessCountStr(String(DEFAULT_EXAMPLE_PROCESSES.length));
    setCsStr("0");
    setQuantumStr("2");
    setAging(false);
  };

  const finished = started && currentTime >= maxTotalTime;
  const showVerdict = finished || userShowVerdict;

  const handlePlayToggle = () => {
    if (finished) {
      setStarted(true);
      setCurrentTime(0);
      setPlaying(true);
      return;
    }
    if (!started) setStarted(true);
    setPlaying((p) => !p);
  };

  const handleStep = () => {
    setPlaying(false);
    if (!started) {
      setStarted(true);
      setCurrentTime(Math.min(1, maxTotalTime));
      return;
    }
    setCurrentTime((prev) => Math.min(maxTotalTime, Math.floor(prev + 1e-6) + 1));
  };

  // Live and final metric statistics per algorithm
  const liveRows = useMemo(() => {
    return comparedItems.map(({ meta, result }) => {
      const completed = started
        ? result.metrics.filter((m) => currentTime >= m.completionTime)
        : [];
      const hasTouchedCpu = started
        ? result.metrics.filter((m) => currentTime > m.firstCpuTime)
        : [];
      const isDone = started && currentTime >= result.totalTime;

      // Live metrics (use final values when finished; otherwise compute for completed jobs)
      const liveWT = isDone
        ? result.avgWaitingTime
        : completed.length > 0
          ? completed.reduce((s, m) => s + m.waitingTime, 0) / completed.length
          : null;

      const liveTAT = isDone
        ? result.avgTurnaroundTime
        : completed.length > 0
          ? completed.reduce((s, m) => s + m.turnaroundTime, 0) / completed.length
          : null;

      const liveRT = isDone
        ? result.avgResponseTime
        : hasTouchedCpu.length > 0
          ? hasTouchedCpu.reduce((s, m) => s + m.responseTime, 0) / hasTouchedCpu.length
          : null;

      const elapsed = started ? Math.min(currentTime, result.totalTime) : 0;
      const busy = started
        ? result.gantt.reduce((acc, seg) => {
            if (seg.type !== "run") return acc;
            const overlap = Math.max(0, Math.min(currentTime, seg.endTime) - seg.startTime);
            return acc + overlap;
          }, 0)
        : 0;

      const liveUtil = isDone ? result.cpuUtilization : elapsed > 0 ? (busy / elapsed) * 100 : null;

      const liveThroughput = isDone
        ? result.throughput
        : elapsed > 0
          ? completed.length / elapsed
          : null;

      return {
        meta,
        result,
        completedCount: completed.length,
        isDone,
        liveWT,
        liveTAT,
        liveRT,
        liveUtil,
        liveThroughput,
        csCount: result.contextSwitchCount,
      };
    });
  }, [comparedItems, started, currentTime]);

  // Determine best algorithm per column once finished
  const bestMap = useMemo(() => {
    if (!finished) return null;
    let minWT = Infinity;
    let minTAT = Infinity;
    let minRT = Infinity;
    let maxUtil = -Infinity;
    let maxThroughput = -Infinity;
    let minCS = Infinity;

    for (const r of liveRows) {
      if (r.result.avgWaitingTime < minWT) minWT = r.result.avgWaitingTime;
      if (r.result.avgTurnaroundTime < minTAT) minTAT = r.result.avgTurnaroundTime;
      if (r.result.avgResponseTime < minRT) minRT = r.result.avgResponseTime;
      if (r.result.cpuUtilization > maxUtil) maxUtil = r.result.cpuUtilization;
      if (r.result.throughput > maxThroughput) maxThroughput = r.result.throughput;
      if (r.result.contextSwitchCount < minCS) minCS = r.result.contextSwitchCount;
    }

    return { minWT, minTAT, minRT, maxUtil, maxThroughput, minCS };
  }, [finished, liveRows]);

  // "What this shows" observation note
  const observationNote = useMemo(() => {
    if (!finished) return null;
    const sortedByWT = [...liveRows].sort(
      (a, b) => a.result.avgWaitingTime - b.result.avgWaitingTime,
    );
    const winner = sortedByWT[0]!;
    const worst = sortedByWT[sortedByWT.length - 1]!;
    const diffWT = worst.result.avgWaitingTime - winner.result.avgWaitingTime;

    const sortedByRT = [...liveRows].sort(
      (a, b) => a.result.avgResponseTime - b.result.avgResponseTime,
    );
    const bestRTAlgo = sortedByRT[0]!;

    return (
      <div className="space-y-2">
        <p>
          🏆 <b>{winner.meta.short}</b> achieved the lowest average waiting time (
          <b>{winner.result.avgWaitingTime.toFixed(2)} ms</b>), beating {worst.meta.short} (
          {worst.result.avgWaitingTime.toFixed(2)} ms) by <b>{diffWT.toFixed(2)} ms</b>.
        </p>
        <p className="text-muted-foreground">
          ⚡ <b>Response time leader:</b> {bestRTAlgo.meta.short} delivered the fastest first CPU
          response (avg <b>{bestRTAlgo.result.avgResponseTime.toFixed(2)} ms</b>).
          {contextSwitchTime > 0 && (
            <span>
              {" "}
              Preemptive algorithms incurred more context switches (
              {liveRows.find((r) => r.meta.id === "srtf")?.csCount ?? 0} for SRTF vs 0 for FCFS).
            </span>
          )}
        </p>
      </div>
    );
  }, [finished, liveRows, contextSwitchTime]);

  // Scaling factor for chalk-style bar comparison
  const maxBarWT = Math.max(...comparedItems.map((c) => c.result.avgWaitingTime), 1);
  const maxBarTAT = Math.max(...comparedItems.map((c) => c.result.avgTurnaroundTime), 1);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/cpu-scheduling" className="text-sm text-muted-foreground hover:underline">
          ← back to CPU Scheduling
        </Link>
      </div>

      {/* Header and inputs control row (matches simulator structure) */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-6xl font-bold">Algorithm comparison</h1>
          <p className="text-muted-foreground">
            Watch all 6 scheduling algorithms race on the exact same workload side by side.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
          <label className="flex items-center gap-2">
            processes
            <input
              aria-label="Number of processes"
              type="number"
              min={1}
              max={10}
              step={1}
              value={processCountStr}
              onChange={(e) => handleProcessCountChange(e.target.value)}
              onBlur={handleProcessCountBlur}
              className="w-20 rounded-md border-2 border-input bg-paper p-2 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex items-center gap-2">
            context switch
            <input
              aria-label="Context switch time"
              type="number"
              min={0}
              max={5}
              step={1}
              value={csStr}
              onChange={(e) => setCsStr(e.target.value)}
              onBlur={handleCsBlur}
              className="w-20 rounded-md border-2 border-input bg-paper p-2 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex items-center gap-2">
            RR quantum
            <input
              aria-label="Round Robin time quantum"
              type="number"
              min={1}
              max={99}
              step={1}
              value={quantumStr}
              onChange={(e) => setQuantumStr(e.target.value)}
              onBlur={handleQuantumBlur}
              className="w-20 rounded-md border-2 border-input bg-paper p-2 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <button
            type="button"
            aria-pressed={aging}
            onClick={() => setAging((a) => !a)}
            className={`cursor-pointer rounded-md border-2 border-foreground px-3 py-2 font-mono text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              aging ? "bg-highlight text-foreground" : "bg-paper text-foreground hover:bg-muted"
            }`}
          >
            Aging: {aging ? "On" : "Off"}
          </button>
          <Button
            variant="outline"
            onClick={() => {
              handleProcessCountBlur();
              handleCsBlur();
              handleQuantumBlur();
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

      {/* Shared Editable Process Table */}
      <div className="paper-card overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-foreground bg-secondary px-3 py-1.5">
          <p className="font-hand text-xl font-bold">Shared workload ({rows.length} processes)</p>
          <span className="font-mono text-xs text-muted-foreground">
            fed simultaneously to all 6 schedulers
          </span>
        </div>
        <div className="max-h-[30rem] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-max font-mono text-sm">
            <thead>
              <tr className="border-b border-foreground/20">
                <th className="px-3 py-2 text-left text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left">Process name</th>
                <th className="px-3 py-2 text-center">Arrival Time (AT)</th>
                <th className="px-3 py-2 text-center">Burst Time (BT)</th>
                <th className="px-3 py-2 text-center">Priority (0 = high)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const color = colors[row.id];
                return (
                  <tr key={row.id} className="border-t border-foreground/10">
                    <td className="px-3 py-2 font-bold text-muted-foreground">{row.id}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 shrink-0 rounded-sm border-2 border-foreground"
                          style={{ backgroundColor: color?.bg }}
                          title={color?.label}
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          maxLength={14}
                          aria-label={`Process name for ${row.id}`}
                          value={row.name}
                          onChange={(e) => updateRowField(idx, "name", e.target.value)}
                          className="w-36 rounded border-2 border-input bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        aria-label={`Arrival Time for ${row.id}`}
                        value={row.atStr}
                        onChange={(e) => updateRowField(idx, "atStr", e.target.value)}
                        onBlur={() => clampRowField(idx, "atStr")}
                        className="w-20 rounded border-2 border-input bg-background px-2 py-1 text-center focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        aria-label={`Burst Time for ${row.id}`}
                        value={row.btStr}
                        onChange={(e) => updateRowField(idx, "btStr", e.target.value)}
                        onBlur={() => clampRowField(idx, "btStr")}
                        className="w-20 rounded border-2 border-input bg-background px-2 py-1 text-center focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        aria-label={`Priority for ${row.id}`}
                        value={row.prioStr}
                        onChange={(e) => updateRowField(idx, "prioStr", e.target.value)}
                        onBlur={() => clampRowField(idx, "prioStr")}
                        className="w-20 rounded border-2 border-input bg-background px-2 py-1 text-center focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Synchronized Chalkboard Area */}
      <div className="chalkboard rounded-md p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={maxTotalTime === 0}
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
          <Button variant="outline" onClick={handleStep} disabled={finished || maxTotalTime === 0}>
            <StepForward />
            Step
          </Button>
          <Button variant="outline" onClick={resetRun}>
            <RotateCcw />
            Reset
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
              t ={" "}
              {playing && !prefersReducedMotion ? currentTime.toFixed(1) : Math.floor(currentTime)}{" "}
              / {maxTotalTime}
            </span>
          </div>
        </div>

        {/* Stacked Synchronized Gantt Charts */}
        <ComparisonGantt
          items={comparedItems}
          colors={colors}
          maxTotalTime={maxTotalTime}
          currentTime={currentTime}
          started={started}
          winnerAlgoIds={showVerdict ? verdict.winners.map((w) => w.algorithm) : []}
        />

        <p className="animate-rise mt-4 min-h-8 font-hand text-2xl">
          {!started && (
            <span className="opacity-75">
              Press Play or Step to watch all 6 schedulers race on the timeline.
            </span>
          )}
          {started && !finished && (
            <span>
              Synchronized playhead at t = {currentTime.toFixed(1)} ticks. Watch how time-slicing
              and preemption differ!
            </span>
          )}
          {finished && <span>✅ All 6 scheduling runs completed! See the scoreboard below.</span>}
        </p>
      </div>

      {/* Live Comparison Table */}
      <div className="paper-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground bg-secondary px-3 py-1.5">
          <p className="font-hand text-xl font-bold">Scoreboard & metrics</p>
          <span className="font-mono text-xs text-muted-foreground">
            {finished ? "final results (best highlighted)" : "live progress so far"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max font-mono text-sm">
            <thead>
              <tr className="border-b border-foreground/20">
                <th className="px-3 py-2 text-left">Algorithm</th>
                <th className="px-3 py-2 text-center">Avg WT</th>
                <th className="px-3 py-2 text-center">Avg TAT</th>
                <th className="px-3 py-2 text-center">Avg RT</th>
                <th className="px-3 py-2 text-center">CPU Util.</th>
                <th className="px-3 py-2 text-center">Throughput</th>
                <th className="px-3 py-2 text-center">Context Switches</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {liveRows.map((row) => {
                const isOverallWinner =
                  showVerdict && verdict.winners.some((w) => w.algorithm === row.meta.id);
                const isBestWT = bestMap !== null && row.result.avgWaitingTime === bestMap.minWT;
                const isBestTAT =
                  bestMap !== null && row.result.avgTurnaroundTime === bestMap.minTAT;
                const isBestRT = bestMap !== null && row.result.avgResponseTime === bestMap.minRT;
                const isBestUtil =
                  bestMap !== null && row.result.cpuUtilization === bestMap.maxUtil;
                const isBestThru =
                  bestMap !== null && row.result.throughput === bestMap.maxThroughput;
                const isBestCS = bestMap !== null && row.csCount === bestMap.minCS;

                return (
                  <tr
                    key={row.meta.id}
                    className={`border-t border-foreground/10 transition-colors ${
                      isOverallWinner ? "bg-highlight/25" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span>{row.meta.label}</span>
                        {isOverallWinner && (
                          <span className="rounded bg-highlight px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
                            {verdict.isTie ? "Tied Best" : "Best"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={isBestWT ? "rounded bg-highlight px-1.5 py-0.5 font-bold" : ""}
                      >
                        {row.liveWT !== null ? row.liveWT.toFixed(2) : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={isBestTAT ? "rounded bg-highlight px-1.5 py-0.5 font-bold" : ""}
                      >
                        {row.liveTAT !== null ? row.liveTAT.toFixed(2) : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={isBestRT ? "rounded bg-highlight px-1.5 py-0.5 font-bold" : ""}
                      >
                        {row.liveRT !== null ? row.liveRT.toFixed(2) : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={isBestUtil ? "rounded bg-highlight px-1.5 py-0.5 font-bold" : ""}
                      >
                        {row.liveUtil !== null ? `${row.liveUtil.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={isBestThru ? "rounded bg-highlight px-1.5 py-0.5 font-bold" : ""}
                      >
                        {row.liveThroughput !== null
                          ? `${row.liveThroughput.toFixed(3)}/unit`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={isBestCS ? "rounded bg-highlight px-1.5 py-0.5 font-bold" : ""}
                      >
                        {row.csCount}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {row.isDone ? (
                        <span className="font-bold text-success-foreground">done</span>
                      ) : started ? (
                        <span className="text-muted-foreground">
                          so far: {row.completedCount} of {rows.length} completed
                        </span>
                      ) : (
                        <span className="text-muted-foreground">ready</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Small chalk-style visual bar comparison */}
      <div className="chalkboard rounded-md p-6 space-y-4">
        <p className="font-hand text-3xl font-bold">Chalk visual comparison</p>
        <p className="font-mono text-xs opacity-75">
          Shorter bar = lower waiting time (better performance):
        </p>
        <div className="space-y-2.5 font-mono text-xs">
          {liveRows.map((r) => {
            const wtVal = r.result.avgWaitingTime;
            const tatVal = r.result.avgTurnaroundTime;
            const pctWT = Math.max(8, Math.min(100, (wtVal / maxBarWT) * 100));
            const pctTAT = Math.max(8, Math.min(100, (tatVal / maxBarTAT) * 100));

            return (
              <div key={r.meta.id} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-chalk-foreground/90">
                  <span className="font-bold">{r.meta.short}</span>
                  <span>
                    Avg WT: {wtVal.toFixed(2)} ms · Avg TAT: {tatVal.toFixed(2)} ms
                  </span>
                </div>
                <div className="flex h-3.5 w-full overflow-hidden rounded bg-white/10">
                  <div
                    className="h-full bg-highlight transition-all duration-300"
                    style={{ width: `${pctWT}%` }}
                    title={`${r.meta.short} WT: ${wtVal.toFixed(2)}`}
                  />
                  <div
                    className="h-full bg-accent/70 transition-all duration-300"
                    style={{ width: `${Math.max(0, pctTAT - pctWT)}%` }}
                    title={`${r.meta.short} TAT: ${tatVal.toFixed(2)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verdict Card */}
      <section
        className="paper-card space-y-4 p-6"
        aria-labelledby="verdict-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground/15 pb-2">
          <h2 id="verdict-heading" className="font-hand text-3xl font-bold">
            Best for this example
          </h2>
          {showVerdict && (
            <span className="rounded bg-highlight px-2 py-0.5 font-mono text-xs font-bold text-foreground">
              {verdict.isTie ? "Tied for Best" : "Overall Best"}
            </span>
          )}
        </div>

        {!showVerdict ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-hand text-xl text-muted-foreground py-2">
            <p>The verdict appears when the run finishes.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUserShowVerdict(true)}
              className="self-start sm:self-auto font-mono text-xs"
            >
              Show verdict now
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="font-hand text-4xl sm:text-5xl font-bold text-primary">
                  {verdict.isTie
                    ? `Tie: ${verdict.winners.map((w) => ALGORITHM_META[w.algorithm].label).join(" & ")}`
                    : ALGORITHM_META[verdict.winner.algorithm].label}
                </p>
                <span className="rounded bg-highlight/70 px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                  {verdict.isTie ? "Tied Winners" : "Winner"}
                </span>
              </div>
              <p className="mt-1 font-mono text-sm text-foreground/80">
                Avg WT: <b className="text-foreground">{verdict.winner.avgWaitingTime.toFixed(2)} ms</b> · Avg TAT:{" "}
                <b className="text-foreground">{verdict.winner.avgTurnaroundTime.toFixed(2)} ms</b> · Avg RT:{" "}
                <b className="text-foreground">{verdict.winner.avgResponseTime.toFixed(2)} ms</b>
              </p>
            </div>

            {/* Chips for per-metric winners */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="rounded-md border border-foreground/20 bg-background/70 px-2.5 py-1">
                🏆 <b>Lowest waiting:</b>{" "}
                {verdict.perMetricWinners.avgWT.winners
                  .map((w) => ALGORITHM_META[w.algorithm].shortLabel)
                  .join(", ")}{" "}
                ({verdict.perMetricWinners.avgWT.formattedValue} ms)
                {verdict.perMetricWinners.avgWT.isTie && " (tie)"}
              </span>

              <span className="rounded-md border border-foreground/20 bg-background/70 px-2.5 py-1">
                ⏱️ <b>Lowest turnaround:</b>{" "}
                {verdict.perMetricWinners.avgTAT.winners
                  .map((w) => ALGORITHM_META[w.algorithm].shortLabel)
                  .join(", ")}{" "}
                ({verdict.perMetricWinners.avgTAT.formattedValue} ms)
                {verdict.perMetricWinners.avgTAT.isTie && " (tie)"}
              </span>

              <span className="rounded-md border border-foreground/20 bg-background/70 px-2.5 py-1">
                ⚡ <b>Fastest response:</b>{" "}
                {verdict.perMetricWinners.avgRT.winners
                  .map((w) => ALGORITHM_META[w.algorithm].shortLabel)
                  .join(", ")}{" "}
                ({verdict.perMetricWinners.avgRT.formattedValue} ms)
                {verdict.perMetricWinners.avgRT.isTie && " (tie)"}
              </span>

              <span className="rounded-md border border-foreground/20 bg-background/70 px-2.5 py-1">
                🔄 <b>Fewest switches:</b>{" "}
                {verdict.perMetricWinners.contextSwitches.winners
                  .map((w) => ALGORITHM_META[w.algorithm].shortLabel)
                  .join(", ")}{" "}
                ({verdict.perMetricWinners.contextSwitches.formattedValue})
                {verdict.perMetricWinners.contextSwitches.isTie && " (tie)"}
              </span>

              <span className="rounded-md border border-foreground/20 bg-background/70 px-2.5 py-1">
                🏁 <b>Shortest makespan:</b>{" "}
                {verdict.perMetricWinners.makespan.winners
                  .map((w) => ALGORITHM_META[w.algorithm].shortLabel)
                  .join(", ")}{" "}
                ({verdict.perMetricWinners.makespan.formattedValue})
                {verdict.perMetricWinners.makespan.isTie && " (tie)"}
              </span>

              <span className="rounded-md border border-foreground/20 bg-background/70 px-2.5 py-1">
                🛡️ <b>Smallest longest-wait:</b>{" "}
                {verdict.perMetricWinners.smallestLongestWait.winners
                  .map(
                    (item) =>
                      `${ALGORITHM_META[item.result.algorithm].shortLabel} (${item.processName}: ${item.waitingTime} ms)`,
                  )
                  .join(", ")}
                {verdict.perMetricWinners.smallestLongestWait.isTie && " (tie)"}
              </span>
            </div>

            {/* Why explanation sentences */}
            <div className="space-y-2 rounded-md border border-foreground/15 bg-background/40 p-4 text-sm leading-relaxed">
              {verdict.whyExplanation.map((sentence, idx) => (
                <p
                  key={idx}
                  className={
                    idx === verdict.whyExplanation.length - 1
                      ? "font-hand text-xl font-bold text-primary pt-1"
                      : ""
                  }
                >
                  {sentence}
                </p>
              ))}
            </div>

            {/* Collapsible rule note */}
            <details className="group rounded border border-foreground/15 bg-background/30 p-3 text-xs font-mono">
              <summary className="cursor-pointer font-bold select-none text-foreground hover:underline">
                ▶ How is &quot;best&quot; decided?
              </summary>
              <div className="mt-2 space-y-1 text-muted-foreground border-t border-foreground/10 pt-2 pl-2">
                <p>1. <b>Lowest total waiting time (WT):</b> Sum of all process waiting times (lower is better).</p>
                <p>2. <b>Tie-break 1 — Lowest total turnaround time (TAT):</b> Sum of all process turnaround times.</p>
                <p>3. <b>Tie-break 2 — Lowest total response time (RT):</b> Sum of all first-CPU response times.</p>
                <p>4. <b>Tie-break 3 — Fewest context switches:</b> Number of preemptions or process switches.</p>
                <p>5. <b>Deterministic canonical ordering:</b> FCFS → SJF → SRTF → Round Robin → Priority (NP) → Priority (P).</p>
                <p className="pt-1 text-[11px] italic">
                  * If two or more algorithms tie on total WT, TAT, and RT, the verdict reports a shared tie rather than pretending one wins.
                </p>
              </div>
            </details>
          </div>
        )}
      </section>

      {/* Calculations Dialog with Tabs per algorithm + Best verdict breakdown */}
      <Dialog open={calculationsOpen} onOpenChange={setCalculationsOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto bg-paper">
          <DialogHeader>
            <DialogTitle className="font-hand text-3xl">All calculations by algorithm</DialogTitle>
            <DialogDescription>
              Complete per-process math formulas with real numbers for every algorithm on this exact
              workload.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={calcTab} onValueChange={setCalcTab} className="mt-2">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1">
              <TabsTrigger
                value="best"
                className="font-mono text-xs data-[state=active]:bg-highlight data-[state=active]:text-foreground font-bold"
              >
                ★ How best was chosen
              </TabsTrigger>
              {ALGORITHMS_LIST.map((algo) => (
                <TabsTrigger
                  key={algo.id}
                  value={algo.id}
                  className="font-mono text-xs data-[state=active]:bg-highlight data-[state=active]:text-foreground"
                >
                  {algo.short}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="best" className="pt-2 space-y-4 font-mono text-xs">
              <div className="rounded-md border-2 border-foreground/20 bg-background/60 p-4 space-y-3">
                <div>
                  <h3 className="font-hand text-2xl font-bold text-foreground">
                    How the best algorithm was chosen
                  </h3>
                  <p className="text-muted-foreground mt-0.5">
                    Algorithms are ranked strictly by integer totals: lowest total WT, then lowest total TAT, then lowest total RT, then fewest context switches.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-max border-collapse text-left">
                    <thead>
                      <tr className="border-b border-foreground/30 text-muted-foreground">
                        <th className="py-2 px-2.5">Rank</th>
                        <th className="py-2 px-2.5">Algorithm</th>
                        <th className="py-2 px-2.5">Avg WT Formula</th>
                        <th className="py-2 px-2.5">Avg TAT Formula</th>
                        <th className="py-2 px-2.5">Avg RT Formula</th>
                        <th className="py-2 px-2.5 text-center">CS</th>
                        <th className="py-2 px-2.5">Tie-break rule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verdict.rankings.map((r) => {
                        const isWinner = verdict.winners.some(
                          (w) => w.algorithm === r.result.algorithm,
                        );
                        return (
                          <tr
                            key={r.result.algorithm}
                            className={`border-b border-foreground/10 ${
                              isWinner ? "bg-highlight/30 font-bold" : ""
                            }`}
                          >
                            <td className="py-2 px-2.5 font-bold">#{r.rank}</td>
                            <td className="py-2 px-2.5">
                              <span>{ALGORITHM_META[r.result.algorithm].label}</span>
                              {isWinner && (
                                <span className="ml-1.5 rounded bg-highlight px-1 text-[10px]">
                                  {verdict.isTie ? "TIE" : "WINNER"}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2.5">
                              Avg WT = {r.totalWT} / {r.n} = <b>{r.avgWT.toFixed(2)}</b>
                            </td>
                            <td className="py-2 px-2.5">
                              Avg TAT = {r.totalTAT} / {r.n} = <b>{r.avgTAT.toFixed(2)}</b>
                            </td>
                            <td className="py-2 px-2.5">
                              Avg RT = {r.totalRT} / {r.n} = <b>{r.avgRT.toFixed(2)}</b>
                            </td>
                            <td className="py-2 px-2.5 text-center">{r.contextSwitches}</td>
                            <td className="py-2 px-2.5 text-muted-foreground">{r.tieBreakReason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-foreground/10 pt-2 text-muted-foreground">
                  <p><b>Decision summary:</b> {verdict.tieBreakReason}</p>
                </div>
              </div>
            </TabsContent>

            {comparedItems.map(({ meta, result }) => (
              <TabsContent key={meta.id} value={meta.id} className="pt-2">
                <SchedulingDetails
                  result={result}
                  colors={colors}
                  currentTime={currentTime}
                  started={started}
                  contextSwitchTime={contextSwitchTime}
                  quantum={quantum}
                  aging={aging}
                />
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
