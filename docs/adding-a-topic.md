# Adding a New Topic to OS Playground

This guide outlines the standard architectural pattern for adding a 5th Operating Systems topic (e.g. *Page Replacement: FIFO, LRU, Optimal* or *File System Allocation: Contiguous, Linked, Indexed*).

---

## Architecture Principles

1. **Zero External Backend**: All state, transitions, and calculations run client-side.
2. **Pure Algorithmic Logic**: All core calculations must reside in pure TypeScript functions under `src/lib/*.ts`, completely decoupled from React hooks and DOM APIs.
3. **Automated Unit Tests**: Never hardcode execution traces or benchmark outputs. Test every edge case in `src/test/*.test.ts`.
4. **Notebook Aesthetic**: Maintain the chalkboard green hero header, paper-card panels, and cream control bars.

---

## Step-by-Step Implementation

### Step 1: Implement the Pure Algorithmic Engine (`src/lib/<topic>.ts`)
- Define TypeScript input types (workloads, parameters) and result types.
- Export deterministic simulation functions (e.g. `runPageReplacement(...)`).
- Export comparison and best-algorithm verdict logic (e.g. `pickBest(...)`).

### Step 2: Write Comprehensive Unit Tests (`src/test/<topic>.test.ts`)
- Verify mathematical correctness against standard OS textbook examples.
- Test edge cases (0 entries, single entry, ties, duplicates, out-of-range inputs).
- Run `npm test` to confirm tests pass.

### Step 3: Register in the Central Registry (`src/lib/topics.ts`)
Add your topic to `OS_TOPICS`:
```ts
{
  slug: "page-replacement",
  title: "Page Replacement",
  shortTitle: "Paging",
  description: "FIFO, LRU, Optimal & Clock algorithms",
  color: "bg-highlight/60",
  rotation: "-2deg",
  ready: true,
  notesReady: true,
  quizReady: true,
  lectureLabel: "OPERATING SYSTEMS · VIRTUAL MEMORY",
  tagline: "Fewer faults ⇒ higher throughput",
  simulatorLink: "/page-replacement/simulator",
  notesLink: "/notes/page-replacement",
  unitLabel: "Unit III · Virtual Memory",
  quote: "“Belady's anomaly shows more frames can sometimes cause more faults.”",
  hubEntries: [
    { num: "1.", title: "Learn", desc: "Frames, reference strings and faults", to: "/notes/page-replacement" },
    { num: "2.", title: "Simulator", desc: "Step through frame allocations", to: "/page-replacement/simulator" },
    { num: "3.", title: "Comparison", desc: "Which algorithm yields fewest faults?", to: "/comparison/page-replacement" },
    { num: "4.", title: "Pop Quiz", desc: "Test before the exam", to: "/quiz/page-replacement" },
  ],
}
```

### Step 4: Create Routes
1. **Topic Hub**: `src/routes/<topic>.index.tsx`
   - Uses `<TopicHub title={topic.title} lectureLabel={`${topic.lectureLabel} · Table of Contents`} ... />`
2. **Interactive Simulator**: `src/routes/<topic>.simulator.tsx`
   - Includes chalkboard control bar ("Play", "Step", "Calculations", "Reset").
   - Back link to `/<topic>`.
3. **Side-by-Side Comparison Bench**: `src/routes/comparison.<topic>.tsx`
   - Runs all algorithms simultaneously on the identical reference workload.
   - Computes best-algorithm verdict deterministically.
   - Back link to `/<topic>`.
4. **Visual Lecture Notes**: `src/routes/notes.<topic>.tsx`
   - Notebook-style card viewer with print button (`window.print()`).
   - Back link to `/<topic>`.
5. **Pop Quiz**: `src/routes/quiz.<topic>.tsx`
   - Multiple-choice questions with instant explanation feedback.
   - Back link to `/<topic>`.

### Step 5: Verify Metadata and Tests
- Confirm unique page titles: `Page Name | OS Playground`.
- Run full test suite: `npm test`.
- Build for production: `npm run build`.
