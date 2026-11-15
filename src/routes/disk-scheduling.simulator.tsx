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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DiskCalculationsDialog, DiskResultsPanel } from "@/components/DiskDetails";
import { DiskHeadChart } from "@/components/DiskHeadChart";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_EXAMPLE_CYLINDERS,
  DEFAULT_EXAMPLE_HEAD,
  DEFAULT_EXAMPLE_REQUEST_CYLINDERS,
  DISK_ALGORITHMS,
  DISK_ALGORITHM_MAP,
  simulateDiskScheduling,
  type DiskAlgorithm,
  type DiskDirection,
  type DiskRequestInput,
} from "@/lib/disk";
import { pickUniqueAppNames } from "@/lib/names";
import { assignProcessColors } from "@/lib/palette";

export const Route = createFileRoute("/disk-scheduling/simulator")({
  head: () => ({
    meta: [
      { title: "Disk Scheduling Simulator | OS Playground" },
      {
        name: "description",
        content:
          "Simulate FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK with animated cylinder tracks, collision-free label layout, and calculation traces.",
      },
      { property: "og:title", content: "Disk Scheduling Simulator | OS Playground" },
      {
        property: "og:description",
        content:
          "Simulate FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK with animated cylinder tracks, collision-free label layout, and calculation traces.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiskSchedulingSimulatorPage,
});

interface EditableRequest {
  id: string;
  name: string;
  cylinderStr: string;
}

const SPEEDS = [0.5, 1, 2, 4] as const;

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  if (raw.trim() === "") return fallback;
  const num = Number(raw);
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function clampFloat(raw: string, min: number, max: number, fallback: number): number {
  if (raw.trim() === "") return fallback;
  const num = Number(raw);
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function isValidCylinder(raw: string, maxCyl: number): boolean {
  if (raw.trim() === "") return false;
  const num = Number(raw);
  return Number.isInteger(num) && num >= 0 && num <= maxCyl;
}

function resolveUniqueDisplayNames(rows: EditableRequest[]): Record<string, string> {
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

function DiskSchedulingSimulatorPage() {
  const [algorithm, setAlgorithm] = useState<DiskAlgorithm>("fcfs");
  const [direction, setDirection] = useState<DiskDirection>("higher");
  const [countReturnJump, setCountReturnJump] = useState<boolean>(true);
  const [seekTimeStr, setSeekTimeStr] = useState<string>("1");

  const [cylindersStr, setCylindersStr] = useState<string>(String(DEFAULT_EXAMPLE_CYLINDERS));
  const [headStr, setHeadStr] = useState<string>(String(DEFAULT_EXAMPLE_HEAD));
  const [reqCountStr, setReqCountStr] = useState<string>(
    String(DEFAULT_EXAMPLE_REQUEST_CYLINDERS.length),
  );

  const [rows, setRows] = useState<EditableRequest[]>(() => {
    const initialNames = pickUniqueAppNames(DEFAULT_EXAMPLE_REQUEST_CYLINDERS.length);
    return DEFAULT_EXAMPLE_REQUEST_CYLINDERS.map((cyl, idx) => ({
      id: `R${idx + 1}`,
      name: initialNames[idx] || `App ${idx + 1}`,
      cylinderStr: String(cyl),
    }));
  });

  // Hover state for highlighting between table and chart
  const [hoveredRequestId, setHoveredRequestId] = useState<string | null>(null);

  // Playback state
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(0); // 0 to segments.length
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Dialog & notes
  const [calculationsOpen, setCalculationsOpen] = useState(false);
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
    setActiveStep(0);
  };

  // Parsing values
  const totalCylinders = clampInt(cylindersStr, 2, 9999, DEFAULT_EXAMPLE_CYLINDERS);
  const lastCylinder = Math.max(1, totalCylinders - 1);
  const startHead = clampInt(headStr, 0, lastCylinder, DEFAULT_EXAMPLE_HEAD);
  const seekTimeMs = clampFloat(seekTimeStr, 0.01, 1000, 1);

  // Validation
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (
      cylindersStr.trim() === "" ||
      !Number.isInteger(Number(cylindersStr)) ||
      Number(cylindersStr) < 2 ||
      Number(cylindersStr) > 9999
    ) {
      errs.push("Total cylinders must be an integer between 2 and 9,999.");
    }
    if (
      headStr.trim() === "" ||
      !Number.isInteger(Number(headStr)) ||
      Number(headStr) < 0 ||
      Number(headStr) > lastCylinder
    ) {
      errs.push(`Head start position must be an integer between 0 and ${lastCylinder}.`);
    }
    if (
      seekTimeStr.trim() === "" ||
      Number.isNaN(Number(seekTimeStr)) ||
      Number(seekTimeStr) <= 0
    ) {
      errs.push("Seek time per cylinder must be a positive number.");
    }
    rows.forEach((r, idx) => {
      if (!isValidCylinder(r.cylinderStr, lastCylinder)) {
        errs.push(`Request ${r.id} cylinder must be an integer between 0 and ${lastCylinder}.`);
      }
    });
    return errs;
  }, [cylindersStr, headStr, seekTimeStr, lastCylinder, rows]);

  const isValid = validationErrors.length === 0;

  const displayNames = useMemo(() => resolveUniqueDisplayNames(rows), [rows]);

  const colors = useMemo(
    () =>
      assignProcessColors(
        rows.map((r) => ({ id: r.id, name: displayNames[r.id] ?? r.id })),
      ),
    [rows, displayNames],
  );

  const parsedRequests: DiskRequestInput[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: displayNames[r.id] ?? r.id,
        cylinder: clampInt(r.cylinderStr, 0, lastCylinder, 0),
      })),
    [rows, displayNames, lastCylinder],
  );

  // Pure simulation result
  const result = useMemo(
    () =>
      simulateDiskScheduling(
        totalCylinders,
        startHead,
        parsedRequests,
        algorithm,
        direction,
        countReturnJump,
        seekTimeMs,
      ),
    [totalCylinders, startHead, parsedRequests, algorithm, direction, countReturnJump, seekTimeMs],
  );

  const totalSegments = result.segments.length;
  const isFinished = started && activeStep >= totalSegments;

  // Animation timer
  useEffect(() => {
    if (!playing) return;
    if (activeStep >= totalSegments) {
      setPlaying(false);
      return;
    }
    const delayMs = prefersReducedMotion ? 150 : Math.max(100, Math.round(750 / speed));
    const timer = window.setTimeout(() => {
      setActiveStep((prev) => Math.min(totalSegments, prev + 1));
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [playing, activeStep, totalSegments, speed, prefersReducedMotion]);

  // Input editing & resizing
  const resizeRequests = (nextCount: number) => {
    resetRun();
    setRows((prev) => {
      if (nextCount === prev.length) return prev;
      if (nextCount < prev.length) return prev.slice(0, nextCount);
      const needed = nextCount - prev.length;
      const newNames = pickUniqueAppNames(
        needed,
        prev.map((r) => r.name),
      );
      const extra: EditableRequest[] = Array.from({ length: needed }, (_, idx) => ({
        id: `R${prev.length + idx + 1}`,
        name: newNames[idx] || `App ${prev.length + idx + 1}`,
        cylinderStr: String(Math.floor(Math.random() * lastCylinder)),
      }));
      return [...prev, ...extra];
    });
  };

  const handleCylindersBlur = () => {
    const val = clampInt(cylindersStr, 2, 9999, DEFAULT_EXAMPLE_CYLINDERS);
    setCylindersStr(String(val));
    resetRun();
  };

  const handleHeadBlur = () => {
    const val = clampInt(headStr, 0, lastCylinder, DEFAULT_EXAMPLE_HEAD);
    setHeadStr(String(val));
    resetRun();
  };

  const handleReqCountChange = (valStr: string) => {
    setReqCountStr(valStr);
    if (valStr.trim() === "") return;
    const val = Number(valStr);
    if (Number.isInteger(val) && val >= 1 && val <= 15) {
      resizeRequests(val);
    }
  };

  const handleReqCountBlur = () => {
    const val = clampInt(reqCountStr, 1, 15, rows.length || 8);
    setReqCountStr(String(val));
    resizeRequests(val);
  };

  const handleSeekTimeBlur = () => {
    const val = clampFloat(seekTimeStr, 0.01, 1000, 1);
    setSeekTimeStr(String(val));
  };

  const randomize = () => {
    resetRun();
    const names = pickUniqueAppNames(rows.length);
    setHeadStr(String(Math.floor(Math.random() * lastCylinder)));
    setRows((prev) =>
      prev.map((r, idx) => ({
        ...r,
        name: names[idx] || r.name,
        cylinderStr: String(Math.floor(Math.random() * lastCylinder)),
      })),
    );
  };

  const shuffleNames = () => {
    resetRun();
    const names = pickUniqueAppNames(rows.length);
    setRows((prev) => prev.map((r, idx) => ({ ...r, name: names[idx] || r.name })));
  };

  const loadExample = () => {
    resetRun();
    setCylindersStr(String(DEFAULT_EXAMPLE_CYLINDERS));
    setHeadStr(String(DEFAULT_EXAMPLE_HEAD));
    setDirection("higher");
    setCountReturnJump(true);
    setSeekTimeStr("1");
    setReqCountStr(String(DEFAULT_EXAMPLE_REQUEST_CYLINDERS.length));

    const initialNames = pickUniqueAppNames(DEFAULT_EXAMPLE_REQUEST_CYLINDERS.length);
    setRows(
      DEFAULT_EXAMPLE_REQUEST_CYLINDERS.map((cyl, idx) => ({
        id: `R${idx + 1}`,
        name: initialNames[idx] || `App ${idx + 1}`,
        cylinderStr: String(cyl),
      })),
    );
  };

  const handlePlayToggle = () => {
    if (!isValid || totalSegments === 0) return;
    if (isFinished) {
      setActiveStep(0);
      setStarted(true);
      setPlaying(true);
      return;
    }
    if (!started) {
      setStarted(true);
      setActiveStep(0);
    }
    setPlaying((p) => !p);
  };

  const handleStep = () => {
    if (!isValid || totalSegments === 0) return;
    setPlaying(false);
    if (!started) {
      setStarted(true);
      setActiveStep(1);
      return;
    }
    setActiveStep((prev) => Math.min(totalSegments, prev + 1));
  };

  const activeAlgoMeta = DISK_ALGORITHM_MAP[algorithm];
  const segmentsShown = started ? result.segments.slice(0, activeStep) : [];

  // Determine which requests are pending at current activeStep
  const servedIds = new Set(
    segmentsShown.filter((s) => s.kind === "serve" && s.requestId).map((s) => s.requestId!),
  );
  const pendingRequests = rows.filter((r) => !servedIds.has(r.id));

  // Current narration text
  const currentNarration = !started
    ? "Press Play or Step to watch the disk head serve requests."
    : activeStep === 0
      ? `Head is currently stationed at cylinder ${startHead}. Press Step or Play to begin.`
      : result.segments[activeStep - 1]?.narration || "";

  return (
    <div className="space-y-8">
      <div>
        <Link to="/disk-scheduling" className="text-sm text-muted-foreground hover:underline">
          ← back to Disk Scheduling
        </Link>
      </div>

      {/* Header + counts & quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Disk Scheduling Simulator</h1>
          <p className="text-muted-foreground">
            Watch the disk head sweep and serve cylinder requests across classical algorithms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
          <label className="flex items-center gap-2">
            cylinders
            <input
              aria-label="Total cylinders"
              type="number"
              min={2}
              max={9999}
              step={1}
              value={cylindersStr}
              onChange={(e) => setCylindersStr(e.target.value)}
              onBlur={handleCylindersBlur}
              className="w-24 rounded-md border-2 border-input bg-paper p-2 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex items-center gap-2">
            head start
            <input
              aria-label="Head start position"
              type="number"
              min={0}
              max={lastCylinder}
              step={1}
              value={headStr}
              onChange={(e) => setHeadStr(e.target.value)}
              onBlur={handleHeadBlur}
              className="w-20 rounded-md border-2 border-input bg-paper p-2 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex items-center gap-2">
            requests
            <input
              aria-label="Number of requests"
              type="number"
              min={1}
              max={15}
              step={1}
              value={reqCountStr}
              onChange={(e) => handleReqCountChange(e.target.value)}
              onBlur={handleReqCountBlur}
              className="w-16 rounded-md border-2 border-input bg-paper p-2 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button
            variant="outline"
            onClick={() => {
              handleCylindersBlur();
              handleHeadBlur();
              handleReqCountBlur();
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
      <section className="paper-card p-4 space-y-4" aria-label="Disk scheduling algorithm selector">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {DISK_ALGORITHMS.map((item) => {
              const active = algorithm === item.id;
              return (
                <Button
                  key={item.id}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  aria-pressed={active}
                  onClick={() => {
                    resetRun();
                    setAlgorithm(item.id);
                  }}
                  className={active ? "font-bold" : ""}
                >
                  {item.label}
                </Button>
              );
            })}
          </div>

          <span className="rounded-md border border-foreground/25 bg-highlight/50 px-2.5 py-1 font-mono text-xs font-bold">
            Active: {activeAlgoMeta.label}
            {activeAlgoMeta.usesDirection
              ? `, moving toward ${direction}`
              : " (direction independent)"}
          </span>
        </div>

        {/* Algorithm description + settings controls */}
        <div className="grid gap-3 pt-1 border-t border-foreground/15 sm:grid-cols-2 lg:grid-cols-3 text-xs font-mono">
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <p className="text-muted-foreground">{activeAlgoMeta.shortDesc}</p>
          </div>

          {/* Direction toggle */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Direction:</span>
            <Button
              variant={direction === "higher" ? "default" : "outline"}
              size="sm"
              disabled={!activeAlgoMeta.usesDirection}
              title={
                !activeAlgoMeta.usesDirection
                  ? `${activeAlgoMeta.label} does not use initial head direction.`
                  : "Sweep toward higher cylinders first"
              }
              onClick={() => {
                resetRun();
                setDirection("higher");
              }}
              className="h-7 text-xs"
            >
              Higher →
            </Button>
            <Button
              variant={direction === "lower" ? "default" : "outline"}
              size="sm"
              disabled={!activeAlgoMeta.usesDirection}
              title={
                !activeAlgoMeta.usesDirection
                  ? `${activeAlgoMeta.label} does not use initial head direction.`
                  : "Sweep toward lower cylinders first"
              }
              onClick={() => {
                resetRun();
                setDirection("lower");
              }}
              className="h-7 text-xs"
            >
              ← Lower
            </Button>
          </div>

          {/* Return jump toggle & seek time */}
          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`flex items-center gap-1.5 cursor-pointer ${
                algorithm !== "c-scan" && algorithm !== "c-look"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              title="When ON, includes the circular jump distance in the total head movement"
            >
              <input
                type="checkbox"
                checked={countReturnJump}
                disabled={algorithm !== "c-scan" && algorithm !== "c-look"}
                onChange={(e) => {
                  setCountReturnJump(e.target.checked);
                }}
                className="rounded border-input text-primary"
              />
              <span>Count return jump</span>
            </label>

            <label className="flex items-center gap-1">
              <span>seek ms/cyl:</span>
              <input
                type="number"
                min={0.01}
                step={0.1}
                aria-label="Seek time per cylinder in ms"
                value={seekTimeStr}
                onChange={(e) => setSeekTimeStr(e.target.value)}
                onBlur={handleSeekTimeBlur}
                className="w-16 rounded border border-input bg-background px-1.5 py-0.5 text-center"
              />
            </label>
          </div>
        </div>

        {/* Collapsible rules link */}
        <div className="border-t border-foreground/15 pt-2 flex justify-end">
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
            <p>• <b>Cylinders:</b> 0 to {lastCylinder} (total {totalCylinders}). Head starts at cylinder {startHead}.</p>
            <p>• <b>Immediate service:</b> A request on the head cylinder is served immediately with 0 distance in all algorithms.</p>
            <p>• <b>Duplicates:</b> Requests on the same cylinder are served together in table order at distance 0.</p>
            <p>• <b>SCAN / C-SCAN:</b> Always travel to the physical boundary (0 or {lastCylinder}) before reversing or jumping.</p>
            <p>• <b>LOOK / C-LOOK:</b> Look ahead and turn/jump immediately at the outermost request without touching empty disk ends.</p>
            <p>• <b>Jump toggle:</b> Controls whether return jumps are counted in total head movement (both totals are always shown in Calculations).</p>
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

      {/* Requests Input Table */}
      <div className="paper-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/15 bg-paper px-4 py-3">
          <h2 className="font-hand text-3xl font-bold">Request queue (cylinders 0 to {lastCylinder})</h2>
          <span className="font-mono text-xs text-muted-foreground">
            Order in table = arrival sequence (used by FCFS)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-foreground/15 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 text-center">Arrival</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">App Name</th>
                <th className="px-3 py-2 text-center">Cylinder (0 – {lastCylinder})</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const color = colors[row.id];
                const resolved = displayNames[row.id] ?? row.id;
                const trimmedInput = row.name.trim().slice(0, 14);
                const showsResolved = resolved !== trimmedInput;
                const invalid = !isValidCylinder(row.cylinderStr, lastCylinder);
                const isServed = servedIds.has(row.id);

                const isHovered = hoveredRequestId === row.id;

                return (
                  <tr
                    key={row.id}
                    onMouseEnter={() => setHoveredRequestId(row.id)}
                    onMouseLeave={() => setHoveredRequestId(null)}
                    onFocus={() => setHoveredRequestId(row.id)}
                    onBlur={() => setHoveredRequestId(null)}
                    className={`border-t border-foreground/10 transition-colors ${
                      isHovered
                        ? "bg-primary/15"
                        : isServed
                          ? "bg-success/15"
                          : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-muted-foreground">#{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-muted-foreground">{row.id}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border-2 border-foreground"
                          style={{ backgroundColor: color?.bg }}
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          maxLength={14}
                          aria-label={`Request name for ${row.id}`}
                          value={row.name}
                          onChange={(e) => {
                            resetRun();
                            const val = e.target.value;
                            setRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, name: val } : r)),
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
                        min={0}
                        max={lastCylinder}
                        step={1}
                        aria-label={`Cylinder for ${resolved}`}
                        value={row.cylinderStr}
                        onChange={(e) => {
                          resetRun();
                          const val = e.target.value;
                          setRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, cylinderStr: val } : r)),
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

      {/* Chalkboard Stage with Head Movement Chart */}
      <div className="chalkboard rounded-md p-6 space-y-5">
        {/* Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={!isValid || totalSegments === 0}
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
            disabled={!isValid || isFinished || totalSegments === 0}
          >
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
              segment {activeStep} / {totalSegments}
            </span>
          </div>
        </div>

        {/* Pending Requests Queue (Colored chips that shrink as served) */}
        <div className="flex min-h-9 flex-wrap items-center gap-2 font-mono text-xs">
          <span className="text-chalk-foreground/80">Pending requests:</span>
          {pendingRequests.length === 0 ? (
            <span className="italic text-chalk-foreground/65">all served</span>
          ) : (
            pendingRequests.map((r) => {
              const color = colors[r.id];
              return (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1.5 rounded border border-chalk-foreground/60 px-2 py-0.5 font-bold transition-all duration-300"
                  style={{ backgroundColor: color?.bg, color: color?.ink }}
                >
                  {displayNames[r.id] ?? r.name} ({r.cylinderStr})
                </span>
              );
            })
          )}
        </div>

        {/* Disk Head Chart */}
        <DiskHeadChart
          totalCylinders={totalCylinders}
          lastCylinder={lastCylinder}
          startHead={startHead}
          segments={result.segments}
          activeStep={activeStep}
          colors={colors}
          displayNames={displayNames}
          hoveredRequestId={hoveredRequestId}
          onHoverRequest={setHoveredRequestId}
        />

        {/* Narration Box */}
        <div className="rounded border border-chalk-foreground/30 bg-black/15 px-4 py-3">
          <p className="font-hand text-2xl text-chalk-foreground">{currentNarration}</p>
        </div>
      </div>

      {/* Results & Calculations Panel */}
      <DiskResultsPanel
        result={result}
        segmentsShown={segmentsShown}
        colors={colors}
        displayNames={displayNames}
        isFinished={isFinished}
        hoveredRequestId={hoveredRequestId}
        onHoverRequest={setHoveredRequestId}
      />

      {/* Calculations Dialog */}
      <DiskCalculationsDialog
        open={calculationsOpen}
        onOpenChange={setCalculationsOpen}
        result={result}
        segmentsShown={segmentsShown}
        displayNames={displayNames}
      />
    </div>
  );
}
