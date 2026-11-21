import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DiningResult, DiningStepRecord, PhilosopherState } from "@/lib/sync/philosophers";

export function DiningTableSvg({
  philosophers,
  forks,
  roomPermits,
  strategy,
}: {
  philosophers: {
    index: number;
    phase: string;
    name?: string;
    heldForks: number[];
    waitingForFork: number | null;
    waitingForPermit: boolean;
    meals: number;
  }[];
  forks: (number | null)[];
  roomPermits?: number;
  strategy: string;
}) {
  const N = philosophers.length;
  const centerX = 200;
  const centerY = 200;
  const tableRadius = 110;
  const philosopherRadius = 155;
  const forkRadius = 85;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <svg
        viewBox="0 0 400 400"
        className="w-full max-w-[360px] sm:max-w-[420px] h-auto drop-shadow-md"
        role="img"
        aria-label="Dining Philosophers Table Visualization"
      >
        {/* Wooden / chalkboard table */}
        <circle
          cx={centerX}
          cy={centerY}
          r={tableRadius}
          fill="rgba(0, 0, 0, 0.4)"
          stroke="var(--chalk-foreground)"
          strokeWidth="3"
          strokeDasharray="6 3"
        />

        {/* Center table text */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          fill="var(--chalk-foreground)"
          className="font-hand text-xl font-bold opacity-80"
        >
          Dining Table
        </text>
        <text
          x={centerX}
          y={centerY + 12}
          textAnchor="middle"
          fill="var(--chalk-foreground)"
          className="font-mono text-[10px] opacity-60"
        >
          {strategy.toUpperCase()} · {N} Seats
        </text>
        {strategy === "limit" && (
          <text
            x={centerX}
            y={centerY + 30}
            textAnchor="middle"
            fill="var(--highlight)"
            className="font-mono text-[10px] font-bold"
          >
            Room permits: {roomPermits}
          </text>
        )}

        {/* Forks between plates */}
        {forks.map((holder, fIdx) => {
          // Angle of fork fIdx is between philosopher fIdx and (fIdx + 1)
          const angle = ((fIdx + 0.5) * 2 * Math.PI) / N - Math.PI / 2;
          const fx = centerX + forkRadius * Math.cos(angle);
          const fy = centerY + forkRadius * Math.sin(angle);
          const isHeld = holder !== null;

          return (
            <g key={`fork-${fIdx}`}>
              <circle
                cx={fx}
                cy={fy}
                r="11"
                fill={isHeld ? "var(--highlight)" : "rgba(255, 255, 255, 0.15)"}
                stroke={isHeld ? "var(--foreground)" : "var(--chalk-foreground)"}
                strokeWidth="1.5"
              />
              <text
                x={fx}
                y={fy + 3.5}
                textAnchor="middle"
                fill={isHeld ? "var(--foreground)" : "var(--chalk-foreground)"}
                className="font-mono text-[9px] font-bold"
              >
                F{fIdx}
              </text>
            </g>
          );
        })}

        {/* Philosophers around the table */}
        {philosophers.map((p, idx) => {
          const angle = (idx * 2 * Math.PI) / N - Math.PI / 2;
          const px = centerX + philosopherRadius * Math.cos(angle);
          const py = centerY + philosopherRadius * Math.sin(angle);

          const isEating = p.phase === "eating";
          const isHungry = p.phase === "hungry";
          const isBlocked = p.waitingForFork !== null || p.waitingForPermit;

          let fill = "rgba(0, 0, 0, 0.6)";
          let stroke = "var(--chalk-foreground)";
          let strokeWidth = "2";
          let dashArray = "none";

          if (isEating) {
            fill = "var(--success)";
            stroke = "#ffffff";
            strokeWidth = "3";
          } else if (isBlocked) {
            fill = "rgba(239, 68, 68, 0.25)";
            stroke = "rgba(239, 68, 68, 0.8)";
            dashArray = "4 2";
          } else if (isHungry) {
            fill = "rgba(234, 179, 8, 0.2)";
            stroke = "var(--highlight)";
            dashArray = "3 3";
          }

          return (
            <g key={`phil-${idx}`}>
              {/* Philosopher Node */}
              <circle
                cx={px}
                cy={py}
                r="22"
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
              />
              <text
                x={px}
                y={py - 2}
                textAnchor="middle"
                fill="var(--chalk-foreground)"
                className="font-hand text-sm font-bold"
              >
                P{idx}
              </text>
              <text
                x={px}
                y={py + 10}
                textAnchor="middle"
                fill="var(--chalk-foreground)"
                className="font-mono text-[8px] opacity-80"
              >
                {isEating ? "EATING" : isBlocked ? "BLOCKED" : isHungry ? "HUNGRY" : "THINK"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DiningCalculationsDialog({
  open,
  onOpenChange,
  result,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: DiningResult;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-hand text-3xl font-bold">
            Dining Philosophers Calculations &amp; Metrics
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Strategy: {result.config.strategy.toUpperCase()} · Philosophers: {result.config.philosophers}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2 font-mono text-sm">
          {/* Metrics breakdown */}
          <div className="paper-card p-4 space-y-2 bg-background/60">
            <h4 className="font-hand text-xl font-bold text-primary">1. Throughput &amp; Fairness</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• <b>Total Meals Served:</b> {result.totalMeals}</p>
              <p>• <b>Total Steps:</b> {result.totalSteps}</p>
              <p className="pt-2">• <b>Throughput</b> = total meals / total steps</p>
              <p className="pl-4 font-bold text-foreground">
                = {result.totalMeals} / {result.totalSteps} = {result.throughput.toFixed(4)} meals/step
              </p>
              <p className="pt-2">• <b>Fairness Gap</b> = max(meals) − min(meals)</p>
              <p className="pl-4 font-bold text-foreground">
                = {Math.max(...result.meals, 0)} − {Math.min(...result.meals, 0)} = {result.fairnessGap} meals
              </p>
              <p className="pt-2">• <b>Average Hungry Wait:</b> {result.averageHungryWait.toFixed(2)} steps</p>
            </div>
          </div>

          {/* Meals Per Philosopher */}
          <div className="paper-card p-4 space-y-2 bg-background/60">
            <h4 className="font-hand text-xl font-bold text-primary">2. Meals per Philosopher</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {result.meals.map((m, idx) => (
                <div key={idx} className="rounded border border-foreground/20 p-2 text-center">
                  <p className="text-muted-foreground font-mono">P{idx}</p>
                  <p className="font-hand text-2xl font-bold text-primary">{m}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
