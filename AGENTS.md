# OS Playground - Development Guidelines

- **Architecture**:
  - The project is fully client-side driven with no external backend requirement.
  - Core operating system algorithmic logic must reside strictly in pure TypeScript functions under `src/lib/*.ts`, `src/lib/practice/*.ts` (generators, verification gate, reference solvers), and `src/lib/labs/*.ts` decoupled from React and DOM APIs.
  - All mathematical calculations, state transitions, traces, and metrics must be exact and tested with automated unit tests (`npm test`).
  - Dual-solver verification gate (`src/lib/practice/gate.ts`) requires agreement between production adapters and independent reference solvers before emitting candidate practice problems.
  - Never hard-code execution traces, metrics, comparisons, or practice solutions.

- **Topic Hub, Labs & Navigation**:
  - All five topics (Banker's Algorithm, CPU Scheduling, Memory Allocation, Disk Scheduling, Page Replacement) and the Labs hub use the shared notebook-style `TopicHub` component for consistent navigation.
  - Sub-pages (Simulator, Comparison, Notes, Quiz, Practice, Labs) must provide a direct back link to their respective hub.
  - The Labs section (`/labs`) contains hands-on experiments: Deadlock Lab (`/labs/deadlock`), Producer-Consumer Lab (`/labs/producer-consumer`), and Dining Philosophers Lab (`/labs/dining-philosophers`).

- **Learning & Textbook Content**:
  - Share learning content between the topic notes pages and any summary views through browser-safe data modules (e.g. `src/lib/topics.ts` or notes data).
  - Keep personal simulator scratch notes in page-session React state; do not imply durable backend storage without a connected service.

- **Correctness & Explanations**:
  - Generate safety and scheduling step-by-step narration directly from the algorithm's complete trace rather than scripted boilerplate.
  - Use pre-allocation state for Banker deadlock avoidance examples; do not imply the Banker can recover an existing deadlock by preemption.

- **Visual Consistency & Readability**:
  - Maintain the chalkboard green hero header, paper-card panels, and cream control bars across all pages.
  - Do not introduce arbitrary themes or conflicting color systems.
  - Practice mode solutions render paper variants (`variant="paper"`) for Gantt charts, Memory maps, Disk head charts, and Frame tables; simulators retain their default chalkboard styling.
  - Readability rules apply to all pages: all text must meet WCAG AA contrast (≥ 4.5:1 normal, ≥ 3:1 large/disabled). Use semantic tokens (`--ink`, `--ink-muted`, `--chalk`, `--chalk-muted`, `--on-accent`, `--success`).
  - No text fading with opacity outside disabled controls. Font sizes: ≥ 14px for chart time ticks, axis ticks, and chart labels; no rendered text < 12px anywhere. All boundary timestamps and axis ticks must be preserved and clearly legible.
