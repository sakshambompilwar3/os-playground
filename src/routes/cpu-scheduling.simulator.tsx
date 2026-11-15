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
import { SchedulingDetails } from "@/components/SchedulingDetails";
import { SchedulingGantt } from "@/components/SchedulingGantt";
import {
  assignProcessColors,
  DEFAULT_EXAMPLE_PROCESSES,
  pickUniqueAppNames,
} from "@/lib/process-palette";
import {
  ALGORITHM_META,
  runScheduling,
  type ProcessInput,
  type SchedulingAlgorithm,
} from "@/lib/scheduling";

export const Route = createFileRoute("/cpu-scheduling/simulator")({
  head: () => ({
    meta: [
      { title: "CPU Scheduling Simulator | OS Playground" },
      {
        name: "description",
        content:
          "Simulate FCFS, SJF, SRTF, Round Robin, and Priority scheduling with interactive Gantt charts, ready queue visualization, and calculation traces.",
      },
      { property: "og:title", content: "CPU Scheduling Simulator | OS Playground" },
      {
        property: "og:description",
        content:
          "Simulate FCFS, SJF, SRTF, Round Robin, and Priority scheduling with interactive Gantt charts, ready queue visualization, and calculation traces.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CpuSchedulingSimulator,
});

type TopAlgorithm = "fcfs" | "sjf" | "srtf" | "round-robin" | "priority";

interface EditableProcess {
  id: string;
  name: string;
  atStr: string;
  btStr: string;
  prioStr: string;
}

const TOP_ALGORITHMS: { id: TopAlgorithm; label: string }[] = [
  { id: "fcfs", label: "FCFS" },
  { id: "sjf", label: "SJF" },
  { id: "srtf", label: "SRTF" },
  { id: "round-robin", label: "Round Robin" },
  { id: "priority", label: "Priority" },
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

function CpuSchedulingSimulator() {
  const [rows, setRows] = useState<EditableProcess[]>(() => toEditable(DEFAULT_EXAMPLE_PROCESSES));
  const [processCountStr, setProcessCountStr] = useState(String(DEFAULT_EXAMPLE_PROCESSES.length));

  const [topAlgo, setTopAlgo] = useState<TopAlgorithm>("fcfs");
  const [priorityPreemptive, setPriorityPreemptive] = useState(false);
  const [aging, setAging] = useState(false);

  const [quantumStr, setQuantumStr] = useState("2");
  const [csStr, setCsStr] = useState("0");

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [calculationsOpen, setCalculationsOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const algorithm: SchedulingAlgorithm =
    topAlgo === "priority" ? (priorityPreemptive ? "priority-p" : "priority-np") : topAlgo;
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

  const result = useMemo(
    () => runScheduling(processInputs, { algorithm, quantum, contextSwitchTime, aging }),
    [processInputs, algorithm, quantum, contextSwitchTime, aging],
  );

  const colors = useMemo(() => assignProcessColors(processInputs), [processInputs]);
  const totalTime = result.totalTime;

  // Reset playback whenever inputs or algorithm settings change (mirrors Banker's)
  const resetRun = () => {
    setPlaying(false);
    setStarted(false);
    setCurrentTime(0);
  };

  useEffect(() => {
    setPlaying(false);
    setStarted(false);
    setCurrentTime(0);
  }, [processInputs, algorithm, quantum, contextSwitchTime, aging]);

  useEffect(() => {
    if (playing && (totalTime <= 0 || currentTime >= totalTime)) {
      setPlaying(false);
    }
  }, [playing, currentTime, totalTime]);

  // Animation loop: smooth RAF normally, per-time-unit steps when prefers-reduced-motion is enabled
  const rafLastRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing || totalTime <= 0) {
      rafLastRef.current = null;
      return;
    }

    if (prefersReducedMotion) {
      const intervalMs = Math.max(120, Math.round(700 / speed));
      const id = window.setInterval(() => {
        setCurrentTime((prev) => Math.min(totalTime, Math.floor(prev) + 1));
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

      setCurrentTime((prev) => Math.min(totalTime, prev + dt * 1.6 * speed));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
      rafLastRef.current = null;
    };
  }, [playing, speed, totalTime, prefersReducedMotion]);

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
  };

  const finished = started && currentTime >= totalTime;

  const handlePlayToggle = () => {
    if (finished) {
      setStarted(true);
      setCurrentTime(0);
      setPlaying(true);
      return;
    }
    if (!started) {
      setStarted(true);
    }
    setPlaying((p) => !p);
  };

  const handleStep = () => {
    setPlaying(false);
    if (!started) {
      setStarted(true);
      setCurrentTime(Math.min(1, totalTime));
      return;
    }
    setCurrentTime((prev) => Math.min(totalTime, Math.floor(prev + 1e-6) + 1));
  };

  // Current snapshot for live ready queue, running process, and narration
  const snapshotIdx = started
    ? Math.min(Math.floor(currentTime), Math.max(0, result.timeline.length - 1))
    : 0;
  const snapshot = result.timeline[snapshotIdx];
  const activeMeta = ALGORITHM_META[algorithm];

  const completedCount = started
    ? result.metrics.filter((m) => currentTime >= m.completionTime).length
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/cpu-scheduling" className="text-sm text-muted-foreground hover:underline">
          ← back to CPU Scheduling
        </Link>
      </div>

      {/* Header + count & quick-action controls (mirrors Banker's simulator) */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-6xl font-bold">CPU Scheduling simulator</h1>
          <p className="text-muted-foreground">
            Pick an algorithm, edit the processes, then press play to watch the Gantt chart.
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
          <Button
            variant="outline"
            onClick={() => {
              handleProcessCountBlur();
              handleCsBlur();
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

      {/* Algorithm Selector Card */}
      <section className="paper-card p-4 space-y-3" aria-label="Scheduling algorithm selector">
        <div className="flex flex-wrap items-center gap-2.5">
          {TOP_ALGORITHMS.map((item) => {
            const active = topAlgo === item.id;
            return (
              <Button
                key={item.id}
                variant="outline"
                aria-pressed={active}
                onClick={() => setTopAlgo(item.id)}
                className={`press font-mono ${active ? "bg-highlight text-foreground" : ""}`}
              >
                {item.label}
              </Button>
            );
          })}

          {topAlgo === "round-robin" && (
            <label className="ml-auto flex items-center gap-2 font-mono text-sm">
              time quantum
              <input
                aria-label="Time quantum"
                type="number"
                min={1}
                step={1}
                value={quantumStr}
                onChange={(e) => setQuantumStr(e.target.value)}
                onBlur={handleQuantumBlur}
                className="w-20 rounded-md border-2 border-input bg-background px-2 py-1.5 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          )}

          {topAlgo === "priority" && (
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <div className="inline-flex rounded-md border-2 border-foreground p-0.5 bg-background">
                <button
                  type="button"
                  onClick={() => setPriorityPreemptive(false)}
                  aria-pressed={!priorityPreemptive}
                  className={`cursor-pointer rounded px-2.5 py-1 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    !priorityPreemptive
                      ? "bg-highlight text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Non-preemptive
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityPreemptive(true)}
                  aria-pressed={priorityPreemptive}
                  className={`cursor-pointer rounded px-2.5 py-1 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    priorityPreemptive
                      ? "bg-highlight text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Preemptive
                </button>
              </div>

              <button
                type="button"
                aria-pressed={aging}
                onClick={() => setAging((a) => !a)}
                className={`cursor-pointer rounded-md border-2 border-foreground px-3 py-1.5 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  aging
                    ? "bg-highlight text-foreground"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                Aging: {aging ? "On" : "Off"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-foreground/15 pt-2.5">
          <p className="text-sm">
            <span className="marker px-1 font-bold">{activeMeta.label}:</span>{" "}
            <span className="text-muted-foreground">{activeMeta.description}</span>
          </p>
          {topAlgo === "priority" && (
            <span className="font-mono text-xs text-muted-foreground">
              Note: lower number = higher priority (0 is highest).
            </span>
          )}
        </div>
      </section>

      {/* Editable Process Table (paper-card matching MatrixTable.tsx) */}
      <div className="paper-card overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-foreground bg-secondary px-3 py-1.5">
          <p className="font-hand text-xl font-bold">Process table</p>
          <span className="font-mono text-xs text-muted-foreground">
            {rows.length} process{rows.length === 1 ? "" : "es"}
          </span>
        </div>
        <div className="max-h-[32rem] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-max font-mono text-sm">
            <thead>
              <tr className="border-b border-foreground/20">
                <th className="px-3 py-2 text-left text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left">Process name</th>
                <th className="px-3 py-2 text-center">Arrival Time (AT)</th>
                <th className="px-3 py-2 text-center">Burst Time (BT)</th>
                {topAlgo === "priority" && (
                  <th className="px-3 py-2 text-center">Priority (0 = high)</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const color = colors[row.id];
                const resolvedName = result.displayNames[row.id] ?? row.id;
                const trimmedInput = row.name.trim().slice(0, 14);
                const showsResolvedNote = resolvedName !== trimmedInput;
                const isRunningRow =
                  started &&
                  snapshot?.segmentType === "run" &&
                  snapshot.runningProcessId === row.id;
                const metric = result.metrics[idx];
                const isDoneRow =
                  started && metric !== undefined && currentTime >= metric.completionTime;

                return (
                  <tr
                    key={row.id}
                    className={`border-t border-foreground/10 transition-colors duration-300 ${
                      isRunningRow ? "bg-highlight" : isDoneRow ? "bg-success/15" : ""
                    }`}
                  >
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
                          placeholder={row.id}
                          value={row.name}
                          onChange={(e) => updateRowField(idx, "name", e.target.value)}
                          className="w-36 rounded border-2 border-input bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        {showsResolvedNote && (
                          <span className="text-xs text-muted-foreground" title="Shown label">
                            → {resolvedName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        aria-label={`Arrival Time for ${resolvedName}`}
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
                        aria-label={`Burst Time for ${resolvedName}`}
                        value={row.btStr}
                        onChange={(e) => updateRowField(idx, "btStr", e.target.value)}
                        onBlur={() => clampRowField(idx, "btStr")}
                        className="w-20 rounded border-2 border-input bg-background px-2 py-1 text-center focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    {topAlgo === "priority" && (
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          aria-label={`Priority for ${resolvedName}`}
                          value={row.prioStr}
                          onChange={(e) => updateRowField(idx, "prioStr", e.target.value)}
                          onBlur={() => clampRowField(idx, "prioStr")}
                          className="w-20 rounded border-2 border-input bg-background px-2 py-1 text-center focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chalkboard Stage (mirrors Banker's chalkboard section) */}
      <div className="chalkboard rounded-md p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={totalTime === 0}
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
          <Button variant="outline" onClick={handleStep} disabled={finished || totalTime === 0}>
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
              / {totalTime}
            </span>
          </div>
        </div>

        {/* Live Now Running + Ready Queue chips */}
        <div className="mt-5 flex min-h-9 flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-chalk-foreground/80">Now running:</span>
            {!started ? (
              <span className="rounded border border-chalk-foreground/45 px-2.5 py-0.5 text-chalk-foreground/75">
                not started
              </span>
            ) : finished ? (
              <span className="rounded border border-chalk-foreground/60 px-2.5 py-0.5 font-bold text-chalk-foreground">
                finished
              </span>
            ) : snapshot?.segmentType === "run" && snapshot.runningProcessId ? (
              <span
                className="inline-flex items-center gap-1.5 rounded border-2 border-chalk-foreground px-2.5 py-0.5 font-bold"
                style={{
                  backgroundColor: colors[snapshot.runningProcessId]?.bg,
                  color: colors[snapshot.runningProcessId]?.ink,
                }}
              >
                {result.displayNames[snapshot.runningProcessId]}
                <span className="opacity-70">({snapshot.runningProcessId})</span>
              </span>
            ) : (
              <span className="rounded border border-dashed border-chalk-foreground/70 px-2.5 py-0.5 text-chalk-foreground">
                {snapshot?.segmentType === "cs" ? "Context switch (CS)" : "Idle"}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-chalk-foreground/80">Ready queue:</span>
            {!started || finished ? (
              <span className="italic text-chalk-foreground/65">empty</span>
            ) : snapshot && snapshot.readyQueueIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {snapshot.readyQueueIds.map((id, i) => (
                  <span
                    key={`${id}-${i}`}
                    className="inline-flex items-center gap-1 rounded border border-foreground px-2 py-0.5 font-bold"
                    style={{
                      backgroundColor: colors[id]?.bg,
                      color: colors[id]?.ink,
                    }}
                  >
                    {result.displayNames[id]}
                    <span className="text-[10px] opacity-75">({id})</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="italic text-chalk-foreground/65">empty</span>
            )}
          </div>
        </div>

        {/* Animated Chalk Gantt Chart */}
        <SchedulingGantt
          gantt={result.gantt}
          colors={colors}
          totalTime={totalTime}
          currentTime={currentTime}
          started={started}
        />

        {/* Handwritten Step Narration */}
        <p
          key={started ? (finished ? "done" : (snapshot?.decisionId ?? 0)) : "idle"}
          className="animate-rise mt-4 min-h-8 font-hand text-2xl"
        >
          {!started && (
            <span className="opacity-75">
              Press Play or Step to follow each scheduling decision.
            </span>
          )}
          {started && !finished && snapshot && <>{snapshot.narration}</>}
          {finished && (
            <>
              ✅ All {result.metrics.length} processes finished at t = {totalTime}! Avg WT ={" "}
              {result.avgWaitingTime.toFixed(2)}, Avg TAT = {result.avgTurnaroundTime.toFixed(2)}.
            </>
          )}
        </p>
      </div>

      {/* Results & Summary Metrics Table */}
      <div className="paper-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground bg-secondary px-3 py-1.5">
          <p className="font-hand text-xl font-bold">Results & metrics</p>
          <span className="font-mono text-xs text-muted-foreground">
            {started
              ? `${completedCount}/${result.metrics.length} completed`
              : "values appear live as processes run"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max font-mono text-sm">
            <thead>
              <tr className="border-b border-foreground/20">
                <th className="px-3 py-2 text-left">Process</th>
                <th className="px-3 py-2 text-center">AT</th>
                <th className="px-3 py-2 text-center">BT</th>
                {topAlgo === "priority" && <th className="px-3 py-2 text-center">Priority</th>}
                <th className="px-3 py-2 text-center">CT</th>
                <th className="px-3 py-2 text-center">TAT</th>
                <th className="px-3 py-2 text-center">WT</th>
                <th className="px-3 py-2 text-center">RT</th>
              </tr>
            </thead>
            <tbody>
              {result.metrics.map((m) => {
                const color = colors[m.id];
                const hasStartedCpu = started && currentTime > m.firstCpuTime;
                const hasFinished = started && currentTime >= m.completionTime;
                return (
                  <tr
                    key={m.id}
                    className={`border-t border-foreground/10 transition-colors ${
                      hasFinished ? "bg-success/10" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-bold">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-sm border border-foreground"
                          style={{ backgroundColor: color?.bg }}
                          aria-hidden="true"
                        />
                        <span>{m.displayName}</span>
                        <span className="text-xs font-normal text-muted-foreground">({m.id})</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">{m.arrivalTime}</td>
                    <td className="px-3 py-2 text-center">{m.burstTime}</td>
                    {topAlgo === "priority" && (
                      <td className="px-3 py-2 text-center">{m.priority}</td>
                    )}
                    <td className="px-3 py-2 text-center font-bold">
                      {hasFinished ? m.completionTime : "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-bold">
                      {hasFinished ? m.turnaroundTime : "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-bold">
                      {hasFinished ? m.waitingTime : "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-bold">
                      {hasStartedCpu ? m.responseTime : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary aggregates */}
        <div className="grid gap-3 border-t-2 border-foreground bg-background/50 p-4 font-mono text-xs sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded border border-foreground/25 bg-paper px-3 py-2">
            <span className="block text-muted-foreground">Average WT</span>
            <span className="text-base font-bold">
              {finished ? result.avgWaitingTime.toFixed(2) : "—"}
            </span>
          </div>
          <div className="rounded border border-foreground/25 bg-paper px-3 py-2">
            <span className="block text-muted-foreground">Average TAT</span>
            <span className="text-base font-bold">
              {finished ? result.avgTurnaroundTime.toFixed(2) : "—"}
            </span>
          </div>
          <div className="rounded border border-foreground/25 bg-paper px-3 py-2">
            <span className="block text-muted-foreground">Average RT</span>
            <span className="text-base font-bold">
              {finished ? result.avgResponseTime.toFixed(2) : "—"}
            </span>
          </div>
          <div className="rounded border border-foreground/25 bg-paper px-3 py-2">
            <span className="block text-muted-foreground">CPU Utilization</span>
            <span className="text-base font-bold">
              {finished ? `${result.cpuUtilization.toFixed(1)}%` : "—"}
            </span>
          </div>
          <div className="rounded border border-foreground/25 bg-paper px-3 py-2">
            <span className="block text-muted-foreground">Throughput</span>
            <span className="text-base font-bold">
              {finished ? `${result.throughput.toFixed(3)} / unit` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Info notes triggered by the run */}
      {finished && result.warnings.length > 0 && (
        <div className="notebook rounded-md py-5 pl-16 pr-6">
          <p className="font-hand text-2xl font-bold text-primary">Observations from this run</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {result.warnings.map((note, idx) => (
              <li key={idx} className="leading-relaxed">
                • {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Calculations Dialog (mirrors Banker's Dialog) */}
      <Dialog open={calculationsOpen} onOpenChange={setCalculationsOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto bg-paper">
          <DialogHeader>
            <DialogTitle className="font-hand text-3xl">All calculations</DialogTitle>
            <DialogDescription>
              {activeMeta.label} · {result.metrics.length} processes · total time {totalTime}
            </DialogDescription>
          </DialogHeader>
          <SchedulingDetails
            result={result}
            colors={colors}
            currentTime={currentTime}
            started={started}
            contextSwitchTime={contextSwitchTime}
            quantum={quantum}
            aging={aging}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
