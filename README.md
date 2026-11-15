# OS Playground

An interactive, visual Operating Systems learning platform designed for computer science students. Explore core OS concepts through hands-on step-by-step chalkboard simulators, visual lecture notes, side-by-side algorithm comparison benches, and self-assessment pop quizzes.

## Topics Covered

### 1. Banker's Algorithm (Deadlock Avoidance)
- **Safety Simulator**: Step through Dijkstra's Banker's Algorithm with custom processes and resource vectors ($A, B, C, \dots$).
- **Resource Request**: Verify whether dynamic resource allocation requests can be safely granted immediately.
- **Deadlock Lab**: Contrast Banker's avoidance against unconstrained allocation to observe deadlock formation.
- **Visual Notes & Pop Quiz**: Conceptual theory, formulas, and multiple-choice questions with instant feedback.

### 2. CPU Scheduling
- **Algorithms**: First-Come, First-Served (FCFS), Shortest Job First (SJF), Shortest Remaining Time First (SRTF), Round Robin (RR), Priority (Non-Preemptive), Priority (Preemptive).
- **Interactive Simulator**: Real-time Gantt chart generation, dynamic ready queue visualization, step-by-step narration, and detailed Turnaround (TAT), Waiting (WT), and Response Time (RT) calculation traces.
- **Comparison Bench**: Multi-algorithm workload runner with deterministic best-algorithm verdict logic.
- **Visual Notes & Pop Quiz**: Scheduling criteria, preemptive vs. non-preemptive tradeoffs, and quiz questions.

### 3. Memory Allocation (Contiguous)
- **Placement Strategies**: First Fit, Best Fit, Worst Fit, and Next Fit.
- **Interactive Simulator**: Step-by-step process placement, dynamic memory map visualization, hole splitting, and internal/external fragmentation tracking.
- **Comparison Bench**: Run workloads across all four placement strategies to compare memory utilization, rejected processes, and fragmentation.
- **Visual Notes & Pop Quiz**: Contiguous partitioning, compaction, dynamic storage allocation, and pop quiz.

### 4. Disk Scheduling
- **Head Movement Algorithms**: FCFS, SSTF, SCAN (Elevator), C-SCAN, LOOK, and C-LOOK.
- **Interactive Simulator**: Animated cylinder head tracks with collision-free label layout, seek time tallying, and step-by-step narration.
- **Comparison Bench**: Side-by-side total seek time and head traversal analysis.
- **Visual Notes & Pop Quiz**: Disk geometry, rotational latency vs. seek time, fairness vs. throughput tradeoffs, and pop quiz.

## Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Routing & SSR**: TanStack Router & TanStack Start
- **Algorithmic Logic**: Pure, deterministic engines in `src/lib/*.ts` (`bankers.ts`, `scheduling.ts`, `memory.ts`, `disk.ts`, `chartLayout.ts`) without UI coupling, thoroughly verified with Vitest unit tests.
- **Design Language**: Academic chalkboard aesthetic with paper cards, chalk-colored controls, and clear mathematical notation.

## Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm or bun

### Installation & Development

```sh
# Clone repository
git clone <repository-url>
cd <repository-directory>

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Running Tests

```sh
npm test
```

### Building for Production

```sh
npm run build
npm run preview
```
