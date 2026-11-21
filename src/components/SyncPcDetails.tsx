import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PCStepRecord, PCThreadState, PCViolation } from "@/lib/sync/pc";

const PRODUCER_CODE = [
  { id: "p1", text: "produce item" },
  { id: "p2", text: "wait(empty)" },
  { id: "p3", text: "wait(mutex)" },
  { id: "p4", text: "slot = in" },
  { id: "p5", text: "buffer[slot] = item" },
  { id: "p6", text: "in = (slot + 1) mod N" },
  { id: "p7", text: "signal(mutex)" },
  { id: "p8", text: "signal(full)" },
];

const CONSUMER_CODE = [
  { id: "c1", text: "wait(full)" },
  { id: "c2", text: "wait(mutex)" },
  { id: "c3", text: "slot = out" },
  { id: "c4", text: "item = buffer[slot]" },
  { id: "c5", text: "out = (slot + 1) mod N" },
  { id: "c6", text: "signal(mutex)" },
  { id: "c7", text: "signal(empty)" },
  { id: "c8", text: "consume item" },
];

export function PcBufferRing({
  buffer,
  inPtr,
  outPtr,
}: {
  buffer: (string | null)[];
  inPtr: number;
  outPtr: number;
}) {
  const N = buffer.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-chalk-foreground">
        <span className="font-hand text-2xl font-bold">Bounded Buffer (Slots 0 to {N - 1})</span>
        <div className="flex items-center gap-4 font-mono text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-highlight" />
            in = {inPtr}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            out = {outPtr}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-chalk-foreground/20 bg-black/25 p-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {buffer.map((item, idx) => {
            const isIn = idx === inPtr;
            const isOut = idx === outPtr;
            return (
              <div
                key={idx}
                className={`relative flex flex-col items-center justify-center rounded border-2 p-2.5 transition-all ${
                  item !== null
                    ? "border-highlight bg-highlight/20 text-chalk-foreground font-bold"
                    : "border-dashed border-chalk-foreground/30 bg-black/20 text-chalk-foreground/40"
                } min-w-[70px] min-h-[70px]`}
              >
                <span className="font-mono text-[10px] text-chalk-foreground/60">
                  slot {idx}
                </span>
                <span className="font-hand text-2xl font-bold mt-1">
                  {item ?? "empty"}
                </span>

                {/* in/out pointer markers */}
                <div className="mt-1 flex gap-1 font-mono text-[9px]">
                  {isIn && (
                    <span className="rounded bg-highlight px-1 text-foreground font-bold">
                      IN
                    </span>
                  )}
                  {isOut && (
                    <span className="rounded bg-accent px-1 text-foreground font-bold">
                      OUT
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PcSemaphoreGauges({
  empty,
  full,
  mutex,
  emptyQueue,
  fullQueue,
  mutexQueue,
}: {
  empty: number;
  full: number;
  mutex: number;
  emptyQueue: string[];
  fullQueue: string[];
  mutexQueue: string[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 font-mono text-xs">
      <div className="rounded border border-chalk-foreground/25 bg-black/30 p-3 text-chalk-foreground">
        <div className="flex items-center justify-between">
          <span className="font-bold text-highlight">Semaphore: empty</span>
          <span className="font-hand text-3xl font-bold">{empty}</span>
        </div>
        <div className="mt-2 text-[11px] text-chalk-foreground/70">
          Queue: {emptyQueue.length > 0 ? emptyQueue.join(" → ") : "empty"}
        </div>
      </div>

      <div className="rounded border border-chalk-foreground/25 bg-black/30 p-3 text-chalk-foreground">
        <div className="flex items-center justify-between">
          <span className="font-bold text-accent">Semaphore: full</span>
          <span className="font-hand text-3xl font-bold">{full}</span>
        </div>
        <div className="mt-2 text-[11px] text-chalk-foreground/70">
          Queue: {fullQueue.length > 0 ? fullQueue.join(" → ") : "empty"}
        </div>
      </div>

      <div className="rounded border border-chalk-foreground/25 bg-black/30 p-3 text-chalk-foreground">
        <div className="flex items-center justify-between">
          <span className="font-bold text-chalk-foreground">Binary: mutex</span>
          <span className="font-hand text-3xl font-bold">{mutex}</span>
        </div>
        <div className="mt-2 text-[11px] text-chalk-foreground/70">
          Queue: {mutexQueue.length > 0 ? mutexQueue.join(" → ") : "empty"}
        </div>
      </div>
    </div>
  );
}

export function PcThreadCard({
  thread,
  isManual,
  onRunStep,
}: {
  thread: PCThreadState;
  isManual?: boolean;
  onRunStep?: (threadId: string) => void;
}) {
  const code = thread.role === "producer" ? PRODUCER_CODE : CONSUMER_CODE;
  const isRunnable = thread.status === "ready";

  return (
    <div
      className={`rounded-md border p-3.5 space-y-2 transition-all ${
        thread.status === "finished"
          ? "border-foreground/15 bg-background/30 opacity-60"
          : thread.status === "blocked"
            ? "border-destructive/40 bg-destructive/5"
            : "border-primary/40 bg-background/80"
      }`}
    >
      <div className="flex items-center justify-between border-b border-foreground/10 pb-1.5 font-mono text-xs">
        <span className="font-bold font-hand text-xl text-primary">
          {thread.label} ({thread.id})
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            thread.status === "finished"
              ? "bg-muted text-muted-foreground"
              : thread.status === "blocked"
                ? "bg-destructive/20 text-destructive"
                : "bg-success/20 text-success"
          }`}
        >
          {thread.status === "blocked" ? `Blocked (${thread.blockedOn})` : thread.status}
        </span>
      </div>

      {/* Mini-instruction list */}
      <div className="space-y-0.5 font-mono text-[11px]">
        {code.map((line) => {
          const isCurrent = line.id === thread.currentInstruction && thread.status !== "finished";
          return (
            <div
              key={line.id}
              className={`flex items-center gap-1.5 px-1 py-0.5 rounded ${
                isCurrent
                  ? "bg-highlight/40 font-bold text-foreground ring-1 ring-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span className="w-5 text-[10px] text-muted-foreground/60">{line.id}</span>
              <span>{line.text}</span>
            </div>
          );
        })}
      </div>

      {/* Manual mode button */}
      {isManual && (
        <div className="pt-2">
          <button
            type="button"
            disabled={!isRunnable}
            onClick={() => onRunStep?.(thread.id)}
            className="press paper-card w-full py-1.5 text-xs font-bold text-foreground bg-highlight disabled:opacity-40"
          >
            Run step ({thread.id})
          </button>
        </div>
      )}
    </div>
  );
}

export function PcCalculationsDialog({
  open,
  onOpenChange,
  itemsProduced,
  itemsConsumed,
  totalSteps,
  maxOccupancy,
  averageOccupancy,
  violations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsProduced: number;
  itemsConsumed: number;
  totalSteps: number;
  maxOccupancy: number;
  averageOccupancy: number;
  violations: PCViolation[];
}) {
  const throughput = totalSteps > 0 ? itemsConsumed / totalSteps : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-hand text-3xl font-bold">
            Producer-Consumer Metrics &amp; Formulas
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Bounded Buffer Synchronization Analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2 font-mono text-sm">
          {/* Occupancy and Throughput */}
          <div className="paper-card p-4 space-y-2 bg-background/60">
            <h4 className="font-hand text-xl font-bold text-primary">1. Occupancy &amp; Throughput</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• <b>Items Produced:</b> {itemsProduced}</p>
              <p>• <b>Items Consumed:</b> {itemsConsumed}</p>
              <p>• <b>Peak Buffer Occupancy:</b> {maxOccupancy} slots</p>
              <p>• <b>Average Buffer Occupancy:</b> {averageOccupancy.toFixed(2)} slots</p>
              <p className="pt-2">• <b>Throughput</b> = items consumed / total steps</p>
              <p className="pl-4 font-bold text-foreground">
                = {itemsConsumed} / {totalSteps} = {throughput.toFixed(4)} items/step
              </p>
            </div>
          </div>

          {/* Violations */}
          <div className="paper-card p-4 space-y-2 bg-background/60">
            <h4 className="font-hand text-xl font-bold text-primary">2. Safety Violation Log</h4>
            {violations.length > 0 ? (
              <ul className="list-disc pl-4 text-xs space-y-1 text-destructive">
                {violations.map((v, i) => (
                  <li key={i}>{v.message}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-success font-bold">
                ✓ Zero violations detected: mutual exclusion and buffer boundary invariants maintained!
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
