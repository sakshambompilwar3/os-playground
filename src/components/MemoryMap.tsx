import type { MemorySegment } from "@/lib/memory";
import type { PaletteColor } from "@/lib/palette";

export interface MemoryMapProps {
  segments: MemorySegment[];
  totalMemory: number;
  colors: Record<string, PaletteColor>;
  mode: "fixed" | "dynamic";
  scanSegmentId?: string | null;
  chosenSegmentId?: string | null;
  pointerSegmentId?: string | null;
  title?: string;
  variant?: "chalkboard" | "paper";
  initialSegments?: MemorySegment[];
}

export function MemoryMap({
  segments,
  totalMemory,
  colors,
  mode,
  scanSegmentId = null,
  chosenSegmentId = null,
  pointerSegmentId = null,
  title,
  variant = "chalkboard",
  initialSegments,
}: MemoryMapProps) {
  const safeTotal = Math.max(1, totalMemory);
  const isPaper = variant === "paper";

  if (isPaper) {
    // Collect legend items
    const legendProcesses = new Map<string, { id: string; name: string; size: number; bg?: string }>();
    let hasInternalFrag = false;
    let hasFree = false;

    for (const seg of segments) {
      if (seg.kind === "allocated" && seg.processId) {
        legendProcesses.set(seg.processId, {
          id: seg.processId,
          name: seg.processName ?? seg.processId,
          size: seg.processSize ?? seg.size,
          bg: colors[seg.processId]?.bg,
        });
        if (mode === "fixed" && seg.internalFrag > 0) {
          hasInternalFrag = true;
        }
      } else if (seg.kind === "free") {
        hasFree = true;
      }
    }

    const renderBar = (barSegments: MemorySegment[], barTitle: string) => {
      // Calculate boundary ticks for this bar (never drop boundaries)
      const rawBoundaries: number[] = [];
      for (const seg of barSegments) {
        if (!rawBoundaries.includes(seg.start)) rawBoundaries.push(seg.start);
        if (!rawBoundaries.includes(seg.end)) rawBoundaries.push(seg.end);
      }
      rawBoundaries.sort((a, b) => a - b);

      const staggers: number[] = [];
      for (let i = 0; i < rawBoundaries.length; i++) {
        const b = rawBoundaries[i]!;
        const prev = i > 0 ? rawBoundaries[i - 1]! : null;
        if (prev !== null && ((b - prev) / safeTotal) * 700 < 28) {
          const prevStagger = staggers[i - 1] ?? 0;
          staggers.push(prevStagger === 0 ? 1 : 0);
        } else {
          staggers.push(0);
        }
      }

      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between border-b border-foreground/20 pb-1">
            <span className="font-hand text-xl font-bold text-foreground">{barTitle}</span>
            <span className="font-mono text-xs text-muted-foreground">{safeTotal} KB total</span>
          </div>

          <div className="table-scroll-container overflow-x-auto pb-2">
            <div className="min-w-[620px] pt-4 pr-28">
              {/* Memory bar */}
              <div
                className="flex h-24 w-full overflow-hidden rounded-lg border-2 border-foreground bg-paper shadow-sm"
                role="img"
                aria-label={`${barTitle}: ${barSegments.map((s) => `${s.label} (${s.kind === "allocated" ? s.processName : "free"}, ${s.size} KB)`).join(", ")}`}
              >
                {barSegments.map((seg) => {
                  const pct = (seg.size / safeTotal) * 100;
                  const isNarrow = pct < 8; // less than ~50px on standard container

                  if (seg.kind === "free") {
                    return (
                      <div
                        key={seg.segmentId}
                        style={{ width: `${pct}%`, minWidth: "50px" }}
                        className="relative flex flex-col items-center justify-center border-r-2 border-dashed border-foreground/50 bg-secondary/20 px-1 text-center last:border-r-0"
                      >
                        <span className="font-mono text-xs uppercase font-bold text-muted-foreground">
                          free
                        </span>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {seg.size} KB
                        </span>
                        <span className="truncate max-w-full font-mono text-xs text-ink-muted">
                          {seg.label}
                        </span>
                      </div>
                    );
                  }

                  // Allocated segment
                  const color = seg.processId ? colors[seg.processId] : undefined;
                  const procSize = seg.processSize ?? seg.size;
                  const usedPct = seg.size > 0 ? (procSize / seg.size) * 100 : 100;
                  const fragPct = 100 - usedPct;

                  return (
                    <div
                      key={seg.segmentId}
                      style={{ width: `${pct}%`, minWidth: "50px" }}
                      className="relative flex h-full border-r-2 border-foreground last:border-r-0"
                    >
                      {/* Narrow leader line above block */}
                      {isNarrow && (
                        <div
                          className="pointer-events-none absolute -top-5 left-1/2 flex -translate-x-1/2 flex-col items-center z-10"
                        >
                          <span className="rounded border border-foreground/40 bg-paper px-1.5 py-0.5 font-mono text-xs font-bold text-foreground shadow-sm whitespace-nowrap">
                            {seg.processName ?? seg.processId}
                          </span>
                          <span className="h-1 w-0.5 bg-foreground" />
                        </div>
                      )}

                      {/* Process allocated portion */}
                      <div
                        style={{
                          width: mode === "fixed" ? `${usedPct}%` : "100%",
                          backgroundColor: color?.bg ?? "var(--highlight)",
                          color: color?.ink ?? "var(--foreground)",
                        }}
                        className="flex h-full flex-col items-center justify-center overflow-hidden px-1 text-center border-r border-foreground/30 last:border-r-0"
                      >
                        <span className="truncate max-w-full font-sans text-xs font-bold">
                          {seg.processName ?? seg.processId}
                        </span>
                        <span className="font-mono text-xs font-semibold">
                          {procSize} KB
                        </span>
                        <span className="font-mono text-xs text-ink-muted">
                          {seg.label}
                        </span>
                      </div>

                      {/* Fixed-mode internal fragmentation portion */}
                      {mode === "fixed" && seg.internalFrag > 0 && (
                        <div
                          style={{
                            width: `${fragPct}%`,
                            backgroundImage:
                              "repeating-linear-gradient(45deg, rgba(0,0,0,0.06), rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.16) 4px, rgba(0,0,0,0.16) 8px)",
                          }}
                          className="flex h-full flex-col items-center justify-center overflow-hidden border-l border-foreground/40 px-0.5 text-center"
                          title={`Internal fragmentation: ${seg.internalFrag} KB`}
                        >
                          <span className="rounded bg-paper px-1.5 py-0.5 border border-foreground font-mono text-xs font-bold text-foreground shadow-sm whitespace-nowrap">
                            frag {seg.internalFrag} KB
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Solid ink boundary ticks */}
              <div
                className="relative mt-2 h-9 border-t-2 border-foreground"
                style={{ width: "100%" }}
              >
                {rawBoundaries.map((b, bIdx) => {
                  const leftPct = (b / safeTotal) * 100;
                  const stagger = staggers[bIdx] ?? 0;
                  return (
                    <div
                      key={`b-${b}`}
                      className={`absolute flex -translate-x-1/2 flex-col items-center ${stagger ? "top-2.5" : "top-0"}`}
                      style={{ left: `${leftPct}%` }}
                    >
                      <span className={`${stagger ? "h-4" : "h-2"} w-0.5 bg-foreground`} />
                      <span className="font-mono text-sm font-semibold text-foreground">{b}</span>
                    </div>
                  );
                })}
                <span className="absolute -right-28 top-0.5 font-mono text-xs font-bold text-ink-muted">
                  Address (KB) →
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6 rounded-lg border-2 border-foreground bg-paper p-4 shadow-[var(--shadow-paper)]">
        {initialSegments && initialSegments.length > 0 && renderBar(initialSegments, "Initial Partitions")}
        {renderBar(segments, initialSegments && initialSegments.length > 0 ? "After Allocation" : title || "Final Memory Segments")}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-foreground/20 pt-3 font-mono text-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Legend:
          </span>
          {Array.from(legendProcesses.values()).map((proc) => (
            <div
              key={proc.id}
              className="flex items-center gap-1.5 rounded-md border border-foreground/30 bg-paper px-2 py-0.5 shadow-sm"
            >
              <span
                className="h-3 w-3 rounded-sm border border-foreground"
                style={{ backgroundColor: proc.bg ?? "var(--highlight)" }}
              />
              <span className="font-bold text-foreground">{proc.name}</span>
              <span className="text-muted-foreground">({proc.size} KB)</span>
            </div>
          ))}
          {hasInternalFrag && (
            <div className="flex items-center gap-1.5 rounded-md border border-foreground/30 bg-paper px-2 py-0.5 shadow-sm">
              <span className="h-3 w-3 rounded-sm border border-foreground bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.2)_2px,rgba(0,0,0,0.2)_4px)]" />
              <span className="font-bold text-foreground">Internal Fragmentation</span>
            </div>
          )}
          {hasFree && (
            <div className="flex items-center gap-1.5 rounded-md border border-foreground/30 bg-paper px-2 py-0.5 shadow-sm">
              <span className="h-3 w-3 rounded-sm border border-dashed border-foreground/60 bg-secondary/30" />
              <span className="font-bold text-foreground">Free Space</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title && (
        <div className="font-mono text-xs uppercase tracking-wider text-chalk-muted">
          {title}
        </div>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[620px] pr-28">
          {/* Pointer & Scan badges row */}
          <div className="mb-1.5 flex items-end" style={{ minHeight: "1.5rem" }}>
            {segments.map((seg) => {
              const pct = (seg.size / safeTotal) * 100;
              const isPointer = pointerSegmentId === seg.segmentId;
              const isScan = scanSegmentId === seg.segmentId;
              const isChosen = chosenSegmentId === seg.segmentId;
              return (
                <div
                  key={`badge-${seg.segmentId}`}
                  style={{ width: `${pct}%`, minWidth: "56px" }}
                  className="flex justify-center px-0.5"
                >
                  {isChosen ? (
                    <span className="rounded bg-highlight px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                      chosen
                    </span>
                  ) : isScan ? (
                    <span className="rounded border border-highlight bg-highlight/20 px-2 py-0.5 font-mono text-xs font-bold text-highlight">
                      checking
                    </span>
                  ) : isPointer ? (
                    <span
                      className="rounded border border-chalk-foreground bg-chalk-foreground px-2 py-0.5 font-mono text-xs font-bold text-chalk"
                      title="Next Fit pointer (N)"
                    >
                      N
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Horizontal Memory Bar */}
          <div
            className="flex h-24 w-full overflow-hidden rounded border-2 border-chalk-foreground/70 bg-black/15"
            role="img"
            aria-label="Memory map"
          >
            {segments.map((seg) => {
              const pct = (seg.size / safeTotal) * 100;
              const isScan = scanSegmentId === seg.segmentId;
              const isChosen = chosenSegmentId === seg.segmentId;
              const color = seg.processId ? colors[seg.processId] : undefined;

              if (seg.kind === "free") {
                return (
                  <div
                    key={seg.segmentId}
                    style={{ width: `${pct}%`, minWidth: "56px" }}
                    className={`relative flex flex-col items-center justify-center border-r border-dashed border-chalk-muted px-1 text-center transition-all duration-300 last:border-r-0 ${
                      isChosen
                        ? "bg-highlight/30 ring-2 ring-inset ring-highlight"
                        : isScan
                          ? "bg-white/10 ring-2 ring-inset ring-highlight"
                          : "bg-transparent"
                    }`}
                  >
                    <span className="font-mono text-xs uppercase font-bold text-chalk-muted">
                      free
                    </span>
                    <span className="font-mono text-xs font-bold text-chalk-foreground">
                      {seg.size} KB
                    </span>
                    <span className="truncate max-w-full font-mono text-xs text-chalk-muted">
                      {seg.label}
                    </span>
                  </div>
                );
              }

              // Allocated segment
              const procSize = seg.processSize ?? seg.size;
              const usedPct = seg.size > 0 ? (procSize / seg.size) * 100 : 100;
              const fragPct = 100 - usedPct;

              return (
                <div
                  key={seg.segmentId}
                  style={{ width: `${pct}%`, minWidth: "56px" }}
                  className={`relative flex h-full border-r border-foreground/70 transition-all duration-300 last:border-r-0 ${
                    isChosen ? "ring-2 ring-inset ring-highlight" : ""
                  }`}
                >
                  {/* Used process portion */}
                  <div
                    style={{
                      width: mode === "fixed" ? `${usedPct}%` : "100%",
                      backgroundColor: color?.bg ?? "var(--highlight)",
                      color: color?.ink ?? "var(--foreground)",
                    }}
                    className="flex h-full flex-col items-center justify-center overflow-hidden px-1 text-center"
                  >
                    <span className="truncate max-w-full font-sans text-xs font-bold">
                      {seg.processName ?? seg.processId}
                    </span>
                    <span className="font-mono text-xs font-semibold">
                      {procSize} KB
                    </span>
                  </div>

                  {/* Fixed-mode internal fragmentation hatching with solid chip */}
                  {mode === "fixed" && seg.internalFrag > 0 && (
                    <div
                      style={{
                        width: `${fragPct}%`,
                        backgroundImage:
                          "repeating-linear-gradient(45deg, rgba(255,255,255,0.12), rgba(255,255,255,0.12) 4px, rgba(0,0,0,0.25) 4px, rgba(0,0,0,0.25) 8px)",
                      }}
                      className="flex h-full flex-col items-center justify-center overflow-hidden border-l border-dashed border-foreground/40 px-0.5 text-center"
                      title={`Internal fragmentation: ${seg.internalFrag} KB`}
                    >
                      <span className="rounded bg-black/85 px-1.5 py-0.5 border border-chalk-muted font-mono text-xs font-bold text-chalk-foreground shadow-sm whitespace-nowrap">
                        frag {seg.internalFrag} KB
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Address boundary ticks with 8px ticks, solid baseline and caption */}
          <div className="relative mt-2 h-9 border-t-2 border-chalk-muted" style={{ width: "100%" }}>
            {segments.map((seg, idx) => {
              const leftPct = (seg.start / safeTotal) * 100;
              const isLast = idx === segments.length - 1;
              const endLeftPct = (seg.end / safeTotal) * 100;
              return (
                <div key={`tick-${seg.segmentId}`}>
                  <div
                    className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${leftPct}%` }}
                  >
                    <span className="h-2 w-0.5 bg-chalk-muted" />
                    <span className="font-mono text-sm font-semibold text-chalk-foreground">{seg.start}</span>
                  </div>
                  {isLast && (
                    <div
                      className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                      style={{ left: `${endLeftPct}%` }}
                    >
                      <span className="h-2 w-0.5 bg-chalk-muted" />
                      <span className="font-mono text-sm font-semibold text-chalk-foreground">{seg.end}</span>
                    </div>
                  )}
                </div>
              );
            })}
            <span className="absolute -right-28 top-0.5 font-mono text-xs font-bold text-chalk-muted">
              Address (KB) →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
