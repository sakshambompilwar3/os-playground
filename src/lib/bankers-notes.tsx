import type { ReactNode } from "react";

export interface BankerNoteCard {
  id: string;
  t: string;
  b: string;
  extra?: ReactNode;
}

export const BANKERS_NOTES: BankerNoteCard[] = [
  {
    id: "what-is-deadlock",
    t: "1. What is a Deadlock?",
    b: "A deadlock is a situation where a set of processes are permanently blocked because each process holds resources that another process needs, and every process is waiting for someone else to release a resource. Because every process in the set is waiting, none of them can ever make progress, execute, or release what they hold.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-4">
          <p className="font-bold text-foreground">The Classic Analogy: Gridlocked Traffic</p>
          <p className="mt-1 text-muted-foreground leading-relaxed">
            Picture a four-way street intersection where four cars enter simultaneously from north, south, east, and west.
            Each car is occupying a section of the road and waiting for the car in front to move. None of the cars can back up,
            none can move forward, and nobody can clear the junction without an external tow truck. In operating systems,
            threads and processes that get tangled in cyclic resource dependencies suffer the exact same fate.
          </p>
        </div>
        <div className="rounded border-2 border-primary/20 bg-primary/5 p-3 font-mono text-xs text-primary">
          <b>Key Takeaway:</b> Deadlock = Mutual waiting with zero progress. Unlike temporary latency or high CPU load, a deadlocked state will never resolve on its own.
        </div>
      </div>
    ),
  },
  {
    id: "four-necessary-conditions",
    t: "2. The Four Necessary Conditions",
    b: "For a deadlock to arise, four conditions must hold simultaneously in the system. If you can break or prevent even one of these four conditions, a deadlock becomes mathematically impossible.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="grid gap-2.5">
          <div className="rounded border border-foreground/20 bg-background/70 p-3">
            <span className="font-bold text-primary font-mono">1. Mutual Exclusion</span>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              At least one resource must be held in a non-sharable mode. Only one process at a time can use the resource; any other requesting process must wait until it is released.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/70 p-3">
            <span className="font-bold text-primary font-mono">2. Hold and Wait</span>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              A process must currently hold at least one resource while simultaneously waiting to acquire additional resources that are currently being held by other processes.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/70 p-3">
            <span className="font-bold text-primary font-mono">3. No Preemption</span>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              Resources cannot be forcibly confiscated from a process. A resource can only be released voluntarily by the process holding it after that process has completed its task.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/70 p-3">
            <span className="font-bold text-primary font-mono">4. Circular Wait</span>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              A closed chain of processes exists: P0 waits for a resource held by P1, P1 waits for P2, and Pn-1 waits for P0. Each link in the chain is waiting for the next link.
            </p>
          </div>
        </div>
        <p className="font-hand text-xl text-accent-foreground">
          ✎ <b>Crucial Note:</b> All four conditions must hold at the same time. If any single condition is absent, deadlock cannot occur!
        </p>
      </div>
    ),
  },
  {
    id: "resource-allocation-graph",
    t: "3. Resource-Allocation Graph (RAG)",
    b: "A Resource-Allocation Graph is a directed graph that visually models resource ownership and requests across all processes and resource types in the system.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">Graph Conventions:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
            <li><b>Process nodes:</b> Drawn as circles (e.g., P1, P2).</li>
            <li><b>Resource nodes:</b> Drawn as rectangles (e.g., R1, R2). Each dot inside the rectangle represents one physical instance of that resource.</li>
            <li><b>Request edge:</b> A directed edge from process to resource (<code className="font-mono text-foreground font-bold">Pi → Rj</code>). The process is waiting for an instance.</li>
            <li><b>Assignment edge:</b> A directed edge from an instance dot inside the resource to the process (<code className="font-mono text-foreground font-bold">Rj → Pi</code>). The process holds that instance.</li>
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Diagram 1: Deadlock */}
          <div className="rounded border-2 border-destructive/30 bg-paper p-3 text-center">
            <p className="font-mono text-xs font-bold text-destructive uppercase">Graph with Deadlock (Cycle + 1 Instance Each)</p>
            <svg
              viewBox="0 0 280 180"
              className="mx-auto mt-2 w-full max-w-[260px]"
              role="img"
              aria-label="Resource allocation graph showing a deadlock cycle between P1, R1, P2, and R2 with single instances"
            >
              <rect x="20" y="20" width="50" height="50" rx="4" fill="none" stroke="#101a28" strokeWidth="2" />
              <circle cx="45" cy="45" r="4" fill="#101a28" />
              <text x="45" y="15" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">R1 (1)</text>

              <circle cx="230" cy="45" r="22" fill="#faf8f2" stroke="#101a28" strokeWidth="2" />
              <text x="230" y="50" textAnchor="middle" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="#101a28">P1</text>

              <rect x="205" y="110" width="50" height="50" rx="4" fill="none" stroke="#101a28" strokeWidth="2" />
              <circle cx="230" cy="135" r="4" fill="#101a28" />
              <text x="230" y="175" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">R2 (1)</text>

              <circle cx="45" cy="135" r="22" fill="#faf8f2" stroke="#101a28" strokeWidth="2" />
              <text x="45" y="140" textAnchor="middle" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="#101a28">P2</text>

              {/* Edges */}
              {/* R1 -> P1 */}
              <line x1="45" y1="45" x2="208" y2="45" stroke="#101a28" strokeWidth="2" markerEnd="url(#arrow)" />
              {/* P1 -> R2 */}
              <line x1="230" y1="67" x2="230" y2="110" stroke="#a64024" strokeWidth="2" strokeDasharray="3 3" />
              {/* R2 -> P2 */}
              <line x1="205" y1="135" x2="67" y2="135" stroke="#101a28" strokeWidth="2" />
              {/* P2 -> R1 */}
              <line x1="45" y1="113" x2="45" y2="70" stroke="#a64024" strokeWidth="2" strokeDasharray="3 3" />
            </svg>
            <p className="mt-1 text-[11px] text-muted-foreground font-mono">
              Cycle: P1 → R2 → P2 → R1 → P1. With 1 instance each, this is a guaranteed deadlock!
            </p>
          </div>

          {/* Diagram 2: Cycle with multi-instance (No Deadlock) */}
          <div className="rounded border-2 border-success/30 bg-paper p-3 text-center">
            <p className="font-mono text-xs font-bold text-success uppercase">Cycle with Multiple Instances (NO Deadlock)</p>
            <svg
              viewBox="0 0 280 180"
              className="mx-auto mt-2 w-full max-w-[260px]"
              role="img"
              aria-label="Resource allocation graph showing a cycle with multiple instances where process P3 can finish and break the cycle"
            >
              {/* R1 with 2 dots */}
              <rect x="20" y="20" width="60" height="50" rx="4" fill="none" stroke="#101a28" strokeWidth="2" />
              <circle cx="38" cy="45" r="4" fill="#101a28" />
              <circle cx="62" cy="45" r="4" fill="#101a28" />
              <text x="50" y="15" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">R1 (2)</text>

              <circle cx="230" cy="45" r="22" fill="#faf8f2" stroke="#101a28" strokeWidth="2" />
              <text x="230" y="50" textAnchor="middle" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="#101a28">P1</text>

              {/* R2 with 2 dots */}
              <rect x="200" y="110" width="60" height="50" rx="4" fill="none" stroke="#101a28" strokeWidth="2" />
              <circle cx="218" cy="135" r="4" fill="#101a28" />
              <circle cx="242" cy="135" r="4" fill="#101a28" />
              <text x="230" y="175" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">R2 (2)</text>

              <circle cx="45" cy="135" r="22" fill="#faf8f2" stroke="#101a28" strokeWidth="2" />
              <text x="45" y="140" textAnchor="middle" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="#101a28">P2</text>

              <circle cx="140" cy="135" r="18" fill="#e2e8f0" stroke="#101a28" strokeWidth="1.5" />
              <text x="140" y="140" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">P3</text>

              {/* Edges */}
              <line x1="62" y1="45" x2="208" y2="45" stroke="#101a28" strokeWidth="2" />
              <line x1="230" y1="67" x2="230" y2="110" stroke="#a64024" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="218" y1="135" x2="67" y2="135" stroke="#101a28" strokeWidth="2" />
              <line x1="45" y1="113" x2="45" y2="70" stroke="#a64024" strokeWidth="2" strokeDasharray="3 3" />
              {/* P3 holds 2nd instance of R2 */}
              <line x1="242" y1="135" x2="158" y2="135" stroke="#101a28" strokeWidth="2" />
            </svg>
            <p className="mt-1 text-[11px] text-muted-foreground font-mono">
              Cycle exists, but P3 holds an instance of R2 and needs no extra resources. When P3 finishes, R2 is freed and breaks the cycle!
            </p>
          </div>
        </div>

        <div className="rounded border border-foreground/20 bg-background/60 p-3 font-mono text-xs">
          <b>Graph Cycle Rules:</b>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-muted-foreground">
            <li><b>No cycle in graph:</b> The system is strictly deadlock-free.</li>
            <li><b>Cycle with single-instance resource types:</b> Deadlock has definitely occurred.</li>
            <li><b>Cycle with multiple-instance resource types:</b> Deadlock <i>may</i> exist, but is not guaranteed.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "deadlock-with-semaphores",
    t: "4. Deadlock with Semaphores & Starvation",
    b: "Even in simple multithreaded applications, improper ordering of basic synchronization primitives can easily trigger a catastrophic deadlock.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">The Classic Lock-Ordering Bug:</p>
          <div className="grid gap-2 sm:grid-cols-2 font-mono text-xs">
            <div className="rounded border border-foreground/25 bg-background p-2.5">
              <span className="font-bold text-primary">Process P0</span>
              <pre className="mt-1 text-foreground leading-tight">
{`wait(S);
wait(Q);
// critical section
signal(S);
signal(Q);`}
              </pre>
            </div>
            <div className="rounded border border-foreground/25 bg-background p-2.5">
              <span className="font-bold text-primary">Process P1</span>
              <pre className="mt-1 text-foreground leading-tight">
{`wait(Q);
wait(S);
// critical section
signal(Q);
signal(S);`}
              </pre>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            If P0 executes <code className="font-mono text-foreground font-bold">wait(S)</code> and is immediately context-switched, P1 can execute <code className="font-mono text-foreground font-bold">wait(Q)</code>.
            Now P0 waits for Q (held by P1), and P1 waits for S (held by P0). Neither can advance!
          </p>
        </div>

        <div className="rounded border border-foreground/20 bg-background/70 p-3">
          <span className="font-bold text-primary">Deadlock vs. Starvation:</span>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            <b>Starvation (Indefinite Blocking):</b> A process waits indefinitely in a semaphore queue because other processes are repeatedly given priority. Unlike deadlock, other processes continue to run and make progress.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "four-ways-to-handle-deadlocks",
    t: "5. Four Ways to Handle Deadlocks",
    b: "Operating systems employ four fundamental strategies when dealing with potential deadlock conditions.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="grid gap-2.5 sm:grid-cols-2 font-mono text-xs">
          <div className="rounded border border-foreground/25 bg-background/80 p-3">
            <span className="font-bold text-primary">1. Deadlock Prevention</span>
            <p className="mt-1 text-muted-foreground">
              Design static protocols that ensure at least one of the four necessary conditions can never hold.
            </p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-3">
            <span className="font-bold text-primary">2. Deadlock Avoidance</span>
            <p className="mt-1 text-muted-foreground">
              Dynamic tracking using a priori information. The OS inspects every request and only grants it if the resulting state remains safe.
            </p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-3">
            <span className="font-bold text-primary">3. Detection &amp; Recovery</span>
            <p className="mt-1 text-muted-foreground">
              Allow deadlocks to occur, run an algorithm periodically to detect deadlocked threads, and recover by aborting jobs or preempting resources.
            </p>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-3">
            <span className="font-bold text-primary">4. Ignore It (Ostrich Algorithm)</span>
            <p className="mt-1 text-muted-foreground">
              Bury your head in the sand: pretend deadlocks never happen. Standard approach in Windows and UNIX!
            </p>
          </div>
        </div>
        <div className="rounded border-2 border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <b>Why do Windows and Linux use the Ostrich algorithm?</b> Deadlocks in typical desktop/server software are relatively rare. The constant CPU and memory overhead of checking every single mutex acquisition or restricting programming flexibility costs far more than forcing an occasional reboot or process termination when a deadlock happens.
        </div>
      </div>
    ),
  },
  {
    id: "deadlock-prevention",
    t: "6. Deadlock Prevention",
    b: "Prevention works by eliminating at least one of the four necessary conditions through structural constraints on system operation.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="space-y-2">
          <div className="rounded border border-foreground/20 bg-background/70 p-3">
            <b className="text-primary font-mono">Breaking Mutual Exclusion:</b>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sharable resources (like read-only files) do not require mutually exclusive access and can never deadlock. However, fundamentally non-sharable resources (printers, write locks) cannot have mutual exclusion removed without destroying data integrity.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/70 p-3">
            <b className="text-primary font-mono">Breaking Hold and Wait:</b>
            <p className="text-xs text-muted-foreground mt-0.5">
              Protocol 1: A process must request and receive all required resources before execution begins. Protocol 2: A process may request resources only when it currently holds none. <i>Drawbacks:</i> Extremely low resource utilization (holding resources before they are needed) and possible starvation of processes needing many resources.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/70 p-3">
            <b className="text-primary font-mono">Breaking No Preemption:</b>
            <p className="text-xs text-muted-foreground mt-0.5">
              If a process holding resources requests another resource that cannot be immediately allocated, all resources currently held by that process are preempted (forcibly released). Only practical for resources whose state is easily saved and restored, such as CPU registers and physical memory.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/70 p-3">
            <b className="text-primary font-mono">Breaking Circular Wait:</b>
            <p className="text-xs text-muted-foreground mt-0.5">
              Impose a global linear ordering of all resource types (<code className="font-mono text-foreground font-bold">F: R → N</code>). Every process must request resources in strictly increasing order of enumeration. If holding resource <i>i</i>, it can only request resource <i>j</i> if <i>F(j) &gt; F(i)</i>. <i>Limitation:</i> Dynamic locking patterns in modern software make global ordering difficult to enforce statically.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "deadlock-avoidance-safe-state",
    t: "7. Deadlock Avoidance & The Safe State",
    b: "Avoidance requires advance information: each process must declare its maximum resource demands at startup. The system dynamically examines resource allocations to ensure that a circular-wait condition can never develop.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">Definition of a Safe State:</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A state is <b>safe</b> if there exists at least one order (a <b>safe sequence</b> <code className="font-mono text-foreground font-bold">&lt;P0, P1, ..., Pn-1&gt;</code>) in which all processes can finish. For each process Pi in the sequence, its remaining need can be satisfied by the currently available resources plus the resources already held by all preceding processes Pj (j &lt; i):
          </p>
          <div className="rounded bg-background p-2 font-mono text-xs font-bold text-primary text-center">
            Need_i ≤ Available + ∑ Allocation_j (for all j &lt; i)
          </div>
        </div>

        {/* State Space Diagram */}
        <div className="rounded border-2 border-foreground/20 bg-paper p-4 text-center">
          <p className="font-mono text-xs font-bold text-foreground uppercase mb-2">State Space Partition</p>
          <svg
            viewBox="0 0 320 160"
            className="mx-auto w-full max-w-[300px]"
            role="img"
            aria-label="Venn diagram showing safe states separate from unsafe states, with deadlock states nested strictly inside unsafe states"
          >
            {/* System States boundary */}
            <rect x="10" y="10" width="300" height="140" rx="8" fill="#faf8f2" stroke="#101a28" strokeWidth="2" />
            <text x="25" y="30" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#1e293b">All System States</text>

            {/* Unsafe states region */}
            <rect x="25" y="45" width="165" height="95" rx="6" fill="#f87171" fillOpacity="0.2" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x="35" y="65" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#b91c1c">Unsafe States</text>

            {/* Deadlock nested inside unsafe */}
            <rect x="40" y="80" width="110" height="50" rx="4" fill="#dc2626" fillOpacity="0.3" stroke="#dc2626" strokeWidth="2" />
            <text x="95" y="110" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#991b1b" textAnchor="middle">Deadlock</text>

            {/* Safe states region */}
            <rect x="200" y="45" width="95" height="95" rx="6" fill="#4ade80" fillOpacity="0.25" stroke="#16a34a" strokeWidth="2" />
            <text x="248" y="98" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="#15803d" textAnchor="middle">Safe State</text>
          </svg>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            A safe state is never deadlocked. An unsafe state is NOT necessarily deadlocked, but carries the risk of leading to deadlock!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "rag-avoidance",
    t: "8. Graph Avoidance (Single Instance)",
    b: "When every resource type has only one instance, deadlock avoidance can be implemented directly on the Resource-Allocation Graph using claim edges.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3 space-y-2">
          <p className="font-bold text-foreground">Three Edge Types in the Graph:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
            <li><b>Claim edge (<code className="font-mono text-foreground font-bold">Pi ⇢ Rj</code>):</b> Dashed arrow indicating process Pi may request resource Rj in the future. Must be declared before execution.</li>
            <li><b>Request edge (<code className="font-mono text-foreground font-bold">Pi → Rj</code>):</b> Solid arrow when the process actually makes the request.</li>
            <li><b>Assignment edge (<code className="font-mono text-foreground font-bold">Rj → Pi</code>):</b> Solid arrow when the resource is allocated to Pi.</li>
          </ul>
        </div>
        <div className="rounded border border-foreground/20 bg-background/70 p-3 text-xs leading-relaxed text-muted-foreground">
          <b>Avoidance Rule:</b> A request for resource Rj is granted only if converting the request edge <code className="font-mono font-bold text-foreground">Pi → Rj</code> into an assignment edge <code className="font-mono font-bold text-foreground">Rj → Pi</code> does not create a directed cycle in the graph. Cycle detection in a graph with <i>n</i> processes takes <b>O(n²)</b> operations.
        </div>
      </div>
    ),
  },
  {
    id: "bankers-algorithm-structures",
    t: "9. Banker's Algorithm: Data Structures",
    b: "When resource types have multiple instances, graph cycle detection is no longer sufficient. Dijkstra developed the Banker's Algorithm (named because a banker never allocates cash so that they cannot satisfy all customers' borrowing limits).",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground">Four Core Data Structures (n processes, m resource types):</p>
          <div className="grid gap-2 sm:grid-cols-2 font-mono text-xs">
            <div className="rounded border border-foreground/25 bg-background p-2.5">
              <span className="font-bold text-primary">Available [m]</span>
              <p className="text-muted-foreground">Vector of length m. Available[j] is the number of free instances of resource type Rj.</p>
            </div>
            <div className="rounded border border-foreground/25 bg-background p-2.5">
              <span className="font-bold text-primary">Max [n × m]</span>
              <p className="text-muted-foreground">Matrix. Max[i][j] is the maximum demand process Pi will ever claim for resource Rj.</p>
            </div>
            <div className="rounded border border-foreground/25 bg-background p-2.5">
              <span className="font-bold text-primary">Allocation [n × m]</span>
              <p className="text-muted-foreground">Matrix. Allocation[i][j] is the number of instances of Rj currently held by Pi.</p>
            </div>
            <div className="rounded border border-foreground/25 bg-background p-2.5">
              <span className="font-bold text-primary">Need [n × m]</span>
              <p className="text-muted-foreground">Matrix. Need[i][j] = Max[i][j] − Allocation[i][j]. Remaining resources Pi may still request.</p>
            </div>
          </div>
        </div>
        <p className="font-hand text-xl text-accent-foreground">
          ✎ <b>Sanity Rule:</b> A declared maximum claim can never exceed total system capacity (<code className="font-mono font-bold">Max[i][j] ≤ Total[j]</code>).
        </p>
      </div>
    ),
  },
  {
    id: "safety-algorithm",
    t: "10. The Safety Algorithm",
    b: "The safety algorithm determines whether the current system allocation state is safe by finding a valid completion sequence for all processes.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2 font-mono text-xs">
          <p className="font-bold text-foreground font-sans text-sm">Safety Check Steps:</p>
          <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
            <li>
              <b>Initialize:</b> Let <code className="font-bold text-primary">Work = Available</code> (vector of length m) and <code className="font-bold text-primary">Finish[i] = false</code> for all <i>i = 0, 1, ..., n-1</i>.
            </li>
            <li>
              <b>Find a candidate:</b> Find an index <i>i</i> such that both:
              <br />
              <span className="text-foreground font-bold">Finish[i] === false</span> AND <span className="text-foreground font-bold">Need_i ≤ Work</span>.
              <br />
              If no such <i>i</i> exists, jump to step 4.
            </li>
            <li>
              <b>Simulate completion:</b>
              <br />
              <code className="text-foreground font-bold">Work = Work + Allocation_i</code>
              <br />
              <code className="text-foreground font-bold">Finish[i] = true</code>
              <br />
              Append <i>i</i> to safe sequence; go back to step 2.
            </li>
            <li>
              <b>Verdict:</b> If <code className="text-foreground font-bold">Finish[i] === true</code> for all <i>i</i>, the system is in a <b>Safe State</b>! Otherwise, the state is <b>Unsafe</b>.
            </li>
          </ol>
          <p className="pt-1 text-muted-foreground">Algorithm computational cost: <b>O(m · n²)</b> operations.</p>
        </div>

        {/* Rules Used on this Site Callout */}
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-3.5">
          <p className="font-bold text-primary font-mono text-xs uppercase tracking-wider">
            ★ Rules used on this site (Scanning Order Convention)
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            The safety checker in our simulator continues scanning forward through the processes (from P0 through Pn-1) in each pass.
            When a process finishes and returns its allocation to Work, the loop continues to subsequent processes in the list before
            wrapping around to P0 for another pass. This yields the safe sequence <code className="font-mono font-bold text-foreground">&lt;P1, P3, P4, P0, P2&gt;</code> for
            our standard benchmark. Other textbooks restart the search from P0 immediately whenever any process finishes (giving <code className="font-mono font-bold text-foreground">&lt;P1, P3, P0, P2, P4&gt;</code>);
            both scan orders are completely valid and mathematically correct safe sequences!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "resource-request-algorithm",
    t: "11. The Resource-Request Algorithm",
    b: "When a process Pi issues a resource request vector Request_i, the operating system uses the Banker's request algorithm to decide whether to grant it immediately or make Pi wait.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 font-mono text-xs space-y-2">
          <p className="font-bold text-foreground font-sans text-sm">The 3 Sequential Checks:</p>
          <div className="space-y-2 text-muted-foreground">
            <div className="rounded border border-foreground/20 bg-background p-2.5">
              <span className="font-bold text-primary">Check 1 (Exceeds Need?):</span>
              <p className="mt-0.5">
                If <code className="text-foreground font-bold">Request_i ≤ Need_i</code>, proceed to Check 2.
                Otherwise, raise an error condition: process has exceeded its declared maximum claim!
              </p>
            </div>
            <div className="rounded border border-foreground/20 bg-background p-2.5">
              <span className="font-bold text-primary">Check 2 (Available?):</span>
              <p className="mt-0.5">
                If <code className="text-foreground font-bold">Request_i ≤ Available</code>, proceed to Check 3.
                Otherwise, process Pi must <b>wait</b> since resources are not currently free.
              </p>
            </div>
            <div className="rounded border border-foreground/20 bg-background p-2.5">
              <span className="font-bold text-primary">Check 3 (Trial Safety Simulation):</span>
              <p className="mt-0.5">
                Pretend to grant the request by tentatively updating the state matrices:
              </p>
              <pre className="mt-1 text-foreground font-bold">
{`Available    = Available − Request_i
Allocation_i = Allocation_i + Request_i
Need_i       = Need_i − Request_i`}
              </pre>
              <p className="mt-1">
                Now run the <b>Safety Algorithm</b> on this provisional state.
                If <b>Safe</b> → Formally grant resources to Pi!
                If <b>Unsafe</b> → Pi must wait; restore the original state matrices!
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "worked-example-simulator",
    t: "12. Complete Worked Example",
    b: "Let us walk through the exact 5-process, 3-resource benchmark used in the simulator's Load Example (Resource types A, B, C):",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="overflow-x-auto rounded border-2 border-foreground/20 bg-background/70 p-3 font-mono text-xs">
          <table className="w-full text-center">
            <thead>
              <tr className="border-b border-foreground/20 text-muted-foreground">
                <th className="py-1 text-left">Process</th>
                <th>Allocation (A B C)</th>
                <th>Max (A B C)</th>
                <th>Need = Max − Alloc</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="py-1 text-left font-bold">P0</td><td>0 1 0</td><td>7 5 3</td><td className="font-bold text-primary">7 4 3</td><td rowSpan={5} className="font-bold text-success align-middle border-l border-foreground/15">3 3 2</td></tr>
              <tr><td className="py-1 text-left font-bold">P1</td><td>2 0 0</td><td>3 2 2</td><td className="font-bold text-primary">1 2 2</td></tr>
              <tr><td className="py-1 text-left font-bold">P2</td><td>3 0 2</td><td>9 0 2</td><td className="font-bold text-primary">6 0 0</td></tr>
              <tr><td className="py-1 text-left font-bold">P3</td><td>2 1 1</td><td>2 2 2</td><td className="font-bold text-primary">0 1 1</td></tr>
              <tr><td className="py-1 text-left font-bold">P4</td><td>0 0 2</td><td>4 3 3</td><td className="font-bold text-primary">4 3 1</td></tr>
            </tbody>
          </table>
        </div>

        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3 space-y-2 text-xs font-mono">
          <p className="font-bold text-foreground font-sans text-sm">Safety Test Execution (Initial State):</p>
          <p className="text-muted-foreground">Start: Work = Available = (3, 3, 2). Finish = [F, F, F, F, F].</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><b>Pass 1:</b> P0 Need(7,4,3) ≤ Work(3,3,2) is False. P1 Need(1,2,2) ≤ Work(3,3,2) is True! P1 finishes → <code className="text-foreground font-bold">Work = (3,3,2) + (2,0,0) = (5,3,2)</code>.</li>
            <li>P2 Need(6,0,0) ≤ Work(5,3,2) is False. P3 Need(0,1,1) ≤ Work(5,3,2) is True! P3 finishes → <code className="text-foreground font-bold">Work = (5,3,2) + (2,1,1) = (7,4,3)</code>.</li>
            <li>P4 Need(4,3,1) ≤ Work(7,4,3) is True! P4 finishes → <code className="text-foreground font-bold">Work = (7,4,3) + (0,0,2) = (7,4,5)</code>.</li>
            <li><b>Pass 2 (wrapping to P0):</b> P0 Need(7,4,3) ≤ Work(7,4,5) is True! P0 finishes → <code className="text-foreground font-bold">Work = (7,4,5) + (0,1,0) = (7,5,5)</code>.</li>
            <li>P2 Need(6,0,0) ≤ Work(7,5,5) is True! P2 finishes → <code className="text-foreground font-bold">Work = (7,5,5) + (3,0,2) = (10,5,7)</code>.</li>
          </ul>
          <p className="font-bold text-success font-sans">
            ✓ All processes finished! Safe sequence: &lt;P1, P3, P4, P0, P2&gt;.
          </p>
        </div>

        {/* 3 Request Scenarios */}
        <div className="space-y-2 text-xs font-mono">
          <div className="rounded border border-success/40 bg-success/5 p-3">
            <b className="text-success font-sans">Request Scenario 1 (P1 asks (1, 0, 2)):</b>
            <p className="text-muted-foreground mt-1">
              (1) Request(1,0,2) ≤ Need(1,2,2)? Yes. (2) Request(1,0,2) ≤ Available(3,3,2)? Yes.
              <br />
              (3) Trial state: Available=(2,3,0), Alloc_P1=(3,0,2), Need_P1=(0,2,0). Running safety test finds safe sequence &lt;P1, P3, P4, P0, P2&gt;. <b>Request is GRANTED!</b>
            </p>
          </div>

          <div className="rounded border border-destructive/40 bg-destructive/5 p-3">
            <b className="text-destructive font-sans">Request Scenario 2 (From original state, P4 asks (3, 3, 0)):</b>
            <p className="text-muted-foreground mt-1">
              (1) Request(3,3,0) ≤ Need(4,3,1)? Yes. (2) Request(3,3,0) ≤ Available(3,3,2)? Yes.
              <br />
              (3) Trial state: Available becomes (0,0,2), Alloc_P4=(3,3,2), Need_P4=(1,0,1).
              <br />
              Safety check with Work=(0,0,2): Needs are P0(7,4,3), P1(1,2,2), P2(6,0,0), P3(0,1,1), P4(1,0,1). <b>None can satisfy Need ≤ Work!</b> State is UNSAFE. <b>Request is REFUSED; P4 must wait!</b>
            </p>
          </div>

          <div className="rounded border border-primary/40 bg-primary/5 p-3">
            <b className="text-primary font-sans">Request Scenario 3 (After Scenario 1 granted, P4 asks (3, 3, 0)):</b>
            <p className="text-muted-foreground mt-1">
              (1) Request(3,3,0) ≤ Need(4,3,1)? Yes. (2) Request(3,3,0) ≤ Available(2,3,0)? <b>No!</b> (Resource A needs 3, only 2 available).
              <br />
              P4 immediately <b>waits at Step 2</b> without even running the safety check.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "deadlock-detection",
    t: "13. Deadlock Detection",
    b: "If an operating system does not employ prevention or avoidance, deadlocks can occur. Detection algorithms inspect resource state periodically to pinpoint trapped processes.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3 space-y-2">
          <p className="font-bold text-foreground">1. Single Instance: Wait-For Graph</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Constructed directly from the Resource-Allocation Graph by removing resource nodes and collapsing edges. A directed edge <code className="font-mono text-foreground font-bold">Pi → Pj</code> means process Pi is waiting for process Pj to release a resource. A directed cycle in a wait-for graph <b>strictly proves deadlock</b>. Cycle detection takes <b>O(n²)</b> operations.
          </p>
        </div>
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3 space-y-2">
          <p className="font-bold text-foreground">2. Multiple Instances: Matrix Detection Algorithm</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Uses <code className="font-mono text-foreground font-bold">Available[m]</code>, <code className="font-mono text-foreground font-bold">Allocation[n × m]</code>, and a live <code className="font-mono text-foreground font-bold">Request[n × m]</code> matrix (instead of Need).
            <br />
            1. Let <code className="font-mono text-foreground font-bold">Work = Available</code>. For all <i>i</i>: if <code className="font-mono text-foreground font-bold">Allocation[i] ≠ 0</code>, <code className="font-mono text-foreground font-bold">Finish[i] = false</code>; otherwise <code className="font-mono text-foreground font-bold">Finish[i] = true</code>.
            <br />
            2. Find an <i>i</i> such that <code className="font-mono text-foreground font-bold">Finish[i] === false</code> and <code className="font-mono text-foreground font-bold">Request_i ≤ Work</code>.
            <br />
            3. Set <code className="font-mono text-foreground font-bold">Work = Work + Allocation_i</code>, <code className="font-mono text-foreground font-bold">Finish[i] = true</code>, repeat.
            <br />
            4. If any <code className="font-mono text-foreground font-bold">Finish[i] === false</code> at the end, <b>process Pi is deadlocked!</b> Runtime: <b>O(m · n²)</b>.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "deadlock-recovery",
    t: "14. Deadlock Recovery",
    b: "Once deadlock detection identifies deadlocked processes, the operating system must intervene using process termination or resource preemption.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded border border-foreground/25 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-xs uppercase">Option 1: Process Termination</span>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-xs text-muted-foreground">
              <li><b>Abort all deadlocked processes:</b> Guaranteed to break the cycle, but costly because long computations are completely discarded.</li>
              <li><b>Abort one at a time:</b> Abort a process and rerun deadlock detection until the cycle is resolved.</li>
              <li><b>Criteria for selecting victim:</b> Process priority, runtime elapsed vs. remaining, resources currently held, resources still needed, batch vs. interactive.</li>
            </ul>
          </div>
          <div className="rounded border border-foreground/25 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-xs uppercase">Option 2: Resource Preemption</span>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-xs text-muted-foreground">
              <li><b>Selecting a victim:</b> Preempt resources from the process with minimum recovery cost.</li>
              <li><b>Rollback:</b> Roll back the victim process to a recent safe checkpoint, or restart from scratch.</li>
              <li><b>Starvation prevention:</b> Ensure resources are not always preempted from the same process (include rollback count in the cost metric).</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "summary-and-exam-tips",
    t: "15. Summary & Exam Tips",
    b: "A quick review of the four deadlock management approaches, common exam traps, and problem-solving rules:",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="overflow-x-auto rounded border-2 border-foreground/20 bg-background/70 p-3 font-mono text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-foreground/20 text-muted-foreground">
                <th className="py-1">Approach</th>
                <th>Core Idea</th>
                <th>Main Drawback / Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10 text-xs">
              <tr>
                <td className="py-1.5 font-bold text-primary">Prevention</td>
                <td>Design system so at least 1 of 4 conditions cannot hold</td>
                <td>Low resource utilization; high device idle time</td>
              </tr>
              <tr>
                <td className="py-1.5 font-bold text-primary">Avoidance</td>
                <td>Check requests dynamically; stay in safe state</td>
                <td>Requires a priori maximum demand declarations; O(m·n²)</td>
              </tr>
              <tr>
                <td className="py-1.5 font-bold text-primary">Detection</td>
                <td>Allow deadlocks; run detection algorithms periodically</td>
                <td>Detection overhead; complex rollback/preemption recovery</td>
              </tr>
              <tr>
                <td className="py-1.5 font-bold text-primary">Ostrich</td>
                <td>Ignore deadlocks; assume they occur very rarely</td>
                <td>Requires occasional manual intervention or system reboot</td>
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
              <b>Need formula:</b> <code className="font-mono text-foreground font-bold">Need = Max − Allocation</code> (NEVER add them!).
            </li>
            <li>
              <b>Safety comparison:</b> Always compare <code className="font-mono text-foreground font-bold">Need ≤ Work</code> (NEVER compare Allocation with Work!).
            </li>
            <li>
              <b>Work update:</b> When process Pi finishes, add <code className="font-mono text-foreground font-bold">Work = Work + Allocation_i</code> (return what it held, not its Need!).
            </li>
            <li>
              <b>Cycles vs Deadlock:</b> A cycle in a multiple-instance graph does NOT prove deadlock. Only single-instance cycles guarantee deadlock.
            </li>
            <li>
              <b>Safe vs Unsafe:</b> Safe NEVER means deadlocked. Unsafe does NOT automatically mean deadlocked—it simply means the OS cannot prevent deadlock if processes request their maximums simultaneously.
            </li>
            <li>
              <b>Request ordering:</b> Always run the 3 request checks in order: (1) <code className="font-mono text-foreground">Request ≤ Need</code>, (2) <code className="font-mono text-foreground">Request ≤ Available</code>, (3) Safety simulation.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
];
