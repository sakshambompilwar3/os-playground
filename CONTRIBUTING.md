# Contributing to OS Playground

Thank you for your interest in contributing to **OS Playground**! We welcome contributions that expand educational Operating Systems topics, improve simulator accuracy, or enhance learning tools.

To keep the platform robust, accessible, and mathematically exact, please review and follow these contribution guidelines.

---

## Core Architectural Invariants

### 1. Pure Algorithmic Engines in `src/lib/`
All operating system algorithms (Banker's, CPU Scheduling, Memory Partitioning, Disk Head Sweeps, Page Replacement, Semaphores, and Dining Philosophers) must live strictly in **pure TypeScript functions** under `src/lib/*.ts` or `src/lib/sync/`:
- **Decoupled from UI**: Never import React, DOM APIs, or router hooks into `src/lib/` algorithmic files.
- **Deterministic**: Given the same inputs, functions must produce identical timelines, traces, and metrics.
- **Complete Narration & Traces**: Generate step-by-step explanatory narration directly from full algorithmic traces rather than hardcoded or canned boilerplate.

### 2. Never Alter Expected Test Values
- When fixing or refactoring, **do not change existing expected test values** in test files to force a test to pass.
- Algorithmic outputs, formulas, and textbook benchmarks must remain mathematically exact.

### 3. Visual & Aesthetic Consistency
- Maintain the signature chalkboard academic visual style:
  - Chalkboard green hero header (`#224c37` / `chalk-green`)
  - Warm paper-card panels (`#faf8f2` / `paper-bg`, `#ffffff` / `paper-card`)
  - Cream control bar buttons (`#f1efe0` with `#1b3d2c` text)
  - Handwritten annotation accents (`font-handwriting` / `Caveat`)
- Do not introduce arbitrary themes or conflicting CSS design systems.
- Ensure wide tables, Gantt charts, and memory bars scroll horizontally inside their container with responsive mobile support down to 360px viewport widths.

### 4. Dependency & Hygiene Policy
- **No Force Auditing**: Never run `npm audit fix --force`.
- **Lockfile Integrity**: Do not arbitrarily modify lockfiles (`bun.lock` or `package-lock.json`) or `vite.config.ts`.
- **Zero Secret Leakage**: Never commit API keys, personal credentials, passwords, or tokens. Use `.env.example` placeholders for optional environment configuration.

---

## Development Workflow

### Prerequisites
- Node.js (v18+ recommended)
- npm or bun

### Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run all unit and component tests
npm test

# Run end-to-end smoke tests and mathematical benchmarks
npm run test:e2e

# Build client and server bundles for production
npm run build
```

---

## Adding a New Topic

To add a new Operating Systems topic to the platform, consult the comprehensive guide at [`docs/adding-a-topic.md`](./docs/adding-a-topic.md).

Every topic follows a standard notebook hub architecture:
1. Pure algorithmic engine (`src/lib/<topic>.ts`)
2. Comprehensive unit test suite (`src/test/<topic>.test.ts`)
3. Topic registration in `src/lib/topics.ts`
4. Notebook hub page (`src/routes/<topic>.index.tsx`)
5. Interactive simulator (`src/routes/<topic>.simulator.tsx`)
6. Side-by-side comparison bench (`src/routes/comparison.<topic>.tsx`)
7. Lecture notes cards (`src/routes/notes.<topic>.tsx`)
8. Self-grading pop quiz (`src/routes/quiz.<topic>.tsx`)

---

## Submitting Pull Requests

1. Create a descriptive feature branch (`git checkout -b feature/topic-name`).
2. Verify all tests pass (`npm test` and `npm run test:e2e`).
3. Verify production build succeeds (`npm run build`).
4. Ensure responsive layouts on both desktop and mobile viewports.
5. Submit a pull request with a clear description of algorithmic changes and mathematical verification.
