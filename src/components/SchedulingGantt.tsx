import type { PaletteColor } from "@/lib/process-palette";
import type { GanttSegment } from "@/lib/scheduling";

interface Props {
  gantt: GanttSegment[];
  colors: Record<string, PaletteColor>;
  totalTime: number;
  currentTime: number;
  started: boolean;
  variant?: "chalkboard" | "paper";
}

export function SchedulingGantt({
  gantt,
  colors,
  totalTime,
  currentTime,
  started,
  variant = "chalkboard",
}: Props) {
  const isPaper = variant === "paper";
  const unitPx = Math.max(34, totalTime <= 18 ? 46 : totalTime <= 30 ? 38 : 34);
  const trackWidth = Math.max(totalTime * unitPx, 140);

  // Collect revealed boundary timestamps under the chart
  const revealedBoundaries = new Set<number>();
  if (started) {
    revealedBoundaries.add(0);
    for (const seg of gantt) {
      if (currentTime > seg.startTime) {
        revealedBoundaries.add(seg.startTime);
      }
      if (currentTime >= seg.endTime) {
        revealedBoundaries.add(seg.endTime);
      }
    }
  }
  const boundaries = Array.from(revealedBoundaries).sort((a, b) => a - b);

  // Stagger boundary ticks when closer than 26px to never drop any time value
  const boundaryStaggers: number[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i]!;
    const prev = i > 0 ? boundaries[i - 1]! : null;
    if (prev !== null && (b - prev) * unitPx < 26) {
      const prevStagger = boundaryStaggers[i - 1] ?? 0;
      boundaryStaggers.push(prevStagger === 0 ? 1 : 0);
    } else {
      boundaryStaggers.push(0);
    }
  }

  // Legend data for paper variant
  const legendMap = new Map<string, { id: string; name: string; bg?: string; duration: number }>();
  let idleDuration = 0;
  let csDuration = 0;

  for (const seg of gantt) {
    const dur = seg.endTime - seg.startTime;
    if (seg.type === "run" && seg.processId) {
      const existing = legendMap.get(seg.processId);
      const name = seg.displayName || seg.processId;
      const bg = colors[seg.processId]?.bg;
      if (existing) {
        existing.duration += dur;
      } else {
        legendMap.set(seg.processId, { id: seg.processId, name, bg, duration: dur });
      }
    } else if (seg.type === "idle") {
      idleDuration += dur;
    } else if (seg.type === "cs") {
      csDuration += dur;
    }
  }

  const ariaDescription = `Gantt chart: ${gantt
    .map((s) => `${s.type === "run" ? s.displayName || s.processId : s.type} from ${s.startTime} to ${s.endTime}`)
    .join(", ")}`;

  if (isPaper) {
    return (
      <div
        className="relative rounded-lg border-2 border-foreground bg-paper p-3.5 shadow-[var(--shadow-paper)]"
        role="img"
        aria-label={ariaDescription}
      >
        <div className="table-scroll-container overflow-x-auto pb-2">
          <div className="min-w-max px-2 pt-6">
            {/* Bar track */}
            <div className="relative h-14" style={{ width: `${trackWidth}px` }}>
              {gantt.map((seg, idx) => {
                if (currentTime <= seg.startTime) return null;
                const segDur = seg.endTime - seg.startTime;
                const segWidth = segDur * unitPx;
                const fillFrac = Math.max(0, Math.min(1, (currentTime - seg.startTime) / segDur));
                const clip = `inset(0 ${(1 - fillFrac) * 100}% 0 0)`;
                const color = seg.processId ? colors[seg.processId] : undefined;
                const isNarrow = segWidth < 28;

                if (seg.type === "run" && color) {
                  return (
                    <div key={`${seg.startTime}-${seg.processId}-${idx}`}>
                      {/* Narrow leader line & label above block */}
                      {isNarrow && (
                        <div
                          className="pointer-events-none absolute -top-6 flex flex-col items-center"
                          style={{
                            left: `${seg.startTime * unitPx + segWidth / 2}px`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <span className="rounded border border-foreground/40 bg-paper px-1 font-mono text-xs font-bold text-foreground shadow-sm">
                            {seg.displayName || seg.processId}
                          </span>
                          <span className="h-1.5 w-0.5 bg-foreground" />
                        </div>
                      )}
                      <div
                        title={`${seg.displayName} (${seg.processId}): t=${seg.startTime} to ${seg.endTime} (${segDur}ms)`}
                        className="absolute top-0 flex h-14 flex-col items-center justify-center overflow-hidden rounded-md border-2 border-foreground px-1 font-mono shadow-sm"
                        style={{
                          left: `${seg.startTime * unitPx}px`,
                          width: `${segWidth}px`,
                          backgroundColor: color.bg,
                          color: color.ink,
                          clipPath: clip,
                        }}
                      >
                        {!isNarrow && (
                          <span className="truncate font-sans text-sm font-bold">
                            {segWidth >= 56
                              ? seg.displayName
                              : segWidth >= 34
                                ? seg.displayName.slice(0, 6)
                                : seg.processId}
                          </span>
                        )}
                        {segWidth >= 44 && (
                          <span className="font-mono text-sm font-semibold">
                            {segDur}ms
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                const isIdle = seg.type === "idle";
                return (
                  <div
                    key={`${seg.startTime}-${seg.type}-${idx}`}
                    title={`${isIdle ? "CPU Idle" : "Context Switch"}: t=${seg.startTime} to ${seg.endTime} (${segDur}ms)`}
                    className={`absolute top-0 flex h-14 items-center justify-center overflow-hidden rounded-md px-1 font-mono text-xs font-bold text-foreground shadow-sm ${
                      isIdle
                        ? "border-2 border-dashed border-foreground/60 bg-secondary/30"
                        : "border-2 border-foreground bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.06),rgba(0,0,0,0.06)_4px,rgba(0,0,0,0.18)_4px,rgba(0,0,0,0.18)_8px)]"
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
            </div>

            {/* Solid ink time axis & numbers */}
            <div
              className="relative mt-2 h-9 border-t-2 border-foreground"
              style={{ width: `${trackWidth}px` }}
            >
              {boundaries.map((b, bIdx) => {
                const stagger = boundaryStaggers[bIdx] ?? 0;
                return (
                  <div
                    key={b}
                    className={`absolute flex -translate-x-1/2 flex-col items-center ${stagger ? "top-3" : "top-0"}`}
                    style={{ left: `${b * unitPx}px` }}
                  >
                    <span className={`${stagger ? "h-5" : "h-2"} w-0.5 bg-foreground`} />
                    <span className="font-mono text-sm font-semibold text-foreground">{b}</span>
                  </div>
                );
              })}
              <span className="absolute -right-20 top-0.5 font-mono text-sm font-bold text-ink-muted">
                Time (ms) →
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-foreground/20 pt-2.5 font-mono text-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Legend:
          </span>
          {Array.from(legendMap.values()).map((proc) => (
            <div
              key={proc.id}
              className="flex items-center gap-1.5 rounded-md border border-foreground/30 bg-paper px-2 py-0.5 shadow-sm"
            >
              <span
                className="h-3 w-3 rounded-sm border border-foreground"
                style={{ backgroundColor: proc.bg ?? "var(--highlight)" }}
              />
              <span className="font-bold text-foreground">{proc.name}</span>
              <span className="text-muted-foreground">({proc.duration}ms)</span>
            </div>
          ))}
          {idleDuration > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-foreground/30 bg-paper px-2 py-0.5 shadow-sm">
              <span className="h-3 w-3 rounded-sm border border-dashed border-foreground/60 bg-secondary/30" />
              <span className="font-bold text-foreground">Idle</span>
              <span className="text-muted-foreground">({idleDuration}ms)</span>
            </div>
          )}
          {csDuration > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-foreground/30 bg-paper px-2 py-0.5 shadow-sm">
              <span className="h-3 w-3 rounded-sm border border-foreground bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.2)_2px,rgba(0,0,0,0.2)_4px)]" />
              <span className="font-bold text-foreground">Context Switch</span>
              <span className="text-muted-foreground">({csDuration}ms)</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-5 min-h-[7.5rem] rounded border border-chalk-muted bg-black/15 p-3 overflow-x-auto"
      role="region"
      aria-label="Animated CPU Scheduling Gantt Chart"
    >
      {!started ? (
        <div className="flex h-[5.75rem] items-center">
          <span className="font-hand text-3xl text-chalk-muted">press play to begin…</span>
        </div>
      ) : (
        <div className="min-w-max pl-2 pr-24 pb-2">
          {/* Bar track */}
          <div className="relative h-14" style={{ width: `${trackWidth}px` }}>
            {gantt.map((seg, idx) => {
              if (currentTime <= seg.startTime) return null;
              const segDur = seg.endTime - seg.startTime;
              const segWidth = segDur * unitPx;
              const fillFrac = Math.max(0, Math.min(1, (currentTime - seg.startTime) / segDur));
              const clip = `inset(0 ${(1 - fillFrac) * 100}% 0 0)`;
              const color = seg.processId ? colors[seg.processId] : undefined;

              if (seg.type === "run" && color) {
                return (
                  <div
                    key={`${seg.startTime}-${seg.processId}-${idx}`}
                    title={`${seg.displayName} (${seg.processId}): t=${seg.startTime} to ${seg.endTime}`}
                    className="absolute top-1 flex h-12 items-center justify-center overflow-hidden rounded-sm border-2 border-chalk-foreground px-1 font-mono text-sm font-bold shadow-sm"
                    style={{
                      left: `${seg.startTime * unitPx}px`,
                      width: `${segWidth}px`,
                      backgroundColor: color.bg,
                      color: color.ink,
                      clipPath: clip,
                    }}
                  >
                    <span className="truncate">
                      {segWidth >= 56
                        ? seg.displayName
                        : segWidth >= 34
                          ? seg.displayName.slice(0, 6)
                          : seg.processId}
                    </span>
                  </div>
                );
              }

              const isIdle = seg.type === "idle";
              return (
                <div
                  key={`${seg.startTime}-${seg.type}-${idx}`}
                  title={`${isIdle ? "CPU Idle" : "Context Switch"}: t=${seg.startTime} to ${seg.endTime}`}
                  className={`absolute top-1 flex h-12 items-center justify-center overflow-hidden rounded-sm px-1 font-mono text-sm font-semibold text-chalk-foreground ${
                    isIdle
                      ? "border-2 border-dashed border-chalk-muted"
                      : "border-2 border-chalk-foreground"
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

            {/* Playhead indicator */}
            {currentTime > 0 && currentTime < totalTime && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 z-10 h-14 w-0.5 bg-highlight shadow-[0_0_6px_rgba(255,240,150,0.8)]"
                style={{ left: `${currentTime * unitPx}px` }}
              >
                <span className="absolute -left-3 -top-5 rounded bg-highlight px-1.5 py-0.5 font-mono text-xs font-bold text-foreground shadow-sm">
                  t = {Math.floor(currentTime)}
                </span>
              </div>
            )}
          </div>

          {/* Chalk axis & time boundary markers */}
          <div
            className="relative mt-2 h-9 border-t-2 border-chalk-muted"
            style={{ width: `${trackWidth}px` }}
          >
            {boundaries.map((b, bIdx) => {
              const stagger = boundaryStaggers[bIdx] ?? 0;
              return (
                <div
                  key={b}
                  className={`absolute flex -translate-x-1/2 flex-col items-center ${stagger ? "top-3" : "top-0"}`}
                  style={{ left: `${b * unitPx}px` }}
                >
                  <span className={`${stagger ? "h-5" : "h-2"} w-0.5 bg-chalk-muted`} />
                  <span className="font-mono text-sm font-semibold text-chalk-foreground">{b}</span>
                </div>
              );
            })}
            <span className="absolute -right-20 top-0.5 font-mono text-sm font-bold text-chalk-muted">
              Time (ms) →
            </span>
          </div>

          {/* Finished summary line */}
          {currentTime >= totalTime && started && (
            <div className="mt-4 flex items-center gap-2 font-mono text-sm font-bold text-chalk-foreground">
              <span className="rounded bg-highlight px-2 py-0.5 text-foreground">
                Finishes at t = {totalTime}ms
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
