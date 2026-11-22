import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Play, Pause, StepForward, RotateCcw, Calculator, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulateDining, PHILOSOPHER_NAMES, type DiningMode, type DiningResult } from "@/lib/labs/philosophers";
import { PROCESS_PALETTE } from "@/lib/palette";

export const Route = createFileRoute("/labs/dining-philosophers")({
  head: () => ({
    meta: [
      { title: "Dining Philosophers Lab | OS Playground" },
      {
        name: "description",
        content: "Five thinkers, five forks: observe circular wait deadlock and explore the asymmetric fork fix.",
      },
      { property: "og:title", content: "Dining Philosophers Lab | OS Playground" },
      {
        property: "og:description",
        content: "Five thinkers, five forks: observe circular wait deadlock and explore the asymmetric fork fix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiningPhilosophersLabPage,
});

const SPEEDS = [0.5, 1, 2, 4] as const;

// 5 Philosopher coordinates around a 500x500 circle
const CX = 250;
const CY = 240;
const R_PHIL = 150;
const R_FORK = 85;

const PHIL_ANGLES = [
  -Math.PI / 2, // P0 top
  -Math.PI / 2 + (2 * Math.PI) / 5, // P1 top-right
  -Math.PI / 2 + (4 * Math.PI) / 5, // P2 bottom-right
  -Math.PI / 2 + (6 * Math.PI) / 5, // P3 bottom-left
  -Math.PI / 2 + (8 * Math.PI) / 5, // P4 top-left
];

const FORK_ANGLES = PHIL_ANGLES.map((a) => a - Math.PI / 5);

function DiningPhilosophersLabPage() {
  const [mode, setMode] = useState<DiningMode>("NAIVE");
  const [eatRoundsStr, setEatRoundsStr] = useState("2");
  const [thinkRoundsStr, setThinkRoundsStr] = useState("1");
  const [maxRoundsStr, setMaxRoundsStr] = useState("60");

  const [eatRounds, setEatRounds] = useState(2);
  const [thinkRounds, setThinkRounds] = useState(1);
  const [maxRounds, setMaxRounds] = useState(60);

  // Playback state
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0); // 0 = start, 1..rounds.length
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [calculationsOpen, setCalculationsOpen] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);

  // Validation
  const eVal = Number(eatRoundsStr);
  const tVal = Number(thinkRoundsStr);
  const mVal = Number(maxRoundsStr);
  const isValid =
    !isNaN(eVal) && eVal >= 1 && eVal <= 5 &&
    !isNaN(tVal) && tVal >= 1 && tVal <= 5 &&
    !isNaN(mVal) && mVal >= 1 && mVal <= 200;

  const simResult: DiningResult | null = useMemo(() => {
    if (!isValid) return null;
    return simulateDining({
      mode,
      eatRounds,
      thinkRounds,
      maxRounds,
    });
  }, [mode, eatRounds, thinkRounds, maxRounds, isValid]);

  const resetRun = () => {
    setPlaying(false);
    setCurrentRoundIndex(0);
  };

  const handleApply = () => {
    if (!isValid) return;
    setEatRounds(Math.floor(eVal));
    setThinkRounds(Math.floor(tVal));
    setMaxRounds(Math.floor(mVal));
    resetRun();
  };

  const handleLoadExample = () => {
    setMode("NAIVE");
    setEatRoundsStr("2");
    setThinkRoundsStr("1");
    setMaxRoundsStr("60");
    setEatRounds(2);
    setThinkRounds(1);
    setMaxRounds(60);
    resetRun();
  };

  const handleTryFix = () => {
    setMode("FIXED");
    resetRun();
  };

  // Playback loop
  useEffect(() => {
    if (!playing || !simResult) return;
    if (currentRoundIndex >= simResult.rounds.length) {
      setPlaying(false);
      return;
    }
    const delay = Math.round(900 / speed);
    const timer = setTimeout(() => {
      setCurrentRoundIndex((r) => {
        if (r + 1 >= simResult.rounds.length) {
          setPlaying(false);
          return simResult.rounds.length;
        }
        return r + 1;
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [playing, currentRoundIndex, simResult, speed]);

  const handleStep = () => {
    if (!simResult) return;
    setPlaying(false);
    if (currentRoundIndex < simResult.rounds.length) {
      setCurrentRoundIndex((r) => r + 1);
    }
  };

  const totalRoundsPlayed = simResult ? simResult.rounds.length : 0;
  const isFinished = currentRoundIndex >= totalRoundsPlayed && totalRoundsPlayed > 0;
  const activeLog = simResult && currentRoundIndex > 0 ? simResult.rounds[currentRoundIndex - 1] : null;

  const isDeadlockedNow = activeLog ? activeLog.allBlocked && simResult?.deadlock.isDeadlocked : false;

  // Insight note logic
  const insightNote = useMemo(() => {
    if (!simResult) return "";
    if (isDeadlockedNow) {
      return "Deadlock: each philosopher holds one fork and waits for another, so nobody can eat";
    }
    if (mode === "FIXED") {
      if (currentRoundIndex >= 20 && simResult.fairnessGap >= 2) {
        return "No deadlock, but meals are uneven because philosophers act in the same order every round";
      }
      return "No deadlock: breaking the symmetry allows forks to be released and shared continuously";
    }
    return "In naive mode: a deadlock is still possible whenever all philosophers grab their first fork simultaneously";
  }, [simResult, isDeadlockedNow, mode, currentRoundIndex]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div>
        <Link to="/labs" className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground hover:underline">
          ← back to Labs
        </Link>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          OPERATING SYSTEMS · LABS
        </p>
        <h1 className="mt-1 font-hand text-5xl md:text-6xl font-bold">Dining Philosophers Lab</h1>
        <p className="mt-1 text-muted-foreground">
          Five thinkers, five forks: observe circular wait deadlock and explore the asymmetric fork fix.
        </p>
      </div>

      {/* Collapsible "What is this lab about?" */}
      <div className="paper-card overflow-hidden">
        <button
          type="button"
          onClick={() => setTheoryOpen(!theoryOpen)}
          aria-expanded={theoryOpen}
          className="flex w-full min-h-[44px] items-center justify-between p-4 text-left font-hand text-2xl font-bold hover:bg-highlight/20 transition-colors"
        >
          <span>What is this lab about?</span>
          {theoryOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {theoryOpen && (
          <div className="border-t border-rule/50 bg-paper/50 p-4 text-sm leading-relaxed space-y-2">
            <p>1. Five philosophers sit at a circular table. Between each pair of thinkers lies exactly one shared fork (5 forks total).</p>
            <p>2. A philosopher must hold both their left and right forks simultaneously to eat.</p>
            <p>3. If every philosopher grabs their left fork first at the same time, each holds 1 fork and waits for the next—creating a <strong>circular wait</strong> deadlock.</p>
            <p>4. Making just the last philosopher grab their right fork first breaks the symmetry and guarantees freedom from deadlock.</p>
          </div>
        )}
      </div>

      {/* Mode Toggle & Parameters */}
      <div className="paper-card p-4 space-y-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground block mb-2">
            Fork Pickup Strategy
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode("NAIVE");
                resetRun();
              }}
              className={`press paper-card flex min-h-[44px] flex-col p-3 text-left transition-colors ${
                mode === "NAIVE" ? "bg-highlight ring-2 ring-primary" : "hover:bg-paper/70"
              }`}
            >
              <span className="font-hand text-xl font-bold">Everyone grabs the left fork first (can deadlock)</span>
              <span className="mt-1 text-xs text-muted-foreground">Symmetric rule: P0..P4 take left fork first, then right.</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("FIXED");
                resetRun();
              }}
              className={`press paper-card flex min-h-[44px] flex-col p-3 text-left transition-colors ${
                mode === "FIXED" ? "bg-highlight ring-2 ring-primary" : "hover:bg-paper/70"
              }`}
            >
              <span className="font-hand text-xl font-bold">Fix: the last philosopher grabs the right fork first</span>
              <span className="mt-1 text-xs text-muted-foreground">Asymmetric rule: P0..P3 grab left first, Descartes (P4) grabs right fork F0 first.</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 border-t border-rule/50 pt-4">
          <label className="flex flex-col gap-1 text-xs font-mono uppercase text-muted-foreground">
            <span>Eating Rounds E (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              value={eatRoundsStr}
              onChange={(e) => {
                setEatRoundsStr(e.target.value);
                const n = Number(e.target.value);
                if (n >= 1 && n <= 5) {
                  setEatRounds(n);
                  resetRun();
                }
              }}
              className="w-24 rounded-md border-2 border-input bg-paper p-2 text-center text-base focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-mono uppercase text-muted-foreground">
            <span>Thinking Rounds T (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              value={thinkRoundsStr}
              onChange={(e) => {
                setThinkRoundsStr(e.target.value);
                const n = Number(e.target.value);
                if (n >= 1 && n <= 5) {
                  setThinkRounds(n);
                  resetRun();
                }
              }}
              className="w-24 rounded-md border-2 border-input bg-paper p-2 text-center text-base focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-mono uppercase text-muted-foreground">
            <span>Max Rounds (1–200)</span>
            <input
              type="number"
              min={1}
              max={200}
              value={maxRoundsStr}
              onChange={(e) => {
                setMaxRoundsStr(e.target.value);
                const n = Number(e.target.value);
                if (n >= 1 && n <= 200) {
                  setMaxRounds(n);
                  resetRun();
                }
              }}
              className="w-28 rounded-md border-2 border-input bg-paper p-2 text-center text-base focus:border-primary focus:outline-none"
            />
          </label>

          <Button variant="outline" onClick={handleApply} disabled={!isValid}>
            Apply
          </Button>

          <Button variant="outline" onClick={handleLoadExample}>
            Load example (NAIVE, E=2, T=1)
          </Button>

          {isDeadlockedNow && (
            <Button onClick={handleTryFix} className="bg-highlight font-bold text-foreground">
              Try the fix →
            </Button>
          )}
        </div>
      </div>

      {/* Chalkboard Stage with Control Bar, Table SVG & Narration */}
      <div className="chalkboard rounded-md p-6 space-y-6">
        {/* Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={!isValid || !simResult}
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
            onClick={handleStep}
            disabled={!isValid || isFinished || !simResult}
          >
            <StepForward className="h-4 w-4" />
            Step (Round)
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

          <Button variant="outline" onClick={resetRun}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 rounded border border-chalk-foreground/30 bg-black/20 p-1 font-mono text-xs text-chalk-foreground">
            <span className="px-1 text-chalk-muted">Speed:</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`min-h-[28px] min-w-[28px] rounded px-1.5 py-0.5 transition-colors ${
                  speed === s ? "bg-chalk-foreground text-chalk font-bold" : "hover:bg-white/10"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="ml-auto font-mono text-sm text-chalk-foreground">
            Round: <span className="font-bold text-chalk-yellow">{currentRoundIndex}</span> / {totalRoundsPlayed}
          </div>
        </div>

        {/* Deadlock Banner */}
        {isDeadlockedNow && (
          <div className="rounded-md border-2 border-destructive bg-destructive/30 p-4 text-chalk-foreground animate-rise">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-hand text-2xl font-bold">
                Deadlock: everyone holds one fork and waits for the next
              </span>
            </div>
            <p className="mt-2 font-mono text-sm">
              Waiting Cycle: Plato → Aristotle → Socrates → Kant → Descartes → Plato
            </p>
          </div>
        )}

        {/* Table SVG Graphic */}
        <div className="rounded-md border border-chalk-foreground/20 bg-black/25 p-4 flex justify-center">
          <svg viewBox="0 0 500 480" className="w-full max-w-lg aspect-square">
            {/* Table Circle */}
            <circle cx={CX} cy={CY} r={120} fill="#183728" stroke="#f1efe0" strokeWidth="2.5" strokeOpacity="0.4" />
            <circle cx={CX} cy={CY} r={112} fill="none" stroke="#f1efe0" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.2" />
            <text x={CX} y={CY + 5} textAnchor="middle" className="font-hand text-xl fill-chalk-foreground/40 pointer-events-none">
              Round Table
            </text>

            {/* Forks between philosophers */}
            {FORK_ANGLES.map((angle, forkIdx) => {
              const fx = CX + R_FORK * Math.cos(angle);
              const fy = CY + R_FORK * Math.sin(angle);
              const holder = activeLog ? activeLog.forkHolders[forkIdx] : null;
              const isHeld = holder !== null && holder !== undefined;
              const holderColor = isHeld ? PROCESS_PALETTE[holder % PROCESS_PALETTE.length] : null;

              return (
                <g key={`fork-${forkIdx}`}>
                  {/* Fork line icon */}
                  <line
                    x1={fx - 10 * Math.sin(angle)}
                    y1={fy + 10 * Math.cos(angle)}
                    x2={fx + 10 * Math.sin(angle)}
                    y2={fy - 10 * Math.cos(angle)}
                    stroke={holderColor ? holderColor.bg : "#f1efe0"}
                    strokeWidth={isHeld ? "5" : "3"}
                    strokeLinecap="round"
                  />
                  <circle
                    cx={fx}
                    cy={fy}
                    r={13}
                    fill={holderColor ? holderColor.bg : "#224c37"}
                    stroke="#f1efe0"
                    strokeWidth="1.5"
                  />
                  <text
                    x={fx}
                    y={fy + 4}
                    textAnchor="middle"
                    className="font-mono text-xs font-bold"
                    fill={holderColor ? holderColor.ink : "#f1efe0"}
                  >
                    F{forkIdx}
                  </text>
                </g>
              );
            })}

            {/* Philosophers around table */}
            {PHIL_ANGLES.map((angle, pIdx) => {
              const px = CX + R_PHIL * Math.cos(angle);
              const py = CY + R_PHIL * Math.sin(angle);
              const philState = activeLog ? activeLog.philosophers[pIdx] : null;
              const status = philState ? philState.status : "hungry";
              const heldCount = philState ? philState.heldForks.length : 0;
              const color = PROCESS_PALETTE[pIdx % PROCESS_PALETTE.length];

              const isEating = status === "eating";
              const isThinking = status === "thinking";
              const isWaiting = philState?.waitingForFork !== undefined;

              return (
                <g key={`phil-${pIdx}`}>
                  {/* Waiting dashed connection to fork */}
                  {isWaiting && philState?.waitingForFork !== undefined && (
                    <line
                      x1={px}
                      y1={py}
                      x2={CX + R_FORK * Math.cos(FORK_ANGLES[philState.waitingForFork])}
                      y2={CY + R_FORK * Math.sin(FORK_ANGLES[philState.waitingForFork])}
                      stroke="#e06c75"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Philosopher Node */}
                  <circle
                    cx={px}
                    cy={py}
                    r={28}
                    fill={isEating ? color.bg : isThinking ? "#1b3d2c" : "#224c37"}
                    stroke={isEating ? color.bg : isThinking ? "#b8c9bc" : color.bg}
                    strokeWidth={isEating ? "3" : "2"}
                    strokeDasharray={status === "hungry" && heldCount === 0 ? "5 3" : undefined}
                    style={{ transition: "all 0.3s ease" }}
                  />

                  {/* Philosopher Initial & Meals Count */}
                  <text
                    x={px}
                    y={py - 2}
                    textAnchor="middle"
                    className="font-hand text-lg font-bold"
                    fill={isEating ? color.ink : "#f1efe0"}
                  >
                    P{pIdx}
                  </text>
                  <text
                    x={px}
                    y={py + 12}
                    textAnchor="middle"
                    className="font-mono text-xs font-bold"
                    fill={isEating ? color.ink : "#b8c9bc"}
                  >
                    {status === "eating" ? "EATING" : status === "thinking" ? "THINK" : heldCount === 1 ? "1 FORK" : "HUNGRY"}
                  </text>

                  {/* Philosopher Name Label outside node */}
                  <text
                    x={px}
                    y={py + (py > CY ? 44 : -36)}
                    textAnchor="middle"
                    className="font-hand text-lg font-bold fill-chalk-yellow"
                  >
                    {PHILOSOPHER_NAMES[pIdx]}
                  </text>

                  {/* Meals badge */}
                  <text
                    x={px}
                    y={py + (py > CY ? 58 : -22)}
                    textAnchor="middle"
                    className="font-mono text-xs font-semibold fill-chalk-foreground"
                  >
                    {philState ? philState.meals : 0} meal{(philState ? philState.meals : 0) === 1 ? "" : "s"}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Live Narration & Actions panel */}
        <div className="space-y-3">
          <div
            role="region"
            aria-live="polite"
            className="rounded-md border border-chalk-foreground/25 bg-black/20 p-4 font-hand text-2xl text-chalk-foreground min-h-[4rem] flex items-center"
          >
            {activeLog ? (
              activeLog.narration
            ) : (
              <span className="text-chalk-muted">
                Press "Play" or "Step (Round)" to simulate philosophers eating and thinking.
              </span>
            )}
          </div>

          {activeLog && (
            <div className="rounded-md border border-chalk-foreground/20 bg-black/20 p-3 font-mono text-xs text-chalk-foreground space-y-1">
              <span className="text-chalk-yellow font-bold uppercase tracking-wider block mb-1">
                Round {activeLog.round} Actions in Order:
              </span>
              {activeLog.actions.map((act, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-chalk-muted">[{i}]</span>
                  <span>{act}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Insight Banner */}
      {insightNote && (
        <div className={`paper-card border-l-4 p-4 ${isDeadlockedNow ? "border-l-destructive bg-destructive/5" : "border-l-primary"}`}>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Insight</p>
          <p className="mt-1 font-hand text-2xl font-bold">{insightNote}</p>
        </div>
      )}

      {/* Results and Live Metrics Cards */}
      {simResult && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="paper-card p-4 space-y-1">
            <span className="font-mono text-xs uppercase text-muted-foreground">Total Meals</span>
            <p className="font-hand text-3xl font-bold">
              {activeLog ? activeLog.philosophers.reduce((acc, p) => acc + p.meals, 0) : 0} meals
            </p>
            <p className="font-mono text-xs text-muted-foreground">Across all 5 philosophers</p>
          </div>

          <div className="paper-card p-4 space-y-1">
            <span className="font-mono text-xs uppercase text-muted-foreground">Throughput</span>
            <p className="font-hand text-3xl font-bold">
              {currentRoundIndex > 0 ? (activeLog ? activeLog.philosophers.reduce((acc, p) => acc + p.meals, 0) / currentRoundIndex : 0).toFixed(4) : "0.0000"}
            </p>
            <p className="font-mono text-xs text-muted-foreground">meals per round</p>
          </div>

          <div className="paper-card p-4 space-y-1">
            <span className="font-mono text-xs uppercase text-muted-foreground">Fairness Gap</span>
            <p className="font-hand text-3xl font-bold">
              {activeLog ? (
                Math.max(...activeLog.philosophers.map((p) => p.meals)) -
                Math.min(...activeLog.philosophers.map((p) => p.meals))
              ) : 0} meals
            </p>
            <p className="font-mono text-xs text-muted-foreground">Max meals − Min meals</p>
          </div>

          <div className="paper-card p-4 space-y-1">
            <span className="font-mono text-xs uppercase text-muted-foreground">Deadlock Status</span>
            <p className="font-hand text-3xl font-bold">
              {isDeadlockedNow ? "DEADLOCKED 💀" : isFinished ? "Completed ✓" : "Running..."}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {isDeadlockedNow ? `Halted at round ${activeLog?.round}` : mode === "FIXED" ? "Deadlock-free" : "Symmetric wait"}
            </p>
          </div>
        </div>
      )}

      {/* Per-Philosopher Table */}
      {simResult && (
        <div className="paper-card p-4 space-y-3">
          <h2 className="font-hand text-2xl font-bold">Meals per Philosopher</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm">
              <thead className="border-b border-rule/50 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="py-2">Philosopher</th>
                  <th className="py-2">Pickup Rule</th>
                  <th className="py-2">Current Status</th>
                  <th className="py-2">Held Forks</th>
                  <th className="py-2">Meals Eaten</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/30">
                {PHILOSOPHER_NAMES.map((name, i) => {
                  const phil = activeLog ? activeLog.philosophers[i] : null;
                  const rule = mode === "FIXED" && i === 4 ? "F0 (right) then F4 (left)" : `F${i} (left) then F${(i + 1) % 5} (right)`;
                  return (
                    <tr key={name}>
                      <td className="py-2 font-bold font-hand text-lg">{name} (P{i})</td>
                      <td className="py-2 text-xs text-muted-foreground">{rule}</td>
                      <td className="py-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                          phil?.status === "eating" ? "bg-success/20 text-success-foreground" : phil?.status === "thinking" ? "bg-accent/20" : "bg-highlight/30"
                        }`}>
                          {phil ? phil.status.toUpperCase() : "HUNGRY"}
                        </span>
                      </td>
                      <td className="py-2 text-xs">
                        {phil && phil.heldForks.length > 0 ? phil.heldForks.map((f) => `F${f}`).join(", ") : "none"}
                      </td>
                      <td className="py-2 font-bold text-primary">
                        {phil ? phil.meals : 0}
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
      {simResult && (
        <Dialog open={calculationsOpen} onOpenChange={setCalculationsOpen}>
          <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto bg-paper">
            <DialogHeader>
              <DialogTitle className="font-hand text-3xl font-bold">Dining Philosophers Calculations</DialogTitle>
              <DialogDescription>
                Live and final formulas and metrics for the current run.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4 text-sm font-mono">
              <div className="rounded-md border p-3 bg-paper/50">
                <span className="text-xs uppercase text-muted-foreground block mb-1">1. Total Meals</span>
                <p>Total Meals = Sum of meals eaten by all 5 philosophers</p>
                <p className="mt-1 font-bold text-primary">
                  = {simResult.mealsPerPhilosopher.join(" + ")} = {simResult.totalMeals} meals
                </p>
              </div>

              <div className="rounded-md border p-3 bg-paper/50">
                <span className="text-xs uppercase text-muted-foreground block mb-1">2. Meal Throughput</span>
                <p>Throughput = Total Meals / Rounds Played</p>
                <p className="mt-1 font-bold text-primary">
                  = {simResult.totalMeals} / {simResult.roundsPlayed} = {simResult.throughput.toFixed(4)} meals/round
                </p>
              </div>

              <div className="rounded-md border p-3 bg-paper/50">
                <span className="text-xs uppercase text-muted-foreground block mb-1">3. Fairness Gap</span>
                <p>Fairness Gap = Maximum Meals − Minimum Meals</p>
                <p className="mt-1 font-bold text-primary">
                  = {Math.max(...simResult.mealsPerPhilosopher)} − {Math.min(...simResult.mealsPerPhilosopher)} = {simResult.fairnessGap} meals
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
