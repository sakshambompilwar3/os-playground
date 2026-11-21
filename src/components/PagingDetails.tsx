import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  effectiveAccessTime,
  type FrameSweepEntry,
  type PagingAlgorithm,
  type PagingResult,
  type PagingStep,
} from "@/lib/paging";
import type { PaletteColor } from "@/lib/palette";

interface FrameTableProps {
  result: PagingResult;
  currentStepIndex: number;
  colors: Record<number, PaletteColor>;
  title?: string;
  compact?: boolean;
}

export function FrameTable({
  result,
  currentStepIndex,
  colors,
  title,
  compact = false,
}: FrameTableProps) {
  const { frameCount, referenceString, steps } = result;
  const activeSteps = steps.slice(0, currentStepIndex);

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center justify-between">
          <span className="font-hand text-2xl font-bold text-chalk-foreground">{title}</span>
          <span className="font-mono text-xs text-chalk-foreground/70">
            {activeSteps.length}/{referenceString.length} references
          </span>
        </div>
      )}
      <div className="table-scroll-container overflow-x-auto rounded border border-chalk-foreground/20 bg-black/20 p-2">
        <table className="min-w-full border-collapse font-mono text-xs">
          <thead>
            {/* Reference string row */}
            <tr className="border-b border-chalk-foreground/30 text-chalk-foreground/80">
              <th className="sticky left-0 z-10 bg-black/80 px-2 py-1 text-left font-bold">
                Ref
              </th>
              {referenceString.map((ref, idx) => {
                const isCurrent = idx === currentStepIndex - 1;
                const isPast = idx < currentStepIndex;
                const color = colors[ref];
                return (
                  <th
                    key={idx}
                    className={`min-w-[36px] px-1.5 py-1 text-center transition-colors ${
                      isCurrent
                        ? "bg-highlight/30 text-highlight font-bold ring-1 ring-highlight"
                        : isPast
                          ? "text-chalk-foreground"
                          : "text-chalk-foreground/40"
                    }`}
                  >
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-xs font-bold"
                      style={
                        isPast
                          ? { backgroundColor: color?.bg ?? "#e2e8f0", color: color?.ink ?? "#0f172a" }
                          : undefined
                      }
                    >
                      {ref}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Frame rows */}
            {Array.from({ length: frameCount }, (_, fIdx) => (
              <tr key={fIdx} className="border-b border-chalk-foreground/10 text-chalk-foreground">
                <td className="sticky left-0 z-10 bg-black/80 px-2 py-1 font-bold text-chalk-foreground/70">
                  F{fIdx + 1}
                </td>
                {referenceString.map((_, colIdx) => {
                  const step = activeSteps[colIdx];
                  const page = step ? step.frames[fIdx] : null;
                  const isCurrent = colIdx === currentStepIndex - 1;
                  const isLoadedHere = step && step.loadedFrameIndex === fIdx;
                  const color = page !== null ? colors[page] : null;

                  return (
                    <td
                      key={colIdx}
                      className={`px-1 py-1 text-center font-mono ${
                        isCurrent ? "bg-highlight/10 font-bold" : ""
                      }`}
                    >
                      {page !== null ? (
                        <span
                          className={`inline-block min-w-[26px] rounded px-1 py-0.5 text-xs ${
                            isLoadedHere && isCurrent
                              ? "ring-2 ring-highlight font-bold scale-105"
                              : ""
                          }`}
                          style={{
                            backgroundColor: color?.bg ?? "transparent",
                            color: color?.ink ?? "inherit",
                          }}
                        >
                          {page}
                        </span>
                      ) : (
                        <span className="text-chalk-foreground/20">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Evicted row */}
            <tr className="border-b border-chalk-foreground/20 text-xs text-chalk-foreground/70">
              <td className="sticky left-0 z-10 bg-black/80 px-2 py-1 font-bold">
                Evict
              </td>
              {referenceString.map((_, colIdx) => {
                const step = activeSteps[colIdx];
                const evicted = step?.evictedPage;
                return (
                  <td key={colIdx} className="px-1 py-0.5 text-center font-mono">
                    {evicted !== undefined && evicted !== null ? (
                      <span className="rounded bg-destructive/20 px-1 text-[10px] text-destructive-foreground line-through font-bold">
                        {evicted}
                      </span>
                    ) : (
                      <span className="text-chalk-foreground/20">-</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Hit / Fault row */}
            <tr className="text-xs font-bold">
              <td className="sticky left-0 z-10 bg-black/80 px-2 py-1 text-chalk-foreground/80">
                Status
              </td>
              {referenceString.map((_, colIdx) => {
                const step = activeSteps[colIdx];
                if (!step) {
                  return (
                    <td key={colIdx} className="px-1 py-1 text-center text-chalk-foreground/20">
                      -
                    </td>
                  );
                }
                return (
                  <td
                    key={colIdx}
                    className={`px-1 py-1 text-center ${
                      step.hit ? "text-success" : "text-highlight"
                    }`}
                  >
                    {step.hit ? "✓" : "✗"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PagingResultsPanel({
  result,
  currentStepIndex,
}: {
  result: PagingResult;
  currentStepIndex: number;
}) {
  const isFinal = currentStepIndex >= result.referenceString.length;
  const activeSteps = result.steps.slice(0, currentStepIndex);
  const total = activeSteps.length;
  const faults = activeSteps.filter((s) => !s.hit).length;
  const hits = activeSteps.filter((s) => s.hit).length;
  const evictions = Math.max(0, faults - result.frameCount);
  const hitRatio = total > 0 ? (hits / total) * 100 : 0;
  const faultRatio = total > 0 ? (faults / total) * 100 : 0;

  return (
    <div className="paper-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-foreground/15 pb-2">
        <h3 className="font-hand text-2xl font-bold">
          Simulation Metrics {isFinal ? "(Final)" : `(Step ${currentStepIndex}/${result.referenceString.length})`}
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${
            isFinal ? "bg-success/20 text-success" : "bg-highlight/30 text-foreground"
          }`}
        >
          {isFinal ? "Run Complete" : "In Progress"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 font-mono text-xs">
        <div className="rounded border border-foreground/20 bg-background/50 p-2.5 text-center">
          <p className="text-muted-foreground uppercase text-[10px]">Page Faults</p>
          <p className="mt-1 font-hand text-3xl font-bold text-primary">{faults}</p>
        </div>
        <div className="rounded border border-foreground/20 bg-background/50 p-2.5 text-center">
          <p className="text-muted-foreground uppercase text-[10px]">Page Hits</p>
          <p className="mt-1 font-hand text-3xl font-bold text-success">{hits}</p>
        </div>
        <div className="rounded border border-foreground/20 bg-background/50 p-2.5 text-center">
          <p className="text-muted-foreground uppercase text-[10px]">Hit Ratio</p>
          <p className="mt-1 font-hand text-3xl font-bold">{hitRatio.toFixed(1)}%</p>
        </div>
        <div className="rounded border border-foreground/20 bg-background/50 p-2.5 text-center">
          <p className="text-muted-foreground uppercase text-[10px]">Fault Ratio</p>
          <p className="mt-1 font-hand text-3xl font-bold">{faultRatio.toFixed(1)}%</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded border border-foreground/20 bg-background/50 p-2.5 text-center">
          <p className="text-muted-foreground uppercase text-[10px]">Evictions</p>
          <p className="mt-1 font-hand text-3xl font-bold text-destructive">{evictions}</p>
        </div>
      </div>
    </div>
  );
}

export function PagingCalculationsDialog({
  open,
  onOpenChange,
  result,
  eatMemoryNs,
  eatFaultMs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: PagingResult;
  eatMemoryNs: number;
  eatFaultMs: number;
}) {
  const n = result.referenceString.length;
  const p = result.faultRatio;
  const eat = effectiveAccessTime(p, eatMemoryNs, eatFaultMs);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-hand text-3xl font-bold">
            Page Replacement Calculations &amp; Formulas
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Algorithm: {result.algorithm.toUpperCase()} · Frames: {result.frameCount} · References: {n}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2 font-mono text-sm">
          {/* Hit & Fault Ratios */}
          <div className="paper-card p-4 space-y-2 bg-background/60">
            <h4 className="font-hand text-xl font-bold text-primary">1. Hit &amp; Fault Ratios</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• <b>Hit Ratio</b> = (hits / total references) × 100</p>
              <p className="pl-4 font-bold text-foreground">
                = ({result.hits} / {n}) × 100 = {(result.hitRatio * 100).toFixed(2)}%
              </p>
              <p className="pt-2">• <b>Fault Ratio (p)</b> = (faults / total references) × 100</p>
              <p className="pl-4 font-bold text-foreground">
                = ({result.faults} / {n}) × 100 = {(result.faultRatio * 100).toFixed(2)}%
              </p>
              <p className="pt-2">• <b>Evictions</b> = max(0, faults − frames)</p>
              <p className="pl-4 font-bold text-foreground">
                = max(0, {result.faults} − {result.frameCount}) = {result.evictions}
              </p>
            </div>
          </div>

          {/* Effective Access Time (EAT) */}
          <div className="paper-card p-4 space-y-2 bg-background/60">
            <h4 className="font-hand text-xl font-bold text-primary">2. Effective Access Time (EAT)</h4>
            <p className="text-xs text-muted-foreground">
              Formula: <code>EAT = (1 − p) × T_mem + p × T_fault</code>
            </p>
            <div className="space-y-1 text-xs">
              <p>• Memory access time (T_mem) = {eatMemoryNs} ns</p>
              <p>• Page fault service time (T_fault) = {eatFaultMs} ms = {(eatFaultMs * 1_000_000).toLocaleString()} ns</p>
              <p>• Page fault probability (p) = {p.toFixed(4)}</p>
              <div className="mt-2 rounded border border-foreground/20 bg-paper p-3 text-sm font-bold text-foreground">
                EAT = (1 − {p.toFixed(4)}) × {eatMemoryNs} ns + {p.toFixed(4)} × {(eatFaultMs * 1_000_000).toLocaleString()} ns
                <br />
                = {((1 - p) * eatMemoryNs).toFixed(2)} ns + {(p * eatFaultMs * 1_000_000).toFixed(2)} ns
                <br />
                <span className="text-primary text-base">
                  = {eat.toLocaleString("en-US", { maximumFractionDigits: 2 })} ns
                </span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({(eat / eatMemoryNs).toFixed(1)}× slowdown compared to regular RAM)
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Fault Trace */}
          <div className="paper-card p-4 space-y-2 bg-background/60">
            <h4 className="font-hand text-xl font-bold text-primary">3. Eviction Log</h4>
            {result.evictionOrder.length > 0 ? (
              <p className="text-xs">
                Evicted pages in order:{" "}
                <span className="font-bold text-destructive">
                  {result.evictionOrder.join(" → ")}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Zero evictions occurred (all faults loaded into empty frames).</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FrameSweepView({
  sweep,
  selectedFrames,
  algorithm,
}: {
  sweep: FrameSweepEntry[];
  selectedFrames: number;
  algorithm: PagingAlgorithm;
}) {
  return (
    <div className="paper-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-foreground/15 pb-2">
        <h3 className="font-hand text-2xl font-bold">
          Frame Allocation Sweep (1 to 10 Frames)
        </h3>
        <span className="font-mono text-xs text-muted-foreground uppercase">
          {algorithm.toUpperCase()} Fault Curve
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-foreground/20 text-muted-foreground text-left">
              <th className="px-2 py-1">Frames</th>
              <th className="px-2 py-1 text-center">Faults</th>
              <th className="px-2 py-1 text-center">Hits</th>
              <th className="px-2 py-1 text-center">Fault Ratio</th>
              <th className="px-2 py-1 text-left">Anomaly Check</th>
            </tr>
          </thead>
          <tbody>
            {sweep.map((row, idx) => {
              const isSelected = row.frames === selectedFrames;
              const prev = idx > 0 ? sweep[idx - 1] : null;
              const isBelady = prev !== null && row.faults > prev.faults;

              return (
                <tr
                  key={row.frames}
                  className={`border-b border-foreground/10 ${
                    isSelected ? "bg-highlight/20 font-bold" : ""
                  }`}
                >
                  <td className="px-2 py-1">
                    Frame {row.frames} {isSelected && "← active"}
                  </td>
                  <td className="px-2 py-1 text-center font-bold text-primary">
                    {row.faults}
                  </td>
                  <td className="px-2 py-1 text-center text-success">{row.hits}</td>
                  <td className="px-2 py-1 text-center">
                    {(row.faultRatio * 100).toFixed(1)}%
                  </td>
                  <td className="px-2 py-1">
                    {isBelady ? (
                      <span className="rounded bg-destructive/20 px-1.5 py-0.5 font-bold text-destructive">
                        ⚠️ Belady's Anomaly (+{row.faults - prev!.faults} faults!)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EatCalculator({
  faultRatio,
  memoryNs,
  setMemoryNs,
  faultMs,
  setFaultMs,
}: {
  faultRatio: number;
  memoryNs: number;
  setMemoryNs: (v: number) => void;
  faultMs: number;
  setFaultMs: (v: number) => void;
}) {
  const eat = effectiveAccessTime(faultRatio, memoryNs, faultMs);
  const slowdown = memoryNs > 0 ? eat / memoryNs : 1;

  return (
    <div className="paper-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/15 pb-2">
        <div>
          <h3 className="font-hand text-2xl font-bold">
            Effective Access Time (EAT) Calculator
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            EAT = (1 − p) × MemoryAccess + p × PageFaultService
          </p>
        </div>
        <span className="rounded bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
          p = {faultRatio.toFixed(4)} ({(faultRatio * 100).toFixed(1)}%)
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 font-mono text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Memory access time (ns):</span>
          <input
            type="number"
            min={1}
            max={10000}
            value={memoryNs}
            onChange={(e) => setMemoryNs(Math.max(1, Number(e.target.value) || 200))}
            className="rounded border-2 border-input bg-background p-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Page fault service time (ms):</span>
          <input
            type="number"
            min={0.1}
            max={100}
            step={0.5}
            value={faultMs}
            onChange={(e) => setFaultMs(Math.max(0.1, Number(e.target.value) || 8))}
            className="rounded border-2 border-input bg-background p-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      <div className="rounded border border-foreground/20 bg-background/50 p-3 font-mono text-xs space-y-1">
        <p className="text-muted-foreground">
          EAT = (1 − {faultRatio.toFixed(4)}) × {memoryNs} ns + {faultRatio.toFixed(4)} × {(faultMs * 1_000_000).toLocaleString()} ns
        </p>
        <p className="font-hand text-3xl font-bold text-primary">
          = {eat.toLocaleString("en-US", { maximumFractionDigits: 1 })} ns
          <span className="ml-3 font-mono text-xs text-muted-foreground font-normal">
            ({slowdown.toFixed(1)}× slower than bare RAM)
          </span>
        </p>
      </div>
    </div>
  );
}
