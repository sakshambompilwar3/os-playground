import type { ReactNode } from "react";

export interface DiskNoteCard {
  id: string;
  t: string;
  b: string;
  extra?: ReactNode;
}

export const DISK_SCHEDULING_NOTES: DiskNoteCard[] = [
  {
    id: "disk-structure",
    t: "1. Disk Structure & Geometry",
    b: "A traditional hard disk drive (HDD) consists of one or more flat circular platters mounted on a central spindle rotating at thousands of RPM. Data is magnetically recorded on concentric rings called tracks, which are segmented into smaller blocks called sectors.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">Key components to remember:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <b>Platters & Surfaces:</b> Each platter has top and bottom surfaces coated with magnetic material.
            </li>
            <li>
              <b>Read/Write Heads & Arm Assembly:</b> Each surface has an attached head. All heads move synchronously on a single rigid actuator arm.
            </li>
            <li>
              <b>Tracks & Sectors:</b> Tracks are circular paths on each surface. A sector is the smallest addressable unit of storage (typically 512 bytes or 4 KB).
            </li>
            <li>
              <b>Cylinder:</b> The set of all tracks at the exact same radial position across all platter surfaces. Because all heads move together, switching between tracks in the same cylinder requires zero arm movement!
            </li>
          </ul>
        </div>

        {/* Hand-drawn style SVG diagram of disk platter, tracks, arm, and head */}
        <div className="rounded border border-foreground/20 bg-card p-3">
          <p className="font-mono text-xs font-bold text-muted-foreground mb-2">
            Diagram: Disk Platter, Arm, Head & Tracks
          </p>
          <svg viewBox="0 0 540 180" className="w-full text-foreground" aria-hidden>
            {/* Concentric Platter & Tracks */}
            <circle cx="160" cy="90" r="75" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="160" cy="90" r="55" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="160" cy="90" r="35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="160" cy="90" r="14" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
            <text x="160" y="94" textAnchor="middle" className="font-mono text-[9px] font-bold" fill="currentColor">Spindle</text>

            {/* Labels for Platter */}
            <line x1="160" y1="15" x2="160" y2="5" stroke="currentColor" strokeWidth="1" />
            <text x="160" y="2" textAnchor="middle" className="font-mono text-[10px] font-bold" fill="currentColor">Outer Track (Cylinder 0)</text>
            <text x="90" y="115" textAnchor="middle" className="font-mono text-[9px] text-muted-foreground" fill="currentColor">Inner Track</text>

            {/* Actuator Arm and Head */}
            <circle cx="360" cy="90" r="12" fill="var(--highlight)" stroke="currentColor" strokeWidth="2" />
            <text x="360" y="94" textAnchor="middle" className="font-mono text-[8px] font-bold" fill="var(--foreground)">Pivot</text>
            <path d="M 350 90 L 195 90" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            {/* Head Slider */}
            <rect x="188" y="84" width="14" height="12" rx="2" fill="var(--highlight)" stroke="currentColor" strokeWidth="1.5" />
            <text x="215" y="76" className="font-mono text-[10px] font-bold text-primary" fill="currentColor">R/W Head</text>
            <text x="360" y="120" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">Actuator Arm</text>

            {/* Cylinder Concept Bracket */}
            <path d="M 420 40 L 430 40 L 430 90 L 440 90 L 430 90 L 430 140 L 420 140" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <text x="448" y="86" className="font-mono text-[10px] font-bold" fill="currentColor">Cylinder</text>
            <text x="448" y="100" className="font-mono text-[9px] text-muted-foreground" fill="currentColor">= tracks at same arm radius</text>
          </svg>
        </div>
      </div>
    ),
  },
  {
    id: "disk-access-time",
    t: "2. Disk Access Time",
    b: "Whenever a process reads or writes a file block, the operating system must pay a physical mechanical cost. Total disk access time is the sum of three distinct components: Seek Time, Rotational Latency, and Transfer Time.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3 space-y-2">
          <p className="font-mono text-sm font-bold text-primary">
            Access Time = Seek Time + Rotational Latency + Transfer Time
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>
              <b>Seek Time (dominant cost):</b> Time required to physically accelerate the mechanical arm and position the head over the desired cylinder. Typically 3 to 10 milliseconds.
            </li>
            <li>
              <b>Rotational Latency:</b> Time spent waiting for the target sector to spin underneath the read/write head. On average, it equals half of one disk revolution.
            </li>
            <li>
              <b>Transfer Time:</b> Time to read or write the actual data bytes as the sector passes under the head (depends on disk rotation speed and density).
            </li>
          </ul>
        </div>
        <div className="rounded border border-foreground/20 bg-card p-3">
          <p className="font-hand text-xl text-primary font-bold">
            ✎ Why seek time matters most:
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Mechanical arm movement is several orders of magnitude slower than electronic memory or CPU computation. Because <b>seek time dominates total access time</b>, disk scheduling algorithms focus primarily on minimizing total head travel (measured in cylinders).
          </p>
          <p className="mt-2 font-mono text-xs font-bold text-foreground">
            On this site: Total seek time = total head movement × seek time per cylinder.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "why-scheduling-is-needed",
    t: "3. Why Scheduling is Needed",
    b: "In a multiprogramming operating system, many concurrent processes submit disk I/O requests simultaneously. At any instant, several requests sit pending in a disk queue waiting for service.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">The scheduler&apos;s goal:</p>
          <p className="mt-1 text-muted-foreground">
            The operating system can reorder the pending request queue before dispatching requests to the disk controller. If the OS serves requests naively in arrival order, the head may travel back and forth over the platters needlessly. By ordering requests intelligently, the OS dramatically lowers total travel distance, saves power, and increases overall disk throughput.
          </p>
        </div>
        <p className="font-hand text-xl text-accent-foreground">
          ✎ <b>Key trade-off:</b> Total seek distance vs fairness! Minimizing distance can risk starving requests located far from the current head cluster.
        </p>
      </div>
    ),
  },
  {
    id: "fcfs",
    t: "4. FCFS (First-Come, First-Served)",
    b: "The simplest disk scheduling algorithm. FCFS maintains a strict FIFO queue and services requests exactly in their chronological arrival sequence, regardless of where each request is located on the disk.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">Evaluation:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li><b>Pros:</b> Completely fair; zero starvation; trivial to implement with an ordinary FIFO queue.</li>
            <li><b>Cons:</b> Suffers from wild <i>zigzagging</i> across the disk. Head movement is usually the highest among all algorithms.</li>
            <li><b>Direction:</b> Does NOT use or depend on an initial head direction.</li>
          </ul>
        </div>

        {/* Hand-drawn style SVG diagram of zigzag path */}
        <div className="rounded border border-foreground/20 bg-card p-3">
          <p className="font-mono text-xs font-bold text-muted-foreground mb-2">
            Diagram: FCFS Wild Zigzag Path (High Seek Distance)
          </p>
          <svg viewBox="0 0 540 100" className="w-full text-foreground" aria-hidden>
            {/* Axis */}
            <line x1="30" y1="20" x2="510" y2="20" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" />
            <text x="30" y="14" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">0</text>
            <text x="510" y="14" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">199</text>

            {/* Zigzag moves: 53 -> 98 -> 183 -> 37 -> 122 */}
            <path d="M 155 35 L 265 50 L 470 65 L 115 80 L 320 95" fill="none" stroke="var(--highlight)" strokeWidth="2.5" />
            <circle cx="155" cy="35" r="4" fill="var(--highlight)" stroke="currentColor" strokeWidth="1.5" />
            <text x="155" y="30" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">53 (start)</text>

            <circle cx="265" cy="50" r="3.5" fill="currentColor" />
            <text x="265" y="45" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">98</text>

            <circle cx="470" cy="65" r="3.5" fill="currentColor" />
            <text x="470" y="60" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">183</text>

            <circle cx="115" cy="80" r="3.5" fill="currentColor" />
            <text x="115" y="75" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">37</text>

            <circle cx="320" cy="95" r="3.5" fill="currentColor" />
            <text x="320" y="90" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">122</text>
          </svg>
        </div>
      </div>
    ),
  },
  {
    id: "sstf",
    t: "5. SSTF (Shortest Seek Time First)",
    b: "SSTF is a greedy algorithm. From the current head cylinder, it always picks the pending request that requires the least mechanical seek distance: min |cylinder - currentHead|.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">Evaluation:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li><b>Pros:</b> Huge reduction in total head movement compared with FCFS. Fast average response time for typical workloads.</li>
            <li><b>Cons (Starvation):</b> Because it favors nearby cylinders, distant requests can wait indefinitely (starve) if a steady stream of new requests keeps arriving near the head!</li>
            <li><b>Sub-optimal:</b> SSTF is a greedy local heuristic; it does not compute a global optimum (like traveling salesperson).</li>
            <li><b>Direction:</b> Does NOT use an initial direction. Ties between equidistant cylinders are broken by arrival/table order.</li>
          </ul>
        </div>
        <p className="font-hand text-xl text-primary">
          ✎ <b>Example:</b> At head 53 with requests 65 and 37, SSTF moves to 65 first (|65 - 53| = 12 vs |37 - 53| = 16).
        </p>
      </div>
    ),
  },
  {
    id: "scan",
    t: "6. SCAN (The Elevator Algorithm)",
    b: "SCAN moves the head continuously in one direction (e.g. toward higher cylinders), servicing every pending request along its path. When it reaches the physical boundary of the disk (cylinder 0 or last cylinder E), it reverses and services requests in the opposite direction.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">Key rules of SCAN:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <b>Elevator behavior:</b> Just like a building elevator, it sweeps from bottom to top, then top to bottom, without reversing mid-flight.
            </li>
            <li>
              <b>Touches the physical end:</b> Standard SCAN always travels all the way to cylinder 0 or cylinder E before reversing, even if no request sits at that boundary.
            </li>
            <li>
              <b>Starvation-free:</b> Every request is guaranteed to be serviced within at most two full sweeps of the disk.
            </li>
            <li>
              <b>Waiting time variance:</b> Requests that the head just passed must wait almost two full sweeps until the head returns.
            </li>
          </ul>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          <b>Direction requirement:</b> SCAN requires an initial direction (higher or lower) to know which way to start sweeping.
        </p>
      </div>
    ),
  },
  {
    id: "c-scan",
    t: "7. C-SCAN (Circular SCAN)",
    b: "C-SCAN modifies SCAN to provide more uniform waiting times. The head sweeps in one direction only (serving requests as it goes). Upon hitting the boundary end, it immediately jumps back to the opposite disk boundary without serving any requests on the return trip, then resumes sweeping in the same direction.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">Why circular sweep?</p>
          <p className="mt-1 text-muted-foreground leading-relaxed">
            In SCAN, cylinders near the center get serviced twice per round trip, while outer cylinders wait longer. C-SCAN treats cylinders as a circular list: when it reaches one end, it wraps around. As a result, every cylinder waits roughly the same time.
          </p>
          <p className="mt-2 font-bold text-foreground">The Return Jump Toggle:</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Different operating systems textbooks (Silberschatz vs Tanenbaum/Stallings) differ on whether the return jump from end to end is counted in total head movement:
          </p>
          <ul className="mt-1 list-disc pl-5 space-y-0.5 text-xs text-muted-foreground">
            <li><b>Counted (default):</b> Accounts for mechanical arm reset movement across the disk.</li>
            <li><b>Not counted:</b> Considers the return jump as a fast seek without disk read workload.</li>
          </ul>
          <p className="mt-1 text-xs text-primary font-bold">This playground supports both modes via the Return Jump toggle!</p>
        </div>
      </div>
    ),
  },
  {
    id: "look",
    t: "8. LOOK (Smart Reversal)",
    b: "LOOK is an optimization of SCAN. Instead of traveling blindly all the way to the physical boundary (0 or E), the head looks ahead: it only moves as far as the final pending request in the current direction. Once the outermost request is serviced, it reverses immediately.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">LOOK vs SCAN:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <b>Saves wasted travel:</b> If the highest request is at cylinder 183 on a 200-cylinder disk (0–199), SCAN travels to 199 (wasting 16 cylinders of travel). LOOK stops at 183 and turns right around!
            </li>
            <li>
              <b>Zero boundary visits:</b> LOOK never visits cylinder 0 or cylinder E unless a real user request specifically asked for that cylinder.
            </li>
            <li>
              <b>Direction sensitive:</b> Like SCAN, LOOK requires an initial direction.
            </li>
          </ul>
        </div>
        <p className="font-hand text-xl text-primary">
          ✎ <b>Rule:</b> LOOK total distance is ALWAYS ≤ SCAN total distance for the same direction!
        </p>
      </div>
    ),
  },
  {
    id: "c-look",
    t: "9. C-LOOK (Circular LOOK)",
    b: "C-LOOK combines circular one-way sweeping with look-ahead turnaround. It sweeps in one direction up to the last request on that side, then jumps directly to the lowest request on the opposite side (skipping both empty ends), and resumes sweeping in the same direction.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">C-LOOK vs C-SCAN:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <b>Skips both ends:</b> On a 200-cylinder disk with requests between 14 and 183, C-SCAN travels from 183 to 199, jumps from 199 to 0, then travels 0 to 14. C-LOOK jumps directly from 183 to 14!
            </li>
            <li>
              <b>Uniformity + efficiency:</b> Provides the uniform waiting times of C-SCAN while eliminating all superfluous head travel past outermost requests.
            </li>
            <li>
              <b>Rule:</b> C-LOOK total distance is ALWAYS ≤ C-SCAN total distance for the same direction.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "direction-matters",
    t: "10. Why Direction Matters",
    b: "Disk scheduling algorithms fall into two distinct families: direction-agnostic and direction-dependent. For algorithms that sweep, the chosen starting direction can dramatically alter total head movement and service order.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-bold text-foreground">Direction-agnostic:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground space-y-1">
                <li><b>FCFS:</b> Follows arrival sequence only.</li>
                <li><b>SSTF:</b> Follows nearest cylinder only.</li>
              </ul>
              <p className="mt-2 text-xs italic text-muted-foreground">Direction has 0 effect on these two.</p>
            </div>
            <div>
              <p className="font-bold text-foreground">Direction-dependent:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground space-y-1">
                <li><b>SCAN & C-SCAN</b></li>
                <li><b>LOOK & C-LOOK</b></li>
              </ul>
              <p className="mt-2 text-xs italic text-primary">Initial direction (higher vs lower) completely reshapes the sweep path!</p>
            </div>
          </div>
        </div>
        <p className="font-hand text-xl text-foreground">
          ✎ <b>Exam trick:</b> In our benchmark example (head at 53), moving toward lower gives LOOK a total of <b>208 cylinders</b>, beating SSTF (236)! But moving toward higher gives LOOK <b>299 cylinders</b>. Always check the initial direction!
        </p>
      </div>
    ),
  },
  {
    id: "worked-example",
    t: "11. Worked Benchmark Example",
    b: "Let us trace the classic textbook benchmark: a disk with 200 cylinders (0 to 199), initial head position at 53, and a pending request queue of: 98, 183, 37, 122, 14, 124, 65, 67.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="overflow-x-auto rounded border border-foreground/20 bg-card">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-foreground/15 bg-muted/40 uppercase text-muted-foreground">
              <tr>
                <th className="p-2.5">Algorithm & Direction</th>
                <th className="p-2.5">Complete Service Sequence</th>
                <th className="p-2.5 text-right">Head Movement</th>
                <th className="p-2.5 text-right">Avg Seek / Req</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              <tr>
                <td className="p-2.5 font-bold">FCFS</td>
                <td className="p-2.5">53 → 98 → 183 → 37 → 122 → 14 → 124 → 65 → 67</td>
                <td className="p-2.5 text-right font-bold text-destructive">640 cyl</td>
                <td className="p-2.5 text-right">80.0 cyl</td>
              </tr>
              <tr className="bg-success/10">
                <td className="p-2.5 font-bold text-success">SSTF</td>
                <td className="p-2.5">53 → 65 → 67 → 37 → 14 → 98 → 122 → 124 → 183</td>
                <td className="p-2.5 text-right font-bold text-success">236 cyl</td>
                <td className="p-2.5 text-right">29.5 cyl</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">SCAN (higher)</td>
                <td className="p-2.5">53 → 65 → 67 → 98 → 122 → 124 → 183 → [end 199] → 37 → 14</td>
                <td className="p-2.5 text-right font-bold">331 cyl</td>
                <td className="p-2.5 text-right">41.4 cyl</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">SCAN (lower)</td>
                <td className="p-2.5">53 → 37 → 14 → [end 0] → 65 → 67 → 98 → 122 → 124 → 183</td>
                <td className="p-2.5 text-right font-bold">236 cyl</td>
                <td className="p-2.5 text-right">29.5 cyl</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">LOOK (higher)</td>
                <td className="p-2.5">53 → 65 → 67 → 98 → 122 → 124 → 183 → 37 → 14</td>
                <td className="p-2.5 text-right font-bold">299 cyl</td>
                <td className="p-2.5 text-right">37.4 cyl</td>
              </tr>
              <tr className="bg-primary/10">
                <td className="p-2.5 font-bold text-primary">LOOK (lower)</td>
                <td className="p-2.5">53 → 37 → 14 → 65 → 67 → 98 → 122 → 124 → 183</td>
                <td className="p-2.5 text-right font-bold text-primary">208 cyl (winner!)</td>
                <td className="p-2.5 text-right">26.0 cyl</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">C-SCAN (higher)</td>
                <td className="p-2.5">53 → 65…183 → [199] → [jump to 0] → 14 → 37</td>
                <td className="p-2.5 text-right font-bold">382 cyl (183 w/o jump)</td>
                <td className="p-2.5 text-right">47.8 cyl</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">C-LOOK (higher)</td>
                <td className="p-2.5">53 → 65…183 → [jump to 14] → 37</td>
                <td className="p-2.5 text-right font-bold">322 cyl (153 w/o jump)</td>
                <td className="p-2.5 text-right">40.3 cyl</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    id: "summary-table",
    t: "12. Summary Comparison of All Six",
    b: "Here is a high-level cheat sheet summarizing how all six disk scheduling algorithms select requests, handle boundaries, and behave under load.",
    extra: (
      <div className="mt-4 overflow-x-auto rounded border border-foreground/20 bg-card font-sans text-xs">
        <table className="w-full text-left font-mono">
          <thead className="border-b border-foreground/15 bg-muted/40 uppercase text-muted-foreground">
            <tr>
              <th className="p-2.5">Algorithm</th>
              <th className="p-2.5">Selection Rule</th>
              <th className="p-2.5 text-center">Direction?</th>
              <th className="p-2.5 text-center">Visits Disk Ends?</th>
              <th className="p-2.5 text-center">Starvation?</th>
              <th className="p-2.5">Main Drawback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            <tr>
              <td className="p-2.5 font-bold">FCFS</td>
              <td className="p-2.5">Arrival order (FIFO)</td>
              <td className="p-2.5 text-center">No</td>
              <td className="p-2.5 text-center">No</td>
              <td className="p-2.5 text-center text-success font-bold">No</td>
              <td className="p-2.5 text-muted-foreground">Extreme seek distance (zigzags)</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold">SSTF</td>
              <td className="p-2.5">Shortest seek distance</td>
              <td className="p-2.5 text-center">No</td>
              <td className="p-2.5 text-center">No</td>
              <td className="p-2.5 text-center text-destructive font-bold">Yes</td>
              <td className="p-2.5 text-muted-foreground">Can starve distant requests</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold">SCAN</td>
              <td className="p-2.5">Elevator sweep to physical end</td>
              <td className="p-2.5 text-center">Yes</td>
              <td className="p-2.5 text-center font-bold text-primary">Yes (0 & E)</td>
              <td className="p-2.5 text-center text-success font-bold">No</td>
              <td className="p-2.5 text-muted-foreground">Wastes travel to empty boundaries</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold">C-SCAN</td>
              <td className="p-2.5">One-way sweep to end + jump to end</td>
              <td className="p-2.5 text-center">Yes</td>
              <td className="p-2.5 text-center font-bold text-primary">Yes (0 & E)</td>
              <td className="p-2.5 text-center text-success font-bold">No</td>
              <td className="p-2.5 text-muted-foreground">Long return jump across whole disk</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold">LOOK</td>
              <td className="p-2.5">Sweep to last request + reverse</td>
              <td className="p-2.5 text-center">Yes</td>
              <td className="p-2.5 text-center text-muted-foreground">No</td>
              <td className="p-2.5 text-center text-success font-bold">No</td>
              <td className="p-2.5 text-muted-foreground">Non-uniform waiting times</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold">C-LOOK</td>
              <td className="p-2.5">One-way sweep to last req + jump</td>
              <td className="p-2.5 text-center">Yes</td>
              <td className="p-2.5 text-center text-muted-foreground">No</td>
              <td className="p-2.5 text-center text-success font-bold">No</td>
              <td className="p-2.5 text-muted-foreground">Return jump cost (if counted)</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "exam-tips",
    t: "13. Exam Tips & Common Traps",
    b: "Disk scheduling problems are exam favorites because they test attention to detail. Here are the most common pitfalls students fall into:",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <p className="font-bold text-destructive">Top 5 Common Mistakes on Exams:</p>
          <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
            <li>
              <b>Mixing up SCAN and LOOK:</b> SCAN <i>must</i> visit cylinder 0 or cylinder E before reversing. LOOK turns around at the outermost request without touching the boundary.
            </li>
            <li>
              <b>Forgetting the initial head position in the first move:</b> Remember to count the distance from the starting head position to the first served cylinder! (e.g., |53 − 65| = 12).
            </li>
            <li>
              <b>Ignoring initial direction:</b> SCAN and LOOK behave completely differently depending on whether the arm moves toward higher or lower cylinders first.
            </li>
            <li>
              <b>Confusion about C-SCAN & C-LOOK return jump:</b> Pay attention to whether the exam question specifies &quot;count return jump&quot; or &quot;ignore return jump&quot;.
            </li>
            <li>
              <b>Confusing cylinders with time units:</b> Head movement is in <i>cylinders</i>. If seek time is 2 ms per cylinder, multiply total cylinders by 2 ms to get milliseconds!
            </li>
          </ol>
        </div>
      </div>
    ),
  },
];
