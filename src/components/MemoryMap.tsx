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
}: MemoryMapProps) {
  const safeTotal = Math.max(1, totalMemory);

  return (
    <div className="space-y-2">
      {title && (
        <div className="font-mono text-xs uppercase tracking-wider text-chalk-foreground/80">
          {title}
        </div>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[620px]">
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
                    <span className="rounded bg-highlight px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                      chosen
                    </span>
                  ) : isScan ? (
                    <span className="rounded border border-highlight bg-highlight/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-highlight">
                      checking
                    </span>
                  ) : isPointer ? (
                    <span
                      className="rounded border border-chalk-foreground bg-chalk-foreground px-1.5 py-0.5 font-mono text-[10px] font-bold text-chalk"
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
                    className={`relative flex flex-col items-center justify-center border-r border-dashed border-chalk-foreground/50 px-1 text-center transition-all duration-300 last:border-r-0 ${
                      isChosen
                        ? "bg-highlight/30 ring-2 ring-inset ring-highlight"
                        : isScan
                          ? "bg-white/10 ring-2 ring-inset ring-highlight"
                          : "bg-transparent"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-chalk-foreground/75">
                      free
                    </span>
                    <span className="font-mono text-xs font-bold text-chalk-foreground">
                      {seg.size} KB
                    </span>
                    <span className="truncate max-w-full font-mono text-[10px] text-chalk-foreground/65">
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
                    <span className="font-mono text-[10px] font-semibold opacity-80">
                      {procSize} KB
                    </span>
                  </div>

                  {/* Fixed-mode internal fragmentation hatching */}
                  {mode === "fixed" && seg.internalFrag > 0 && (
                    <div
                      style={{
                        width: `${fragPct}%`,
                        backgroundImage:
                          "repeating-linear-gradient(45deg, rgba(255,255,255,0.12), rgba(255,255,255,0.12) 4px, rgba(0,0,0,0.18) 4px, rgba(0,0,0,0.18) 8px)",
                      }}
                      className="flex h-full flex-col items-center justify-center overflow-hidden border-l border-dashed border-foreground/40 px-0.5 text-center text-chalk-foreground"
                      title={`Internal fragmentation: ${seg.internalFrag} KB`}
                    >
                      <span className="font-mono text-[9px] leading-tight">internal frag</span>
                      <span className="font-mono text-[10px] font-bold">
                        {seg.internalFrag}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Address boundary ticks */}
          <div className="mt-1 flex font-mono text-[10px] text-chalk-foreground/80">
            {segments.map((seg, idx) => {
              const pct = (seg.size / safeTotal) * 100;
              const isLast = idx === segments.length - 1;
              return (
                <div
                  key={`tick-${seg.segmentId}`}
                  style={{ width: `${pct}%`, minWidth: "56px" }}
                  className="flex justify-between"
                >
                  <span>{seg.start}</span>
                  {isLast && <span>{seg.end}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
