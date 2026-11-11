import type { PaletteColor } from "@/lib/process-palette";
import { ALGORITHM_META, type SchedulingResult } from "@/lib/scheduling";

interface Props {
  result: SchedulingResult;
  colors: Record<string, PaletteColor>;
  currentTime: number;
  started: boolean;
  contextSwitchTime: number;
  quantum: number;
  aging: boolean;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function SchedulingDetails({
  result,
  colors,
  currentTime,
  started,
  contextSwitchTime,
  quantum,
  aging,
}: Props) {
  const effectiveTime = started ? currentTime : 0;
  const meta = ALGORITHM_META[result.algorithm];
  const n = result.metrics.length;

  const completedMetrics = result.metrics.filter(
    (m) => started && effectiveTime >= m.completionTime,
  );
  const allCompleted = started && completedMetrics.length === n && n > 0;

  // Compute live busy time & elapsed time at effectiveTime
  const liveElapsed = started ? Math.min(effectiveTime, result.totalTime) : 0;
  const liveBusy = started
    ? result.gantt.reduce((acc, seg) => {
        if (seg.type !== "run") return acc;
        const overlap = Math.max(0, Math.min(effectiveTime, seg.endTime) - seg.startTime);
        return acc + overlap;
      }, 0)
    : 0;

  const liveDecisions = started ? result.decisions.filter((d) => d.time <= effectiveTime) : [];

  return (
    <div className="min-w-0 space-y-5 text-sm">
      <section>
        <h3 className="font-hand text-2xl font-bold">1. Algorithm & Parameters</h3>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {meta.label} · {n} processes · context switch = {contextSwitchTime}
          {result.algorithm === "round-robin" ? ` · quantum = ${quantum}` : ""}
          {result.algorithm === "priority-np" || result.algorithm === "priority-p"
            ? ` · aging = ${aging ? "on" : "off"} (lower number = higher priority)`
            : ""}
        </p>
        {!started && (
          <p className="mt-2 rounded border-2 border-foreground/30 bg-muted/50 px-3 py-2 font-mono text-xs">
            Simulation has not started yet — press Play or Step to see values fill in live as each
            process runs and completes.
          </p>
        )}
      </section>

      <section>
        <h3 className="font-hand text-2xl font-bold">2. Per-process formulas</h3>
        <div className="mt-2 space-y-3">
          {result.metrics.map((m) => {
            const color = colors[m.id];
            const hasStartedCpu = started && effectiveTime > m.firstCpuTime;
            const hasFinished = started && effectiveTime >= m.completionTime;
            return (
              <div
                key={m.id}
                className="rounded-md border-2 border-foreground/20 bg-background/60 p-3"
              >
                <div className="flex flex-wrap items-center gap-2 font-mono font-bold">
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-sm border border-foreground"
                    style={{ backgroundColor: color?.bg }}
                    aria-hidden="true"
                  />
                  <span>{m.displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground">({m.id})</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    · AT={m.arrivalTime}, BT={m.burstTime}
                    {result.algorithm.startsWith("priority") ? `, Priority=${m.priority}` : ""}
                  </span>
                </div>

                <div className="mt-2 space-y-1 font-mono text-xs">
                  <p className="break-words">
                    TAT = CT − AT &nbsp;→&nbsp;{" "}
                    {hasFinished ? (
                      <>
                        {m.displayName}: {m.completionTime} − {m.arrivalTime} ={" "}
                        <b>{m.turnaroundTime}</b>
                      </>
                    ) : (
                      <span className="text-muted-foreground">waiting for completion…</span>
                    )}
                  </p>
                  <p className="break-words">
                    WT = TAT − BT &nbsp;→&nbsp;{" "}
                    {hasFinished ? (
                      <>
                        {m.displayName}: {m.turnaroundTime} − {m.burstTime} = <b>{m.waitingTime}</b>
                      </>
                    ) : (
                      <span className="text-muted-foreground">waiting for completion…</span>
                    )}
                  </p>
                  <p className="break-words">
                    RT = first CPU time − AT &nbsp;→&nbsp;{" "}
                    {hasStartedCpu ? (
                      <>
                        {m.displayName}: {m.firstCpuTime} − {m.arrivalTime} ={" "}
                        <b>{m.responseTime}</b>
                      </>
                    ) : (
                      <span className="text-muted-foreground">has not started on CPU yet…</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="font-hand text-2xl font-bold">3. Averages & CPU Summary</h3>
        <div className="mt-2 space-y-1.5 rounded-md border-2 border-foreground/20 bg-background/60 p-3 font-mono text-xs">
          <p className="break-words">
            Average WT = (sum of all WT) / n &nbsp;→&nbsp;{" "}
            {allCompleted ? (
              <>
                ({result.metrics.map((m) => m.waitingTime).join(" + ")}) / {n} ={" "}
                <b>{fmt(result.avgWaitingTime)}</b>
              </>
            ) : (
              <span className="text-muted-foreground">
                {completedMetrics.length}/{n} processes finished so far
              </span>
            )}
          </p>
          <p className="break-words">
            Average TAT = (sum of all TAT) / n &nbsp;→&nbsp;{" "}
            {allCompleted ? (
              <>
                ({result.metrics.map((m) => m.turnaroundTime).join(" + ")}) / {n} ={" "}
                <b>{fmt(result.avgTurnaroundTime)}</b>
              </>
            ) : (
              <span className="text-muted-foreground">pending completion of all processes…</span>
            )}
          </p>
          <p className="break-words">
            Average RT = (sum of all RT) / n &nbsp;→&nbsp;{" "}
            {started && result.metrics.every((m) => effectiveTime > m.firstCpuTime) ? (
              <>
                ({result.metrics.map((m) => m.responseTime).join(" + ")}) / {n} ={" "}
                <b>{fmt(result.avgResponseTime)}</b>
              </>
            ) : (
              <span className="text-muted-foreground">
                waiting for all processes to get first CPU…
              </span>
            )}
          </p>
          <p className="break-words">
            CPU utilization = (busy time / total time) × 100 &nbsp;→&nbsp;{" "}
            {liveElapsed > 0 ? (
              <>
                ({fmt(liveBusy)} / {fmt(liveElapsed)}) × 100 ={" "}
                <b>{((liveBusy / liveElapsed) * 100).toFixed(1)}%</b>
              </>
            ) : (
              <span className="text-muted-foreground">0 / 0</span>
            )}
          </p>
          <p className="break-words">
            Throughput = n / total time &nbsp;→&nbsp;{" "}
            {liveElapsed > 0 ? (
              <>
                {completedMetrics.length} / {fmt(liveElapsed)} ={" "}
                <b>{(completedMetrics.length / liveElapsed).toFixed(3)} proc/unit</b>
              </>
            ) : (
              <span className="text-muted-foreground">0</span>
            )}
          </p>
        </div>
      </section>

      {contextSwitchTime > 0 && (
        <section>
          <h3 className="font-hand text-2xl font-bold">4. Context-switch overhead</h3>
          <p className="mt-1 break-words rounded-md border-2 border-foreground/20 bg-highlight/30 p-3 font-mono text-xs">
            A context switch of <b>{contextSwitchTime}</b> unit(s) is inserted only when the CPU
            switches from one process directly to a different process (never on startup, never
            to/from idle, and never when the same process continues).
            {allCompleted && (
              <>
                {" "}
                In this run, <b>{result.contextSwitchCount}</b> switch(es) added{" "}
                <b>{result.contextSwitchTotalTime}</b> overhead unit(s) into total time, CT, TAT,
                and WT.
              </>
            )}
          </p>
        </section>
      )}

      {liveDecisions.length > 0 && (
        <section className="border-t-2 pt-3">
          <h3 className="font-hand text-2xl font-bold">
            {contextSwitchTime > 0 ? "5." : "4."} Scheduler decision trace
          </h3>
          <ol className="mt-2 space-y-2">
            {liveDecisions.map((d) => (
              <li key={d.id} className="border-l-4 border-primary pl-3 font-mono text-xs">
                <span className="font-bold">t = {d.time}:</span> {d.reason}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
