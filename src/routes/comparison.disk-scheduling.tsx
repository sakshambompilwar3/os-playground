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
import { useEffect, useMemo, useRef, useState } from "react";
import { DiskHeadChart } from "@/components/DiskHeadChart";
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
  computeDirectionSensitivity,
  computeLongestWait,
  DEFAULT_EXAMPLE_CYLINDERS,
  DEFAULT_EXAMPLE_HEAD,
  DEFAULT_EXAMPLE_REQUEST_CYLINDERS,
  DISK_ALGORITHM_MAP,
  FIXED_ALGORITHM_ORDER,
  pickBest,
  simulateDiskScheduling,
  type BestDiskVerdict,
  type DirectionSensitivityReport,
  type DiskAlgorithm,
  type DiskDirection,
  type DiskRequestInput,
  type DiskSimulationResult,
} from "@/lib/disk";
import { pickUniqueAppNames } from "@/lib/names";
import { assignProcessColors } from "@/lib/palette";

export const Route = createFileRoute("/comparison/disk-scheduling")({
  head: () => ({
    meta: [
      { title: "Disk Scheduling Comparison | OS Playground" },
      {
        name: "description",
        content:
          "Compare FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK side by side on identical workloads with synchronized head tracks and best algorithm verdict.",
      },
      { property: "og:title", content: "Disk Scheduling Comparison | OS Playground" },
      {
        property: "og:description",
        content:
          "Compare FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK side by side on identical workloads with synchronized head tracks and best algorithm verdict.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiskSchedulingComparisonPage,
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

function DiskSchedulingComparisonPage() {
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

  // Playback state
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsedCylinders, setElapsedCylinders] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [manualShowVerdict, setManualShowVerdict] = useState(false);

  // Dialog & notes
  const [calculationsOpen, setCalculationsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [howBestOpen, setHowBestOpen] = useState(false);
  const [calcTab, setCalcTab] = useState<string>("best");

  // Hover state for bidirectional highlighting
  const [hoveredRequestId, setHoveredRequestId] = useState<string | null>(null);

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
    setElapsedCylinders(0);
    setManualShowVerdict(false);
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
      errs.push("Total cylinders must be an integer between 2 and 9999.");
    }
    if (
      headStr.trim() === "" ||
      !Number.isInteger(Number(headStr)) ||
      Number(headStr) < 0 ||
      Number(headStr) > lastCylinder
    ) {
      errs.push(`Starting head must be an integer between 0 and ${lastCylinder}.`);
    }
    if (rows.length === 0 || rows.length > 15) {
      errs.push("Must have between 1 and 15 requests.");
    }
    rows.forEach((r, idx) => {
      if (!isValidCylinder(r.cylinderStr, lastCylinder)) {
        errs.push(`Request #${idx + 1} (${r.id}): cylinder must be between 0 and ${lastCylinder}.`);
      }
    });
    if (seekTimeStr.trim() === "" || Number(seekTimeStr) <= 0) {
      errs.push("Seek time per cylinder must be greater than 0 ms.");
    }
    return errs;
  }, [cylindersStr, headStr, lastCylinder, rows, seekTimeStr]);

  const isValid = validationErrors.length === 0;

  // Requests input parsed
  const parsedRequests: DiskRequestInput[] = useMemo(() => {
    return rows.map((r, idx) => ({
      id: r.id,
      name: r.name.trim() || r.id,
      cylinder: clampInt(r.cylinderStr, 0, lastCylinder, 0),
    }));
  }, [rows, lastCylinder]);

  // Display names & colors
  const displayNames = useMemo(() => resolveUniqueDisplayNames(rows), [rows]);
  const colors = useMemo(() => assignProcessColors(rows), [rows]);

  // Run simulation on all six algorithms simultaneously on identical input
  const allResults: Record<DiskAlgorithm, DiskSimulationResult> = useMemo(() => {
    if (!isValid) {
      const fallback: Record<string, DiskSimulationResult> = {};
      FIXED_ALGORITHM_ORDER.forEach((algo) => {
        fallback[algo] = {
          algorithm: algo,
          direction,
          countReturnJump,
          totalCylinders,
          lastCylinder,
          startHead,
          seekTimePerCylinderMs: seekTimeMs,
          segments: [],
          steps: [],
          serviceOrder: [],
          totalHeadMovement: 0,
          totalHeadMovementWithJump: 0,
          totalHeadMovementWithoutJump: 0,
          averageSeekPerRequest: 0,
          totalSeekTimeMs: 0,
          servedCount: 0,
        };
      });
      return fallback as Record<DiskAlgorithm, DiskSimulationResult>;
    }

    const resMap: Partial<Record<DiskAlgorithm, DiskSimulationResult>> = {};
    FIXED_ALGORITHM_ORDER.forEach((algo) => {
      resMap[algo] = simulateDiskScheduling(
        totalCylinders,
        startHead,
        parsedRequests,
        algo,
        direction,
        countReturnJump,
        seekTimeMs,
      );
    });
    return resMap as Record<DiskAlgorithm, DiskSimulationResult>;
  }, [
    isValid,
    totalCylinders,
    startHead,
    parsedRequests,
    direction,
    countReturnJump,
    seekTimeMs,
    lastCylinder,
  ]);

  const resultsList = useMemo(() => {
    return FIXED_ALGORITHM_ORDER.map((algo) => allResults[algo]);
  }, [allResults]);

  // Verdict calculation (pure function pickBest)
  const verdict: BestDiskVerdict | null = useMemo(() => {
    if (!isValid || resultsList.length === 0) return null;
    return pickBest(resultsList);
  }, [isValid, resultsList]);

  // Direction sensitivity report
  const directionSensitivity: DirectionSensitivityReport | null = useMemo(() => {
    if (!isValid || parsedRequests.length === 0) return null;
    return computeDirectionSensitivity(
      totalCylinders,
      startHead,
      parsedRequests,
      countReturnJump,
      seekTimeMs,
    );
  }, [isValid, totalCylinders, startHead, parsedRequests, countReturnJump, seekTimeMs]);

  // Maximum movement across all algorithms (for normalization and constant speed sync)
  const maxTotalMovement = useMemo(() => {
    return Math.max(1, ...resultsList.map((r) => r.totalHeadMovement));
  }, [resultsList]);

  // Per-algorithm active step and live progress derived from constant-speed elapsed cylinders
  const liveStats = useMemo(() => {
    const stats: Record<
      DiskAlgorithm,
      {
        activeStep: number;
        movementSoFar: number;
        servedSoFar: number;
        isFinished: boolean;
        longestWait: number;
      }
    > = {} as any;

    FIXED_ALGORITHM_ORDER.forEach((algo) => {
      const res = allResults[algo];
      const finalTotal = res.totalHeadMovement;

      if (!started || elapsedCylinders === 0) {
        stats[algo] = {
          activeStep: 0,
          movementSoFar: 0,
          servedSoFar: 0,
          isFinished: false,
          longestWait: computeLongestWait(res),
        };
        return;
      }

      if (elapsedCylinders >= finalTotal) {
        stats[algo] = {
          activeStep: res.segments.length,
          movementSoFar: finalTotal,
          servedSoFar: res.servedCount,
          isFinished: true,
          longestWait: computeLongestWait(res),
        };
        return;
      }

      // Step along segments until cumulative distance exceeds elapsedCylinders
      let cumDistance = 0;
      let step = 0;
      let served = 0;

      for (let i = 0; i < res.segments.length; i++) {
        const seg = res.segments[i]!;
        const segDist = seg.countedInTotal ? seg.distance : 0;
        if (cumDistance + segDist > elapsedCylinders) {
          step = i;
          break;
        }
        cumDistance += segDist;
        if (seg.kind === "serve") served++;
        step = i + 1;
      }

      stats[algo] = {
        activeStep: step,
        movementSoFar: Math.min(finalTotal, elapsedCylinders),
        servedSoFar: served,
        isFinished: false,
        longestWait: computeLongestWait(res),
      };
    });

    return stats;
  }, [allResults, started, elapsedCylinders]);

  const allFinished = useMemo(() => {
    if (!started) return false;
    return FIXED_ALGORITHM_ORDER.every((algo) => liveStats[algo].isFinished);
  }, [started, liveStats]);

  const shouldShowVerdict = manualShowVerdict || allFinished;

  // Constant speed playback timer: all heads move at the exact same cylinders/second
  useEffect(() => {
    if (!playing || !isValid) return;

    if (prefersReducedMotion) {
      setElapsedCylinders(maxTotalMovement);
      setPlaying(false);
      return;
    }

    // Base speed: 100 cylinders per second at 1x
    const stepIntervalMs = 50;
    const cylindersPerStep = Math.max(1, Math.round((100 * (stepIntervalMs / 1000)) * speed));

    const timer = setInterval(() => {
      setElapsedCylinders((prev) => {
        const next = prev + cylindersPerStep;
        if (next >= maxTotalMovement) {
          setPlaying(false);
          return maxTotalMovement;
        }
        return next;
      });
    }, stepIntervalMs);

    return () => clearInterval(timer);
  }, [playing, isValid, speed, maxTotalMovement, prefersReducedMotion]);

  // Handlers
  const handlePlayToggle = () => {
    if (!isValid) return;
    if (!started) {
      setStarted(true);
      setElapsedCylinders(0);
      setPlaying(true);
      return;
    }
    if (allFinished) {
      setElapsedCylinders(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const handleStep = () => {
    if (!isValid) return;
    setPlaying(false);
    if (!started) {
      setStarted(true);
    }
    if (allFinished) return;

    // Step every algorithm forward to its next served request
    let minNextCylinder = Infinity;
    FIXED_ALGORITHM_ORDER.forEach((algo) => {
      const res = allResults[algo];
      let cum = 0;
      for (const seg of res.segments) {
        if (seg.countedInTotal) cum += seg.distance;
        if (seg.kind === "serve" && cum > elapsedCylinders) {
          if (cum < minNextCylinder) minNextCylinder = cum;
          break;
        }
      }
    });

    if (minNextCylinder !== Infinity) {
      setElapsedCylinders(minNextCylinder);
    } else {
      setElapsedCylinders(maxTotalMovement);
    }
  };

  const randomize = () => {
    resetRun();
    const newHead = Math.floor(Math.random() * (totalCylinders - 1));
    setHeadStr(String(newHead));
    const newCount = rows.length;
    const newNames = pickUniqueAppNames(newCount);
    setRows(
      Array.from({ length: newCount }, (_, idx) => ({
        id: `R${idx + 1}`,
        name: newNames[idx] || `App ${idx + 1}`,
        cylinderStr: String(Math.floor(Math.random() * (totalCylinders - 1))),
      })),
    );
  };

  const shuffleNames = () => {
    const fresh = pickUniqueAppNames(rows.length);
    setRows((prev) =>
      prev.map((r, idx) => ({
        ...r,
        name: fresh[idx] || r.name,
      })),
    );
  };

  const loadExample = () => {
    resetRun();
    setCylindersStr(String(DEFAULT_EXAMPLE_CYLINDERS));
    setHeadStr(String(DEFAULT_EXAMPLE_HEAD));
    setReqCountStr(String(DEFAULT_EXAMPLE_REQUEST_CYLINDERS.length));
    setDirection("higher");
    setCountReturnJump(true);
    setSeekTimeStr("1");
    const names = pickUniqueAppNames(DEFAULT_EXAMPLE_REQUEST_CYLINDERS.length);
    setRows(
      DEFAULT_EXAMPLE_REQUEST_CYLINDERS.map((cyl, idx) => ({
        id: `R${idx + 1}`,
        name: names[idx] || `App ${idx + 1}`,
        cylinderStr: String(cyl),
      })),
    );
  };

  const handleCylindersBlur = () => {
    const clamped = clampInt(cylindersStr, 2, 9999, DEFAULT_EXAMPLE_CYLINDERS);
    setCylindersStr(String(clamped));
    const newMax = clamped - 1;
    const clampedHead = clampInt(headStr, 0, newMax, Math.min(newMax, DEFAULT_EXAMPLE_HEAD));
    setHeadStr(String(clampedHead));
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        cylinderStr: String(clampInt(r.cylinderStr, 0, newMax, 0)),
      })),
    );
  };

  const handleHeadBlur = () => {
    const clamped = clampInt(headStr, 0, lastCylinder, DEFAULT_EXAMPLE_HEAD);
    setHeadStr(String(clamped));
  };

  const handleReqCountBlur = () => {
    const target = clampInt(reqCountStr, 1, 15, rows.length);
    setReqCountStr(String(target));
    if (target === rows.length) return;
    resetRun();
    if (target < rows.length) {
      setRows((prev) => prev.slice(0, target));
    } else {
      const extraNeeded = target - rows.length;
      const existingNames = new Set(rows.map((r) => r.name.toLowerCase()));
      const extraNames = pickUniqueAppNames(extraNeeded, existingNames);
      const added: EditableRequest[] = Array.from({ length: extraNeeded }, (_, i) => {
        const idNum = rows.length + i + 1;
        return {
          id: `R${idNum}`,
          name: extraNames[i] || `App ${idNum}`,
          cylinderStr: String(Math.floor(Math.random() * lastCylinder)),
        };
      });
      setRows((prev) => [...prev, ...added]);
    }
  };

  const handleSeekTimeBlur = () => {
    const clamped = clampFloat(seekTimeStr, 0.01, 1000, 1);
    setSeekTimeStr(String(clamped));
  };

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
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Disk Scheduling comparison</h1>
          <p className="text-muted-foreground">
            Run all six disk scheduling algorithms simultaneously on identical workloads.
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
              onChange={(e) => {
                resetRun();
                setCylindersStr(e.target.value);
              }}
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
              onChange={(e) => {
                resetRun();
                setHeadStr(e.target.value);
              }}
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
              onChange={(e) => {
                resetRun();
                setReqCountStr(e.target.value);
              }}
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

      {/* Global Config Selector Card */}
      <section className="paper-card p-4 space-y-4" aria-label="Disk scheduling parameters">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Direction toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
              Sweep toward:
            </span>
            <button
              type="button"
              onClick={() => {
                resetRun();
                setDirection("higher");
              }}
              className={`rounded border-2 px-3 py-1 font-mono text-xs font-bold transition-all ${
                direction === "higher"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-input bg-background hover:bg-muted text-foreground"
              }`}
            >
              Higher cylinders (↑ {lastCylinder})
            </button>
            <button
              type="button"
              onClick={() => {
                resetRun();
                setDirection("lower");
              }}
              className={`rounded border-2 px-3 py-1 font-mono text-xs font-bold transition-all ${
                direction === "lower"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-input bg-background hover:bg-muted text-foreground"
              }`}
            >
              Lower cylinders (↓ 0)
            </button>
          </div>

          {/* Jump toggle & seek time */}
          <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={countReturnJump}
                onChange={(e) => {
                  resetRun();
                  setCountReturnJump(e.target.checked);
                }}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <span>Count return jump in C-SCAN & C-LOOK</span>
            </label>

            <label className="flex items-center gap-1.5">
              <span>Seek time:</span>
              <input
                type="number"
                min={0.01}
                step={0.1}
                aria-label="Seek time per cylinder in ms"
                value={seekTimeStr}
                onChange={(e) => {
                  resetRun();
                  setSeekTimeStr(e.target.value);
                }}
                onBlur={handleSeekTimeBlur}
                className="w-16 rounded border border-input bg-background px-1.5 py-0.5 text-center"
              />
              <span>ms/cyl</span>
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
            <p>• <b>SCAN / C-SCAN:</b> Always travel to physical boundaries (0 or {lastCylinder}) before reversing or jumping.</p>
            <p>• <b>LOOK / C-LOOK:</b> Reverse or jump at outermost requests without touching empty disk ends.</p>
            <p>• <b>Jump toggle:</b> Controls whether return jumps are counted in total head movement.</p>
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
            Shared identical workload for all six algorithms
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
                const isHovered = hoveredRequestId === row.id;

                return (
                  <tr
                    key={row.id}
                    onMouseEnter={() => setHoveredRequestId(row.id)}
                    onMouseLeave={() => setHoveredRequestId(null)}
                    onFocus={() => setHoveredRequestId(row.id)}
                    onBlur={() => setHoveredRequestId(null)}
                    className={`border-t border-foreground/10 transition-colors ${
                      isHovered ? "bg-primary/15" : ""
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

      {/* Chalkboard Stage with Synchronized Head Movement Charts */}
      <div className="chalkboard rounded-md p-6 space-y-6">
        {/* Shared Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={!isValid}
            onClick={handlePlayToggle}
            className="bg-highlight text-foreground font-bold"
          >
            {playing ? <Pause /> : <Play />}
            {playing ? "Pause" : started && !allFinished ? "Resume" : "Play"}
          </Button>
          <Button variant="outline" disabled={!isValid || allFinished} onClick={handleStep}>
            <StepForward />
            Step
          </Button>
          <Button variant="outline" onClick={resetRun}>
            <RotateCcw />
            Reset
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCalcTab("best");
              setCalculationsOpen(true);
            }}
          >
            <Calculator />
            Calculations
          </Button>

          {!allFinished && !manualShowVerdict && (
            <Button
              variant="outline"
              disabled={!isValid}
              onClick={() => setManualShowVerdict(true)}
              className="font-mono text-xs"
            >
              <Trophy className="h-3.5 w-3.5 text-highlight" />
              Show verdict now
            </Button>
          )}

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs sm:ml-auto">
            <span className="text-chalk-muted font-bold">speed</span>
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
            <span className="ml-1 min-w-[7rem] text-right font-mono text-sm">
              {allFinished ? "all finished" : `${elapsedCylinders} / ${maxTotalMovement} cyl`}
            </span>
          </div>
        </div>

        {/* Best Algorithm Verdict Card */}
        {shouldShowVerdict && verdict && (
          <div className="rounded-md border-2 border-highlight bg-black/25 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-highlight/30 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-highlight" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-highlight">
                    Best Algorithm Verdict
                  </span>
                </div>
                <p className="mt-1 font-hand text-4xl sm:text-5xl font-bold text-highlight">
                  {verdict.isTie
                    ? `TIE: ${verdict.tiedAlgorithms.map((a) => DISK_ALGORITHM_MAP[a].label).join(", ")}`
                    : `Winner: ${verdict.winnerName} (${verdict.ranked[0]!.totalHeadMovement} cylinders)`}
                </p>
              </div>

              {/* Per-metric winner chips */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded border border-highlight/50 bg-highlight/15 px-2.5 py-1 text-chalk-foreground">
                  Lowest Total Movement:{" "}
                  <b className="text-highlight">
                    {verdict.perMetricWinners.lowestMovement.isTie
                      ? `Tie (${verdict.perMetricWinners.lowestMovement.value} cyl)`
                      : `${DISK_ALGORITHM_MAP[verdict.perMetricWinners.lowestMovement.algorithm].label} (${verdict.perMetricWinners.lowestMovement.value} cyl)`}
                  </b>
                </span>
                <span className="rounded border border-chalk-foreground/40 bg-white/5 px-2.5 py-1 text-chalk-foreground">
                  Lowest Longest Wait:{" "}
                  <b className="text-highlight">
                    {verdict.perMetricWinners.lowestLongestWait.isTie
                      ? `Tie (${verdict.perMetricWinners.lowestLongestWait.value} cyl)`
                      : `${DISK_ALGORITHM_MAP[verdict.perMetricWinners.lowestLongestWait.algorithm].label} (${verdict.perMetricWinners.lowestLongestWait.value} cyl)`}
                  </b>
                </span>
              </div>
            </div>

            {/* Generated Explanation */}
            <div className="font-hand text-xl sm:text-2xl text-chalk-foreground leading-relaxed space-y-2">
              {verdict.explanationLines.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>

            {/* Direction Sensitivity Mini-Table */}
            {directionSensitivity && (
              <div className="rounded border border-chalk-foreground/25 bg-black/20 p-3">
                <p className="font-mono text-xs font-bold uppercase text-chalk-foreground mb-2">
                  Direction Sensitivity (Higher vs Lower comparison):
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-xs text-left">
                    <thead>
                      <tr className="border-b border-chalk-foreground/20 text-chalk-muted">
                        <th className="py-1 px-2">Algorithm</th>
                        <th className="py-1 px-2 text-right">Toward Higher (↑)</th>
                        <th className="py-1 px-2 text-right">Toward Lower (↓)</th>
                        <th className="py-1 px-2 text-right">Direction Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-chalk-foreground/10 text-chalk-foreground">
                      {directionSensitivity.items.map((item) => (
                        <tr key={item.algorithm}>
                          <td className="py-1 px-2 font-bold">{item.label}</td>
                          <td className="py-1 px-2 text-right">{item.higherTotal} cyl</td>
                          <td className="py-1 px-2 text-right">{item.lowerTotal} cyl</td>
                          <td className="py-1 px-2 text-right">
                            {item.difference === 0 ? "0 cyl" : `±${item.difference} cyl`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs font-mono text-chalk-muted">
                  Higher winner: <b>{directionSensitivity.higherWinner.label}</b> ({directionSensitivity.higherWinner.total} cyl) · Lower winner: <b>{directionSensitivity.lowerWinner.label}</b> ({directionSensitivity.lowerWinner.total} cyl)
                </p>
              </div>
            )}

            {/* Collapsible How is Best Decided note */}
            <div className="border-t border-highlight/20 pt-2">
              <button
                type="button"
                onClick={() => setHowBestOpen((o) => !o)}
                className="inline-flex cursor-pointer items-center gap-1 font-mono text-xs font-bold text-highlight hover:underline"
              >
                {howBestOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                How is &quot;best&quot; decided?
              </button>
              {howBestOpen && (
                <div className="mt-2 rounded bg-black/30 p-3 font-mono text-xs text-chalk-foreground space-y-1 leading-relaxed">
                  <p>1. <b>Primary metric:</b> Lowest total head movement (under current jump toggle).</p>
                  <p>2. <b>Tie-break:</b> Lower longest wait (cylinders the head moved before the last request was served).</p>
                  <p>3. <b>True tie:</b> If two or more algorithms match on both total movement and longest wait, a tie is declared without pretending one wins.</p>
                  <p>4. <b>Ordering:</b> The ranking table displays ties in fixed algorithm sequence (FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK).</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6 Head Movement Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {FIXED_ALGORITHM_ORDER.map((algo) => {
            const meta = DISK_ALGORITHM_MAP[algo];
            const res = allResults[algo];
            const live = liveStats[algo];
            const isWinner = verdict ? (!verdict.isTie && verdict.winner === algo) || (verdict.isTie && verdict.tiedAlgorithms.includes(algo)) : false;

            return (
              <div
                key={algo}
                className={`rounded-md border p-4 space-y-3 transition-colors ${
                  isWinner && shouldShowVerdict
                    ? "border-highlight bg-black/25 shadow-[0_0_15px_rgba(255,241,118,0.15)]"
                    : "border-chalk-foreground/30 bg-black/15"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-chalk-foreground/20 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-hand text-3xl font-bold text-chalk-foreground">
                      {meta.label}
                    </h3>
                    {isWinner && shouldShowVerdict && (
                      <span className="inline-flex items-center gap-1 rounded bg-highlight px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                        <Trophy className="h-3 w-3" /> Winner
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs">
                    {live.isFinished ? (
                      <span className="rounded bg-success/30 border border-success/50 px-2 py-0.5 text-success font-bold">
                        done: total {res.totalHeadMovement} cyl
                      </span>
                    ) : (
                      <span className="text-chalk-muted font-bold">
                        {live.movementSoFar} / {res.totalHeadMovement} cyl
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs font-mono text-chalk-muted leading-tight">
                  {meta.shortDesc}
                </p>

                {/* Head Movement Chart */}
                <DiskHeadChart
                  totalCylinders={totalCylinders}
                  lastCylinder={lastCylinder}
                  startHead={startHead}
                  segments={res.segments}
                  activeStep={live.activeStep}
                  colors={colors}
                  displayNames={displayNames}
                  hoveredRequestId={hoveredRequestId}
                  onHoverRequest={setHoveredRequestId}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Comparison Table */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-foreground/15 bg-paper px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-hand text-3xl font-bold">Live comparison summary</h2>
          <span className="font-mono text-xs text-muted-foreground">
            Synchronized metrics across all six algorithms
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-foreground/15 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2.5">Algorithm</th>
                <th className="px-3 py-2.5 text-center">Requests Served</th>
                <th className="px-3 py-2.5 text-right">Movement so far</th>
                <th className="px-3 py-2.5 text-right">Total Movement</th>
                <th className="px-3 py-2.5 text-right">Avg Seek / Req</th>
                <th className="px-3 py-2.5 text-right">Total Seek Time</th>
                <th className="px-3 py-2.5 text-right">Longest Wait</th>
                <th className="px-3 py-2.5 text-center min-w-[120px]">Movement Visual</th>
              </tr>
            </thead>
            <tbody>
              {FIXED_ALGORITHM_ORDER.map((algo) => {
                const meta = DISK_ALGORITHM_MAP[algo];
                const res = allResults[algo];
                const live = liveStats[algo];
                const isWinner = verdict ? (!verdict.isTie && verdict.winner === algo) || (verdict.isTie && verdict.tiedAlgorithms.includes(algo)) : false;

                const percent = Math.min(100, Math.round((res.totalHeadMovement / maxTotalMovement) * 100));

                return (
                  <tr
                    key={algo}
                    className={`border-t border-foreground/10 transition-colors ${
                      isWinner && shouldShowVerdict ? "bg-highlight/15 font-semibold" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span>{meta.label}</span>
                        {isWinner && shouldShowVerdict && (
                          <Trophy className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {live.servedSoFar} / {res.servedCount}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {live.movementSoFar} cyl
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      {res.totalHeadMovement} cyl
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {res.averageSeekPerRequest.toFixed(2)} cyl
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {res.totalSeekTimeMs.toFixed(1)} ms
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {live.longestWait} cyl
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="w-full bg-foreground/10 rounded-full h-3 overflow-hidden flex items-center">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isWinner && shouldShowVerdict ? "bg-primary" : "bg-foreground/50"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Calculations Dialog */}
      <Dialog open={calculationsOpen} onOpenChange={setCalculationsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto font-mono text-sm">
          <DialogHeader>
            <DialogTitle className="font-hand text-3xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Calculations Breakdown & Best Verdict
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              Segment-by-segment arithmetic and ranking proof for all algorithms.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={calcTab} onValueChange={setCalcTab} className="mt-3">
            <TabsList className="grid grid-cols-4 sm:grid-cols-7 mb-4">
              <TabsTrigger value="best" className="font-bold">
                Verdict
              </TabsTrigger>
              {FIXED_ALGORITHM_ORDER.map((algo) => (
                <TabsTrigger key={algo} value={algo}>
                  {DISK_ALGORITHM_MAP[algo].label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Verdict Tab */}
            <TabsContent value="best" className="space-y-4">
              {verdict && (
                <div className="space-y-3">
                  <div className="rounded border bg-muted/30 p-3">
                    <p className="font-bold text-sm text-foreground">
                      How the best algorithm was chosen:
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criterion: <b>{verdict.selectionDetails.metric}</b>
                    </p>
                    {verdict.selectionDetails.tieBreakUsed && (
                      <p className="text-xs text-primary font-bold mt-0.5">
                        Tie-Break: {verdict.selectionDetails.tieBreakUsed}
                      </p>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 uppercase border-b text-muted-foreground">
                        <tr>
                          <th className="p-2 text-center">Rank</th>
                          <th className="p-2">Algorithm</th>
                          <th className="p-2 text-right">Total Movement</th>
                          <th className="p-2 text-right">Longest Wait</th>
                          <th className="p-2 text-right">Avg Seek</th>
                          <th className="p-2 text-right">Seek Time</th>
                          <th className="p-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {verdict.ranked.map((item) => (
                          <tr
                            key={item.algorithm}
                            className={item.isWinner ? "bg-primary/10 font-bold" : ""}
                          >
                            <td className="p-2 text-center">#{item.rank}</td>
                            <td className="p-2">{item.algorithmName}</td>
                            <td className="p-2 text-right">{item.totalHeadMovement} cyl</td>
                            <td className="p-2 text-right">{item.longestWait} cyl</td>
                            <td className="p-2 text-right">{item.averageSeekPerRequest.toFixed(2)} cyl</td>
                            <td className="p-2 text-right">{item.totalSeekTimeMs.toFixed(1)} ms</td>
                            <td className="p-2 text-muted-foreground">{item.tieBreakUsed || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Individual Algorithm Tabs */}
            {FIXED_ALGORITHM_ORDER.map((algo) => {
              const res = allResults[algo];
              return (
                <TabsContent key={algo} value={algo} className="space-y-3">
                  <div className="rounded border bg-muted/20 p-3 flex flex-wrap justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-foreground text-sm">
                        {DISK_ALGORITHM_MAP[algo].label} Summary
                      </p>
                      <p className="text-muted-foreground">{DISK_ALGORITHM_MAP[algo].shortDesc}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">Total: {res.totalHeadMovement} cyl</p>
                      {(algo === "c-scan" || algo === "c-look") && (
                        <p className="text-[11px] text-muted-foreground">
                          w/ jump: {res.totalHeadMovementWithJump} · w/o jump: {res.totalHeadMovementWithoutJump}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 uppercase border-b text-muted-foreground">
                        <tr>
                          <th className="p-2 text-center">Step</th>
                          <th className="p-2">Event / Request</th>
                          <th className="p-2 text-center">From → To</th>
                          <th className="p-2 text-right">Distance</th>
                          <th className="p-2 text-right">Running Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {res.segments.map((seg, idx) => {
                          const running = res.segments
                            .slice(0, idx + 1)
                            .filter((s) => s.countedInTotal)
                            .reduce((sum, s) => sum + s.distance, 0);

                          return (
                            <tr key={idx}>
                              <td className="p-2 text-center text-muted-foreground">{idx + 1}</td>
                              <td className="p-2">
                                {seg.kind === "serve"
                                  ? `${displayNames[seg.requestId || ""] || seg.requestName} (${seg.requestId})`
                                  : seg.kind === "end"
                                    ? "Disk boundary reached"
                                    : `Return jump ${seg.countedInTotal ? "(counted)" : "(not counted)"}`}
                              </td>
                              <td className="p-2 text-center">
                                {seg.from} → {seg.to}
                              </td>
                              <td className="p-2 text-right font-mono">
                                |{seg.from} − {seg.to}| = {seg.distance}
                                {!seg.countedInTotal && (
                                  <span className="text-muted-foreground text-[10px] ml-1">
                                    (ignored)
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right font-bold text-primary">{running} cyl</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
