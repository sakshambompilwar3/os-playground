# OS Playground Design & Readability Rules

These design and readability rules govern the entire site to guarantee WCAG 2.1 AA accessibility, high legibility across paper and chalkboard surfaces, and mathematical clarity for learners.

---

## 1. Contrast Ratios & WCAG Targets

All rendered text across all routes must satisfy the following contrast minimums:

| Category | Definition | Contrast Target | Primary Surface |
| :--- | :--- | :--- | :--- |
| **Normal Text** | Font size < 24px (or < 18.66px if bold) | **≥ 4.5:1** | Paper (`oklch(0.965 0.02 88)`) or Chalkboard (`oklch(0.38 0.06 160)`) |
| **Large Text** | Font size ≥ 24px (or ≥ 18.66px if bold) | **≥ 3.0:1** | All surfaces |
| **Disabled Controls** | Elements with `disabled` attribute or `.disabled` class | **≥ 3.0:1** | Form inputs and control buttons |
| **Chart Elements** | Ticks, boundary lines, axis marks, labels | **≥ 4.5:1** (or ≥ 3:1 for graphical lines) | Dedicated chart containers |

---

## 2. Semantic Text Design Tokens

Do not hand-code arbitrary hex codes or low-contrast opacity modifiers. Always use the project's semantic text tokens:

| Token | CSS Variable | Tailwind Utility | Intended Surface | Target Contrast |
| :--- | :--- | :--- | :--- | :--- |
| **Deep Ink** | `--ink` (`oklch(0.20 0.04 260)`) | `text-ink` / `text-foreground` | Paper / Parchment / Cards | **~11.8:1** |
| **Muted Ink** | `--ink-muted` (`oklch(0.38 0.04 260)`) | `text-ink-muted` / `text-muted-foreground` | Paper / Parchment / Cards | **~6.2:1** |
| **Crisp Chalk** | `--chalk-text` (`oklch(0.98 0.015 88)`) | `text-chalk-text` / `text-chalk-foreground` | Chalkboard | **~10.6:1** |
| **Muted Chalk** | `--chalk-muted` (`oklch(0.85 0.03 140)`) | `text-chalk-muted` | Chalkboard | **~7.5:1** |
| **On Accent** | `--on-accent` (`oklch(0.18 0.04 260)`) | `text-on-accent` | Highlights / Swatches / Badges | **~10.8:1** |
| **Success** | `--success` (`oklch(0.50 0.13 150)`) | `text-success` | Paper & Chalkboard | **~5.0:1** on paper |

---

## 3. Font Size Standards

- **Chart Time Ticks & Axis Labels**: **≥ 14px** (`text-sm font-semibold` or `text-sm font-bold`).
  - Applies to: Gantt time boundaries, memory address boundaries, cylinder axis ticks, frame numbers, and axis captions.
- **Minimum Text Size**: **≥ 12px** (`text-xs`).
  - **Zero Tolerance**: Never use `text-[10px]` or `text-[11px]` for any rendered text.
  - Subtitles, metadata, and status chips must use `text-xs` (12px) or larger.

---

## 4. Text Opacity & Fading Rules

- **Zero Opacity Fading Outside Disabled States**:
  - Never use opacity utilities to de-emphasize active text (e.g., `opacity-50`, `opacity-60`, `text-opacity-70`, `text-muted-foreground/70`, `text-chalk-foreground/60`).
  - Use solid, high-contrast muted tokens (`text-ink-muted` or `text-chalk-muted`) instead.
  - Opacity modifiers (like `opacity-50`) are reserved exclusively for legitimately disabled controls.

---

## 5. Chart & Visual Component Rules

### CPU Scheduling Gantt Charts (`SchedulingGantt`, `ComparisonGantt`)
- **Non-Dropping Boundaries**: Every start, end, preemption, and completion timestamp must be rendered.
- **Staggering**: If adjacent time values are closer than 26px, stagger them vertically rather than dropping them.
- **Scale**: Minimum track unit width of 34px with horizontal scrolling in a paper card.
- **Visual Baseline**: 2px solid axis baseline with 8px tick marks (`h-2 w-0.5`).
- **Axis Caption**: Always include `"Time (ms) →"` or `"Time →"` at ≥ 14px bold.
- **Playhead**: Clear badge with `"t = X"`.
- **Completion Summary**: Prominent badge with `"Finishes at t = Xms"`.
- **Multi-Algorithm Stacked Gantt**: Each algorithm row in comparison mode has its own dedicated horizontal axis immediately below its track.

### Memory Allocation Maps (`MemoryMap`)
- **Address Ticks**: Address ticks at every segment boundary at ≥ 14px bold.
- **Axis Caption**: Always include `"Address (KB) →"`.
- **Pattern Chips**: Internal fragmentation over diagonal hatching must render a solid high-contrast chip (`bg-black/85` or `bg-paper`) to guarantee legible numbers.

### Disk Scheduling Trajectory Charts (`DiskHeadChart`)
- **Cylinder Ticks**: Boundary cylinders (0, E) and head start cylinder (h) rendered at ≥ 14px bold.
- **Axis Caption**: Always include `"Cylinder →"` at ≥ 14px bold.
- **Head Start Tick**: On paper surfaces, head start tick uses `--primary` or `--foreground` (never yellow `--highlight` on cream paper).

### Page Replacement Frame Tables (`PagingDetails`)
- **Frame Labels & References**: Rendered at ≥ 14px.
- **Hit vs. Fault**: Always distinguished by both an icon AND clear text (`✓ Hit`, `✗ Fault`).
- **Evicted Pages**: Rendered in a solid badge (`bg-destructive` with `text-destructive-foreground`).

### Dual Variant Styling
- **Practice Mode**: Must pass `variant="paper"` to all visual chart components (`SchedulingGantt`, `MemoryMap`, `DiskHeadChart`, `FrameTable`), rendering ink-on-paper aesthetics.
- **Simulators**: Retain the dark green chalkboard aesthetic.

---

## 6. Automated Verification

- Run `npm run audit:contrast` to execute the full automated contrast and legibility audit across all routes, states, and mobile/desktop viewports.
- Run `npm test` to verify all 26+ test suites, including `contrast-tokens.test.ts` and `contrast-audit.test.tsx`.
