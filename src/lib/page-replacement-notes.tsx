import type { ReactNode } from "react";

export interface PageReplacementNoteCard {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
  takeaway?: string;
  extra?: ReactNode;
}

export const PAGE_REPLACEMENT_NOTES: PageReplacementNoteCard[] = [
  {
    id: "rationale",
    title: "1. Background & Rationale for Virtual Memory",
    subtitle: "Separating logical process memory from physical hardware RAM",
    content: [
      "Virtual memory separates user logical memory from physical hardware RAM. In older operating systems, an entire program had to be resident in physical memory before it could begin executing. Virtual memory removes this restriction: a program can run even if only small portions of its code and data currently reside in physical RAM.",
      "This architecture delivers four revolutionary benefits:",
      "1. Programs can be much larger than physical RAM: A process requiring 16 GB of address space can run seamlessly on a machine with only 4 GB of physical memory.",
      "2. Increased degree of multiprogramming: Because each process consumes only a fraction of its total address space in physical RAM, many more processes can reside in memory concurrently, drastically boosting CPU utilization.",
      "3. Faster program startup: Programs begin executing immediately after loading their entry routines, without waiting for hundreds of megabytes of binary code to load from disk.",
      "4. Simplified shared memory: Common system libraries (e.g. libc, DLLs) can be mapped into multiple processes' virtual address spaces while sharing a single physical copy in RAM.",
    ],
    takeaway: "The Principle of Locality makes virtual memory practical: Temporal Locality (recently referenced locations will be accessed soon) and Spatial Locality (locations near recent references will be accessed soon).",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-primary/25 bg-primary/5 p-3">
            <span className="font-bold text-primary font-mono text-xs uppercase">Temporal Locality</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              If an address is referenced, it will tend to be referenced again soon. Examples: loop execution variables, stack pointers, active subroutine instructions.
            </p>
          </div>
          <div className="rounded border border-primary/25 bg-primary/5 p-3">
            <span className="font-bold text-primary font-mono text-xs uppercase">Spatial Locality</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              If an address is referenced, adjacent addresses will tend to be referenced soon. Examples: sequential array traversal, linear instruction execution, matrix operations.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "demand-paging-page-table",
    title: "2. Demand Paging & The Page Table",
    subtitle: "Lazy loading, pages vs frames, and Page Table Entries (PTE)",
    content: [
      "In modern operating systems, virtual memory is implemented via Demand Paging. The process address space is carved into fixed-size blocks called Pages, while physical memory is carved into equal-sized slots called Frames (standard page size is 4 KB).",
      "Under pure demand paging, an executable starts with zero pages in physical memory. When the process begins executing, the very first instruction immediately triggers a page fault to bring in page 0. Pages are loaded lazily: a page is brought into physical RAM only when referenced.",
      "The Page Table is the hardware-indexed lookup structure that maps a process's virtual page numbers to physical frame numbers. Each Page Table Entry (PTE) contains several critical hardware flags:",
    ],
    takeaway: "Pages are logical blocks in the process; frames are physical slots in RAM. Demand paging loads pages on demand.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="grid gap-2.5 sm:grid-cols-2 font-mono text-xs">
          <div className="rounded border border-foreground/20 bg-background/80 p-2.5">
            <span className="font-bold text-primary">Frame Number (f)</span>
            <p className="text-muted-foreground text-[11px]">The base address of the physical RAM frame holding the page.</p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-2.5">
            <span className="font-bold text-primary">Valid / Invalid Bit (v)</span>
            <p className="text-muted-foreground text-[11px]">1 = resident in physical RAM; 0 = on backing store disk or illegal.</p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-2.5">
            <span className="font-bold text-primary">Dirty / Modify Bit (m)</span>
            <p className="text-muted-foreground text-[11px]">1 = page was modified in RAM; must be written back to disk on eviction.</p>
          </div>
          <div className="rounded border border-foreground/20 bg-background/80 p-2.5">
            <span className="font-bold text-primary">Protection Bits</span>
            <p className="text-muted-foreground text-[11px]">Read, Write, and Execute (NX/XD) access control permissions.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "virtual-address-translation",
    title: "3. Virtual Address Translation",
    subtitle: "Mathematical splitting: Page number and offset calculations",
    content: [
      "Every virtual address issued by the CPU is divided into two distinct components:",
      "1. Page number (p): used as an index into the process page table to find the corresponding physical frame number.",
      "2. Offset (d): the displacement within the page, combined directly with the base frame address to locate the exact byte.",
      "Mathematical split for page size S = 2^k bytes:",
      "• Page number p = address DIV page_size (or address >> k)",
      "• Page offset d = address MOD page_size (or address & ((1 << k) - 1))",
    ],
    takeaway: "Page size is always a power of 2, making translation a lightning-fast hardware bit-shift operation.",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        {/* Worked Example */}
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-4 space-y-3 font-mono text-xs">
          <p className="font-bold text-primary uppercase">
            Worked 14-Bit Address Example (Syllabus Classic):
          </p>
          <div className="text-muted-foreground space-y-1">
            <p>• Virtual Address Space = <b>16 KB</b> = 2^14 bytes → 14-bit virtual address.</p>
            <p>• Page Size = <b>2 KB</b> = 2048 bytes = 2^11 bytes → 11 bits reserved for offset (d).</p>
            <p>• Remaining bits for Page Number (p) = 14 − 11 = <b>3 bits</b> (2^3 = 8 pages, numbered 0 to 7).</p>
          </div>

          <div className="rounded border border-foreground/20 bg-paper p-3 space-y-1.5">
            <p className="font-bold text-foreground">Translating Virtual Address 3045:</p>
            <p>• p = 3045 DIV 2048 = <b>1</b> (Page 1)</p>
            <p>• d = 3045 MOD 2048 = <b>997</b> (Offset 997)</p>
            <div className="mt-2 rounded bg-foreground/5 p-2 text-center text-primary font-bold">
              Binary: 3045 = 001 01111100101₂ (p = 001₂ = 1, d = 01111100101₂ = 997)
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "page-table-structures",
    title: "4. Page Table Structures: Hierarchical, Inverted & Hashed",
    subtitle: "Scaling page tables to 32-bit and 64-bit address spaces",
    content: [
      "In modern 32-bit and 64-bit systems, a linear page table would be enormous. For a 32-bit system with 4 KB pages, the page table needs 2^20 entries (1 million entries × 4 bytes = 4 MB per process!). Operating systems structure page tables into three primary architectures:",
      "1. Hierarchical (Multilevel) Paging: Breaks the page table into multiple levels. In two-level paging on a 32-bit machine, the 32-bit address is split into: a 10-bit outer page number, a 10-bit inner page number, and a 12-bit offset (4 KB). Unused regions of virtual memory never have their inner page tables allocated, saving huge amounts of physical RAM.",
      "2. Inverted Page Table: Instead of one table per process with an entry for every virtual page, an Inverted Page Table has exactly one entry for each physical frame in RAM. Each entry records which process ID and virtual page currently occupy that frame. Drastically reduces memory overhead, but requires a hash table to avoid linear searching.",
      "3. Hashed Page Table: Common in address spaces larger than 32 bits. The virtual page number is hashed into a hash table containing linked lists of page elements to resolve collisions.",
    ],
    takeaway: "Hierarchical paging saves space by allocating inner tables only for active address regions.",
  },
  {
    id: "tlb",
    title: "5. Translation Lookaside Buffer (TLB)",
    subtitle: "Hardware associative cache accelerating virtual translation",
    content: [
      "Accessing a page table in physical memory doubles the number of memory operations: one memory read to fetch the Page Table Entry, and a second memory read to fetch the actual instruction or data! To solve this performance catastrophe, CPUs incorporate a high-speed associative hardware cache called the Translation Lookaside Buffer (TLB).",
      "• TLB Hit: The virtual page number is found in the TLB cache. The physical frame number is returned in a single clock cycle without touching RAM.",
      "• TLB Miss: The page number is missing from the TLB. The CPU must perform a page table walk in main memory, load the mapping into the TLB (evicting an old TLB entry), and retry.",
    ],
    takeaway: "The TLB delivers near-hardware-speed memory access by caching the most recently translated page-to-frame mappings.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-3.5 space-y-2 font-mono text-xs">
          <p className="font-bold text-primary uppercase">Effective Access Time (EAT) with TLB Formula:</p>
          <div className="rounded border border-primary/20 bg-background/90 p-2 text-center text-primary font-bold">
            EAT = α · (t_TLB + t_mem) + (1 − α) · (t_TLB + 2 · t_mem)
          </div>
          <p className="text-muted-foreground text-[11px]">
            Where α is the TLB hit ratio (typically 98%–99%), t_TLB is the cache search time (e.g. 1 ns), and t_mem is the physical RAM access time (e.g. 100 ns). With α = 0.98, EAT = 0.98(101) + 0.02(201) = 98.98 + 4.02 = 103 ns (only a 3% overhead!).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "translation-worked-example",
    title: "6. Translation & Page Fault Worked Example",
    subtitle: "Step-by-step trace: Translating addresses with a sample Page Table",
    content: [
      "Let's trace physical address translations and identify page faults on a realistic system.",
      "System parameters: Page size = 1024 bytes (1 KB). Address space has pages P0 through P5.",
      "Process Page Table State:",
      "• Page 0 → Frame 4 (valid)",
      "• Page 1 → Frame 7 (valid)",
      "• Page 2 → Invalid (not in memory)",
      "• Page 3 → Frame 2 (valid)",
      "• Page 4 → Invalid (not in memory)",
      "• Page 5 → Frame 0 (valid)",
    ],
    takeaway: "Valid bits map directly to physical frames; invalid bits immediately trigger an OS page fault exception.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-paper p-4 space-y-3 font-mono text-xs">
          <p className="font-bold text-foreground uppercase">Translate Three Target Addresses:</p>

          <div className="rounded border border-success/30 bg-background/80 p-2.5 space-y-1">
            <span className="font-bold text-success">a) Virtual Address 1052:</span>
            <p className="text-muted-foreground">• p = 1052 DIV 1024 = <b>1</b>, offset d = 1052 MOD 1024 = <b>28</b></p>
            <p className="text-muted-foreground">• Page Table lookup: Page 1 maps to <b>Frame 7</b> (valid).</p>
            <p className="font-bold text-foreground">
              → Physical Address = (Frame 7 × 1024) + 28 = 7168 + 28 = <b>7196</b>
            </p>
          </div>

          <div className="rounded border border-destructive/30 bg-background/80 p-2.5 space-y-1">
            <span className="font-bold text-destructive">b) Virtual Address 2221:</span>
            <p className="text-muted-foreground">• p = 2221 DIV 1024 = <b>2</b>, offset d = 2221 MOD 1024 = <b>173</b></p>
            <p className="text-muted-foreground">• Page Table lookup: Page 2 is <b>INVALID</b>!</p>
            <p className="font-bold text-destructive">
              → Result: PAGE FAULT! (Trap to OS kernel to fetch Page 2 from backing disk)
            </p>
          </div>

          <div className="rounded border border-success/30 bg-background/80 p-2.5 space-y-1">
            <span className="font-bold text-success">c) Virtual Address 5499:</span>
            <p className="text-muted-foreground">• p = 5499 DIV 1024 = <b>5</b>, offset d = 5499 MOD 1024 = <b>379</b></p>
            <p className="text-muted-foreground">• Page Table lookup: Page 5 maps to <b>Frame 0</b> (valid).</p>
            <p className="font-bold text-foreground">
              → Physical Address = (Frame 0 × 1024) + 379 = 0 + 379 = <b>379</b>
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "page-fault-handling",
    title: "7. Page Fault Handling Sequence",
    subtitle: "The 7-step hardware exception and kernel service cycle",
    content: [
      "When the CPU encounters a PTE with its valid bit set to 0, hardware generates an internal interrupt (trap) known as a Page Fault. The operating system handles the fault through a strict 7-step sequence:",
      "1. Trap to OS: The hardware suspends execution of the current instruction, saves the program counter and CPU registers onto the kernel stack, and jumps to the kernel's page-fault handler.",
      "2. Check validity: The kernel inspects its internal virtual memory tables. If the virtual address is completely illegal (out of bounds), the kernel raises a segmentation violation (`SIGSEGV`) and aborts the process. If it is a legitimate page not currently in memory, page fault service proceeds.",
      "3. Find backing disk location: The OS determines the block address of the required page on the swap partition or file system backing store.",
      "4. Allocate a free frame: The OS locates an unused physical frame in RAM. If all physical frames are occupied, it runs a Page Replacement Algorithm (FIFO, LRU, Clock) to select a resident victim frame.",
      "5. Write back victim if dirty: If the selected victim frame has its dirty/modify bit set to 1, its modified data must be written back to disk before reuse.",
      "6. Read desired page from disk: The OS issues a disk I/O request to load the requested page into the newly freed physical frame. The calling process is placed into the waiting state, and the CPU schedules another ready process.",
      "7. Update PTE and restart: Once disk I/O completes, an interrupt wakes the OS. The kernel writes the new physical frame number into the process's page table, sets the valid bit to 1, clears the dirty bit, and restarts the originally interrupted instruction at its exact saved instruction pointer.",
    ],
    takeaway: "Handling a page fault requires disk I/O, which is tens of thousands of times slower than physical RAM access.",
  },
  {
    id: "replacement-algorithms",
    title: "8. Page Replacement Algorithms & Approximations",
    subtitle: "FIFO, Optimal, LRU, Clock, and Enhanced Second-Chance (NRU)",
    content: [
      "When memory is full and a page fault occurs, page replacement picks which resident frame to evict. Operating system researchers have developed several classic policies:",
      "• FIFO (First-In, First-Out): Evicts the page that has been in memory the longest. Simple FIFO queue, but blind to recency and suffers from Belady's Anomaly.",
      "• Optimal (OPT / MIN): Evicts the page that will not be referenced for the longest period of time in the future. Provably guarantees the minimum possible page fault count. Unimplementable in real-time online systems because future accesses are unpredictable; used as an offline theoretical benchmark.",
      "• LRU (Least Recently Used): Evicts the page that has remained unreferenced for the longest time in the past. Replaces future prediction with past history via the principle of locality. A stack algorithm immune to Belady's anomaly. Perfect LRU requires expensive hardware support (timestamps or doubly-linked stacks on every single memory access).",
      "• Clock / Second-Chance: Practical hardware approximation of LRU. Treats frames as a circular list with a rotating clock hand. Each frame has a 1-bit hardware reference bit. When checking a victim: if reference bit is 0, evict it! If reference bit is 1, clear it to 0 ('second chance'), advance the clock hand, and inspect the next frame.",
      "• Enhanced Second-Chance (NRU - Not Recently Used): Evaluates both the Reference bit (r) and the Modify/Dirty bit (m) as an ordered pair (r, m) with four priority classes:",
    ],
    takeaway: "Real operating systems use Second-Chance (Clock) or Enhanced Clock to achieve near-LRU performance with trivial 1-bit hardware overhead.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-primary/25 bg-primary/5 p-3.5 space-y-2">
          <p className="font-bold text-primary font-mono text-xs uppercase">
            Enhanced Second-Chance (NRU) Four Classes (Best to Worst Victim):
          </p>
          <div className="grid gap-2 sm:grid-cols-2 font-mono text-xs">
            <div className="rounded border border-success/30 bg-background/80 p-2">
              <span className="font-bold text-success">Class (0, 0): Best Victim</span>
              <p className="text-[11px] text-muted-foreground">Neither recently used nor modified. Ideal to evict; no disk write needed.</p>
            </div>
            <div className="rounded border border-primary/30 bg-background/80 p-2">
              <span className="font-bold text-primary">Class (0, 1): Good Victim</span>
              <p className="text-[11px] text-muted-foreground">Not recently used, but modified. Requires disk write-back, but hasn't been accessed recently.</p>
            </div>
            <div className="rounded border border-warning/30 bg-background/80 p-2">
              <span className="font-bold text-warning">Class (1, 0): Poor Victim</span>
              <p className="text-[11px] text-muted-foreground">Recently used, but clean. Likely to be accessed again soon.</p>
            </div>
            <div className="rounded border border-destructive/30 bg-background/80 p-2">
              <span className="font-bold text-destructive">Class (1, 1): Worst Victim</span>
              <p className="text-[11px] text-muted-foreground">Recently used and modified. High disk write cost and actively in use!</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "benchmark-and-belady",
    title: "9. Worked Benchmark Example & Belady's Anomaly",
    subtitle: "Tracing 20 references on 3 frames, and proof of Belady's anomaly",
    content: [
      "Standard Syllabus 20-Reference Benchmark String: `7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1` with 3 physical frames:",
      "• FIFO: 15 Page Faults (5 hits, 25% hit ratio).",
      "• LRU: 12 Page Faults (8 hits, 40% hit ratio).",
      "• Optimal: 9 Page Faults (11 hits, 55% hit ratio).",
      "Optimal beats LRU by 3 faults, and LRU beats FIFO by 3 faults, confirming that past locality effectively approximates future optimality.",
      "Belady's Anomaly: You would intuitively expect that granting more physical frames to a process would decrease or preserve its page faults. In 1969, Laszlo Belady proved that under FIFO, increasing frames can paradoxically INCREASE page faults!",
    ],
    takeaway: "FIFO suffers from Belady's Anomaly because it ignores reference frequency and recency. LRU and Optimal are immune stack algorithms.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-destructive/30 bg-destructive/5 p-4 space-y-2 font-mono text-xs">
          <p className="font-bold text-destructive uppercase">
            Classic Proof: Reference String `1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5`
          </p>
          <div className="grid gap-3 sm:grid-cols-2 text-foreground">
            <div className="rounded border border-foreground/20 bg-paper p-3">
              <p className="font-bold">With 3 Frames:</p>
              <p className="text-muted-foreground text-[11px]">FIFO incurs exactly <b>9 page faults</b>.</p>
            </div>
            <div className="rounded border border-destructive/30 bg-paper p-3">
              <p className="font-bold text-destructive">With 4 Frames (33% More Memory):</p>
              <p className="text-destructive font-bold text-[11px]">FIFO incurs exactly <b>10 page faults</b>!</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Stack Algorithm Property: LRU and Optimal are mathematically immune to Belady's Anomaly because the set of pages in n frames is always a strict subset of the set of pages in n + 1 frames.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "frame-allocation-thrashing",
    title: "10. Allocation of Frames & Thrashing",
    subtitle: "Global vs Local replacement, Working Set Model, and page fault frequency",
    content: [
      "Operating systems must decide how many frames to allocate to each process. Every process requires a minimum number of frames defined by the computer's CPU instruction set architecture (e.g. an instruction with two indirect memory operands requires at least 3 frames simultaneously).",
      "Allocation Strategies: Equal allocation divides frames equally among all processes; Proportional allocation divides available frames based on each process's virtual size. Global replacement allows a process to pick victim frames from the entire system; Local replacement restricts a process to evicting only from its own allocated frames.",
      "Thrashing: If a process does not have enough frames to hold its active working set, it quickly page-faults. It evicts a page, but almost immediately needs that page back, causing another fault. When multiple processes thrash, the system spends 99% of its time paging to disk rather than executing instructions. CPU utilization collapses to near zero!",
    ],
    takeaway: "Thrashing occurs when the sum of process working sets exceeds total physical RAM. The OS must suspend a process to restore throughput.",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-primary/30 bg-primary/5 p-3.5 space-y-2">
          <p className="font-bold text-primary font-mono text-xs uppercase">
            Peter Denning's Working Set Model
          </p>
          <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <p>
              The <b>Working Set Window (Δ)</b> is a fixed parameter of recent page references (e.g. last 10,000 memory accesses). The <b>Working Set (WSS_i)</b> of process P_i is the set of unique pages referenced in the most recent window Δ.
            </p>
            <p>
              • Total Demand: <code className="font-mono text-foreground font-bold">D = ∑ WSS_i</code>
            </p>
            <p>
              • If <code className="font-mono text-foreground font-bold">D &gt; m</code> (where m is total physical memory frames), thrashing is imminent! The operating system prevents thrashing by <b>suspending (swapping out) an entire process</b>, freeing its frames to satisfy the working sets of remaining processes.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "effective-access-time",
    title: "11. Effective Access Time (EAT)",
    subtitle: "Calculating the massive quantitative performance penalty of page faults",
    content: [
      "Effective Access Time calculates the weighted average memory access time taking into account the probability of a page fault:",
      "Formula: EAT = (1 − p) · T_mem + p · T_fault",
      "Where p is the page fault rate (0 ≤ p ≤ 1), T_mem is the physical memory access time, and T_fault is the total page fault service time (trap overhead + disk read + restart).",
    ],
    takeaway: "Even a page fault rate of 0.1% can degrade system memory performance by over 40 times!",
    extra: (
      <div className="mt-4 space-y-3 font-sans text-sm">
        <div className="rounded border-2 border-foreground/20 bg-paper p-4 space-y-2 font-mono text-xs">
          <p className="font-bold text-foreground uppercase">Worked Syllabus Example:</p>
          <p className="text-muted-foreground">• Memory Access Time T_mem = <b>200 ns</b></p>
          <p className="text-muted-foreground">• Page Fault Service Time T_fault = <b>8 ms = 8,000,000 ns</b></p>
          <p className="text-muted-foreground">• Page Fault Rate p = <b>0.001</b> (1 fault in 1,000 accesses)</p>
          <div className="rounded border border-primary/30 bg-primary/10 p-2.5 text-foreground space-y-1">
            <p>EAT = (1 − 0.001) × 200 + 0.001 × 8,000,000</p>
            <p>EAT = 0.999 × 200 + 8,000 = 199.8 + 8,000 = <b>8,199.8 ns</b></p>
            <p className="text-destructive font-bold pt-1">
              Slowdown Factor: 8,199.8 / 200 ≈ 41× slower than physical RAM!
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "rules-used-on-this-site",
    title: "12. Rules Used on this Site",
    subtitle: "Exact deterministic conventions used by the simulator and practice solvers",
    content: [
      "When running the Page Replacement Simulator or solving practice problems on this platform, these strict deterministic rules govern execution:",
      "1. Cold-start compulsory faults: The initial filling of empty frames always counts as compulsory page faults.",
      "2. Sequential frame allocation: When empty frames are available, new pages are allocated sequentially into the lowest-numbered empty frame (Frame 1, then Frame 2, etc.).",
      "3. Hit updates: In LRU, a page hit updates that page's recency timestamp to the current step. In FIFO, hits do NOT alter frame order or page arrival times.",
      "4. Optimal tie-breaking: When multiple resident pages are never referenced again in the future reference string, the simulator tie-breaks deterministically by evicting whichever page has the earliest physical frame load timestamp.",
    ],
    takeaway: "These conventions guarantee that your calculations match the simulator and practice solutions down to the step.",
  },
  {
    id: "summary-and-exam-tips",
    title: "13. Summary Table & Exam Tips",
    subtitle: "High-yield review comparison and exam pitfalls",
    content: [
      "Review this summary comparison and mental checkpoints before your exam:",
    ],
    takeaway: "Remember: LRU updates timestamps on hits, but FIFO never does!",
    extra: (
      <div className="mt-4 space-y-4 font-sans text-sm">
        <div className="overflow-x-auto rounded border border-foreground/20">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-foreground/5 font-mono text-[11px] text-foreground uppercase border-b border-foreground/15">
              <tr>
                <th className="p-2">Algorithm</th>
                <th className="p-2">Eviction Rule</th>
                <th className="p-2">Belady's Anomaly?</th>
                <th className="p-2">Hardware Overhead</th>
                <th className="p-2">Real OS Practical?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10 text-xs">
              <tr>
                <td className="p-2 font-bold text-primary">FIFO</td>
                <td className="p-2">Oldest loaded page</td>
                <td className="p-2 text-destructive font-bold">Yes (Susceptible)</td>
                <td className="p-2">Minimal (queue)</td>
                <td className="p-2">Rarely alone</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">LRU</td>
                <td className="p-2">Unused longest past time</td>
                <td className="p-2 text-success font-bold">No (Stack algorithm)</td>
                <td className="p-2">High (counter/stack)</td>
                <td className="p-2">Too costly without approx</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">Optimal</td>
                <td className="p-2">Unused longest future time</td>
                <td className="p-2 text-success font-bold">No (Stack algorithm)</td>
                <td className="p-2">Future knowledge</td>
                <td className="p-2">Impossible (Benchmark)</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">Clock (2nd Chance)</td>
                <td className="p-2">Circular scan of ref bit</td>
                <td className="p-2 text-destructive font-bold">Yes (variant of FIFO)</td>
                <td className="p-2">Very Low (1 bit)</td>
                <td className="p-2 text-success font-bold">Yes (Widely used)</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-primary">Enhanced Clock</td>
                <td className="p-2">Class (r, m) ordered scan</td>
                <td className="p-2 text-destructive font-bold">Yes</td>
                <td className="p-2">Low (2 bits: ref &amp; dirty)</td>
                <td className="p-2 text-success font-bold">Yes (Mac, Linux, Windows)</td>
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
              <b>Hit update trap:</b> In LRU, ALWAYS update the page's recency position on a HIT. In FIFO, do NOT touch anything on a hit!
            </li>
            <li>
              <b>Cold miss counting:</b> Initial references to empty frames count as page faults! If you have 3 frames, the first 3 distinct pages are 3 faults.
            </li>
            <li>
              <b>Dirty bit eviction savings:</b> Clean pages (modify bit = 0) do not need to be written to disk on eviction; dirty pages (modify bit = 1) cost two I/O operations (write victim + read new page).
            </li>
            <li>
              <b>EAT units:</b> Memory access time is in nanoseconds (ns); fault time is in milliseconds (ms). Always convert ms to ns (multiply by 1,000,000) before computing EAT!
            </li>
          </ul>
        </div>
      </div>
    ),
  },
];
