import type { ReactNode } from "react";

export interface CpuNoteCard {
  id: string;
  t: string;
  b: string;
  extra?: ReactNode;
}

export const CPU_SCHEDULING_NOTES: CpuNoteCard[] = [
  {
    id: "what-is-cpu-scheduling",
    t: "1. What is CPU Scheduling?",
    b: "CPU scheduling is the operating system's decision-making process for choosing which ready process gets the CPU next. In a multiprogramming OS, multiple processes live in memory at once; whenever the active process blocks for I/O or its time slice expires, the scheduler immediately picks another job so the CPU never sits idle.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">Two key players:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <b>Scheduler:</b> selects a process from the ready queue using a scheduling algorithm.
            </li>
            <li>
              <b>Dispatcher:</b> gives actual control of the CPU to the selected process (switches
              context, jumps to program counter).
            </li>
          </ul>
        </div>
        <p className="font-hand text-xl text-accent-foreground">
          ✎ <b>Context switch:</b> saving the state of the old process and loading the state of the
          new one — pure overhead where no useful user work gets done!
        </p>
      </div>
    ),
  },
  {
    id: "key-terms-and-formulas",
    t: "2. Key Terms & Formulas",
    b: "To evaluate any scheduling algorithm, we track six core metrics for every process. Keep these formulas etched into your brain for exam day:",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="grid gap-2 sm:grid-cols-2 font-mono text-xs">
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">AT (Arrival Time)</span>
            <p className="text-muted-foreground">Instant the process enters the ready queue.</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">BT (Burst Time)</span>
            <p className="text-muted-foreground">Total CPU execution time required.</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">CT (Completion Time)</span>
            <p className="text-muted-foreground">Clock tick when execution finishes.</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">TAT = CT − AT</span>
            <p className="text-muted-foreground">Turnaround Time (total time in system).</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">WT = TAT − BT</span>
            <p className="text-muted-foreground">Waiting Time (idle waiting in ready queue).</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">RT = First CPU Time − AT</span>
            <p className="text-muted-foreground">Response Time (time until first CPU slice).</p>
          </div>
        </div>

        {/* Hand-drawn style SVG Timeline Diagram */}
        <div className="rounded border-2 border-foreground/20 bg-paper/60 p-3">
          <p className="font-hand text-lg font-bold">Process Lifecycle Timeline:</p>
          <svg
            viewBox="0 0 540 130"
            className="mt-2 w-full max-w-lg"
            aria-label="Process metric timeline"
          >
            {/* Axis */}
            <line
              x1="30"
              y1="50"
              x2="510"
              y2="50"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="3 3"
            />

            {/* Arrival */}
            <circle cx="60" cy="50" r="5" fill="var(--color-primary)" />
            <text
              x="60"
              y="36"
              textAnchor="middle"
              className="font-mono text-[11px] font-bold"
              fill="currentColor"
            >
              AT (t=1)
            </text>

            {/* Waiting slice 1 */}
            <rect x="60" y="42" width="80" height="16" fill="var(--color-muted)" opacity="0.5" />
            <text
              x="100"
              y="54"
              textAnchor="middle"
              className="font-mono text-[9px]"
              fill="currentColor"
            >
              wait
            </text>

            {/* First Run */}
            <circle cx="140" cy="50" r="5" fill="var(--color-success)" />
            <text
              x="140"
              y="36"
              textAnchor="middle"
              className="font-mono text-[11px] font-bold"
              fill="currentColor"
            >
              1st CPU (t=4)
            </text>
            <rect
              x="140"
              y="42"
              width="100"
              height="16"
              fill="var(--color-highlight)"
              stroke="currentColor"
              strokeWidth="1"
            />
            <text
              x="190"
              y="54"
              textAnchor="middle"
              className="font-mono text-[10px] font-bold"
              fill="currentColor"
            >
              run (3)
            </text>

            {/* Preempted wait */}
            <rect x="240" y="42" width="90" height="16" fill="var(--color-muted)" opacity="0.5" />
            <text
              x="285"
              y="54"
              textAnchor="middle"
              className="font-mono text-[9px]"
              fill="currentColor"
            >
              wait
            </text>

            {/* Final Run */}
            <rect
              x="330"
              y="42"
              width="120"
              height="16"
              fill="var(--color-highlight)"
              stroke="currentColor"
              strokeWidth="1"
            />
            <text
              x="390"
              y="54"
              textAnchor="middle"
              className="font-mono text-[10px] font-bold"
              fill="currentColor"
            >
              run (4)
            </text>

            {/* Completion */}
            <circle cx="450" cy="50" r="5" fill="var(--color-destructive)" />
            <text
              x="450"
              y="36"
              textAnchor="middle"
              className="font-mono text-[11px] font-bold"
              fill="currentColor"
            >
              CT (t=10)
            </text>

            {/* RT Bracket */}
            <line x1="60" y1="72" x2="140" y2="72" stroke="var(--color-primary)" strokeWidth="2" />
            <text
              x="100"
              y="86"
              textAnchor="middle"
              className="font-mono text-[10px] font-bold"
              fill="var(--color-primary)"
            >
              RT = 4 − 1 = 3
            </text>

            {/* TAT Bracket */}
            <line x1="60" y1="102" x2="450" y2="102" stroke="currentColor" strokeWidth="2" />
            <text
              x="255"
              y="118"
              textAnchor="middle"
              className="font-mono text-[11px] font-bold"
              fill="currentColor"
            >
              TAT = CT − AT = 10 − 1 = 9 (WT = 9 − 7 = 2)
            </text>
          </svg>
        </div>

        <div className="rounded border border-foreground/20 bg-muted/40 p-2.5 font-mono text-xs">
          <p>
            • <b>CPU Utilization:</b> (total busy time / total schedule time) × 100%
          </p>
          <p>
            • <b>Throughput:</b> total processes completed / total schedule time (proc/unit)
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "preemptive-vs-non-preemptive",
    t: "3. Preemptive vs Non-Preemptive",
    b: "The biggest architectural divide in scheduling algorithms is whether the OS can forcibly yank the CPU away from a running process before it voluntarily yields.",
    extra: (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-max border-collapse border border-foreground/30 font-mono text-xs">
          <thead>
            <tr className="bg-secondary">
              <th className="border border-foreground/30 p-2 text-left">Property</th>
              <th className="border border-foreground/30 p-2 text-left">Non-Preemptive</th>
              <th className="border border-foreground/30 p-2 text-left">Preemptive</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-foreground/20">
              <td className="border border-foreground/30 p-2 font-bold">CPU Yield</td>
              <td className="border border-foreground/30 p-2">
                Only when job finishes or requests I/O
              </td>
              <td className="border border-foreground/30 p-2">
                OS timer or priority arrival can interrupt
              </td>
            </tr>
            <tr className="border-t border-foreground/20">
              <td className="border border-foreground/30 p-2 font-bold">Overhead</td>
              <td className="border border-foreground/30 p-2">Minimal (few context switches)</td>
              <td className="border border-foreground/30 p-2">
                Higher (repeated save/restore of PCB)
              </td>
            </tr>
            <tr className="border-t border-foreground/20">
              <td className="border border-foreground/30 p-2 font-bold">Responsiveness</td>
              <td className="border border-foreground/30 p-2">Poor for interactive apps</td>
              <td className="border border-foreground/30 p-2">
                Excellent (guaranteed time slices)
              </td>
            </tr>
            <tr className="border-t border-foreground/20">
              <td className="border border-foreground/30 p-2 font-bold">Algorithms</td>
              <td className="border border-foreground/30 p-2">FCFS, SJF (NP), Priority (NP)</td>
              <td className="border border-foreground/30 p-2">
                Round Robin, SRTF, Priority (Preemptive)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "scheduling-criteria",
    t: "4. Scheduling Criteria",
    b: "Different operating systems prioritize different metrics. A server aims for high throughput; a phone or desktop OS aims for snappy response time.",
    extra: (
      <div className="mt-4 grid gap-3 sm:grid-cols-2 font-sans text-sm">
        <div className="rounded-md border-2 border-success/40 bg-success/10 p-3">
          <p className="font-hand text-xl font-bold text-success-foreground">What we MAXIMIZE ↑</p>
          <ul className="mt-2 list-disc pl-4 space-y-1 font-mono text-xs">
            <li>
              <b>CPU Utilization:</b> keeping the hardware as close to 100% busy as possible.
            </li>
            <li>
              <b>Throughput:</b> number of finished processes completed per second.
            </li>
          </ul>
        </div>
        <div className="rounded-md border-2 border-destructive/40 bg-destructive/10 p-3">
          <p className="font-hand text-xl font-bold text-destructive-foreground">
            What we MINIMIZE ↓
          </p>
          <ul className="mt-2 list-disc pl-4 space-y-1 font-mono text-xs">
            <li>
              <b>Turnaround Time:</b> wait less overall from start to finish.
            </li>
            <li>
              <b>Waiting Time:</b> reduce wasted time sitting in the ready queue.
            </li>
            <li>
              <b>Response Time:</b> get that first output frame to the user instantly!
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "fcfs-convoy-effect",
    t: "5. FCFS & the Convoy Effect",
    b: "First-Come, First-Served is the simplest scheduling policy: whoever arrives first runs until it is completely done. It is starvation-free, but vulnerable to high average waiting times due to the Convoy Effect.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <p className="text-muted-foreground">
          <b>The Convoy Effect:</b> A heavy CPU-bound job runs first. Multiple fast I/O-bound jobs
          arrive right behind it and are forced to idle in the queue, causing device and CPU
          underutilization.
        </p>

        {/* Mini Gantt SVG showing Convoy Effect */}
        <div className="rounded border-2 border-foreground/20 bg-paper/60 p-3">
          <p className="font-hand text-base font-bold">
            Convoy Effect Example (P1: BT=24, P2: BT=3, P3: BT=3 at t=0):
          </p>
          <svg
            viewBox="0 0 520 70"
            className="mt-2 w-full max-w-md"
            aria-label="Convoy effect Gantt chart"
          >
            <rect
              x="20"
              y="10"
              width="360"
              height="30"
              fill="var(--color-highlight)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="200"
              y="30"
              textAnchor="middle"
              className="font-mono text-xs font-bold"
              fill="currentColor"
            >
              P1 (BT=24)
            </text>

            <rect
              x="380"
              y="10"
              width="55"
              height="30"
              fill="oklch(0.84 0.11 150)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="407"
              y="30"
              textAnchor="middle"
              className="font-mono text-[10px] font-bold"
              fill="currentColor"
            >
              P2 (3)
            </text>

            <rect
              x="435"
              y="10"
              width="55"
              height="30"
              fill="oklch(0.83 0.09 250)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="462"
              y="30"
              textAnchor="middle"
              className="font-mono text-[10px] font-bold"
              fill="currentColor"
            >
              P3 (3)
            </text>

            {/* Time labels */}
            <text x="20" y="56" className="font-mono text-[10px]" fill="currentColor">
              0
            </text>
            <text
              x="380"
              y="56"
              textAnchor="middle"
              className="font-mono text-[10px]"
              fill="currentColor"
            >
              24
            </text>
            <text
              x="435"
              y="56"
              textAnchor="middle"
              className="font-mono text-[10px]"
              fill="currentColor"
            >
              27
            </text>
            <text
              x="490"
              y="56"
              textAnchor="middle"
              className="font-mono text-[10px]"
              fill="currentColor"
            >
              30
            </text>
          </svg>
          <p className="mt-1 font-mono text-xs text-destructive">
            Avg WT = (0 + 24 + 27) / 3 = <b>17.0 ms</b>! (If P2 and P3 ran first, avg WT would drop
            to <b>3.0 ms</b>!)
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "sjf-algorithm",
    t: "6. SJF (Shortest Job First - Non-Preemptive)",
    b: "SJF selects whichever ready process has the shortest total burst time. It is provably optimal for minimizing average waiting time when all processes arrive simultaneously.",
    extra: (
      <div className="mt-3 space-y-2 font-sans text-sm">
        <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
          <li>
            <b>Why optimal?</b> Running short bursts early gets jobs out of the queue immediately,
            so fewer processes accumulate waiting time.
          </li>
          <li>
            <b>The Catch:</b> In real general-purpose OSes, the exact next CPU burst duration cannot
            be known in advance! (OSes estimate it using past history: exponential smoothing τₙ₊₁ =
            α·tₙ + (1−α)·τₙ).
          </li>
          <li>
            <b>Starvation:</b> If small jobs arrive continuously, long-running processes may wait
            forever (indefinite blocking).
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "srtf-algorithm",
    t: "7. SRTF (Shortest Remaining Time First)",
    b: "SRTF is the preemptive cousin of SJF. When a new process arrives, if its burst time is strictly shorter than the currently running process's remaining time, the CPU preempts the active process and switches.",
    extra: (
      <div className="mt-3 space-y-2 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3">
          <p className="font-bold">Key Characteristics:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-xs font-mono text-muted-foreground">
            <li>
              Gives the lowest average waiting time even when processes arrive at different times.
            </li>
            <li>Generates more context switches than non-preemptive SJF.</li>
            <li>Subject to starvation of long jobs just like SJF.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "round-robin-algorithm",
    t: "8. Round Robin (RR)",
    b: "Round Robin is built for time-sharing systems. The CPU scheduler circles through a FIFO ready queue, giving each process a fixed slice of execution called the time quantum (q).",
    extra: (
      <div className="mt-3 space-y-3 font-sans text-sm">
        <div className="grid gap-2 sm:grid-cols-2 font-mono text-xs">
          <div className="rounded border border-foreground/25 bg-background p-2.5">
            <span className="font-bold text-destructive">Quantum too large (q → ∞)</span>
            <p className="text-muted-foreground">
              Behaves identically to FCFS; response time degrades.
            </p>
          </div>
          <div className="rounded border border-foreground/25 bg-background p-2.5">
            <span className="font-bold text-destructive">Quantum too small (q → 0)</span>
            <p className="text-muted-foreground">
              Processor thrashing! Too much CPU spent on context switching.
            </p>
          </div>
        </div>
        <p className="rounded border-2 border-foreground/20 bg-highlight/30 p-2.5 font-mono text-xs">
          <b>Rule of thumb:</b> Rule of thumb in production OSes is setting quantum such that ~80%
          of CPU bursts finish within a single time slice.
        </p>
        <p className="font-hand text-xl text-primary">
          ✎ <b>Our Site's Queue Tie Rule:</b> When a process's quantum expires at the exact same
          instant a brand-new process arrives, the new arrival enters the queue <i>before</i> the
          preempted process is re-queued!
        </p>
      </div>
    ),
  },
  {
    id: "priority-scheduling",
    t: "9. Priority Scheduling & Aging",
    b: "In priority scheduling, each process is stamped with a priority rank, and the CPU is allocated to the highest-priority ready process. It can be implemented as either non-preemptive or preemptive.",
    extra: (
      <div className="mt-3 space-y-3 font-sans text-sm">
        <p className="font-mono text-xs">
          <b>Convention:</b> On this site (and Unix nice values / POSIX standards),{" "}
          <b>lower numerical value = higher priority</b> (priority 0 beats priority 2).
        </p>
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3">
          <p className="font-bold text-destructive">Starvation Danger:</p>
          <p className="text-xs text-muted-foreground">
            A steady stream of high-priority processes can block a low-priority job indefinitely. In
            1973, when MIT's IBM 7094 was shut down, they discovered a low-priority job submitted in
            1967 that had never run!
          </p>
          <p className="mt-2 font-bold text-success-foreground">The Solution: Aging</p>
          <p className="text-xs text-muted-foreground">
            Gradually increase the effective priority of processes that sit waiting in the ready
            queue. (For example, our simulator boosts effective priority by 1 level every 4 waiting
            time units!).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "summary-comparison-table",
    t: "10. Side-by-Side Algorithm Summary",
    b: "Here is how all five algorithms compare side by side for quick revision:",
    extra: (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-max border-collapse border border-foreground/30 font-mono text-xs">
          <thead>
            <tr className="bg-secondary">
              <th className="border border-foreground/30 p-2 text-left">Algorithm</th>
              <th className="border border-foreground/30 p-2 text-left">Type</th>
              <th className="border border-foreground/30 p-2 text-left">Advantage</th>
              <th className="border border-foreground/30 p-2 text-left">Disadvantage</th>
              <th className="border border-foreground/30 p-2 text-center">Starvation?</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-foreground/20">
              <td className="border border-foreground/30 p-2 font-bold">FCFS</td>
              <td className="border border-foreground/30 p-2">Non-preemptive</td>
              <td className="border border-foreground/30 p-2">
                Dead simple, zero preemption overhead
              </td>
              <td className="border border-foreground/30 p-2">Convoy effect, high average WT</td>
              <td className="border border-foreground/30 p-2 text-center font-bold text-success-foreground">
                No
              </td>
            </tr>
            <tr className="border-t border-foreground/20">
              <td className="border border-foreground/30 p-2 font-bold">SJF</td>
              <td className="border border-foreground/30 p-2">Non-preemptive</td>
              <td className="border border-foreground/30 p-2">
                Optimal average WT for simultaneous arrivals
              </td>
              <td className="border border-foreground/30 p-2">Requires burst time prediction</td>
              <td className="border border-foreground/30 p-2 text-center font-bold text-destructive">
                Yes
              </td>
            </tr>
            <tr className="border-t border-foreground/20">
              <td className="border border-foreground/30 p-2 font-bold">SRTF</td>
              <td className="border border-foreground/30 p-2">Preemptive</td>
              <td className="border border-foreground/30 p-2">
                Optimal average WT with dynamic arrivals
              </td>
              <td className="border border-foreground/30 p-2">
                Frequent context switching overhead
              </td>
              <td className="border border-foreground/30 p-2 text-center font-bold text-destructive">
                Yes
              </td>
            </tr>
            <tr className="border-t border-foreground/20">
              <td className="border border-foreground/30 p-2 font-bold">Round Robin</td>
              <td className="border border-foreground/30 p-2">Preemptive</td>
              <td className="border border-foreground/30 p-2">
                Fair, responsive, ideal for interactive tasks
              </td>
              <td className="border border-foreground/30 p-2">
                High WT if quantum is poorly tuned
              </td>
              <td className="border border-foreground/30 p-2 text-center font-bold text-success-foreground">
                No
              </td>
            </tr>
            <tr className="border-t border-foreground/20">
              <td className="border border-foreground/30 p-2 font-bold">Priority</td>
              <td className="border border-foreground/30 p-2">Both (P / NP)</td>
              <td className="border border-foreground/30 p-2">
                Matches real-world urgency & deadlines
              </td>
              <td className="border border-foreground/30 p-2">
                Low-priority jobs can starve without aging
              </td>
              <td className="border border-foreground/30 p-2 text-center font-bold text-destructive">
                Yes* (No with aging)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "worked-example-fcfs",
    t: "11. Worked Example Step-by-Step",
    b: "Let's solve the textbook set: A (AT 0, BT 5), B (1, 3), C (2, 8), D (3, 6) under FCFS:",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        {/* Step-by-step narration */}
        <ol className="list-decimal pl-5 space-y-1 font-mono text-xs">
          <li>
            <b>t=0:</b> Process A arrives and immediately claims CPU. Runs 0→5. CT(A)=5.
          </li>
          <li>
            <b>t=5:</b> B, C, D have all arrived. B arrived first (t=1), so B runs 5→8. CT(B)=8.
          </li>
          <li>
            <b>t=8:</b> C arrived earlier than D (t=2 vs t=3), so C runs 8→16. CT(C)=16.
          </li>
          <li>
            <b>t=16:</b> D runs 16→22. CT(D)=22.
          </li>
        </ol>

        {/* Gantt Chart SVG */}
        <div className="rounded border-2 border-foreground/20 bg-paper/60 p-3">
          <p className="font-hand text-sm font-bold">Gantt Chart (FCFS):</p>
          <svg
            viewBox="0 0 500 60"
            className="mt-2 w-full max-w-md"
            aria-label="FCFS worked example Gantt"
          >
            <rect
              x="20"
              y="10"
              width="105"
              height="26"
              fill="var(--color-highlight)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="72"
              y="27"
              textAnchor="middle"
              className="font-mono text-xs font-bold"
              fill="currentColor"
            >
              A (5)
            </text>

            <rect
              x="125"
              y="10"
              width="65"
              height="26"
              fill="oklch(0.84 0.11 150)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="157"
              y="27"
              textAnchor="middle"
              className="font-mono text-xs font-bold"
              fill="currentColor"
            >
              B (3)
            </text>

            <rect
              x="190"
              y="10"
              width="170"
              height="26"
              fill="oklch(0.83 0.09 250)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="275"
              y="27"
              textAnchor="middle"
              className="font-mono text-xs font-bold"
              fill="currentColor"
            >
              C (8)
            </text>

            <rect
              x="360"
              y="10"
              width="125"
              height="26"
              fill="oklch(0.82 0.12 52)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="422"
              y="27"
              textAnchor="middle"
              className="font-mono text-xs font-bold"
              fill="currentColor"
            >
              D (6)
            </text>

            <text x="20" y="50" className="font-mono text-[10px]" fill="currentColor">
              0
            </text>
            <text
              x="125"
              y="50"
              textAnchor="middle"
              className="font-mono text-[10px]"
              fill="currentColor"
            >
              5
            </text>
            <text
              x="190"
              y="50"
              textAnchor="middle"
              className="font-mono text-[10px]"
              fill="currentColor"
            >
              8
            </text>
            <text
              x="360"
              y="50"
              textAnchor="middle"
              className="font-mono text-[10px]"
              fill="currentColor"
            >
              16
            </text>
            <text
              x="485"
              y="50"
              textAnchor="middle"
              className="font-mono text-[10px]"
              fill="currentColor"
            >
              22
            </text>
          </svg>
        </div>

        {/* Calculation Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-foreground/30 font-mono text-xs">
            <thead>
              <tr className="bg-secondary">
                <th className="border border-foreground/30 p-1.5 text-left">Process</th>
                <th className="border border-foreground/30 p-1.5 text-center">AT</th>
                <th className="border border-foreground/30 p-1.5 text-center">BT</th>
                <th className="border border-foreground/30 p-1.5 text-center">CT</th>
                <th className="border border-foreground/30 p-1.5 text-center">TAT = CT − AT</th>
                <th className="border border-foreground/30 p-1.5 text-center">WT = TAT − BT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-foreground/30 p-1.5 font-bold">A</td>
                <td className="border border-foreground/30 p-1.5 text-center">0</td>
                <td className="border border-foreground/30 p-1.5 text-center">5</td>
                <td className="border border-foreground/30 p-1.5 text-center">5</td>
                <td className="border border-foreground/30 p-1.5 text-center">
                  5 − 0 = <b>5</b>
                </td>
                <td className="border border-foreground/30 p-1.5 text-center">
                  5 − 5 = <b>0</b>
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/30 p-1.5 font-bold">B</td>
                <td className="border border-foreground/30 p-1.5 text-center">1</td>
                <td className="border border-foreground/30 p-1.5 text-center">3</td>
                <td className="border border-foreground/30 p-1.5 text-center">8</td>
                <td className="border border-foreground/30 p-1.5 text-center">
                  8 − 1 = <b>7</b>
                </td>
                <td className="border border-foreground/30 p-1.5 text-center">
                  7 − 3 = <b>4</b>
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/30 p-1.5 font-bold">C</td>
                <td className="border border-foreground/30 p-1.5 text-center">2</td>
                <td className="border border-foreground/30 p-1.5 text-center">8</td>
                <td className="border border-foreground/30 p-1.5 text-center">16</td>
                <td className="border border-foreground/30 p-1.5 text-center">
                  16 − 2 = <b>14</b>
                </td>
                <td className="border border-foreground/30 p-1.5 text-center">
                  14 − 8 = <b>6</b>
                </td>
              </tr>
              <tr>
                <td className="border border-foreground/30 p-1.5 font-bold">D</td>
                <td className="border border-foreground/30 p-1.5 text-center">3</td>
                <td className="border border-foreground/30 p-1.5 text-center">6</td>
                <td className="border border-foreground/30 p-1.5 text-center">22</td>
                <td className="border border-foreground/30 p-1.5 text-center">
                  22 − 3 = <b>19</b>
                </td>
                <td className="border border-foreground/30 p-1.5 text-center">
                  19 − 6 = <b>13</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded border-2 border-foreground/20 bg-highlight/30 p-2.5 font-mono text-xs">
          <p>
            • <b>Average TAT</b> = (5 + 7 + 14 + 19) / 4 = 45 / 4 = <b>11.25</b>
          </p>
          <p>
            • <b>Average WT</b> = (0 + 4 + 6 + 13) / 4 = 23 / 4 = <b>5.75</b>
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "exam-tips-mistakes",
    t: "12. Exam Tips & Common Traps",
    b: "Avoid these classic exam mistakes that trip up students every semester:",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded-md border-2 border-destructive/30 bg-destructive/10 p-3 space-y-1.5">
          <p className="font-bold text-destructive-foreground">⚠️ Common Pitfalls:</p>
          <ul className="list-disc pl-4 space-y-1 text-xs font-mono">
            <li>
              <b>Forgetting idle time:</b> If no process is ready at t=0 (e.g. earliest AT is 2),
              the CPU is IDLE from 0 to 2. Never start a job before its AT!
            </li>
            <li>
              <b>Mixing up TAT and WT:</b> Remember: TAT is from entry to exit (CT − AT). WT is time
              spent waiting (TAT − BT). WT can never be negative!
            </li>
            <li>
              <b>Wrong tie-breaks:</b> When burst times or priorities tie, standard tie-breaker is
              earlier Arrival Time, then lower process ID.
            </li>
            <li>
              <b>Round Robin re-queueing:</b> When a process's quantum expires at the same time a
              new process arrives, add the newly arrived job to the queue BEFORE re-inserting the
              preempted one!
            </li>
          </ul>
        </div>
        <p className="font-hand text-xl text-primary">
          💡 <b>Sanity check:</b> For non-preemptive algorithms without preemption, Response Time
          (RT) always equals Waiting Time (WT)!
        </p>
      </div>
    ),
  },
];
