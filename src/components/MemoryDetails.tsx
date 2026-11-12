import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  AllocationRecord,
  AllocationStep,
  FitStrategy,
  MemorySummary,
  PartitionMode,
} from "@/lib/memory";
import { MODE_META, STRATEGY_META } from "@/lib/memory";
import type { PaletteColor } from "@/lib/palette";

export interface MemoryResultsPanelProps {
  records: AllocationRecord[];
  summary: MemorySummary;
  mode: PartitionMode;
  colors: Record<string, PaletteColor>;
  displayNames: Record<string, string>;
}

export function MemoryResultsPanel({
  records,
  summary,
  mode,
  colors,
  displayNames,
}: MemoryResultsPanelProps) {
  const waitingRecords = records.filter((r) => r.status === "waiting");

  return (
    <div className="space-y-6">
      {/* Waiting list */}
      {waitingRecords.length > 0 && (
        <div className="paper-card border-destructive/40 bg-destructive/5 p-4 space-y-2">
          <h3 className="font-hand text-2xl font-bold text-destructive">
            Waiting processes (not allocated)
          </h3>
          <div className="flex flex-wrap gap-2">
            {waitingRecords.map((rec) => {
              const color = colors[rec.processId];
              const name = displayNames[rec.processId] ?? rec.processName;
              return (
                <div
                  key={rec.processId}
                  className="inline-flex items-center gap-2 rounded-md border-2 border-foreground/40 bg-paper px-3 py-1.5 font-mono text-xs"
                >
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-sm border border-foreground"
                    style={{ backgroundColor: color?.bg }}
                    aria-hidden="true"
                  />
                  <span className="font-bold">
                    {name} ({rec.processId})
                  </span>
                  <span className="text-muted-foreground">— {rec.waitReason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary metrics grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="paper-card p-4">
          <p className="font-mono text-xs text-muted-foreground">Total memory</p>
          <p className="mt-1 font-mono text-2xl font-bold">{summary.totalMemory} KB</p>
        </div>
        <div className="paper-card p-4">
          <p className="font-mono text-xs text-muted-foreground">Allocated / Free</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {summary.allocatedProcessMemory} / {summary.totalFreeMemory} KB
          </p>
        </div>
        <div className="paper-card p-4">
          <p className="font-mono text-xs text-muted-foreground">
            Free holes / Largest hole
          </p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {summary.freeHoleCount} ({summary.largestFreeHole} KB)
          </p>
        </div>
        <div className="paper-card p-4">
          <p className="font-mono text-xs text-muted-foreground">Memory utilization</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {summary.utilizationPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Fragmentation summary */}
      <div className="paper-card p-4 font-mono text-sm space-y-1.5">
        {mode === "fixed" && (
          <p>
            <span className="font-bold">Total internal fragmentation:</span>{" "}
            {summary.totalInternalFrag} KB (unused space inside allocated fixed blocks)
          </p>
        )}
        <p>
          <span className="font-bold">External fragmentation:</span>{" "}
          {summary.waitingCount === 0
            ? "0 KB — all processes were allocated."
            : summary.externalFragApplies
              ? `${summary.totalFreeMemory} KB total free across ${summary.freeHoleCount} holes, but largest free hole is ${summary.largestFreeHole} KB (cannot fit smallest waiting process of ${summary.smallestWaitingSize} KB).`
              : `Not triggered — ${summary.totalFreeMemory} KB total free is smaller than the smallest waiting process (${summary.smallestWaitingSize} KB).`}
        </p>
      </div>

      {/* Allocation Table */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-foreground/15 bg-paper px-4 py-3">
          <h3 className="font-hand text-3xl font-bold">Allocation table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-foreground/15 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2.5">Process</th>
                <th className="px-4 py-2.5 text-right">Size</th>
                <th className="px-4 py-2.5">Allocated to</th>
                <th className="px-4 py-2.5 text-center">Address</th>
                <th className="px-4 py-2.5 text-right">
                  {mode === "fixed" ? "Internal frag" : "Leftover hole"}
                </th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => {
                const color = colors[rec.processId];
                const name = displayNames[rec.processId] ?? rec.processName;
                const isWaiting = rec.status === "waiting";
                return (
                  <tr
                    key={rec.processId}
                    className={`border-t border-foreground/10 ${
                      isWaiting ? "bg-destructive/5" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-foreground"
                          style={{ backgroundColor: color?.bg }}
                          aria-hidden="true"
                        />
                        <span className="font-bold">{name}</span>
                        <span className="text-xs text-muted-foreground">({rec.processId})</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{rec.processSize} KB</td>
                    <td className="px-4 py-2.5">{rec.allocatedTo ?? "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      {rec.start !== null && rec.end !== null ? `${rec.start}–${rec.end}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isWaiting
                        ? "—"
                        : mode === "fixed"
                          ? `${rec.internalFrag} KB`
                          : `${rec.leftoverHole} KB`}
                    </td>
                    <td className="px-4 py-2.5">
                      {isWaiting ? (
                        <span className="font-bold text-destructive">Waiting (not allocated)</span>
                      ) : (
                        <span className="font-bold text-success-foreground">Allocated</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export interface MemoryCalculationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PartitionMode;
  strategy: FitStrategy;
  stepsShown: AllocationStep[];
  summary: MemorySummary;
  displayNames: Record<string, string>;
}

export function MemoryCalculationsDialog({
  open,
  onOpenChange,
  mode,
  strategy,
  stepsShown,
  summary,
  displayNames,
}: MemoryCalculationsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto bg-paper">
        <DialogHeader>
          <DialogTitle className="font-hand text-4xl">Memory calculations</DialogTitle>
          <DialogDescription>
            {MODE_META[mode].label} + {STRATEGY_META[strategy].label} — formulas with live numbers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 font-mono text-xs">
          <div className="rounded-md border border-foreground/20 bg-background p-3 space-y-1.5">
            <p className="font-bold text-sm">Summary formulas</p>
            <p>
              Total memory = {summary.totalMemory} KB
            </p>
            <p>
              Allocated process memory = {summary.allocatedProcessMemory} KB
            </p>
            <p>
              Memory utilization = ({summary.allocatedProcessMemory} / {summary.totalMemory || 1}) × 100 ={" "}
              <span className="font-bold">{summary.utilizationPercent.toFixed(2)}%</span>
            </p>
            {mode === "fixed" ? (
              <p>
                Total internal fragmentation = Σ(Block − Process) ={" "}
                <span className="font-bold">{summary.totalInternalFrag} KB</span>
              </p>
            ) : (
              <p>
                Total free memory = <span className="font-bold">{summary.totalFreeMemory} KB</span> across{" "}
                {summary.freeHoleCount} hole(s) (largest = {summary.largestFreeHole} KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="font-bold text-sm">Step-by-step arithmetic ({stepsShown.length} steps shown)</p>
            {stepsShown.length === 0 ? (
              <p className="text-muted-foreground italic">
                Press Play or Step to record process placement calculations.
              </p>
            ) : (
              stepsShown.map((step) => {
                const name = displayNames[step.processId] ?? step.processName;
                return (
                  <div
                    key={step.stepIndex}
                    className="rounded-md border border-foreground/15 bg-background p-3 space-y-1"
                  >
                    <p className="font-bold">
                      Step {step.stepIndex + 1}: {name} ({step.processId}) — needs {step.processSize} KB
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      {step.candidates.map((c) => (
                        <li
                          key={`${step.stepIndex}-${c.segmentId}`}
                          className={c.chosen ? "font-bold text-foreground" : ""}
                        >
                          {c.reason}
                        </li>
                      ))}
                    </ul>
                    <p className="pt-1 text-foreground">{step.narration}</p>
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
