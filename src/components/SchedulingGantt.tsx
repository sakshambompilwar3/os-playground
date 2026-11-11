import type { PaletteColor } from "@/lib/process-palette";
import type { GanttSegment } from "@/lib/scheduling";

interface Props {
  gantt: GanttSegment[];
  colors: Record<string, PaletteColor>;
  totalTime: number;
  currentTime: number;
  started: boolean;
}

export function SchedulingGantt({ gantt, colors, totalTime, currentTime, started }: Props) {
  const unitPx = totalTime <= 18 ? 44 : totalTime <= 30 ? 36 : 30;
  const trackWidth = Math.max(totalTime * unitPx, 120);

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

  return (
    <div
      className="mt-5 min-h-[7.5rem] rounded border border-chalk-foreground/25 bg-black/10 p-3 overflow-x-auto"
      role="region"
      aria-label="Animated CPU Scheduling Gantt Chart"
    >
      {!started ? (
        <div className="flex h-[5.75rem] items-center">
          <span className="font-hand text-3xl opacity-70">press play to begin…</span>
        </div>
      ) : (
        <div className="min-w-max pl-2 pr-6">
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
                    className="absolute top-1 flex h-12 items-center justify-center overflow-hidden rounded-sm border-2 border-chalk-foreground px-1 font-mono text-xs font-bold shadow-sm"
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
                  className={`absolute top-1 flex h-12 items-center justify-center overflow-hidden rounded-sm px-1 font-mono text-xs font-semibold text-chalk-foreground/90 ${
                    isIdle
                      ? "border-2 border-dashed border-chalk-foreground/65"
                      : "border-2 border-chalk-foreground/85"
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
                <span className="absolute -left-1.5 -top-1 h-2.5 w-3.5 rounded-sm border border-foreground bg-highlight" />
              </div>
            )}
          </div>

          {/* Chalk axis & time boundary markers */}
          <div
            className="relative mt-1 h-7 border-t border-chalk-foreground/45"
            style={{ width: `${trackWidth}px` }}
          >
            {boundaries.map((b) => (
              <div
                key={b}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${b * unitPx}px` }}
              >
                <span className="h-1.5 w-px bg-chalk-foreground/80" />
                <span className="font-mono text-xs text-chalk-foreground/90">{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
