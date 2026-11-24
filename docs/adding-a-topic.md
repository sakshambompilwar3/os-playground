# Adding a New Topic or Lab to OS Playground

This guide outlines the standard architectural pattern for adding a new Operating Systems topic (e.g. *File System Allocation*) or hands-on lab, following the established design pattern of the platform's 5 core topics (Banker's Algorithm, CPU Scheduling, Memory Allocation, Disk Scheduling, Page Replacement) and 3 labs (Deadlock Lab, Producer-Consumer Lab, Dining Philosophers Lab).

---

## Architecture Principles

1. **Zero External Backend**: All state, transitions, and calculations run client-side.
2. **Pure Algorithmic Logic**: All core calculations reside in pure TypeScript functions under `src/lib/*.ts` or `src/lib/labs/*.ts`, completely decoupled from React hooks and DOM APIs.
3. **Automated Unit Tests**: Never hardcode execution traces or benchmark outputs. Test every edge case in `src/test/*.test.ts`.
4. **Notebook Aesthetic**: Maintain the chalkboard green hero header, paper-card panels, and cream control bars.

---

## Adding a Topic

### Step 1: Implement the Pure Algorithmic Engine (`src/lib/<topic>.ts`)
- Define TypeScript input types (workloads, parameters) and result types.
- Export deterministic simulation functions.
- Export comparison and best-algorithm verdict logic.

### Step 2: Write Comprehensive Unit Tests (`src/test/<topic>.test.ts`)
- Verify mathematical correctness against standard OS textbook examples.
- Test edge cases (0 entries, single entry, ties, duplicates, out-of-range inputs).
- Run `npm test` to confirm tests pass.

### Step 3: Register in the Central Registry (`src/lib/topics.ts`)
Add the topic entry to `OS_TOPICS`:
```ts
{
  slug: "topic-slug",
  title: "Topic Name",
  shortTitle: "Short Name",
  description: "One line description",
  color: "bg-highlight/60",
  rotation: "-2deg",
  ready: true,
  notesReady: true,
  quizReady: true,
  lectureLabel: "OPERATING SYSTEMS · UNIT",
  tagline: "Short chalk motto",
  simulatorLink: "/topic-slug/simulator",
  notesLink: "/notes/topic-slug",
  unitLabel: "Unit X · Subject",
  hubEntries: [
    { num: "1.", title: "Learn", desc: "Theory with drawings", to: "/notes/topic-slug" },
    { num: "2.", title: "Simulator", desc: "Watch execution step by step", to: "/topic-slug/simulator" },
    { num: "3.", title: "Comparison", desc: "Which algorithm wins?", to: "/comparison/topic-slug" },
    { num: "4.", title: "Pop Quiz", desc: "Test before the exam", to: "/quiz/topic-slug" },
  ],
}
```

### Step 4: Create Routes
1. **Topic Hub**: `src/routes/<topic>.index.tsx`
2. **Interactive Simulator**: `src/routes/<topic>.simulator.tsx`
3. **Side-by-Side Comparison Bench**: `src/routes/comparison.<topic>.tsx`
4. **Visual Lecture Notes**: `src/routes/notes.<topic>.tsx` (derived directly from class syllabus material and standard textbooks in fresh student-friendly words, using hand-drawn SVG diagrams with accessible labels; no slide images stored). For example, Disk Scheduling notes follow verified class notes where available (including the rotational/transfer timing formulas and FCFS/SSTF/SCAN/C-SCAN examples), while LOOK and C-LOOK originate from standard syllabus textbooks (Silberschatz et al.).
5. **Pop Quiz**: `src/routes/quiz.<topic>.tsx`

---

## Adding a Lab

Labs are standalone, focused hands-on experiments (e.g. synchronization, cache, or deadlocks) hosted under `/labs`:

1. **Pure Engine**: Create `src/lib/labs/<labName>.ts` with deterministic simulation logic and formulas.
2. **Unit Tests**: Add `src/test/<labName>.test.ts` verifying textbook traces and invariant checks.
3. **Registry**: Add entries to `LAB_HUB_ENTRIES` and `OS_LABS` in `src/lib/labs.ts`.
4. **Page Route**: Create `src/routes/labs.<labName>.tsx` using standard chalkboard controls and paper-card styling, with a back link to `/labs`.
5. **Verification**: Confirm unique page title (`<Lab Name> | OS Playground`), run `npm test` and `npm run build`.
