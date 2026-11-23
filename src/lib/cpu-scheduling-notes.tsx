import type { ReactNode } from "react";

export interface CpuNoteCard {
  id: string;
  t: string;
  b: string;
  extra?: ReactNode;
}

export const CPU_SCHEDULING_NOTES: CpuNoteCard[] = [
  {
    id: "background",
    t: "1. Background: Multiprogramming & Burst Cycles",
    b: "In a multiprogramming operating system, several processes reside simultaneously in main memory. The CPU executes instructions for one process until that process must pause—usually to wait for an I/O request, disk transfer, or network packet. Rather than letting the CPU sit idle during this downtime, the operating system intervenes and switches the CPU to another ready process.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">The CPU–I/O Burst Cycle</p>
          <p className="text-muted-foreground leading-relaxed text-xs">
            Process execution alternates between phases of intensive calculation (<b>CPU bursts</b>) and phases of waiting for input/output devices (<b>I/O bursts</b>).
            A process typically begins with a CPU burst, followed by an I/O burst, another CPU burst, and finally ends on a CPU burst terminating execution.
            Empirical studies show an exponential frequency distribution: short CPU bursts are extremely common, whereas very long CPU bursts are rare.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-primary/25 bg-primary/5 p-3">
            <span className="font-bold text-primary font-mono text-xs uppercase">CPU Scheduler (Short-Term)</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Selects which process from the ready queue in memory should be assigned the CPU core next. Invoked very frequently (often every few milliseconds).
            </p>
          </div>
          <div className="rounded border border-primary/25 bg-primary/5 p-3">
            <span className="font-bold text-primary font-mono text-xs uppercase">Dispatcher &amp; Latency</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              The module that hands over physical control of the CPU to the selected process. It switches context, flips to user mode, and jumps to the proper location in the program.
              The time it takes to stop one process and start another is called <b>dispatch latency</b>—pure overhead during which no user work progresses.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "decision-points",
    t: "2. Preemptive vs Non-Preemptive Decision Points",
    b: "CPU scheduling decisions occur whenever a process transitions across fundamental process states. There are four primary circumstances where the operating system must decide whether to invoke the CPU scheduler.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded border border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-xs">1. Running → Waiting</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              The process voluntarily gives up the CPU to wait for an I/O request, child termination (<code className="font-mono">wait()</code>), or semaphore synchronization.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-xs">2. Running → Ready</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              An interrupt occurs, such as a hardware timer tick signaling that the current process's time quantum has expired, or a higher-priority device interrupt.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-xs">3. Waiting → Ready</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              An asynchronous event completes, such as disk data arriving or an I/O device signaling readiness, returning an idle process to the ready queue.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-xs">4. Process Terminates</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              The running process calls <code className="font-mono">exit()</code> or aborts due to a fatal trap, releasing all its allocated resources and the CPU.
            </p>
          </div>
        </div>

        <div className="rounded border-2 border-foreground/20 bg-paper p-3.5 space-y-2">
          <p className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">The Fundamental Distinction:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
            <li>
              <b>Non-Preemptive (Cooperative):</b> Scheduling only takes place under situations <b>1 and 4</b>. Once a process is allocated the CPU, it retains control until it either yields voluntarily (I/O wait) or terminates. Simple to build, but a rogue infinite loop can freeze the entire machine.
            </li>
            <li>
              <b>Preemptive:</b> Scheduling can also occur under situations <b>2 and 3</b>. The operating system uses hardware timer interrupts to seize the CPU from a running process and give it to another job. Prevents monopolies, but requires synchronization primitives (locks, semaphores) to protect shared data structures from race conditions during context switches.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "scheduling-criteria",
    t: "3. Scheduling Criteria",
    b: "Different scheduling algorithms favor different goals. Operating systems balance five classic criteria when evaluating or tuning a scheduling policy.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded border border-success/30 bg-success/5 p-3">
            <span className="font-bold text-success font-mono text-xs uppercase">▲ Maximize: CPU Utilization</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              The percentage of total time the CPU is actively busy running user or kernel tasks (typically 40% in lightly loaded systems to 90% in heavily loaded systems).
            </p>
          </div>
          <div className="rounded border border-success/30 bg-success/5 p-3">
            <span className="font-bold text-success font-mono text-xs uppercase">▲ Maximize: Throughput</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              The number of complete processes that finish execution per unit of time (e.g., 10 processes per minute).
            </p>
          </div>
          <div className="rounded border border-destructive/30 bg-destructive/5 p-3">
            <span className="font-bold text-destructive font-mono text-xs uppercase">▼ Minimize: Turnaround Time (TAT)</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              The entire elapsed interval from the moment a process is submitted to the moment it completely finishes.
            </p>
          </div>
          <div className="rounded border border-destructive/30 bg-destructive/5 p-3">
            <span className="font-bold text-destructive font-mono text-xs uppercase">▼ Minimize: Waiting Time (WT)</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              The total amount of time a process spends sitting in the ready queue waiting to be assigned the CPU. Scheduling algorithms directly influence WT.
            </p>
          </div>
        </div>

        <div className="rounded border border-destructive/30 bg-destructive/5 p-3">
          <span className="font-bold text-destructive font-mono text-xs uppercase">▼ Minimize: Response Time (RT)</span>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            The time elapsed from submission until the process produces its <i>first</i> output or receives its first CPU slice. Crucial for interactive desktop and mobile applications where user latency matters far more than overall batch throughput.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "terms-and-formulas",
    t: "4. Key Terms & Formulas",
    b: "Quantitative scheduling analysis relies on precise metric definitions. Memorize these relationships and how they map onto the process timeline:",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="grid gap-2 sm:grid-cols-2 font-mono text-xs">
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">AT (Arrival Time)</span>
            <p className="text-muted-foreground text-[11px]">Timestamp when the process enters the ready queue.</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">BT (Burst Time)</span>
            <p className="text-muted-foreground text-[11px]">Total CPU execution duration required to finish.</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">CT (Completion Time)</span>
            <p className="text-muted-foreground text-[11px]">Wall-clock tick when execution terminates.</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">TAT = CT − AT</span>
            <p className="text-muted-foreground text-[11px]">Turnaround Time: total time spent in the system.</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">WT = TAT − BT</span>
            <p className="text-muted-foreground text-[11px]">Waiting Time: time spent waiting in the ready queue.</p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-2.5">
            <span className="font-bold text-primary">RT = First CPU Time − AT</span>
            <p className="text-muted-foreground text-[11px]">Response Time: delay until first scheduled on CPU.</p>
          </div>
        </div>

        {/* Formulas card */}
        <div className="rounded border-2 border-primary/25 bg-primary/5 p-3 space-y-1.5 font-mono text-xs">
          <p className="font-bold text-primary uppercase">System-Level Metrics:</p>
          <p className="text-foreground">
            <b>CPU Utilization:</b> <code className="font-bold">Total Busy Time / Total Schedule Length × 100%</code>
          </p>
          <p className="text-foreground">
            <b>Throughput:</b> <code className="font-bold">Completed Processes / Total Schedule Time</code>
          </p>
        </div>

        {/* Hand-drawn style SVG Timeline Diagram */}
        <div className="rounded border-2 border-foreground/20 bg-paper p-3 text-center">
          <p className="font-mono text-xs font-bold text-foreground uppercase mb-1">Process Lifecycle Timeline</p>
          <svg
            viewBox="0 0 540 140"
            className="mx-auto w-full max-w-lg"
            role="img"
            aria-label="Process metric timeline illustrating Arrival Time AT, First CPU response RT, waiting intervals WT, and Completion Time CT leading to Turnaround Time TAT"
          >
            {/* Timeline line */}
            <line x1="40" y1="65" x2="500" y2="65" stroke="#101a28" strokeWidth="2" strokeDasharray="3 3" />

            {/* Arrival marker */}
            <circle cx="70" cy="65" r="5" fill="#1b4931" />
            <text x="70" y="45" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">AT (t=1)</text>

            {/* Ready Waiting block */}
            <rect x="70" y="55" width="80" height="20" fill="#f87171" fillOpacity="0.3" stroke="#dc2626" strokeWidth="1" />
            <text x="110" y="69" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#991b1b">Waiting</text>

            {/* First CPU execution */}
            <circle cx="150" cy="65" r="5" fill="#1b4931" />
            <text x="150" y="45" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">1st CPU (t=5)</text>

            {/* Burst 1 */}
            <rect x="150" y="55" width="100" height="20" fill="#4ade80" fillOpacity="0.4" stroke="#16a34a" strokeWidth="1" />
            <text x="200" y="69" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#14532d">CPU Burst 1</text>

            {/* Preemption wait */}
            <rect x="250" y="55" width="90" height="20" fill="#f87171" fillOpacity="0.3" stroke="#dc2626" strokeWidth="1" />
            <text x="295" y="69" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#991b1b">Waiting</text>

            {/* Burst 2 */}
            <rect x="340" y="55" width="130" height="20" fill="#4ade80" fillOpacity="0.4" stroke="#16a34a" strokeWidth="1" />
            <text x="405" y="69" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#14532d">CPU Burst 2</text>

            {/* Completion */}
            <circle cx="470" cy="65" r="5" fill="#1b4931" />
            <text x="470" y="45" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">CT (t=15)</text>

            {/* Annotations */}
            {/* RT bracket */}
            <line x1="70" y1="90" x2="150" y2="90" stroke="#1b4931" strokeWidth="1.5" />
            <text x="110" y="106" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#1b4931">RT = 5 − 1 = 4</text>

            {/* TAT bracket */}
            <line x1="70" y1="120" x2="470" y2="120" stroke="#101a28" strokeWidth="1.5" />
            <text x="270" y="136" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">Turnaround Time (TAT) = CT − AT = 15 − 1 = 14</text>
          </svg>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            WT = Total red waiting slices = (5 − 1) + (340 − 250) = 4 + 90 = 94 (or simply TAT − total BT).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "fcfs",
    t: "5. First-Come, First-Served (FCFS) & Convoy Effect",
    b: "First-Come, First-Served is the simplest CPU scheduling algorithm. Processes are managed strictly in a FIFO ready queue. Whichever process requests the CPU first receives it first. It is completely non-preemptive.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">The Convoy Effect</p>
          <p className="text-muted-foreground leading-relaxed text-xs">
            When a single heavy CPU-bound process hogs the CPU, all other short, I/O-bound processes must queue up behind it.
            While waiting for the CPU hog, I/O devices sit idle. Once the big job yields for I/O, all short jobs finish their CPU bursts quickly and queue at I/O devices, leaving the CPU idle.
            This phenomenon—short processes stuck trailing a massive process—is called the <b>convoy effect</b>, and leads to miserable average waiting times.
          </p>
        </div>

        {/* Worked Example */}
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="font-bold text-primary font-mono text-xs uppercase">
            Worked Example: Order Matters Dramatically
          </p>
          <p className="text-xs text-muted-foreground">
            Three processes arrive at time 0: <b>P1 (BT = 24), P2 (BT = 3), P3 (BT = 3)</b>.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border border-destructive/30 bg-paper p-3 text-xs space-y-1">
              <span className="font-bold text-destructive font-mono">Order: P1, P2, P3</span>
              <p className="font-mono text-[11px]">Gantt: [P1: 0..24] [P2: 24..27] [P3: 27..30]</p>
              <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                <li>P1 WT = 0 ms</li>
                <li>P2 WT = 24 ms</li>
                <li>P3 WT = 27 ms</li>
              </ul>
              <p className="font-mono font-bold text-destructive mt-1">
                Average WT = (0 + 24 + 27) / 3 = 17 ms
              </p>
            </div>

            <div className="rounded border border-success/30 bg-paper p-3 text-xs space-y-1">
              <span className="font-bold text-success font-mono">Order: P2, P3, P1</span>
              <p className="font-mono text-[11px]">Gantt: [P2: 0..3] [P3: 3..6] [P1: 6..30]</p>
              <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                <li>P2 WT = 0 ms</li>
                <li>P3 WT = 3 ms</li>
                <li>P1 WT = 6 ms</li>
              </ul>
              <p className="font-mono font-bold text-success mt-1">
                Average WT = (0 + 3 + 6) / 3 = 3 ms
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Notice that the exact same workload produces an average wait of 17 ms vs 3 ms purely based on arrival order!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "sjf-srtf",
    t: "6. Shortest Job First (SJF) & SRTF (with Burst Prediction)",
    b: "Shortest Job First associates each process with the length of its next CPU burst. When the CPU becomes available, it is assigned to the process with the smallest burst time. Ties are broken using FCFS.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">Optimality of SJF</p>
          <p className="text-muted-foreground leading-relaxed text-xs">
            SJF is <b>provably optimal</b>: it produces the minimum average waiting time for any given set of stationary processes. Moving a shorter job before a longer one decreases the waiting time of the short job by more than it increases the waiting time of the long job, driving down the overall mean.
          </p>
        </div>

        {/* Non-preemptive vs Preemptive SRTF Worked Example */}
        <div className="rounded border-2 border-primary/30 bg-paper p-4 space-y-3">
          <p className="font-bold text-primary font-mono text-xs uppercase">
            Worked Example: SJF (Non-Preemptive) vs SRTF (Preemptive)
          </p>
          <p className="text-xs text-muted-foreground">
            Consider four processes: <b>P1 (AT=0, BT=7), P2 (AT=2, BT=4), P3 (AT=4, BT=1), P4 (AT=5, BT=4)</b>.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border border-foreground/20 bg-background/70 p-3 text-xs space-y-1.5">
              <span className="font-bold text-foreground font-mono">1. SJF (Non-Preemptive)</span>
              <p className="font-mono text-[11px] text-muted-foreground">
                Gantt: [P1: 0..7] [P3: 7..8] [P2: 8..12] [P4: 12..16]
              </p>
              <ul className="list-disc pl-4 text-muted-foreground text-[11px] space-y-0.5">
                <li>At t=0, only P1 is ready. It runs to completion at t=7.</li>
                <li>At t=7, P2 (BT 4), P3 (BT 1), P4 (BT 4) are ready. P3 is shortest (1), runs to t=8.</li>
                <li>At t=8, P2 and P4 tie at BT 4. P2 arrived first (t=2 vs t=5), runs to t=12.</li>
                <li>P4 runs 12..16.</li>
              </ul>
              <div className="pt-1 font-mono text-[11px]">
                <p>WT: P1 = 0, P3 = 7−4 = 3, P2 = 8−2 = 6, P4 = 12−5 = 7</p>
                <p className="font-bold text-primary">Average WT = (0 + 3 + 6 + 7) / 4 = 16 / 4 = 4 ms</p>
              </div>
            </div>

            <div className="rounded border border-foreground/20 bg-background/70 p-3 text-xs space-y-1.5">
              <span className="font-bold text-foreground font-mono">2. SRTF (Preemptive SJF)</span>
              <p className="font-mono text-[11px] text-muted-foreground">
                Gantt: [P1: 0..2] [P2: 2..4] [P3: 4..5] [P2: 5..7] [P4: 7..11] [P1: 11..16]
              </p>
              <ul className="list-disc pl-4 text-muted-foreground text-[11px] space-y-0.5">
                <li>t=0..2: P1 runs (remaining 5). At t=2, P2 arrives (BT 4 &lt; 5). P1 is preempted!</li>
                <li>t=2..4: P2 runs (remaining 2). At t=4, P3 arrives (BT 1 &lt; 2). P2 is preempted!</li>
                <li>t=4..5: P3 runs to finish (CT=5, WT=0).</li>
                <li>t=5..7: P2 resumes (remaining 2 &lt; P4's 4 &lt; P1's 5) and finishes at t=7.</li>
                <li>t=7..11: P4 runs (BT 4 &lt; P1's 5) and finishes at t=11.</li>
                <li>t=11..16: P1 finishes its remaining 5 units.</li>
              </ul>
              <div className="pt-1 font-mono text-[11px]">
                <p>WT: P1 = (2−2) + (11−2) = 9, P2 = (2−2) + (5−4) = 1, P3 = 0, P4 = 7−5 = 2</p>
                <p className="font-bold text-primary">Average WT = (9 + 1 + 0 + 2) / 4 = 12 / 4 = 3 ms</p>
              </div>
            </div>
          </div>
        </div>

        {/* Exponential Smoothing Burst Prediction */}
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground font-mono text-xs uppercase">
            Predicting the Next CPU Burst: Exponential Smoothing
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In general-purpose operating systems, future burst times cannot be known in advance. We estimate them using an exponential moving average of past bursts:
          </p>
          <div className="rounded border border-primary/20 bg-primary/5 p-2.5 font-mono text-xs text-center text-primary font-bold">
            τ_(n+1) = α · t_n + (1 − α) · τ_n
          </div>
          <p className="text-xs text-muted-foreground">
            Where <code className="font-mono text-foreground">t_n</code> is the most recent measured burst, <code className="font-mono text-foreground">τ_n</code> is the past predicted burst, and <code className="font-mono text-foreground">0 ≤ α ≤ 1</code> controls the weight of recent history. If <code className="font-mono">α = 0</code>, history is ignored; if <code className="font-mono">α = 1</code>, only the single most recent burst counts. Typically <code className="font-mono">α = 0.5</code>.
          </p>

          <div className="rounded border border-foreground/15 bg-paper p-3 text-xs space-y-1 font-mono">
            <p className="font-bold text-foreground">Worked Prediction Example (α = 0.5, initial τ_0 = 10):</p>
            <p>1. Actual burst t_0 = 6 → τ_1 = 0.5(6) + 0.5(10) = 3 + 5 = <b>8</b></p>
            <p>2. Actual burst t_1 = 4 → τ_2 = 0.5(4) + 0.5(8) = 2 + 4 = <b>6</b></p>
            <p>3. Actual burst t_2 = 6 → τ_3 = 0.5(6) + 0.5(6) = 3 + 3 = <b>6</b></p>
            <p>4. Actual burst t_3 = 4 → τ_4 = 0.5(4) + 0.5(6) = 2 + 3 = <b>5</b></p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "priority",
    t: "7. Priority Scheduling & Aging",
    b: "In priority scheduling, an integer priority is associated with each process, and the CPU is allocated to the highest-priority process. Most textbooks and production OS kernels follow the convention that a smaller integer represents a higher priority.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-xs uppercase">Internal vs External Priority</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              <b>Internal priorities</b> use measurable metrics like memory limits, file handles, or burst ratios. <b>External priorities</b> are set by external policies, user payment tiers, or department authority.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-xs uppercase">Preemptive vs Non-Preemptive</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              A preemptive priority scheduler will preempt the currently running process if a new process arrives with a priority strictly higher than the current job. A non-preemptive scheduler simply places it at the head of the ready queue.
            </p>
          </div>
        </div>

        <div className="rounded border-2 border-destructive/30 bg-destructive/5 p-3.5 space-y-2">
          <p className="font-bold text-destructive font-mono text-xs uppercase">The Threat: Starvation (Indefinite Blocking)</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A major risk of priority scheduling is <b>starvation</b>: a steady stream of higher-priority processes can leave a low-priority process sitting in the ready queue indefinitely. In a legendary real-world case at MIT, an IBM 7094 was shut down in 1973 and engineers discovered a low-priority process submitted in 1967 that had never run!
          </p>
          <div className="rounded border border-success/30 bg-success/5 p-2.5">
            <span className="font-bold text-success font-mono text-xs uppercase">The Solution: Aging</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              <b>Aging</b> gradually increases the priority of processes that wait in the system for a long time. For example, if priority integers range from 127 (lowest) to 0 (highest), the OS could decrement a process's priority number by 1 every 15 minutes of waiting. Eventually, even the humblest job reaches top priority and is guaranteed CPU execution.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "round-robin",
    t: "8. Round Robin (RR) Scheduling",
    b: "Round Robin is specifically designed for time-sharing systems. A small unit of CPU time—called a time quantum or time slice (typically 10 to 100 milliseconds)—is allocated to each ready process in circular order.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">How Round Robin Operates</p>
          <p className="text-muted-foreground leading-relaxed text-xs">
            The ready queue is treated as a circular FIFO queue. The CPU scheduler picks the process at the head, sets a hardware timer for 1 quantum <code className="font-mono">q</code>, and dispatches the process. If its remaining CPU burst is <code className="font-mono">≤ q</code>, it finishes and leaves the system. If its burst exceeds <code className="font-mono">q</code>, the timer interrupts the CPU, a context switch executes, and the preempted process is appended to the tail of the ready queue.
          </p>
          <p className="text-xs text-primary font-mono font-bold">
            Guaranteed Response: If there are n processes in the ready queue and the quantum is q, no process waits longer than (n − 1) · q time units for its next turn.
          </p>
        </div>

        {/* Quantum Size Tradeoff */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-foreground/20 bg-paper p-3 text-xs">
            <span className="font-bold text-foreground font-mono">Quantum Too Large (q → ∞)</span>
            <p className="mt-1 text-muted-foreground">
              If the quantum exceeds the longest burst time in the system, no process ever gets preempted. Round Robin degenerates completely into simple FCFS!
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-paper p-3 text-xs">
            <span className="font-bold text-foreground font-mono">Quantum Too Small (q → 0)</span>
            <p className="mt-1 text-muted-foreground">
              If quantum is comparable to the context-switch overhead (e.g. q = 1 ms while context switch = 0.5 ms), the CPU spends 33% of its time switching contexts rather than executing code. Rule of thumb: 80% of CPU bursts should be shorter than q.
            </p>
          </div>
        </div>

        {/* Worked Example */}
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="font-bold text-primary font-mono text-xs uppercase">
            Worked Example: Round Robin with Quantum q = 20
          </p>
          <p className="text-xs text-muted-foreground">
            Four processes arrive at time 0 in order: <b>P1 (BT 53), P2 (BT 17), P3 (BT 68), P4 (BT 24)</b>.
          </p>
          <div className="rounded border border-foreground/20 bg-paper p-3 font-mono text-xs space-y-1">
            <p className="font-bold text-foreground">Round-by-Round Execution Gantt:</p>
            <p className="text-[11px] text-muted-foreground">
              [P1: 0..20] → [P2: 20..37 (done!)] → [P3: 37..57] → [P4: 57..77] →
              [P1: 77..97] → [P3: 97..117] → [P4: 117..121 (done!)] →
              [P1: 121..134 (done!)] → [P3: 134..162 (done!)]
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 font-mono text-xs">
            <div className="rounded border border-foreground/15 bg-background/80 p-2">
              <p><b>P1:</b> CT=134, TAT=134, WT=81, RT=0</p>
              <p><b>P2:</b> CT=37, TAT=37, WT=20, RT=20</p>
            </div>
            <div className="rounded border border-foreground/15 bg-background/80 p-2">
              <p><b>P3:</b> CT=162, TAT=162, WT=94, RT=37</p>
              <p><b>P4:</b> CT=121, TAT=121, WT=97, RT=57</p>
            </div>
          </div>

          <div className="rounded border border-primary/30 bg-primary/10 p-2.5 font-mono text-xs space-y-1">
            <p className="text-foreground"><b>Average Waiting Time:</b> (81 + 20 + 94 + 97) / 4 = 292 / 4 = <b>73 ms</b></p>
            <p className="text-foreground"><b>Average Turnaround Time:</b> (134 + 37 + 162 + 121) / 4 = 454 / 4 = <b>113.5 ms</b></p>
            <p className="text-foreground"><b>Average Response Time:</b> (0 + 20 + 37 + 57) / 4 = 114 / 4 = <b>28.5 ms</b></p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "advanced-scheduling",
    t: "9. Advanced Topics: Multilevel Queues, Multiprocessor & Real-Time",
    b: "Modern operating systems manage diverse workloads with complex hierarchies, multiprocessor cores, and strict timing guarantees.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        {/* MLQ & MLFQ */}
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">Multilevel Queue &amp; MLFQ</p>
          <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
            <p>
              <b>Multilevel Queue (MLQ):</b> Partitions the ready queue into separate queues based on process type (e.g., interactive foreground using Round Robin vs batch background using FCFS). Queues have fixed absolute priority (foreground runs before background) or time-slice sharing (80% CPU to foreground, 20% to background). Processes permanently stay in their assigned queue.
            </p>
            <p>
              <b>Multilevel Feedback Queue (MLFQ):</b> Allows processes to move between queues based on their past CPU burst behavior. Defined by five key parameters:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>1. Number of queues.</li>
              <li>2. Scheduling algorithm for each queue (e.g., Q0 has q = 8 ms, Q1 has q = 16 ms, Q2 uses FCFS).</li>
              <li>3. Method used to upgrade a process to a higher-priority queue (aging).</li>
              <li>4. Method used to demote a process to a lower-priority queue (CPU hog demoted after using its slice).</li>
              <li>5. Process entry selection (new jobs enter highest-priority queue Q0).</li>
            </ul>
          </div>
        </div>

        {/* Multiprocessor Scheduling */}
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">Multiprocessor &amp; Multi-Core Scheduling</p>
          <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <p>
              <b>Asymmetric vs Symmetric (SMP):</b> In asymmetric multiprocessing, one master processor handles all scheduling and I/O; in Symmetric Multiprocessing (SMP), each core runs its own scheduler and accesses a shared or per-core ready queue.
            </p>
            <p>
              <b>Processor Affinity:</b> A process has an affinity for the CPU core on which it is currently executing because its data fills that core's cache memory. Migrating it incurs high cache-invalidation penalties. <b>Soft affinity</b> tries to keep it on the same core; <b>hard affinity</b> guarantees it (e.g., Linux <code className="font-mono">sched_setaffinity</code>).
            </p>
            <p>
              <b>Load Balancing:</b> Balances work across cores using <b>push migration</b> (a periodic monitor task pushes tasks from overloaded to idle cores) and <b>pull migration</b> (an idle core pulls waiting tasks from a busy core's queue).
            </p>
            <p>
              <b>NUMA (Non-Uniform Memory Access):</b> When memory is partitioned across CPUs, the scheduler must place threads on the CPU that has direct, local hardware access to their allocated memory.
            </p>
          </div>
        </div>

        {/* Real-Time & Threads */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-foreground/20 bg-paper p-3 text-xs space-y-1">
            <span className="font-bold text-foreground font-mono">Real-Time Scheduling</span>
            <p className="text-muted-foreground">
              <b>Hard real-time:</b> Tasks must complete within guaranteed deadlines; missing a deadline is catastrophic system failure.
            </p>
            <p className="text-muted-foreground">
              <b>Soft real-time:</b> Critical tasks receive priority over non-critical tasks, but deadlines are best-effort (e.g., video streaming).
            </p>
            <p className="text-muted-foreground">
              <b>Event Latency:</b> The time from event occurrence to service. Consists of <i>interrupt latency</i> (interrupt pin to ISR execution) and <i>dispatch latency</i> (preemption and context switch to real-time task).
            </p>
          </div>

          <div className="rounded border border-foreground/20 bg-paper p-3 text-xs space-y-1">
            <span className="font-bold text-foreground font-mono">Thread Scheduling &amp; Pthreads</span>
            <p className="text-muted-foreground">
              <b>PCS (Process-Contention Scope):</b> Threads in the same process compete for available LWPs (user-level scheduling, many-to-one or many-to-many models).
            </p>
            <p className="text-muted-foreground">
              <b>SCS (System-Contention Scope):</b> Kernel schedules each thread directly onto available CPU cores (one-to-one model like Linux and Windows).
            </p>
            <p className="text-muted-foreground font-mono">
              POSIX policies: <b>SCHED_FIFO</b> (preemptive priority FIFO), <b>SCHED_RR</b> (Round Robin within priority level), <b>SCHED_OTHER</b> (default time-sharing).
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "rules-used-on-this-site",
    t: "10. Rules Used on this Site",
    b: "When running the CPU Scheduling Simulator or solving Practice problems on this site, standard deterministic conventions apply across all algorithms:",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-2.5">
          <p className="font-bold text-primary font-mono text-xs uppercase tracking-wider">
            ★ Deterministic Simulation Conventions:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground">
            <li>
              <b>Priority numbering:</b> Lower numerical integer indicates higher priority (e.g., priority 1 runs before priority 2).
            </li>
            <li>
              <b>Tie-breaking:</b> When multiple processes are ready with identical criteria (same burst in SJF, or same priority), ties are broken by <b>earlier arrival time (AT)</b> first. If arrival times are also identical, ties are broken deterministically by <b>lower process ID</b> (e.g., P1 before P2).
            </li>
            <li>
              <b>Round Robin Queue Arrival &amp; Expiration:</b> When a process's quantum expires at exact time <code className="font-mono text-foreground font-bold">t</code> simultaneously with new processes arriving at time <code className="font-mono text-foreground font-bold">t</code>, all newly arriving processes enter the tail of the ready queue <b>before</b> the preempted process is re-queued.
            </li>
            <li>
              <b>Context Switch Time:</b> Context switch overhead defaults to 0 ms in basic simulation and practice modes, but can be configured to non-zero in the simulator to visualize dispatch latency.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "summary-and-exam-tips",
    t: "11. Summary Table & Exam Tips",
    b: "Review this quick comparison table and mental checkpoints before your operating systems exam:",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="overflow-x-auto rounded border border-foreground/20">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-foreground/5 font-mono text-[11px] text-foreground uppercase border-b border-foreground/15">
              <tr>
                <th className="p-2">Algorithm</th>
                <th className="p-2">Preemptive?</th>
                <th className="p-2">Starvation?</th>
                <th className="p-2">Optimal For?</th>
                <th className="p-2">Overhead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10 text-xs">
              <tr>
                <td className="p-2 font-bold text-primary">FCFS</td>
                <td className="p-2">No</td>
                <td className="p-2">No</td>
                <td className="p-2">Simplicity; long batch jobs</td>
                <td className="p-2">Minimal</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">SJF</td>
                <td className="p-2">No</td>
                <td className="p-2 text-destructive font-bold">Yes (long jobs)</td>
                <td className="p-2">Minimizing average WT (stationary)</td>
                <td className="p-2">Burst prediction</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">SRTF</td>
                <td className="p-2">Yes</td>
                <td className="p-2 text-destructive font-bold">Yes (long jobs)</td>
                <td className="p-2">Minimizing average WT (dynamic)</td>
                <td className="p-2">Frequent context switching</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">Round Robin</td>
                <td className="p-2">Yes</td>
                <td className="p-2">No</td>
                <td className="p-2">Interactive response time</td>
                <td className="p-2">High if quantum is small</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">Priority</td>
                <td className="p-2">Both variants</td>
                <td className="p-2 text-destructive font-bold">Yes (solved by Aging)</td>
                <td className="p-2">Mission-critical jobs</td>
                <td className="p-2">Priority queue balancing</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">MLFQ</td>
                <td className="p-2">Yes</td>
                <td className="p-2">No (with Aging)</td>
                <td className="p-2">General-purpose time-sharing</td>
                <td className="p-2">Complex queue management</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
          <p className="font-bold text-primary font-mono text-xs uppercase tracking-wider">
            ★ Exam Traps &amp; Mental Checkpoints:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
            <li>
              <b>WT vs TAT:</b> <code className="font-mono text-foreground font-bold">TAT = CT − AT</code> and <code className="font-mono text-foreground font-bold">WT = TAT − BT</code>. If you compute WT as CT − BT, you will lose points whenever AT ≠ 0!
            </li>
            <li>
              <b>First CPU slice:</b> Response time is measured strictly to the <i>first</i> instant a process receives CPU time, NOT when it completes.
            </li>
            <li>
              <b>Preemption checks in SRTF:</b> Always check remaining burst of running job against the total burst of a newly arrived job. If equal, no preemption occurs.
            </li>
            <li>
              <b>Round Robin last slice:</b> If a process only needs 3 ms and quantum is 20 ms, it runs for exactly 3 ms and yields immediately—it does not waste 17 ms of idle time!
            </li>
          </ul>
        </div>
      </div>
    ),
  },
];
