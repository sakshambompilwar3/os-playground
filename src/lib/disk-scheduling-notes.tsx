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
    t: "1. Disk Structure & Why Scheduling Matters",
    b: "A traditional hard disk drive (HDD) consists of one or more flat circular platters mounted on a central spindle rotating at thousands of RPM. Data is magnetically recorded on concentric rings called tracks, which are segmented into smaller blocks called sectors.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground font-mono text-xs uppercase tracking-wider">
            Key Geometry Components
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
            <li>
              <b>Platters &amp; Surfaces:</b> Flat circular disks coated with magnetic material on both top and bottom surfaces.
            </li>
            <li>
              <b>Tracks &amp; Sectors:</b> Tracks are concentric rings on each platter surface. Each track is divided into fixed-size storage sectors (typically 512 bytes or 4 KB).
            </li>
            <li>
              <b>Actuator Arm &amp; Read/Write Heads:</b> A mechanical arm assembly holds read/write heads positioned over every surface. All heads move synchronously together.
            </li>
            <li>
              <b>Cylinder:</b> The set of all tracks at the exact same radial position across all platter surfaces. Switching tracks within the same cylinder requires selecting a different head electronically with zero physical arm movement!
            </li>
          </ul>
        </div>

        {/* Hand-drawn style SVG diagram of disk platter, tracks, arm, and head */}
        <div className="rounded border-2 border-foreground/20 bg-paper p-3 text-center">
          <p className="font-mono text-xs font-bold text-foreground uppercase mb-2">
            Disk Platter, Actuator Arm, Head &amp; Cylinder Geometry
          </p>
          <svg
            viewBox="0 0 540 190"
            className="mx-auto w-full max-w-lg"
            role="img"
            aria-label="Diagram showing rotating disk platter with concentric tracks, spindle, read-write head on actuator arm, and cylinder alignment"
          >
            {/* Concentric Platter & Tracks */}
            <circle cx="160" cy="95" r="75" fill="#faf8f2" stroke="#101a28" strokeWidth="2.5" />
            <circle cx="160" cy="95" r="55" fill="none" stroke="#101a28" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="160" cy="95" r="35" fill="none" stroke="#101a28" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="160" cy="95" r="14" fill="#faf8f2" stroke="#101a28" strokeWidth="2" />
            <text x="160" y="99" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">Spindle</text>

            {/* Labels for Platter */}
            <line x1="160" y1="20" x2="160" y2="8" stroke="#101a28" strokeWidth="1.5" />
            <text x="160" y="6" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">Outer Track (Cylinder 0)</text>
            <text x="85" y="125" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#334155">Inner Track</text>

            {/* Actuator Arm and Head */}
            <circle cx="360" cy="95" r="14" fill="#faf8f2" stroke="#101a28" strokeWidth="2" />
            <text x="360" y="99" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">Pivot</text>
            <path d="M 346 95 L 195 95" stroke="#101a28" strokeWidth="4" strokeLinecap="round" />
            {/* Head Slider */}
            <rect x="185" y="88" width="16" height="14" rx="2" fill="#1b4931" stroke="#101a28" strokeWidth="1.5" />
            <line x1="195" y1="88" x2="220" y2="78" stroke="#101a28" strokeWidth="1.5" />
            <text x="225" y="80" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">R/W Head</text>
            <text x="360" y="130" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">Actuator Arm</text>

            {/* Cylinder Concept Bracket */}
            <path d="M 420 45 L 430 45 L 430 95 L 440 95 L 430 95 L 430 145 L 420 145" fill="none" stroke="#101a28" strokeWidth="1.5" />
            <text x="448" y="90" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">Cylinder</text>
            <text x="448" y="108" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#334155">= tracks at same radius</text>
          </svg>
        </div>

        {/* Disk Access Time & Why Scheduling Matters */}
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-3.5 space-y-2">
          <p className="font-bold text-foreground font-mono text-xs uppercase tracking-wider">
            Disk Access Time Formula
          </p>
          <div className="rounded border border-primary/25 bg-primary/5 p-2.5 font-mono text-xs text-primary font-bold text-center">
            Disk Access Time = Seek Time + Rotational Latency + Transfer Time
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground leading-relaxed">
            <li>
              <b>Seek Time (dominant cost):</b> Time required to physically accelerate the mechanical arm and position the head over the desired cylinder (typically 3 to 10 ms).
            </li>
            <li>
              <b>Rotational Latency:</b> Time spent waiting for the target sector to rotate underneath the head. On average, it equals half a revolution.
            </li>
            <li>
              <b>Transfer Time:</b> Time required to stream data bytes as the sector passes under the head.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            Because mechanical arm movement is hundreds of times slower than electronic transfers, <b>seek time dominates total access time</b>. Under a simple model:
          </p>
          <div className="rounded border border-foreground/15 bg-paper p-2 font-mono text-xs text-center text-foreground font-bold">
            Total Seek Time ≈ Total Head Movement × Time per Cylinder
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When an operating system runs multiple processes, dozens of I/O requests wait in the queue at the same time. The order in which requests are serviced dramatically affects total head movement and system throughput.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "six-algorithms",
    t: "2. The Six Algorithms in this Unit",
    b: "This unit covers six classic disk scheduling algorithms: FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK. Each policy embodies a different tradeoff between seek distance, implementation overhead, and fairness.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
            <span className="font-bold text-primary font-mono uppercase">1. FCFS (First-Come, First-Served)</span>
            <p className="text-muted-foreground leading-relaxed">
              Services requests strictly in arrival order. Completely fair and starvation-free, but suffers from high head movement.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
            <span className="font-bold text-primary font-mono uppercase">2. SSTF (Shortest Seek Time First)</span>
            <p className="text-muted-foreground leading-relaxed">
              Always chooses the pending request closest to the current head. Drastically cuts seek distance, but can starve far-away cylinders.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
            <span className="font-bold text-primary font-mono uppercase">3. SCAN (Elevator Algorithm)</span>
            <p className="text-muted-foreground leading-relaxed">
              Sweeps continuously from boundary to boundary (0 to N−1), servicing all requests along the path, then reverses.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
            <span className="font-bold text-primary font-mono uppercase">4. C-SCAN (Circular SCAN)</span>
            <p className="text-muted-foreground leading-relaxed">
              Services requests in one direction only. Upon reaching the end, it jumps back to cylinder 0 without servicing, providing uniform wait times.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
            <span className="font-bold text-primary font-mono uppercase">5. LOOK</span>
            <p className="text-muted-foreground leading-relaxed">
              Optimized SCAN: reverses direction immediately at the last pending request instead of traveling all the way to cylinder 0 or N−1.
            </p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
            <span className="font-bold text-primary font-mono uppercase">6. C-LOOK</span>
            <p className="text-muted-foreground leading-relaxed">
              Optimized C-SCAN: jumps between the outermost pending requests rather than traveling to physical boundaries 0 and N−1.
            </p>
          </div>
        </div>

        {/* Head Path Mini Diagrams SVG */}
        <div className="rounded border-2 border-foreground/20 bg-paper p-3 text-center">
          <p className="font-mono text-xs font-bold text-foreground uppercase mb-2">
            Head Trajectory Patterns of the Six Algorithms
          </p>
          <svg
            viewBox="0 0 540 180"
            className="mx-auto w-full max-w-lg"
            role="img"
            aria-label="Visual trajectories comparing head paths of FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK"
          >
            {/* Grid 3 cols x 2 rows */}
            {/* Box 1: FCFS */}
            <rect x="10" y="10" width="165" height="75" rx="4" fill="#faf8f2" stroke="#101a28" strokeWidth="1.5" />
            <text x="20" y="26" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">FCFS</text>
            <polyline points="25,50 60,65 110,35 140,70 160,40" fill="none" stroke="#dc2626" strokeWidth="2" />
            <text x="20" y="78" fontFamily="sans-serif" fontSize="12" fill="#334155">Zig-zag traversal</text>

            {/* Box 2: SSTF */}
            <rect x="187" y="10" width="165" height="75" rx="4" fill="#faf8f2" stroke="#101a28" strokeWidth="1.5" />
            <text x="197" y="26" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">SSTF</text>
            <polyline points="240,55 250,50 260,60 210,40 330,70" fill="none" stroke="#16a34a" strokeWidth="2" />
            <text x="197" y="78" fontFamily="sans-serif" fontSize="12" fill="#334155">Greedy local jumps</text>

            {/* Box 3: SCAN */}
            <rect x="365" y="10" width="165" height="75" rx="4" fill="#faf8f2" stroke="#101a28" strokeWidth="1.5" />
            <text x="375" y="26" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">SCAN</text>
            <polyline points="390,55 460,35 520,30 400,70" fill="none" stroke="#2563eb" strokeWidth="2" />
            <text x="375" y="78" fontFamily="sans-serif" fontSize="12" fill="#334155">Sweeps to boundary</text>

            {/* Box 4: C-SCAN */}
            <rect x="10" y="95" width="165" height="75" rx="4" fill="#faf8f2" stroke="#101a28" strokeWidth="1.5" />
            <text x="20" y="111" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">C-SCAN</text>
            <polyline points="40,140 100,120 165,110" fill="none" stroke="#7c3aed" strokeWidth="2" />
            <line x1="165" y1="110" x2="15" y2="155" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3 3" />
            <polyline points="15,155 50,145" fill="none" stroke="#7c3aed" strokeWidth="2" />
            <text x="20" y="163" fontFamily="sans-serif" fontSize="12" fill="#334155">One-way + full return</text>

            {/* Box 5: LOOK */}
            <rect x="187" y="95" width="165" height="75" rx="4" fill="#faf8f2" stroke="#101a28" strokeWidth="1.5" />
            <text x="197" y="111" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">LOOK</text>
            <polyline points="215,145 280,125 330,120 205,160" fill="none" stroke="#0891b2" strokeWidth="2" />
            <text x="197" y="163" fontFamily="sans-serif" fontSize="12" fill="#334155">Reverses at last request</text>

            {/* Box 6: C-LOOK */}
            <rect x="365" y="95" width="165" height="75" rx="4" fill="#faf8f2" stroke="#101a28" strokeWidth="1.5" />
            <text x="375" y="111" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#101a28">C-LOOK</text>
            <polyline points="395,140 450,125 505,115" fill="none" stroke="#ea580c" strokeWidth="2" />
            <line x1="505" y1="115" x2="380" y2="155" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="3 3" />
            <polyline points="380,155 420,145" fill="none" stroke="#ea580c" strokeWidth="2" />
            <text x="375" y="163" fontFamily="sans-serif" fontSize="12" fill="#334155">One-way + trimmed jump</text>
          </svg>
        </div>
      </div>
    ),
  },
  {
    id: "fcfs",
    t: "3. First-Come, First-Served (FCFS)",
    b: "First-Come, First-Served is the simplest disk scheduling algorithm. Requests are placed into a FIFO queue and serviced in the exact chronological order of their arrival. It is completely fair and immune to starvation, but often produces excessive back-and-forth arm movement.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        {/* Worked Example 1 */}
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-3 font-mono text-xs">
          <p className="font-bold text-primary uppercase">
            Example 1: Standard Textbook Workload (200 Cylinders: 0 to 199)
          </p>
          <div className="text-muted-foreground space-y-1">
            <p>• Initial Head Position: <b>53</b></p>
            <p>• Request Queue: <b>98, 183, 37, 122, 14, 124, 65, 67</b></p>
            <p className="text-foreground font-bold">
              • Service Order: 53 → 98 → 183 → 37 → 122 → 14 → 124 → 65 → 67
            </p>
          </div>

          <div className="rounded border border-foreground/20 bg-paper p-3 space-y-1 text-foreground">
            <p className="font-bold">Step-by-Step Head Movements:</p>
            <p>|98 − 53| = 45</p>
            <p>|183 − 98| = 85</p>
            <p>|37 − 183| = 146</p>
            <p>|122 − 37| = 85</p>
            <p>|14 − 122| = 108</p>
            <p>|124 − 14| = 110</p>
            <p>|65 − 124| = 59</p>
            <p>|67 − 65| = 2</p>
            <div className="mt-2 pt-1 border-t border-foreground/15 font-bold text-primary">
              <p>Total Head Movement: 45 + 85 + 146 + 85 + 108 + 110 + 59 + 2 = 640 cylinders</p>
              <p>Average Seek: 640 / 8 = 80 cylinders per request</p>
            </div>
          </div>
        </div>

        {/* Worked Example 2 */}
        <div className="rounded border-2 border-foreground/20 bg-background/80 p-4 space-y-3 font-mono text-xs">
          <p className="font-bold text-foreground uppercase">
            Example 2: Seven-Request Workload (Head at 50)
          </p>
          <div className="text-muted-foreground space-y-1">
            <p>• Initial Head Position: <b>50</b></p>
            <p>• Request Queue: <b>82, 170, 43, 140, 24, 16, 190</b></p>
            <p className="text-foreground font-bold">
              • Service Order: 50 → 82 → 170 → 43 → 140 → 24 → 16 → 190
            </p>
          </div>

          <div className="rounded border border-foreground/20 bg-paper p-3 space-y-1 text-foreground">
            <p className="font-bold">Step-by-Step Head Movements:</p>
            <p>|82 − 50| = 32</p>
            <p>|170 − 82| = 88</p>
            <p>|43 − 170| = 127</p>
            <p>|140 − 43| = 97</p>
            <p>|24 − 140| = 116</p>
            <p>|16 − 24| = 8</p>
            <p>|190 − 16| = 174</p>
            <div className="mt-2 pt-1 border-t border-foreground/15 font-bold text-primary">
              <p>Total Head Movement: 32 + 88 + 127 + 97 + 116 + 8 + 174 = 642 cylinders</p>
              <p>Average Seek: 642 / 7 = 91.71 cylinders per request</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "sstf",
    t: "4. Shortest Seek Time First (SSTF)",
    b: "Shortest Seek Time First selects the pending request closest to the current head position. By greedily minimizing immediate seek distance, SSTF dramatically reduces total head travel compared to FCFS. However, it is not always globally optimal, and requests located on outer tracks can suffer starvation.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        {/* Worked Example 1 */}
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-3 font-mono text-xs">
          <p className="font-bold text-primary uppercase">
            Example 1: Initial Head 53, Queue [98, 183, 37, 122, 14, 124, 65, 67]
          </p>
          <div className="rounded border border-foreground/15 bg-paper p-3 space-y-1">
            <p className="font-bold text-foreground">Initial Distances from Head 53:</p>
            <p className="text-muted-foreground">
              98: 45 | 183: 130 | 37: 16 | 122: 69 | 14: 39 | 124: 71 | 65: 12 | 67: 14
            </p>
            <p className="font-bold text-primary pt-1">
              • Nearest to 53 is 65 (distance 12).
            </p>
          </div>

          <div className="rounded border border-foreground/15 bg-paper p-3 space-y-1 text-foreground">
            <p className="font-bold">Greedy Step-by-Step Trace:</p>
            <p>1. From 53 → <b>65</b> (movement = 12)</p>
            <p>2. From 65 → <b>67</b> (movement = 2)</p>
            <p>3. From 67 → <b>37</b> (dist 30) vs 98 (dist 31) → choose 37 (movement = 30)</p>
            <p>4. From 37 → <b>14</b> (movement = 23)</p>
            <p>5. From 14 → <b>98</b> (movement = 84)</p>
            <p>6. From 98 → <b>122</b> (movement = 24)</p>
            <p>7. From 122 → <b>124</b> (movement = 2)</p>
            <p>8. From 124 → <b>183</b> (movement = 59)</p>
            <div className="mt-2 pt-1 border-t border-foreground/15 font-bold text-primary">
              <p>Service Order: 65, 67, 37, 14, 98, 122, 124, 183</p>
              <p>Total Head Movement: 12 + 2 + 30 + 23 + 84 + 24 + 2 + 59 = 236 cylinders</p>
              <p>Average Seek: 236 / 8 = 29.5 cylinders per request</p>
            </div>
          </div>

          {/* Common Mistake Box */}
          <div className="rounded border-2 border-destructive/40 bg-destructive/5 p-3.5 space-y-1.5 text-xs">
            <p className="font-bold text-destructive font-mono uppercase">
              ★ Common Exam Mistake at Head 67:
            </p>
            <p className="text-muted-foreground leading-relaxed">
              When the head is at 67, students often hesitate between 37 and 98:
              <br />• Distance to 37: |37 − 67| = <b>30 cylinders</b>
              <br />• Distance to 98: |98 − 67| = <b>31 cylinders</b>
              <br />Because 30 &lt; 31, SSTF <b>must visit 37 next</b>! Picking 98 first is a common blunder that results in an incorrect total of <b>299 cylinders</b>.
            </p>
          </div>
        </div>

        {/* Worked Example 2 & 3 */}
        <div className="grid gap-3 sm:grid-cols-2 font-mono text-xs">
          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1.5">
            <span className="font-bold text-foreground uppercase">Example 2: Head 50, Eight Requests</span>
            <p className="text-muted-foreground text-[11px]">Queue: 176, 79, 34, 60, 92, 11, 41, 114</p>
            <p className="text-foreground">Order: 41, 34, 11, 60, 79, 92, 114, 176</p>
            <p className="text-muted-foreground text-[11px]">Movements: 9, 7, 23, 49, 19, 13, 22, 62</p>
            <p className="font-bold text-primary pt-1">Total: 204 cylinders (avg 25.5)</p>
          </div>

          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1.5">
            <span className="font-bold text-foreground uppercase">Example 3: Head 50, Seven Requests</span>
            <p className="text-muted-foreground text-[11px]">Queue: 82, 170, 43, 140, 24, 16, 190</p>
            <p className="text-foreground">Order: 43, 24, 16, 82, 140, 170, 190</p>
            <p className="text-muted-foreground text-[11px]">Movements: 7, 19, 8, 66, 58, 30, 20</p>
            <p className="font-bold text-primary pt-1">Total: 208 cylinders (avg 29.71)</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "scan",
    t: "5. SCAN (The Elevator Algorithm)",
    b: "In the SCAN algorithm (popularly called the elevator algorithm), the disk arm moves continuously in one direction toward a disk boundary, serving all requests along the path. Upon reaching the physical disk end (cylinder 0 or N−1), the arm reverses direction and services requests on the way back; the cycle repeats.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded border border-success/30 bg-success/5 p-3 space-y-1">
            <span className="font-bold text-success font-mono uppercase">Advantages</span>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              <li>Simple and robust logic.</li>
              <li>Completely prevents starvation.</li>
              <li>Yields fairly even response and waiting times.</li>
            </ul>
          </div>

          <div className="rounded border border-destructive/30 bg-destructive/5 p-3 space-y-1">
            <span className="font-bold text-destructive font-mono uppercase">Disadvantages</span>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              <li>Cylinders the head has just passed must wait almost a full round-trip.</li>
              <li>Arm travels all the way to the disk boundary even when no request is waiting there.</li>
            </ul>
          </div>
        </div>

        {/* Worked Example */}
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-2.5 font-mono text-xs">
          <p className="font-bold text-primary uppercase">
            Worked Example: Head 53 Moving Toward Higher Cylinders (0 to 199)
          </p>
          <p className="text-muted-foreground">
            Queue: <b>98, 183, 41, 122, 14, 124, 65, 67</b>
          </p>
          <div className="rounded border border-foreground/15 bg-paper p-3 space-y-1 text-foreground">
            <p>1. Upward sweep toward boundary 199: visits 65, 67, 98, 122, 124, 183, and reaches 199.</p>
            <p className="text-muted-foreground">Movement upward = 199 − 53 = 146 cylinders</p>
            <p>2. Arm reverses at 199, moves downward: visits 41, and stops at lowest request 14.</p>
            <p className="text-muted-foreground">Movement downward = 199 − 14 = 185 cylinders</p>
            <div className="mt-2 pt-1 border-t border-foreground/15 font-bold text-primary">
              <p>Total Head Movement = (199 − 53) + (199 − 14) = 146 + 185 = 331 cylinders</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <b>Note on 37 vs 41:</b> If request 41 is replaced with 37, the total head movement remains exactly <b>331 cylinders</b>, because 14 is still the lowest request reached on the return sweep ($199 − 14 = 185$).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "c-scan",
    t: "6. C-SCAN (Circular SCAN)",
    b: "Circular SCAN (C-SCAN) is an improved variant of SCAN designed to provide a more uniform waiting time distribution. The head serves requests in one direction only (e.g. toward higher cylinders). When it reaches the end, it immediately returns to the opposite end without serving any requests on the return trip, and restarts scanning in the original direction.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded border border-success/30 bg-success/5 p-3 space-y-1">
            <span className="font-bold text-success font-mono uppercase">Advantages</span>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              <li>Uniform waiting times: cylinders just visited do not wait for a full round-trip.</li>
              <li>More consistent response time across all tracks.</li>
            </ul>
          </div>

          <div className="rounded border border-destructive/30 bg-destructive/5 p-3 space-y-1">
            <span className="font-bold text-destructive font-mono uppercase">Disadvantages</span>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              <li>Higher total head movement than SCAN due to the return jump.</li>
              <li>Still travels all the way to physical boundaries 0 and N−1.</li>
            </ul>
          </div>
        </div>

        {/* Worked Example */}
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-2.5 font-mono text-xs">
          <p className="font-bold text-primary uppercase">
            Worked Example: Head 53 Toward Higher (0 to 199)
          </p>
          <p className="text-muted-foreground">
            Queue: <b>98, 183, 41, 122, 14, 124, 65, 67</b>
          </p>
          <div className="rounded border border-foreground/15 bg-paper p-3 space-y-1 text-foreground">
            <p>1. Upward sweep: from 53 to boundary 199 = 199 − 53 = 146</p>
            <p>2. Return jump: from 199 to boundary 0 = 199 − 0 = 199</p>
            <p>3. Second upward sweep: from 0 to request 41 = 41 − 0 = 41</p>
            <div className="mt-2 pt-1 border-t border-foreground/15 font-bold text-primary">
              <p>Total Head Movement (return jump counted) = 146 + 199 + 41 = 386 cylinders</p>
            </div>
          </div>
          <div className="rounded border border-foreground/15 bg-background/80 p-3 space-y-1 text-xs">
            <p className="font-bold text-foreground font-mono">Return Jump Convention Note:</p>
            <p className="text-muted-foreground leading-relaxed">
              Standard operating system theory counts the full return trip (yielding <b>386 cylinders</b>). However, some textbook authors exclude the return jump as pure seek overhead without servicing (yielding 146 + 41 = <b>187 cylinders</b>). On this website, you can toggle counting the return jump on or off with a single click.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "look-and-c-look",
    t: "7. LOOK and C-LOOK",
    b: "LOOK and C-LOOK are practical, industry-standard optimizations of SCAN and C-SCAN. In a production operating system, the disk arm does not blindly travel to the physical ends of the platter; instead, it looks ahead to see if any more requests are pending in the current direction.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
            <span className="font-bold text-primary font-mono uppercase">LOOK (Smart Reversal)</span>
            <p className="text-muted-foreground leading-relaxed">
              Functions like SCAN, but reverses direction immediately upon servicing the final request in the current direction, without traveling to cylinder 0 or N−1.
            </p>
          </div>

          <div className="rounded border border-foreground/20 bg-background/80 p-3 space-y-1">
            <span className="font-bold text-primary font-mono uppercase">C-LOOK (Circular LOOK)</span>
            <p className="text-muted-foreground leading-relaxed">
              Functions like C-SCAN, but jumps directly from the outermost request on one side to the outermost request on the other side, bypassing physical edges 0 and N−1.
            </p>
          </div>
        </div>

        {/* Worked Example */}
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-3 font-mono text-xs">
          <p className="font-bold text-primary uppercase">
            Worked Example: Head 53 Toward Higher, Queue [98, 183, 37, 122, 14, 124, 65, 67]
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-foreground/15 bg-paper p-3 space-y-1 text-foreground">
              <p className="font-bold text-primary">1. LOOK Trace:</p>
              <p>• Upward to last request: 183 − 53 = 130</p>
              <p>• Reverse to lowest request: 183 − 14 = 169</p>
              <p className="font-bold text-foreground pt-1">
                Total Movement = 130 + 169 = 299 cylinders
              </p>
            </div>

            <div className="rounded border border-foreground/15 bg-paper p-3 space-y-1 text-foreground">
              <p className="font-bold text-primary">2. C-LOOK Trace:</p>
              <p>• Upward to last request: 183 − 53 = 130</p>
              <p>• Jump to lowest request: 183 − 14 = 169</p>
              <p>• Upward to request 37: 37 − 14 = 23</p>
              <p className="font-bold text-foreground pt-1">
                Total (jump counted) = 130 + 169 + 23 = 322 cylinders
              </p>
              <p className="text-muted-foreground text-[11px]">(Without jump: 130 + 23 = 153)</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic pt-1">
            These two are in the syllabus; check them against your teacher's slides.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "direction-matters",
    t: "8. Why Direction Matters",
    b: "Because SCAN, C-SCAN, LOOK, and C-LOOK are directional algorithms, their total head travel and service order change fundamentally depending on whether the arm is initially moving toward higher or lower cylinders. FCFS and SSTF do not use an arm direction.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <p className="text-xs text-muted-foreground leading-relaxed">
          The table below demonstrates how starting direction dramatically impacts seek distance for the same seven-request workload (Head at 50, Queue: <b>82, 170, 43, 140, 24, 16, 190</b>, 200 cylinders, return jump counted):
        </p>

        <div className="overflow-x-auto rounded border border-foreground/20">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-foreground/5 font-mono text-[11px] text-foreground uppercase border-b border-foreground/15">
              <tr>
                <th className="p-2.5">Algorithm</th>
                <th className="p-2.5">Toward Higher Cylinders</th>
                <th className="p-2.5">Toward Lower Cylinders</th>
                <th className="p-2.5">Direction Sensitivity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10 text-xs font-mono">
              <tr>
                <td className="p-2.5 font-bold text-primary">FCFS</td>
                <td className="p-2.5">642 cyl</td>
                <td className="p-2.5">642 cyl</td>
                <td className="p-2.5 text-muted-foreground font-sans">None (pure arrival order)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-primary">SSTF</td>
                <td className="p-2.5">208 cyl</td>
                <td className="p-2.5">208 cyl</td>
                <td className="p-2.5 text-muted-foreground font-sans">None (pure distance)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-primary">SCAN</td>
                <td className="p-2.5">332 cyl</td>
                <td className="p-2.5 text-success font-bold">240 cyl</td>
                <td className="p-2.5 text-foreground font-sans">Saves 92 cyl moving down!</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-primary">C-SCAN</td>
                <td className="p-2.5">391 cyl</td>
                <td className="p-2.5">366 cyl</td>
                <td className="p-2.5 text-foreground font-sans">Saves 25 cyl moving down</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-primary">LOOK</td>
                <td className="p-2.5">314 cyl</td>
                <td className="p-2.5 text-success font-bold">208 cyl</td>
                <td className="p-2.5 text-foreground font-sans">Ties SSTF moving down!</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-primary">C-LOOK</td>
                <td className="p-2.5">341 cyl</td>
                <td className="p-2.5">316 cyl</td>
                <td className="p-2.5 text-foreground font-sans">Saves 25 cyl moving down</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded border-2 border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <b>Key Takeaway:</b> When moving toward lower cylinders, SSTF and LOOK produce the exact same service order (43, 24, 16, 82, 140, 170, 190) and the exact same total movement of <b>208 cylinders</b>, resulting in a tie!
        </div>
      </div>
    ),
  },
  {
    id: "rules-used-on-this-site",
    t: "9. Rules Used on this Site",
    b: "To guarantee exact mathematical consistency across our interactive simulator, comparison verdicts, and practice problem solver, these deterministic conventions are followed:",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-2.5">
          <p className="font-bold text-primary font-mono text-xs uppercase tracking-wider">
            ★ Deterministic Simulation Conventions:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground leading-relaxed">
            <li>
              <b>Return Jump Counted by Default:</b> In C-SCAN and C-LOOK, the return jump across the disk is counted in total head movement by default. Both simulator and comparison pages offer a toggle switch to exclude the jump if your curriculum leaves it out.
            </li>
            <li>
              <b>SSTF Tie-Breaking:</b> When multiple pending requests are equidistant from the current head position, ties are broken deterministically in favor of whichever request appears earlier in the input queue.
            </li>
            <li>
              <b>Physical Boundary Travel in SCAN &amp; C-SCAN:</b> SCAN and C-SCAN always travel all the way to the boundary cylinder (cylinder N−1 when moving up, cylinder 0 when moving down), even if no request exists at the boundary.
            </li>
            <li>
              <b>Immediate Service at Head Position:</b> If a pending request is located at the head's exact current cylinder, it is serviced immediately with 0 cylinders of head movement.
            </li>
            <li>
              <b>Zero-Indexed Cylinders:</b> Cylinders are indexed from 0 to N−1 (e.g. 0 to 199 for a standard 200-cylinder disk).
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "summary-and-exam-tips",
    t: "10. Summary Table & Exam Tips",
    b: "Review this comparative summary of all six algorithms and key exam pitfalls before your operating systems exam:",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="overflow-x-auto rounded border border-foreground/20">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-foreground/5 font-mono text-[11px] text-foreground uppercase border-b border-foreground/15">
              <tr>
                <th className="p-2">Algorithm</th>
                <th className="p-2">Selection Rule</th>
                <th className="p-2">Directional?</th>
                <th className="p-2">Visits Ends?</th>
                <th className="p-2">Starvation?</th>
                <th className="p-2">Main Drawback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10 text-xs">
              <tr>
                <td className="p-2 font-bold text-primary">FCFS</td>
                <td className="p-2">Arrival order (FIFO)</td>
                <td className="p-2">No</td>
                <td className="p-2">No</td>
                <td className="p-2 text-success font-bold">No</td>
                <td className="p-2">Excessive seek travel (convoy)</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">SSTF</td>
                <td className="p-2">Closest to current head</td>
                <td className="p-2">No</td>
                <td className="p-2">No</td>
                <td className="p-2 text-destructive font-bold">Yes</td>
                <td className="p-2">Starvation of edge cylinders</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">SCAN</td>
                <td className="p-2">Elevator sweep &amp; reverse</td>
                <td className="p-2">Yes</td>
                <td className="p-2">Yes (0 &amp; N−1)</td>
                <td className="p-2 text-success font-bold">No</td>
                <td className="p-2">Long wait for cylinders just passed</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">C-SCAN</td>
                <td className="p-2">One-way sweep + circular jump</td>
                <td className="p-2">Yes</td>
                <td className="p-2">Yes (0 &amp; N−1)</td>
                <td className="p-2 text-success font-bold">No</td>
                <td className="p-2">Extra return jump movement</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">LOOK</td>
                <td className="p-2">Sweep to outermost request</td>
                <td className="p-2">Yes</td>
                <td className="p-2">No</td>
                <td className="p-2 text-success font-bold">No</td>
                <td className="p-2">Slightly less uniform wait than C-LOOK</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">C-LOOK</td>
                <td className="p-2">One-way sweep + trimmed jump</td>
                <td className="p-2">Yes</td>
                <td className="p-2">No</td>
                <td className="p-2 text-success font-bold">No</td>
                <td className="p-2">Extra return jump movement</td>
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
              <b>Write the whole path first:</b> Write down the entire sequence of serviced cylinders before performing any addition or subtraction!
            </li>
            <li>
              <b>Don't forget the initial head start:</b> Always calculate movement from the initial head position to the first served cylinder (e.g. |65 − 53| = 12).
            </li>
            <li>
              <b>SCAN vs LOOK boundaries:</b> SCAN and C-SCAN touch the physical boundary cylinder (0 or N−1). LOOK and C-LOOK reverse or jump at the outermost request!
            </li>
            <li>
              <b>Check return jump counting:</b> Look at exam instructions carefully to see whether the return trip in C-SCAN and C-LOOK is counted or omitted.
            </li>
            <li>
              <b>SSTF distance recalculation:</b> In SSTF, always compare distances from the <i>current</i> head position after every single move; never measure from the starting head position!
            </li>
          </ul>
        </div>
      </div>
    ),
  },
];
