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
  const unitPx = Math.max(34, maxTotalTime <= 18 ? 44 : maxTotalTime <= 30 ? 38 : 34);
  const trackWidth = Math.max(maxTotalTime * unitPx, 140);

  // Precompute boundaries per item so each stacked Gantt chart has its own exact time axis
  const itemAxes = items.map(({ result }) => {
    const s = new Set<number>();
    if (started) {
      s.add(0);
      for (const seg of result.gantt) {
        if (currentTime > seg.startTime) s.add(seg.startTime);
        if (currentTime >= seg.endTime) s.add(seg.endTime);
      }
    }
    const bList = Array.from(s).sort((a, b) => a - b);
    const staggers: number[] = [];
    for (let i = 0; i < bList.length; i++) {
      const b = bList[i]!;
      const prev = i > 0 ? bList[i - 1]! : null;
      if (prev !== null && (b - prev) * unitPx < 26) {
        const prevStagger = staggers[i - 1] ?? 0;
        staggers.push(prevStagger === 0 ? 1 : 0);
      } else {
        staggers.push(0);
      }
    }
    return { boundaries: bList, staggers };
  });

  return (
    <div
      className="mt-5 rounded border border-chalk-muted bg-black/15 p-3 overflow-x-auto"
      role="region"
      aria-label="Synchronized CPU Scheduling Comparison Gantt Charts"
    >
      {!started ? (
        <div className="flex h-44 items-center justify-center">
          <span className="font-hand text-3xl text-chalk-muted">press play to begin…</span>
        </div>
      ) : (
        <div className="min-w-max space-y-6 pl-1 pr-24 pb-2">
          {items.map(({ meta, result }, itemIdx) => {
            const floorTime = Math.min(
              Math.floor(currentTime),
              Math.max(0, result.timeline.length - 1),
            );
            const snapshot = result.timeline[floorTime];
            const runningId = snapshot?.segmentType === "run" ? snapshot.runningProcessId : null;
            const runningProc = runningId ? result.displayNames[runningId] : null;
            const isDone = currentTime >= result.totalTime;
            const axis = itemAxes[itemIdx]!;

            return (
              <div key={meta.id} className="space-y-1">
                <div className="flex items-center gap-3">
                  {/* Algorithm identifier & live chip */}
                  <div className="flex w-36 shrink-0 flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-bold text-chalk-foreground">
                        {meta.short}
                      </span>
                      {winnerAlgoIds.includes(meta.id) && (
                        <span className="rounded bg-highlight px-1.5 py-0.5 font-mono text-xs font-bold text-foreground">
                          Best
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 min-h-[1.25rem]">
                      {isDone ? (
                        <span className="font-mono text-xs text-success-foreground font-bold">
                          done (t={result.totalTime})
                        </span>
                      ) : runningId && runningProc ? (
                        <span
                          className="inline-block truncate rounded px-1.5 py-0.5 border border-foreground font-mono text-xs font-bold"
                          style={{
                            backgroundColor: colors[runningId]?.bg,
                            color: colors[runningId]?.ink,
                            maxWidth: "8.5rem",
                          }}
                        >
                          {runningProc}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-chalk-muted italic">
                          {snapshot?.segmentType === "cs" ? "CS" : "idle"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Individual Gantt track & its own axis */}
                  <div>
                    <div
                      className="relative h-11 border-l-2 border-chalk-muted"
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
                              className="absolute top-0.5 flex h-10 items-center justify-center overflow-hidden rounded-sm border-2 border-chalk-foreground px-1 font-mono text-sm font-bold"
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
                            className={`absolute top-0.5 flex h-10 items-center justify-center overflow-hidden rounded-sm px-1 font-mono text-sm font-semibold ${
                              isIdle
                                ? "border-2 border-dashed border-chalk-muted text-chalk-muted"
                                : "border-2 border-chalk-foreground text-chalk-foreground"
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
                          className="pointer-events-none absolute top-0 z-10 h-11 w-0.5 bg-highlight shadow-[0_0_4px_rgba(255,240,150,0.8)]"
                          style={{ left: `${currentTime * unitPx}px` }}
                        />
                      )}
                    </div>

                    {/* Dedicated time axis directly under this stacked chart */}
                    <div
                      className="relative mt-1 h-8 border-t-2 border-chalk-muted"
                      style={{ width: `${trackWidth}px` }}
                    >
                      {axis.boundaries.map((b, bIdx) => {
                        const stagger = axis.staggers[bIdx] ?? 0;
                        return (
                          <div
                            key={b}
                            className={`absolute flex -translate-x-1/2 flex-col items-center ${stagger ? "top-2.5" : "top-0"}`}
                            style={{ left: `${b * unitPx}px` }}
                          >
                            <span className={`${stagger ? "h-4" : "h-2"} w-0.5 bg-chalk-muted`} />
                            <span className="font-mono text-sm font-semibold text-chalk-foreground">{b}</span>
                          </div>
                        );
                      })}
                      <span className="absolute -right-20 top-0.5 font-mono text-sm font-bold text-chalk-muted">
                        Time →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
