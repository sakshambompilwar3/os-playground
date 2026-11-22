# Practice Mode Architecture & Design

Practice Mode provides infinite, deterministic, textbook-grade practice problems for all five core Operating Systems topics:
1. **CPU Scheduling** (`cpu-scheduling`)
2. **Memory Allocation** (`memory-allocation`)
3. **Disk Scheduling** (`disk-scheduling`)
4. **Page Replacement** (`page-replacement`)
5. **Banker's Algorithm** (`bankers`)

---

## 1. Deterministic Problem Generation

Every practice problem is a pure, deterministic mathematical function of a 3-tuple:
$$\text{Problem} = f(\text{topic}, \text{level}, \text{seed})$$

Given the same `topic`, `level`, and `seed`, the generator is guaranteed to yield the exact same problem statement, workloads, parameters, questions, answers, and step-by-step solution trace regardless of browser, device, or time.

### Seed Alphabet & Normalization
Seeds are represented as short, human-friendly 6-character strings.
- **Alphabet**: 31 unambiguous alphanumeric characters:
  ```
  2 3 4 5 6 7 8 9 A B C D E F G H J K M N P Q R S T U V W X Y Z
  ```
- **Excluded Characters**: `0`, `O`, `1`, `I`, and `L` are omitted to prevent visual confusion when writing, reading, or sharing replay codes.
- **Normalization**: User input is automatically cleaned:
  - Trim whitespace.
  - Convert to uppercase.
  - Substitute lookalikes (`0` $\to$ `O` $\to$ `8`, `1` $\to$ `I` $\to$ `L` $\to$ `T`).
  - Strip any character outside the 31-character alphabet.
  - Pad or truncate to 6 characters (defaulting to fallback seed if empty).

The underlying pseudo-random number generator (PRNG) uses the **Mulberry32** 32-bit generator initialized via **xmur3** hash of the normalized seed.

---

## 2. Two-Solver Verification Gate

To eliminate faulty questions, floating-point discrepancies, or ambiguous answers, every candidate problem must pass through the **Verification Gate** (`src/lib/practice/gate.ts`) before reaching the user.

```
       (topic, level, seed)
                │
                ▼
     ┌───────────────────────┐
     │  Candidate Generator  │ ◄── Attempt Loop (${seed}~${attempt})
     └──────────┬────────────┘
                │
        Candidate Problem
                │
      ┌─────────┴─────────┐
      ▼                   ▼
┌──────────────┐    ┌─────────────────┐
│  Production  │    │ Independent Ref │
│   Adapter    │    │     Solver      │
└──────┬───────┘    └────────┬────────┘
       │                     │
       ▼                     ▼
┌─────────────────────────────────────┐
│      Verification Gate Check:       │
│  - Exact Answer Agreement           │
│  - Tie-Freedom Check (Easy/Medium)  │
│  - No NaN, null, or undefined       │
└──────────────────┬──────────────────┘
                   │
            Pass? ──┼──► YES ──► Emit Verified Problem
                    │
                    └──► NO ───► Retry with next attempt seed (up to 50)
```

### Production Adapters (`src/lib/practice/adapters/*.ts`)
Thin wrappers around the production solvers (`src/lib/scheduling.ts`, `src/lib/memory.ts`, `src/lib/disk.ts`, `src/lib/paging.ts`, `src/lib/bankers.ts`). They format candidate problem inputs into the shape expected by existing simulator engines without modifying original solver logic.

### Independent Reference Solvers (`src/lib/practice/reference/*.ts`)
Clean-room, alternative reference solvers written independently from scratch. They **never import** any file from `src/lib/*.ts` or the production adapters.
- **CPU Scheduling**: Unit-by-unit (time-stepped) discrete clock simulation with tie-breaking variants (Variant A: lower arrival / PID; Variant B: higher PID; Variant C: RR preemption arrival ordering).
- **Memory Allocation**: Plain-array scan tracking physical partitions, leftover splits, and search head positions with alternative tie variants.
- **Disk Scheduling**: Direct distance calculations and analytical trajectory builder for FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK.
- **Page Replacement**: Direct frame vector state machine tracking FIFO queues, LRU timestamps, and Optimal next-use lookaheads.
- **Banker's Algorithm**: Direct resource-matrix safety evaluator implementing the exact full-pass index scan (`0..n-1` without breaking on finish) and resource-request algorithm.

### Validation Criteria
1. **Solver Agreement**: For every question in the problem, the production answer must match the reference solver answer within numeric tolerance ($\pm 0.01$ for floats, exact integer/string for discrete values).
2. **Tie-Freedom**: On **Easy** and **Medium** difficulties, reference solver tie-break variants must produce identical results. If any alternative tie-break rule alters the outcome, the candidate is rejected as ambiguous.
3. **Completeness & Integrity**: All parameters, metrics, questions, and solution steps must be defined, finite numbers or non-empty strings (no `NaN`, `null`, or `undefined`).

---

## 3. Difficulty Levels & Tie-Break Rules

| Difficulty | Workload Scope | Algorithms Covered | Tie Rule |
| :--- | :--- | :--- | :--- |
| **Easy** | 3 processes / blocks / frames; small request queues (4-5); 0 arrivals. | FCFS, SJF, SRTF, RR, Priority (NP/P), Fixed/Dynamic Fit, SSTF, SCAN, LOOK, FIFO, LRU, Optimal, Banker's Safety/Sequence/Request. | **Strictly tie-free**. Any candidate tie causes immediate rejection. Distinct burst times, block sizes, and request cylinders are enforced. |
| **Medium** | 4-5 processes / partitions / frames; non-zero arrivals; standard workloads. | All 6 CPU algos, all 8 Memory combinations, all 6 Disk algos, all 3 Paging algos, all 3 Banker's problem types. | **Strictly tie-free**. Verification gate tests multiple tie-breaking variants and ensures zero ambiguous decisions. |
| **Hard** | 5-6 processes / partitions; edge cases, preemptive priority, high cylinder spans (200), Optimal lookaheads, resource-request tests. | All algorithms including Preemptive Priority, C-SCAN, C-LOOK, Optimal, Resource-Request Algorithm. | **Explicit tie-break rule**. Problem statement explicitly lists tie-breaking criteria in the "Rules used" statement. |

---

## 4. Subtopic Selectors & Random Option

Next to the Level selector on `/practice/$topic`, students can select specific algorithms or problem variants, or leave the selector on **Random** (the default).

### Topic Selectors
- **CPU Scheduling** (`sub`):
  - `random` (default): Uniformly chooses among all 6 algorithms.
  - `fcfs`: First-Come, First-Served.
  - `sjf`: Shortest Job First (non-preemptive).
  - `srtf`: Shortest Remaining Time First (preemptive).
  - `rr`: Round Robin (preemptive with quantum).
  - `priority-np`: Priority (non-preemptive, lower number = higher priority).
  - `priority-p`: Priority (preemptive, lower number = higher priority).
- **Memory Allocation** (`mode` and `strategy`):
  - Mode: `random` (default), `fixed` (Fixed partitioning), `dynamic` (Dynamic partitioning).
  - Strategy: `random` (default), `first-fit` (First Fit), `best-fit` (Best Fit), `worst-fit` (Worst Fit), `next-fit` (Next Fit).
- **Disk Scheduling** (`sub`):
  - `random` (default): Uniformly chooses among all 6 algorithms.
  - `fcfs`: First-Come, First-Served.
  - `sstf`: Shortest Seek Time First.
  - `scan`: SCAN (Elevator).
  - `c-scan`: Circular SCAN.
  - `look`: LOOK.
  - `c-look`: Circular LOOK.
- **Page Replacement** (`sub`):
  - `random` (default): Uniformly chooses among all 3 algorithms.
  - `fifo`: First-In, First-Out.
  - `lru`: Least Recently Used.
  - `optimal`: Optimal Page Replacement (OPT / MIN).
- **Banker's Algorithm** (`sub`):
  - `random` (default): Uniformly chooses among all 3 problem types.
  - `safety-check`: Determine if system is in a safe or unsafe state.
  - `safe-sequence`: Find a complete safe execution sequence.
  - `resource-request`: Evaluate whether an immediate resource request can be granted.

### Deterministic Random Resolution
When a selector is set to `random`, the concrete choice is resolved deterministically from the seed:
```ts
algorithm = rng.pick(ALL_ALGOS);
```
The concrete algorithm is prominently displayed in the problem title (e.g. `SRTF · Medium`, `Best Fit (Fixed) · Easy`).
Clicking **Next Problem** retains user selector choices. When a selector is Random, the page cycles seeds until a different concrete algorithm than the previous problem is chosen.

---

## 5. URL Schema & Routing Parameters

All problem configurations are fully shareable via URL parameters:
```
/practice/$topic?level=...&sub=...&seed=...&from=...
```
For Memory Allocation:
```
/practice/memory-allocation?level=...&mode=...&strategy=...&seed=...&from=...
```

### Allowlist & Fallback Behavior (`src/lib/practice/subtopics.ts`)
- `level`: `"easy"` | `"medium"` | `"hard"`. Invalid or missing values fall back to `"easy"`.
- `sub`: Validated against topic options. Invalid or missing values fall back to `"random"`.
- `mode`: `"fixed"` | `"dynamic"`. Invalid or missing values fall back to `"random"`.
- `strategy`: `"first-fit"` | `"best-fit"` | `"worst-fit"` | `"next-fit"`. Invalid or missing values fall back to `"random"`.
- `seed`: 6-character normalized alphanumeric string. Invalid or empty values fall back to generating a fresh seed.
- `from`: `"hub"` | `"practice"`. Invalid values fall back to `"practice"`.

### Dynamic Back Link Behavior
The back link at the top of `/practice/$topic` respects user navigation origin:
- If `from=hub`: Shows `← Back to <Topic Name> Hub` and links directly to `/<topic>`.
- If `from=practice` (or omitted): Shows `← Back to Practice` and links to `/practice`.
The `from` parameter is preserved across level changes, selector updates, and new problems.

---

## 6. Standard Memory Allocation Definitions

All memory calculations and questions across the simulator and practice mode adhere strictly to standard textbook definitions:

1. **Free Memory**:
   The sum of all completely unallocated blocks or holes (`kind === "free"`). Internal fragmentation is allocated to an active process and is **NOT** counted as free memory because other processes cannot use it.
2. **Internal Fragmentation**:
   Unused physical space inside allocated partitions (`block.size - process.size`). Occurs only in **Fixed Partitioning** mode. For **Dynamic Partitioning**, internal fragmentation is strictly 0.
3. **External Fragmentation**:
   Total free memory that cannot satisfy a waiting process because it is divided into non-contiguous holes.
4. **Memory Utilization**:
   $$\text{Utilization} = \frac{\text{Allocated Process Memory}}{\text{Total Memory}} \times 100\%$$
   $$\text{Equivalently: } \frac{\text{Total Memory} - \text{Total Free Memory} - \text{Total Internal Frag}}{\text{Total Memory}} \times 100\%$$

---

## 7. Solution Visualizations (Paper Variants)

All worked solution steps render on paper cards (`bg-paper border-2 border-foreground shadow-[var(--shadow-paper)]`) using high-contrast ink styling (`variant="paper"`):

- **CPU Scheduling Gantt Chart** (`SchedulingGantt.tsx`):
  - Solid palette fill with 2px ink borders (`border-foreground`).
  - Unit width $\ge 28\text{px}$ per time unit.
  - Bold ink labels with duration inside ($\ge 44\text{px}$) or SVG leader lines above for narrow segments ($< 28\text{px}$).
  - Idle periods rendered with dashed 2px borders; context switch hatched (only if $> 0\text{ms}$).
  - Solid ink time axis with numbers $\ge 14\text{px}$ placed collision-free ($\ge 20\text{px}$ spacing).
  - Process legend below the chart showing color chip and total runtime.
  - Fully accessible with `role="img"` and descriptive `aria-label`.
- **Memory Allocation Map** (`MemoryMap.tsx`):
  - Stacked vertical layout: **Initial Partitions** (showing original empty block sizes) followed by **After Allocation**.
  - Solid palette fills for processes; distinct diagonal hatching with readable chip badges for internal fragmentation.
  - Pale dashed blocks for free holes.
  - Solid ink address boundary numbers $\ge 14\text{px}$ placed collision-free.
  - Process and partition legend below the maps.
- **Disk Scheduling Head Chart** (`DiskHeadChart.tsx`):
  - Light paper canvas with dark ink cylinder grid lines and request chips.
  - High-contrast serve lines and dashed jump trajectories.
- **Page Replacement Frame Table** (`PagingDetails.tsx`):
  - High-contrast paper table with sticky reference and frame headers.
  - Distinct hit ($\checkmark$ green) and fault ($\times$ brick) status badges.
- **Banker's Algorithm Matrix Tables** (`MatrixTable.tsx`):
  - Allocation and Need matrix tables rendered in clean paper cards with high-contrast numerical cells.

---

## 8. Client-Side Grading Notice

> [!NOTE]
> **Practice mode is only for practice; grading happens in the browser (graded quizzes will be checked on a server later).**
>
> All question evaluation, input parsing (handling decimals, fractions like `23/4`, percentages, whitespace, sequences, and sets), hint toggling, score tracking, and solution reveals execute purely in client-side React state.
