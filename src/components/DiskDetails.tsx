import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DiskAlgorithm, DiskSegment, DiskSimulationResult } from "@/lib/disk";
import { DISK_ALGORITHM_MAP } from "@/lib/disk";
import type { PaletteColor } from "@/lib/palette";

export interface DiskResultsPanelProps {
  result: DiskSimulationResult;
  segmentsShown: DiskSegment[];
  colors: Record<string, PaletteColor>;
  displayNames: Record<string, string>;
  isFinished: boolean;
  hoveredRequestId?: string | null;
  onHoverRequest?: (id: string | null) => void;
}

export function DiskResultsPanel({
  result,
  segmentsShown,
  colors,
  displayNames,
  isFinished,
  hoveredRequestId,
  onHoverRequest,
}: DiskResultsPanelProps) {
  const currentRunningTotal = segmentsShown
    .filter((s) => s.countedInTotal)
    .reduce((sum, s) => sum + s.distance, 0);

  const servedSoFar = segmentsShown.filter((s) => s.kind === "serve");
  const currentAvgSeek =
    servedSoFar.length > 0 ? currentRunningTotal / servedSoFar.length : 0;
  const currentSeekTime = currentRunningTotal * result.seekTimePerCylinderMs;

  const currentServiceOrder = segmentsShown
    .filter((s) => s.kind === "serve" && s.requestId)
    .map((s) => `${s.to}`);

  const fullServiceOrderStr = [result.startHead, ...result.segments.filter((s) => s.kind === "serve").map((s) => s.to)].join(" → ");

  const algoMeta = DISK_ALGORITHM_MAP[result.algorithm];

  return (
    <div className="space-y-6">
      {/* Algorithm Info Note Banner */}
      {algoMeta.infoNote && (
        <div className="paper-card border-primary/30 bg-primary/5 p-4 text-xs font-mono">
          <p className="font-bold text-primary uppercase text-[11px] tracking-wider mb-1">
            Note on {algoMeta.label}:
          </p>
          <p className="text-muted-foreground leading-relaxed">{algoMeta.infoNote}</p>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="paper-card p-4">
          <p className="font-mono text-xs text-muted-foreground">Total head movement</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {isFinished ? result.totalHeadMovement : currentRunningTotal} cylinders
          </p>
          {(result.algorithm === "c-scan" || result.algorithm === "c-look") && (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              w/ jump: {result.totalHeadMovementWithJump} · w/o jump: {result.totalHeadMovementWithoutJump}
            </p>
          )}
        </div>
        <div className="paper-card p-4">
          <p className="font-mono text-xs text-muted-foreground">Average seek / request</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {(isFinished ? result.averageSeekPerRequest : currentAvgSeek).toFixed(2)} cyl
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            served {isFinished ? result.servedCount : servedSoFar.length} / {result.servedCount}
          </p>
        </div>
        <div className="paper-card p-4">
          <p className="font-mono text-xs text-muted-foreground">Total seek time</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {(isFinished ? result.totalSeekTimeMs : currentSeekTime).toFixed(2)} ms
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            at {result.seekTimePerCylinderMs} ms / cylinder
          </p>
        </div>
        <div className="paper-card p-4">
          <p className="font-mono text-xs text-muted-foreground">Service sequence</p>
          <p className="mt-1 truncate font-mono text-sm font-bold" title={fullServiceOrderStr}>
            {segmentsShown.length > 0 ? `${result.startHead} → ${currentServiceOrder.join(" → ")}` : `${result.startHead}`}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {isFinished ? "Completed all requests" : `in progress (${servedSoFar.length}/${result.servedCount})`}
          </p>
        </div>
      </div>

      {/* Results Table */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-foreground/15 bg-paper px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-hand text-3xl font-bold">Head movement log</h3>
          <span className="font-mono text-xs text-muted-foreground">
            {segmentsShown.length} of {result.segments.length} segments
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-foreground/15 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2.5 text-center">Step</th>
                <th className="px-4 py-2.5">Request / Event</th>
                <th className="px-4 py-2.5 text-center">From → To</th>
                <th className="px-4 py-2.5 text-right">Movement (cylinders)</th>
                <th className="px-4 py-2.5 text-right">Running Total</th>
              </tr>
            </thead>
            <tbody>
              {segmentsShown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground italic">
                    Press Play or Step to begin head movements.
                  </td>
                </tr>
              ) : (
                segmentsShown.map((seg, idx) => {
                  const color = seg.requestId ? colors[seg.requestId] : undefined;
                  const name = seg.requestId
                    ? displayNames[seg.requestId] ?? seg.requestName
                    : undefined;

                  const isServe = seg.kind === "serve";
                  const isEnd = seg.kind === "end";
                  const isJump = seg.kind === "jump";

                  const runningSum = segmentsShown
                    .slice(0, idx + 1)
                    .filter((s) => s.countedInTotal)
                    .reduce((sum, s) => sum + s.distance, 0);

                  const isHovered = seg.requestId && seg.requestId === hoveredRequestId;

                  return (
                    <tr
                      key={`row-${idx}`}
                      onMouseEnter={() => seg.requestId && onHoverRequest?.(seg.requestId)}
                      onMouseLeave={() => seg.requestId && onHoverRequest?.(null)}
                      onFocus={() => seg.requestId && onHoverRequest?.(seg.requestId)}
                      onBlur={() => seg.requestId && onHoverRequest?.(null)}
                      className={`border-t border-foreground/10 transition-colors ${
                        isHovered
                          ? "bg-primary/15 font-semibold"
                          : isJump
                            ? "bg-muted/40 font-semibold"
                            : isEnd
                              ? "bg-card font-semibold"
                              : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        {isServe ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-foreground"
                              style={{ backgroundColor: color?.bg }}
                              aria-hidden="true"
                            />
                            <span className="font-bold">{name}</span>
                            <span className="text-xs text-muted-foreground">({seg.requestId})</span>
                          </div>
                        ) : isEnd ? (
                          <span className="italic text-muted-foreground font-bold">
                            Disk boundary reached
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground font-bold">
                            Return jump {seg.countedInTotal ? "(counted)" : "(not counted)"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {seg.from} → <span className="font-bold">{seg.to}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        |{seg.from} − {seg.to}| ={" "}
                        <span className="font-bold">{seg.distance}</span>
                        {!seg.countedInTotal && (
                          <span className="text-xs text-muted-foreground ml-1">(ignored)</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-primary">
                        {runningSum}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export interface DiskCalculationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: DiskSimulationResult;
  segmentsShown: DiskSegment[];
  displayNames: Record<string, string>;
}

export function DiskCalculationsDialog({
  open,
  onOpenChange,
  result,
  segmentsShown,
  displayNames,
}: DiskCalculationsDialogProps) {
  const isFinished = segmentsShown.length >= result.segments.length;
  const listToCalculate = isFinished ? result.segments : segmentsShown;

  const countedSegments = listToCalculate.filter((s) => s.countedInTotal);
  const sumFormula = countedSegments.map((s) => s.distance).join(" + ") || "0";
  const totalMovement = countedSegments.reduce((sum, s) => sum + s.distance, 0);

  const servedRequestsCount = listToCalculate.filter((s) => s.kind === "serve").length;
  const safeCount = Math.max(1, servedRequestsCount || result.servedCount);
  const avgFormula = `${totalMovement} / ${safeCount} = ${(totalMovement / safeCount).toFixed(2)}`;
  const timeFormula = `${totalMovement} × ${result.seekTimePerCylinderMs} = ${(totalMovement * result.seekTimePerCylinderMs).toFixed(2)} ms`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto bg-paper">
        <DialogHeader>
          <DialogTitle className="font-hand text-4xl">Disk Scheduling calculations</DialogTitle>
          <DialogDescription>
            {DISK_ALGORITHM_MAP[result.algorithm].label} — formulas with live real numbers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 font-mono text-xs">
          {/* Summary Formulas Box */}
          <div className="rounded-md border border-foreground/20 bg-background p-3.5 space-y-2">
            <p className="font-bold text-sm">Summary formulas</p>
            <p>
              <b>Total head movement</b> = Σ |from − to|{" "}
              {result.countReturnJump ? "(jump counted)" : "(jump ignored)"}
            </p>
            <p className="text-muted-foreground break-all pl-3">
              Total = {sumFormula} = <span className="font-bold text-foreground">{totalMovement}</span> cylinders
            </p>

            {(result.algorithm === "c-scan" || result.algorithm === "c-look") && (
              <div className="pl-3 space-y-0.5 text-muted-foreground border-l-2 border-foreground/20">
                <p>
                  • With return jump:{" "}
                  <span className="font-bold text-foreground">
                    {result.totalHeadMovementWithJump} cylinders
                  </span>
                </p>
                <p>
                  • Without return jump:{" "}
                  <span className="font-bold text-foreground">
                    {result.totalHeadMovementWithoutJump} cylinders
                  </span>
                </p>
              </div>
            )}

            <p>
              <b>Average seek per request</b> = Total movement / Served requests
            </p>
            <p className="text-muted-foreground pl-3">
              Average = {avgFormula} cylinders
            </p>

            <p>
              <b>Total seek time</b> = Total movement × seek time per cylinder
            </p>
            <p className="text-muted-foreground pl-3">
              Seek time = {timeFormula}
            </p>
          </div>

          {/* Step-by-Step breakdown */}
          <div className="space-y-2">
            <p className="font-bold text-sm">
              Step-by-step movement list ({listToCalculate.length} segments)
            </p>
            {listToCalculate.length === 0 ? (
              <p className="text-muted-foreground italic">
                Press Play or Step to record head movement steps.
              </p>
            ) : (
              listToCalculate.map((seg, idx) => {
                const name = seg.requestId
                  ? displayNames[seg.requestId] ?? seg.requestName
                  : undefined;

                return (
                  <div
                    key={`step-calc-${idx}`}
                    className="rounded-md border border-foreground/15 bg-background p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        Step {idx + 1}:{" "}
                        {seg.kind === "serve"
                          ? `Serve ${name} (${seg.requestId}) at cylinder ${seg.to}`
                          : seg.kind === "end"
                            ? `Sweep to disk end at cylinder ${seg.to}`
                            : `Jump to cylinder ${seg.to}`}
                      </span>
                      <span className="text-muted-foreground">
                        |{seg.from} − {seg.to}| = {seg.distance} cyl
                      </span>
                    </div>
                    <p className="text-muted-foreground">{seg.narration}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
