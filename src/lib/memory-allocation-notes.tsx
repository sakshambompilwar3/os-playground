import type { ReactNode } from "react";

export interface MemoryNoteCard {
  id: string;
  t: string;
  b: string;
  extra?: ReactNode;
}

export const MEMORY_ALLOCATION_NOTES: MemoryNoteCard[] = [
  {
    id: "what-is-memory-allocation",
    t: "1. What is Memory Allocation?",
    b: "Main memory (RAM) is the central workspace where both the operating system kernel and user processes must coexist. In contiguous memory allocation, each process requires a single unbroken, continuous range of memory addresses to run.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">Core OS responsibilities:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <b>Track status:</b> Keep an accurate ledger of which address ranges are allocated to processes and which are free.
            </li>
            <li>
              <b>Enforce protection:</b> Ensure user processes cannot access or overwrite the kernel or each other&apos;s memory segments.
            </li>
            <li>
              <b>Satisfy requests:</b> Carve out memory chunks quickly as processes arrive, and reclaim them cleanly upon exit.
            </li>
          </ul>
        </div>
        <p className="font-hand text-xl text-accent-foreground">
          ✎ <b>Contiguous rule:</b> A process needing 200 KB cannot be split across two 100 KB chunks — it must find one single 200 KB hole!
        </p>
      </div>
    ),
  },
  {
    id: "fixed-partitioning",
    t: "2. Fixed (Static) Partitioning",
    b: "In fixed partitioning, system memory is divided into fixed blocks (either equal or unequal sizes) before any user process arrives. Partitions never change in size or boundary during system operation.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">Key characteristics & limitations:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <b>One process per block:</b> Even if a block is 500 KB and a process only needs 200 KB, the entire block is reserved. No other process may enter.
            </li>
            <li>
              <b>Hard degree of multiprogramming:</b> If there are <i>k</i> partitions, at most <i>k</i> processes can reside in memory simultaneously.
            </li>
            <li>
              <b>Size ceiling:</b> A process larger than the single largest partition cannot run at all without overlay techniques.
            </li>
            <li>
              <b>Internal fragmentation:</b> Any unused space inside an assigned partition is completely wasted.
            </li>
          </ul>
        </div>

        {/* Hand-drawn style SVG diagram of Fixed Partitioning with hatched internal frag */}
        <div className="rounded border border-foreground/20 bg-card p-3">
          <p className="font-mono text-xs font-bold text-muted-foreground mb-2">
            Diagram: Fixed partitions with internal fragmentation
          </p>
          <svg viewBox="0 0 540 100" className="w-full text-foreground" aria-hidden>
            <defs>
              <pattern id="diag-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              </pattern>
            </defs>
            {/* Block 1: 100 KB (Free) */}
            <rect x="10" y="25" width="70" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
            <text x="45" y="45" textAnchor="middle" className="font-mono text-[10px] font-bold" fill="currentColor">B1 (100K)</text>
            <text x="45" y="58" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">free</text>

            {/* Block 2: 500 KB (Occupied: 212K process + 288K internal frag) */}
            <rect x="85" y="25" width="85" height="40" fill="var(--highlight)" stroke="currentColor" strokeWidth="2" />
            <text x="127" y="45" textAnchor="middle" className="font-sans text-[10px] font-bold" fill="var(--foreground)">P1 (212K)</text>
            <rect x="170" y="25" width="115" height="40" fill="url(#diag-hatch)" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
            <text x="227" y="45" textAnchor="middle" className="font-mono text-[9px] font-bold" fill="currentColor">Internal Frag</text>
            <text x="227" y="58" textAnchor="middle" className="font-mono text-[9px]" fill="currentColor">288 KB wasted</text>

            {/* Block 3: 200 KB */}
            <rect x="290" y="25" width="80" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
            <text x="330" y="49" textAnchor="middle" className="font-mono text-[10px] font-bold" fill="currentColor">B3 (200K)</text>

            {/* Block 4: 300 KB */}
            <rect x="375" y="25" width="150" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
            <text x="450" y="49" textAnchor="middle" className="font-mono text-[10px] font-bold" fill="currentColor">B4 (300K)</text>

            {/* Memory addresses */}
            <text x="10" y="80" className="font-mono text-[9px]" fill="currentColor">0 KB</text>
            <text x="85" y="80" className="font-mono text-[9px]" fill="currentColor">100K</text>
            <text x="285" y="80" className="font-mono text-[9px]" fill="currentColor">600K</text>
            <text x="370" y="80" className="font-mono text-[9px]" fill="currentColor">800K</text>
            <text x="525" y="80" className="font-mono text-[9px]" fill="currentColor">1100K</text>
          </svg>
        </div>
      </div>
    ),
  },
  {
    id: "dynamic-partitioning",
    t: "3. Dynamic (Variable) Partitioning",
    b: "Dynamic partitioning avoids pre-cut block boundaries. Instead, whenever a process arrives, the operating system carves out a block with exactly the process&apos;s requested size from an existing free hole. Zero space is wasted inside the allocated partition.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">How holes evolve:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <b>Exact fit:</b> A 212 KB process placed in a 500 KB hole uses exactly 212 KB.
            </li>
            <li>
              <b>Hole splitting:</b> The remaining 288 KB stays in the exact same spot as a smaller, free hole ready for the next process.
            </li>
            <li>
              <b>No internal fragmentation:</b> Internal fragmentation is <b>0 KB</b> by definition.
            </li>
            <li>
              <b>External fragmentation appears:</b> As processes terminate at different times, memory becomes peppered with non-contiguous holes of assorted sizes.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "fragmentation",
    t: "4. Fragmentation: Internal vs. External",
    b: "Fragmentation is the waste of memory capacity. It comes in two distinct forms that students often mix up on exams:",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="grid gap-3 sm:grid-cols-2 font-mono text-xs">
          <div className="rounded border-2 border-foreground/25 bg-background/80 p-3">
            <span className="font-bold text-primary text-sm">Internal Fragmentation</span>
            <p className="mt-1 font-sans text-foreground">
              <b>Formula:</b> Block Size − Process Size
            </p>
            <p className="mt-1 text-muted-foreground">
              Occurs in <b>fixed partitioning</b>. Space is inside an assigned block but unused by the process.
            </p>
          </div>
          <div className="rounded border-2 border-foreground/25 bg-background/80 p-3">
            <span className="font-bold text-primary text-sm">External Fragmentation</span>
            <p className="mt-1 font-sans text-foreground">
              <b>Formula:</b> Total Free ≥ Request, but Max Hole &lt; Request
            </p>
            <p className="mt-1 text-muted-foreground">
              Occurs in <b>dynamic partitioning</b>. Free memory exists, but is fragmented into holes too small to satisfy the contiguous request.
            </p>
          </div>
        </div>

        {/* Small diagram of scattered holes */}
        <div className="rounded border border-foreground/20 bg-card p-3">
          <p className="font-mono text-xs font-bold text-muted-foreground mb-2">
            Diagram: External fragmentation (Total free = 300 KB, but a 250 KB process cannot fit!)
          </p>
          <svg viewBox="0 0 540 80" className="w-full text-foreground" aria-hidden>
            {/* Hole 1: 100 KB */}
            <rect x="10" y="20" width="80" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
            <text x="50" y="42" textAnchor="middle" className="font-mono text-[10px] font-bold" fill="currentColor">Hole 100K</text>

            {/* Proc A: 150 KB */}
            <rect x="95" y="20" width="110" height="36" fill="var(--highlight)" stroke="currentColor" strokeWidth="2" />
            <text x="150" y="42" textAnchor="middle" className="font-sans text-[10px] font-bold" fill="var(--foreground)">App A (150K)</text>

            {/* Hole 2: 80 KB */}
            <rect x="210" y="20" width="70" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
            <text x="245" y="42" textAnchor="middle" className="font-mono text-[10px] font-bold" fill="currentColor">Hole 80K</text>

            {/* Proc B: 120 KB */}
            <rect x="285" y="20" width="100" height="36" fill="var(--highlight)" stroke="currentColor" strokeWidth="2" />
            <text x="335" y="42" textAnchor="middle" className="font-sans text-[10px] font-bold" fill="var(--foreground)">App B (120K)</text>

            {/* Hole 3: 120 KB */}
            <rect x="390" y="20" width="140" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
            <text x="460" y="42" textAnchor="middle" className="font-mono text-[10px] font-bold" fill="currentColor">Hole 120K</text>
          </svg>
        </div>

        <div className="rounded border border-foreground/20 bg-background/60 p-3 space-y-1 text-xs">
          <p>
            • <b>How to fix external fragmentation?</b> In dynamic partitioning, <b>Compaction</b> shuffles all running processes to one side, uniting the holes.
          </p>
          <p>
            • <b>How to avoid it entirely?</b> Modern operating systems use <b>Paging</b> (covered in later lectures), allowing a process&apos;s memory to be non-contiguous.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "placement-strategies",
    t: "5. Placement Strategies",
    b: "When a new process requests memory, how does the OS choose which free hole to assign? There are four classical algorithms, each making a different trade-off:",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="space-y-3">
          {/* First Fit */}
          <div className="rounded border-2 border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-sm">1. First Fit</span>
            <p className="mt-1 text-muted-foreground">
              <b>Rule:</b> Scans memory starting from address 0 and assigns the <b>first hole</b> that is large enough.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-success-foreground font-bold">Advantage:</span> Extremely fast and low overhead (stops at first match).<br />
              <span className="text-destructive font-bold">Disadvantage:</span> Tends to leave a crowd of small, unusable holes near low memory addresses.
            </p>
          </div>

          {/* Best Fit */}
          <div className="rounded border-2 border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-sm">2. Best Fit</span>
            <p className="mt-1 text-muted-foreground">
              <b>Rule:</b> Scans <b>every hole</b> in memory and selects the <b>smallest hole</b> that fits (ties broken by lowest address).
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-success-foreground font-bold">Advantage:</span> Preserves large holes for future large processes.<br />
              <span className="text-destructive font-bold">Disadvantage:</span> Must search the entire list, and creates tiny leftover slivers that are nearly impossible to reuse.
            </p>
          </div>

          {/* Worst Fit */}
          <div className="rounded border-2 border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-sm">3. Worst Fit</span>
            <p className="mt-1 text-muted-foreground">
              <b>Rule:</b> Scans <b>every hole</b> in memory and selects the <b>largest hole</b> (ties broken by lowest address).
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-success-foreground font-bold">Advantage:</span> The leftover space is large and more likely to be reusable.<br />
              <span className="text-destructive font-bold">Disadvantage:</span> Rapidly dismantles the biggest holes; subsequent large processes almost always fail. Generally the weakest strategy.
            </p>
          </div>

          {/* Next Fit */}
          <div className="rounded border-2 border-foreground/20 bg-background/80 p-3">
            <span className="font-bold text-primary font-mono text-sm">4. Next Fit</span>
            <p className="mt-1 text-muted-foreground">
              <b>Rule:</b> Identical to First Fit, but starts scanning from the <b>location of the previous allocation</b> (wrapping around once).
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-success-foreground font-bold">Advantage:</span> Spreads allocations evenly across the memory span, reducing low-memory clutter.<br />
              <span className="text-destructive font-bold">Disadvantage:</span> Frequently splits large holes situated near the end of memory.
            </p>
          </div>
        </div>

        <p className="font-hand text-xl text-primary">
          ⚠️ <b>Crucial realization:</b> No strategy is best for every input! The winning algorithm depends completely on the request sizes and their arrival order.
        </p>
      </div>
    ),
  },
  {
    id: "compaction",
    t: "6. Compaction",
    b: "Compaction is the process of physically moving all allocated processes in memory toward one end (typically address 0) so that all scattered free holes coalesce into a single large continuous hole at the opposite end.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3">
          <p className="font-bold text-foreground">When is compaction possible?</p>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <b>Only in dynamic partitioning:</b> Fixed partitions have rigid boundaries and cannot be moved or merged.
            </li>
            <li>
              <b>Requires dynamic relocation:</b> Process code and data must use base and limit registers so address binding can happen dynamically at runtime when memory is shifted.
            </li>
            <li>
              <b>Heavy performance cost:</b> Copying hundreds of megabytes of process memory takes CPU cycles, pauses application execution, and burns bus bandwidth.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "worked-example",
    t: "7. Worked Example (Textbook Benchmark)",
    b: "Consider the classic Silberschatz textbook problem: initial memory blocks of 100, 500, 200, 300, and 600 KB with processes requesting 212, 417, 112, and 426 KB in that order under dynamic partitioning.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="paper-card overflow-hidden">
          <div className="border-b border-foreground/15 bg-paper px-3 py-2">
            <span className="font-bold text-xs uppercase font-mono">Best Fit Step-by-Step (All 4 placed!)</span>
          </div>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-foreground/15 text-left text-muted-foreground">
                <th className="px-3 py-2">Process</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Chosen Block</th>
                <th className="px-3 py-2">Leftover Hole</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-foreground/10">
                <td className="px-3 py-2 font-bold">P1</td>
                <td className="px-3 py-2">212 KB</td>
                <td className="px-3 py-2">300 KB block</td>
                <td className="px-3 py-2 text-success-foreground font-bold">88 KB</td>
              </tr>
              <tr className="border-t border-foreground/10">
                <td className="px-3 py-2 font-bold">P2</td>
                <td className="px-3 py-2">417 KB</td>
                <td className="px-3 py-2">500 KB block</td>
                <td className="px-3 py-2 text-success-foreground font-bold">83 KB</td>
              </tr>
              <tr className="border-t border-foreground/10">
                <td className="px-3 py-2 font-bold">P3</td>
                <td className="px-3 py-2">112 KB</td>
                <td className="px-3 py-2">200 KB block</td>
                <td className="px-3 py-2 text-success-foreground font-bold">88 KB</td>
              </tr>
              <tr className="border-t border-foreground/10">
                <td className="px-3 py-2 font-bold">P4</td>
                <td className="px-3 py-2">426 KB</td>
                <td className="px-3 py-2">600 KB block</td>
                <td className="px-3 py-2 text-success-foreground font-bold">174 KB</td>
              </tr>
            </tbody>
          </table>
          <div className="p-2.5 font-mono text-[11px] text-muted-foreground bg-background/50">
            Holes remaining after Best Fit: 100, 83, 88, 88, 174 KB. Total free: 533 KB.
          </div>
        </div>

        <div className="rounded border-2 border-destructive/40 bg-destructive/5 p-3 space-y-1">
          <p className="font-bold text-destructive text-xs uppercase font-mono">
            Contrast: Why First Fit Fails on this Input
          </p>
          <p className="text-xs text-muted-foreground">
            • P1 (212 KB) enters 500 KB block (leftover = 288 KB)<br />
            • P2 (417 KB) enters 600 KB block (leftover = 183 KB)<br />
            • P3 (112 KB) enters 288 KB hole (leftover = 176 KB)<br />
            • When <b>P4 (426 KB)</b> arrives, remaining holes are 100, 176, 200, 300, and 183 KB. Total free memory is <b>959 KB</b>, but the largest hole is only <b>300 KB</b>!
          </p>
          <p className="font-hand text-lg font-bold text-destructive pt-1">
            Result: P4 must wait. That is textbook external fragmentation!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "strategy-summary-table",
    t: "8. Strategy Summary",
    b: "A quick side-by-side comparison matrix of the four contiguous placement strategies for easy revision:",
    extra: (
      <div className="mt-4 paper-card overflow-hidden font-sans text-sm">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-foreground/15 text-left text-muted-foreground bg-paper">
              <th className="px-3 py-2">Strategy</th>
              <th className="px-3 py-2">Search Rule</th>
              <th className="px-3 py-2">Search Speed</th>
              <th className="px-3 py-2">Main Drawback</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-foreground/10">
              <td className="px-3 py-2 font-bold text-primary">First Fit</td>
              <td className="px-3 py-2">First hole ≥ size from start</td>
              <td className="px-3 py-2 text-success-foreground font-bold">Fastest</td>
              <td className="px-3 py-2 text-muted-foreground">Leaves small holes near low memory</td>
            </tr>
            <tr className="border-t border-foreground/10">
              <td className="px-3 py-2 font-bold text-primary">Best Fit</td>
              <td className="px-3 py-2">Smallest hole ≥ size</td>
              <td className="px-3 py-2 text-warning-foreground font-bold">Slow (scans all)</td>
              <td className="px-3 py-2 text-muted-foreground">Generates tiny unusable leftover slivers</td>
            </tr>
            <tr className="border-t border-foreground/10">
              <td className="px-3 py-2 font-bold text-primary">Worst Fit</td>
              <td className="px-3 py-2">Largest hole ≥ size</td>
              <td className="px-3 py-2 text-warning-foreground font-bold">Slow (scans all)</td>
              <td className="px-3 py-2 text-muted-foreground">Destroys largest blocks early; worst in practice</td>
            </tr>
            <tr className="border-t border-foreground/10">
              <td className="px-3 py-2 font-bold text-primary">Next Fit</td>
              <td className="px-3 py-2">First hole ≥ size from last pointer</td>
              <td className="px-3 py-2 text-success-foreground font-bold">Fast</td>
              <td className="px-3 py-2 text-muted-foreground">Splits large blocks situated near the end</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "exam-tips",
    t: "9. Exam Tips & Common Mistakes",
    b: "Avoid these five trap questions commonly tested in OS university exams:",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-background/70 p-3 space-y-2">
          <div>
            <p className="font-bold text-primary font-mono text-xs">1. Using the wrong block order</p>
            <p className="text-xs text-muted-foreground">
              Always search holes in physical address sequence starting from address 0 KB, not by numerical block ID or arbitrary table sorting.
            </p>
          </div>
          <div>
            <p className="font-bold text-primary font-mono text-xs">2. Forgetting holes split in dynamic mode</p>
            <p className="text-xs text-muted-foreground">
              When a 212 KB process is placed into a 500 KB block, the leftover 288 KB immediately becomes an available free hole for subsequent processes!
            </p>
          </div>
          <div>
            <p className="font-bold text-primary font-mono text-xs">3. Mislabeling leftover holes as internal fragmentation</p>
            <p className="text-xs text-muted-foreground">
              Dynamic partitioning has <b>ZERO</b> internal fragmentation. The leftover space is an external hole, not trapped inside the process.
            </p>
          </div>
          <div>
            <p className="font-bold text-primary font-mono text-xs">4. Mixing units</p>
            <p className="text-xs text-muted-foreground">
              Keep block and process units consistent. Check whether numbers are in KB or MB (1 MB = 1024 KB in binary notation, or 1000 KB if specified by professor).
            </p>
          </div>
          <div>
            <p className="font-bold text-primary font-mono text-xs">5. Halting the simulation when a process waits</p>
            <p className="text-xs text-muted-foreground">
              If P2 cannot fit, mark P2 as <b>Waiting</b> and immediately proceed to try P3! A waiting process does not block the allocator from placing subsequent smaller processes.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];
