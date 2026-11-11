import type { PaletteColor } from "@/lib/process-palette";
import type { SchedulingAlgorithm, SchedulingResult } from "@/lib/scheduling";

export interface ComparedResultItem {
  meta: {
    id: SchedulingAlgorithm;
    label: string;
    short: string;
  };
  result: SchedulingResult;
}

interface Props {
  items: ComparedResultItem[];
  colors: Record<string, PaletteColor>;
  maxTotalTime: number;
  currentTime: number;
  started: boolean;
  winnerAlgoIds?: SchedulingAlgorithm[];
}

export function ComparisonGantt({
  items,
  colors,
  maxTotalTime,
  currentTime,
  started,
  winnerAlgoIds = [],
}: Props) {
  const unitPx = maxTotalTime <= 18 ? 42 : maxTotalTime <= 30 ? 34 : 26;
  const trackWidth = Math.max(maxTotalTime * unitPx, 120);

  // Collect revealed time boundaries across all algorithms
  const boundarySet = new Set<number>();
  if (started) {
    boundarySet.add(0);
    for (const item of items) {
      for (const seg of item.result.gantt) {
        if (currentTime > seg.startTime) boundarySet.add(seg.startTime);
        if (currentTime >= seg.endTime) boundarySet.add(seg.endTime);
      }
    }
  }
  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);

  return (
    <div
      className="mt-5 rounded border border-chalk-foreground/25 bg-black/10 p-3 overflow-x-auto"
      role="region"
      aria-label="Synchronized CPU Scheduling Comparison Gantt Charts"
    >
      {!started ? (
        <div className="flex h-44 items-center justify-center">
          <span className="font-hand text-3xl opacity-70">press play to begin…</span>
        </div>
      ) : (
        <div className="min-w-max space-y-3 pl-1 pr-6">
          {items.map(({ meta, result }) => {
            const floorTime = Math.min(
              Math.floor(currentTime),
              Math.max(0, result.timeline.length - 1),
            );
            const snapshot = result.timeline[floorTime];
            const runningId = snapshot?.segmentType === "run" ? snapshot.runningProcessId : null;
            const runningProc = runningId ? result.displayNames[runningId] : null;
            const isDone = currentTime >= result.totalTime;

            return (
              <div key={meta.id} className="flex items-center gap-3">
                {/* Algorithm identifier & live chip */}
                <div className="flex w-36 shrink-0 flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-chalk-foreground">
                      {meta.short}
                    </span>
                    {winnerAlgoIds.includes(meta.id) && (
                      <span className="rounded bg-highlight/30 px-1 py-0.2 font-mono text-[9px] font-bold text-highlight border border-highlight/40">
                        Best
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 min-h-[1.25rem]">
                    {isDone ? (
                      <span className="font-mono text-[10px] text-success-foreground font-bold">
                        done (t={result.totalTime})
                      </span>
                    ) : runningId && runningProc ? (
                      <span
                        className="inline-block truncate rounded px-1.5 py-0.2 border border-foreground font-mono text-[10px] font-bold"
                        style={{
                          backgroundColor: colors[runningId]?.bg,
                          color: colors[runningId]?.ink,
                          maxWidth: "8.5rem",
                        }}
                      >
                        {runningProc}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-chalk-foreground/60 italic">
                        {snapshot?.segmentType === "cs" ? "CS" : "idle"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Individual Gantt track */}
                <div
                  className="relative h-10 border-l border-chalk-foreground/40"
                  style={{ width: `${trackWidth}px` }}
                >
                  {result.gantt.map((seg, idx) => {
                    if (currentTime <= seg.startTime) return null;
                    const segDur = seg.endTime - seg.startTime;
                    const segWidth = segDur * unitPx;
                    const fillFrac = Math.max(
                      0,
                      Math.min(1, (currentTime - seg.startTime) / segDur),
                    );
                    const clip = `inset(0 ${(1 - fillFrac) * 100}% 0 0)`;
                    const color = seg.processId ? colors[seg.processId] : undefined;

                    if (seg.type === "run" && color) {
                      return (
                        <div
                          key={`${seg.startTime}-${seg.processId}-${idx}`}
                          title={`${seg.displayName} (${seg.processId}): ${seg.startTime}–${seg.endTime}`}
                          className="absolute top-0.5 flex h-9 items-center justify-center overflow-hidden rounded-sm border border-chalk-foreground px-1 font-mono text-[11px] font-bold"
                          style={{
                            left: `${seg.startTime * unitPx}px`,
                            width: `${segWidth}px`,
                            backgroundColor: color.bg,
                            color: color.ink,
                            clipPath: clip,
                          }}
                        >
                          <span className="truncate">
                            {segWidth >= 48 ? seg.displayName : seg.processId}
                          </span>
                        </div>
                      );
                    }

                    const isIdle = seg.type === "idle";
                    return (
                      <div
                        key={`${seg.startTime}-${seg.type}-${idx}`}
                        title={`${isIdle ? "Idle" : "Context Switch"}: ${seg.startTime}–${seg.endTime}`}
                        className={`absolute top-0.5 flex h-9 items-center justify-center overflow-hidden rounded-sm px-1 font-mono text-[10px] ${
                          isIdle
                            ? "border border-dashed border-chalk-foreground/60 text-chalk-foreground/75"
                            : "border border-chalk-foreground/85 text-chalk-foreground/90 font-semibold"
                        }`}
                        style={{
                          left: `${seg.startTime * unitPx}px`,
                          width: `${segWidth}px`,
                          clipPath: clip,
                        }}
                      >
                        <span className="truncate">{isIdle ? "idle" : "CS"}</span>
                      </div>
                    );
                  })}

                  {/* Playhead indicator for this row */}
                  {currentTime > 0 && currentTime < maxTotalTime && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 z-10 h-10 w-0.5 bg-highlight shadow-[0_0_4px_rgba(255,240,150,0.8)]"
                      style={{ left: `${currentTime * unitPx}px` }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Unified chalk time axis under all charts */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-36 shrink-0 text-right font-mono text-[11px] text-chalk-foreground/70 pr-2">
              time (ticks)
            </div>
            <div
              className="relative h-6 border-t border-chalk-foreground/45"
              style={{ width: `${trackWidth}px` }}
            >
              {boundaries.map((b) => (
                <div
                  key={b}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${b * unitPx}px` }}
                >
                  <span className="h-1.5 w-px bg-chalk-foreground/80" />
                  <span className="font-mono text-[10px] text-chalk-foreground/90">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
