# OS Playground - Development Guidelines

- **Architecture**:
  - The project is fully client-side driven with no external backend requirement.
  - Core operating system algorithmic logic must reside strictly in pure TypeScript functions under `src/lib/*.ts` (`bankers.ts`, `scheduling.ts`, `memory.ts`, `disk.ts`, `chartLayout.ts`) decoupled from React and DOM APIs.
  - All mathematical calculations, state transitions, traces, and metrics must be exact and tested with automated unit tests (`npm test`).
  - Never hard-code execution traces, metrics, or comparisons.

- **Topic Hub & Navigation**:
  - All four topics (Banker's Algorithm, CPU Scheduling, Memory Allocation, Disk Scheduling) use the shared notebook-style `TopicHub` component for consistent navigation.
  - Sub-pages (Simulator, Comparison, Notes, Quiz) must provide a direct back link to their respective topic hub.

- **Learning & Textbook Content**:
  - Share learning content between the topic notes pages and any summary views through browser-safe data modules (e.g. `src/lib/topics.ts` or notes data).
  - Keep personal simulator scratch notes in page-session React state; do not imply durable backend storage without a connected service.

- **Correctness & Explanations**:
  - Generate safety and scheduling step-by-step narration directly from the algorithm's complete trace rather than scripted boilerplate.
  - Use pre-allocation state for Banker deadlock avoidance examples; do not imply the Banker can recover an existing deadlock by preemption.

- **Visual Consistency**:
  - Maintain the chalkboard green hero header, paper-card panels, and cream control bars across all pages.
  - Do not introduce arbitrary themes or conflicting color systems.
