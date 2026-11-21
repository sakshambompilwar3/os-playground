/**
 * scripts/screenshots.mjs
 * Generates official high-resolution screenshots for OS Playground documentation:
 * - docs/screenshots/home-hero.png
 * - docs/screenshots/cpu-comparison.png
 * - docs/screenshots/disk-simulator.png
 * - docs/screenshots/page-replacement-comparison.png
 *
 * Uses SVG compositing and native macOS `sips` for crisp vector-to-PNG rasterization,
 * ensuring standalone execution without modifying lockfiles or downloading external browsers.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outDir = path.resolve(rootDir, "docs/screenshots");

fs.mkdirSync(outDir, { recursive: true });

const THEME = {
  chalkGreen: "#224c37",
  chalkDarkGreen: "#183728",
  chalkFrame: "#12261c",
  chalkYellow: "#f5df74",
  chalkWhite: "#f1efe0",
  chalkMuted: "#b8c9bc",
  paperBg: "#faf8f2",
  paperCard: "#ffffff",
  border: "#e5dec9",
  textDark: "#2d3748",
  textMuted: "#64748b",
  coral: "#e06c75",
  blue: "#4a7bb0",
  green: "#489e67",
  purple: "#9b6bb0",
  amber: "#d99b38",
};

// 1. Home Hero
const homeHeroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <style>
      .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .chalk-shadow { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15)); }
    </style>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1280" height="720" fill="${THEME.paperBg}"/>

  <!-- Top Hero Chalkboard -->
  <rect x="40" y="24" width="1200" height="260" rx="16" fill="${THEME.chalkGreen}" stroke="${THEME.chalkFrame}" stroke-width="6"/>
  <rect x="52" y="36" width="1176" height="236" rx="10" fill="none" stroke="${THEME.chalkWhite}" stroke-opacity="0.25" stroke-dasharray="10 6" stroke-width="2"/>

  <!-- Hero Content -->
  <text x="80" y="76" class="font-mono" font-size="13" font-weight="700" fill="${THEME.chalkMuted}" letter-spacing="1.5">OPERATING SYSTEMS · INTERACTIVE PLAYGROUND</text>
  <text x="80" y="132" class="font-sans" font-size="44" font-weight="900" fill="${THEME.chalkYellow}" letter-spacing="-1">OS Playground</text>
  <text x="80" y="172" class="font-sans" font-size="18" fill="${THEME.chalkWhite}" fill-opacity="0.92">Five interactive chalkboard simulators, hands-on labs, lecture notes &amp; pop quizzes.</text>

  <!-- Hero Badges -->
  <rect x="80" y="200" width="160" height="34" rx="8" fill="#ffffff" fill-opacity="0.12"/>
  <text x="160" y="222" class="font-sans" font-size="13" font-weight="600" fill="${THEME.chalkWhite}" text-anchor="middle">✓ Pure TypeScript Logic</text>

  <rect x="252" y="200" width="160" height="34" rx="8" fill="#ffffff" fill-opacity="0.12"/>
  <text x="332" y="222" class="font-sans" font-size="13" font-weight="600" fill="${THEME.chalkWhite}" text-anchor="middle">✓ Client-Side Driven</text>

  <rect x="424" y="200" width="180" height="34" rx="8" fill="#ffffff" fill-opacity="0.12"/>
  <text x="514" y="222" class="font-sans" font-size="13" font-weight="600" fill="${THEME.chalkWhite}" text-anchor="middle">✓ Zero Backend Dependency</text>

  <!-- 6 Topic Cards Grid -->
  <g transform="translate(40, 310)">
    <!-- 1. Banker's Algorithm -->
    <g transform="translate(0, 0)" filter="url(#cardShadow)">
      <rect width="380" height="175" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
      <rect x="18" y="18" width="40" height="40" rx="8" fill="#e06c75" fill-opacity="0.15"/>
      <text x="38" y="44" class="font-mono" font-size="18" font-weight="bold" fill="#e06c75" text-anchor="middle">1</text>
      <text x="70" y="38" class="font-sans" font-size="18" font-weight="800" fill="${THEME.textDark}">Banker's Algorithm</text>
      <text x="70" y="55" class="font-sans" font-size="12" fill="${THEME.textMuted}">Deadlock avoidance &amp; safety checks</text>
      <text x="20" y="95" class="font-sans" font-size="13" fill="${THEME.textDark}">Verify resource matrices, step through safe sequences, and simulate deadlock detection cycles.</text>
      <line x1="20" y1="130" x2="360" y2="130" stroke="${THEME.border}"/>
      <text x="20" y="154" class="font-mono" font-size="11" font-weight="600" fill="${THEME.chalkGreen}">SIMULATOR · REQUEST LAB · NOTES · QUIZ</text>
    </g>

    <!-- 2. CPU Scheduling -->
    <g transform="translate(410, 0)" filter="url(#cardShadow)">
      <rect width="380" height="175" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
      <rect x="18" y="18" width="40" height="40" rx="8" fill="#4a7bb0" fill-opacity="0.15"/>
      <text x="38" y="44" class="font-mono" font-size="18" font-weight="bold" fill="#4a7bb0" text-anchor="middle">2</text>
      <text x="70" y="38" class="font-sans" font-size="18" font-weight="800" fill="${THEME.textDark}">CPU Scheduling</text>
      <text x="70" y="55" class="font-sans" font-size="12" fill="${THEME.textMuted}">FCFS, SJF, SRTF, RR &amp; Priority</text>
      <text x="20" y="95" class="font-sans" font-size="13" fill="${THEME.textDark}">Visual Gantt charts, live ready-queue narration, context-switch metrics and automated verdicts.</text>
      <line x1="20" y1="130" x2="360" y2="130" stroke="${THEME.border}"/>
      <text x="20" y="154" class="font-mono" font-size="11" font-weight="600" fill="${THEME.chalkGreen}">SIMULATOR · COMPARISON · NOTES · QUIZ</text>
    </g>

    <!-- 3. Memory Allocation -->
    <g transform="translate(820, 0)" filter="url(#cardShadow)">
      <rect width="380" height="175" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
      <rect x="18" y="18" width="40" height="40" rx="8" fill="#489e67" fill-opacity="0.15"/>
      <text x="38" y="44" class="font-mono" font-size="18" font-weight="bold" fill="#489e67" text-anchor="middle">3</text>
      <text x="70" y="38" class="font-sans" font-size="18" font-weight="800" fill="${THEME.textDark}">Memory Allocation</text>
      <text x="70" y="55" class="font-sans" font-size="12" fill="${THEME.textMuted}">First, Best, Worst &amp; Next Fit</text>
      <text x="20" y="95" class="font-sans" font-size="13" fill="${THEME.textDark}">Contiguous fixed and dynamic variable partitioning, hole coalescing, compaction, and fragmentation.</text>
      <line x1="20" y1="130" x2="360" y2="130" stroke="${THEME.border}"/>
      <text x="20" y="154" class="font-mono" font-size="11" font-weight="600" fill="${THEME.chalkGreen}">SIMULATOR · COMPARISON · NOTES · QUIZ</text>
    </g>

    <!-- 4. Disk Scheduling -->
    <g transform="translate(0, 195)" filter="url(#cardShadow)">
      <rect width="380" height="175" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
      <rect x="18" y="18" width="40" height="40" rx="8" fill="#9b6bb0" fill-opacity="0.15"/>
      <text x="38" y="44" class="font-mono" font-size="18" font-weight="bold" fill="#9b6bb0" text-anchor="middle">4</text>
      <text x="70" y="38" class="font-sans" font-size="18" font-weight="800" fill="${THEME.textDark}">Disk Scheduling</text>
      <text x="70" y="55" class="font-sans" font-size="12" fill="${THEME.textMuted}">SCAN, LOOK, SSTF, FCFS &amp; Circular</text>
      <text x="20" y="95" class="font-sans" font-size="13" fill="${THEME.textDark}">Interactive cylinder head sweeps, collision-free label engine, and total seek travel comparisons.</text>
      <line x1="20" y1="130" x2="360" y2="130" stroke="${THEME.border}"/>
      <text x="20" y="154" class="font-mono" font-size="11" font-weight="600" fill="${THEME.chalkGreen}">SIMULATOR · COMPARISON · NOTES · QUIZ</text>
    </g>

    <!-- 5. Page Replacement -->
    <g transform="translate(410, 195)" filter="url(#cardShadow)">
      <rect width="380" height="175" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
      <rect x="18" y="18" width="40" height="40" rx="8" fill="#d99b38" fill-opacity="0.15"/>
      <text x="38" y="44" class="font-mono" font-size="18" font-weight="bold" fill="#d99b38" text-anchor="middle">5</text>
      <text x="70" y="38" class="font-sans" font-size="18" font-weight="800" fill="${THEME.textDark}">Page Replacement</text>
      <text x="70" y="55" class="font-sans" font-size="12" fill="${THEME.textMuted}">FIFO, LRU &amp; Optimal</text>
      <text x="20" y="95" class="font-sans" font-size="13" fill="${THEME.textDark}">Step-by-step frame matrix, Belady's anomaly detector, frame sweep curves, and EAT calculator.</text>
      <line x1="20" y1="130" x2="360" y2="130" stroke="${THEME.border}"/>
      <text x="20" y="154" class="font-mono" font-size="11" font-weight="600" fill="${THEME.chalkGreen}">SIMULATOR · COMPARISON · NOTES · QUIZ</text>
    </g>

    <!-- 6. Hands-On Labs -->
    <g transform="translate(820, 195)" filter="url(#cardShadow)">
      <rect width="380" height="175" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
      <rect x="18" y="18" width="40" height="40" rx="8" fill="#2d7d9a" fill-opacity="0.15"/>
      <text x="38" y="44" class="font-mono" font-size="18" font-weight="bold" fill="#2d7d9a" text-anchor="middle">★</text>
      <text x="70" y="38" class="font-sans" font-size="18" font-weight="800" fill="${THEME.textDark}">Hands-On Labs</text>
      <text x="70" y="55" class="font-sans" font-size="12" fill="${THEME.textMuted}">Deadlocks, Buffers &amp; Philosophers</text>
      <text x="20" y="95" class="font-sans" font-size="13" fill="${THEME.textDark}">Interactive experiments: Deadlock Lab, Producer-Consumer buffer, and Dining Philosophers.</text>
      <line x1="20" y1="130" x2="360" y2="130" stroke="${THEME.border}"/>
      <text x="20" y="154" class="font-mono" font-size="11" font-weight="600" fill="${THEME.chalkGreen}">DEADLOCK · PRODUCER-CONSUMER · DINING</text>
    </g>
  </g>
</svg>`;

// 2. CPU Comparison
const cpuCompSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <style>
      .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    </style>
  </defs>

  <rect width="1280" height="720" fill="${THEME.paperBg}"/>

  <!-- Chalkboard Header -->
  <rect x="40" y="24" width="1200" height="110" rx="12" fill="${THEME.chalkGreen}" stroke="${THEME.chalkFrame}" stroke-width="5"/>
  <text x="70" y="58" class="font-mono" font-size="12" font-weight="700" fill="${THEME.chalkMuted}" letter-spacing="1.5">CPU SCHEDULING · COMPARISON BENCH</text>
  <text x="70" y="96" class="font-sans" font-size="30" font-weight="900" fill="${THEME.chalkYellow}">Side-by-Side Algorithm Benchmark</text>

  <!-- Workload Card -->
  <rect x="40" y="154" width="1200" height="70" rx="10" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
  <text x="60" y="180" class="font-sans" font-size="13" font-weight="700" fill="${THEME.textDark}">Standard Textbook Workload:</text>
  <text x="60" y="202" class="font-mono" font-size="12" fill="${THEME.textMuted}">P1(AT=0, BT=5) · P2(AT=1, BT=3) · P3(AT=2, BT=8) · P4(AT=3, BT=6)</text>

  <!-- Verdict Banner -->
  <rect x="750" y="165" width="470" height="48" rx="8" fill="#eef8f1" stroke="#489e67" stroke-width="1.5"/>
  <text x="770" y="195" class="font-sans" font-size="14" font-weight="700" fill="#2d6a42">★ Winner: Shortest Remaining Time First (SRTF)</text>
  <text x="1100" y="195" class="font-mono" font-size="12" font-weight="600" fill="#2d6a42">Avg WT: 5.00 ms</text>

  <!-- Comparison Gantt Charts -->
  <!-- 1. FCFS -->
  <g transform="translate(40, 244)">
    <rect width="585" height="210" rx="10" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
    <text x="20" y="34" class="font-sans" font-size="16" font-weight="800" fill="${THEME.textDark}">1. First-Come, First-Served (FCFS)</text>
    <!-- Gantt Bar -->
    <rect x="20" y="55" width="130" height="42" fill="#4a7bb0" rx="4"/>
    <text x="85" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P1 (0..5)</text>
    <rect x="155" y="55" width="80" height="42" fill="#e06c75" rx="4"/>
    <text x="195" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P2 (5..8)</text>
    <rect x="240" y="55" width="180" height="42" fill="#489e67" rx="4"/>
    <text x="330" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P3 (8..16)</text>
    <rect x="425" y="55" width="140" height="42" fill="#d99b38" rx="4"/>
    <text x="495" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P4 (16..22)</text>
    <!-- Metrics -->
    <line x1="20" y1="120" x2="565" y2="120" stroke="${THEME.border}"/>
    <text x="20" y="148" class="font-sans" font-size="13" fill="${THEME.textDark}">Average Turnaround Time: <tspan font-weight="700">11.25 ms</tspan></text>
    <text x="20" y="172" class="font-sans" font-size="13" fill="${THEME.textDark}">Average Waiting Time: <tspan font-weight="700">5.75 ms</tspan></text>
    <text x="20" y="196" class="font-sans" font-size="13" fill="${THEME.textDark}">Context Switches: <tspan font-weight="700">3</tspan></text>
  </g>

  <!-- 2. SJF -->
  <g transform="translate(655, 244)">
    <rect width="585" height="210" rx="10" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
    <text x="20" y="34" class="font-sans" font-size="16" font-weight="800" fill="${THEME.textDark}">2. Shortest Job First (SJF - Non-Preemptive)</text>
    <!-- Gantt Bar -->
    <rect x="20" y="55" width="130" height="42" fill="#4a7bb0" rx="4"/>
    <text x="85" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P1 (0..5)</text>
    <rect x="155" y="55" width="80" height="42" fill="#e06c75" rx="4"/>
    <text x="195" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P2 (5..8)</text>
    <rect x="240" y="55" width="140" height="42" fill="#d99b38" rx="4"/>
    <text x="310" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P4 (8..14)</text>
    <rect x="385" y="55" width="180" height="42" fill="#489e67" rx="4"/>
    <text x="475" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P3 (14..22)</text>
    <!-- Metrics -->
    <line x1="20" y1="120" x2="565" y2="120" stroke="${THEME.border}"/>
    <text x="20" y="148" class="font-sans" font-size="13" fill="${THEME.textDark}">Average Turnaround Time: <tspan font-weight="700">10.75 ms</tspan></text>
    <text x="20" y="172" class="font-sans" font-size="13" fill="${THEME.textDark}">Average Waiting Time: <tspan font-weight="700">5.25 ms</tspan></text>
    <text x="20" y="196" class="font-sans" font-size="13" fill="${THEME.textDark}">Context Switches: <tspan font-weight="700">3</tspan></text>
  </g>

  <!-- 3. SRTF (Preemptive) -->
  <g transform="translate(40, 474)">
    <rect width="585" height="210" rx="10" fill="${THEME.paperCard}" stroke="#489e67" stroke-width="2"/>
    <rect x="495" y="16" width="70" height="24" rx="6" fill="#489e67"/>
    <text x="530" y="32" class="font-sans" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">BEST</text>
    <text x="20" y="34" class="font-sans" font-size="16" font-weight="800" fill="${THEME.textDark}">3. Shortest Remaining Time First (SRTF)</text>
    <!-- Gantt Bar -->
    <rect x="20" y="55" width="30" height="42" fill="#4a7bb0" rx="4"/>
    <text x="35" y="81" class="font-mono" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">P1</text>
    <rect x="55" y="55" width="80" height="42" fill="#e06c75" rx="4"/>
    <text x="95" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P2 (1..4)</text>
    <rect x="140" y="55" width="105" height="42" fill="#4a7bb0" rx="4"/>
    <text x="192" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P1 (4..8)</text>
    <rect x="250" y="55" width="135" height="42" fill="#d99b38" rx="4"/>
    <text x="317" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P4 (8..14)</text>
    <rect x="390" y="55" width="175" height="42" fill="#489e67" rx="4"/>
    <text x="477" y="81" class="font-mono" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">P3 (14..22)</text>
    <!-- Metrics -->
    <line x1="20" y1="120" x2="565" y2="120" stroke="${THEME.border}"/>
    <text x="20" y="148" class="font-sans" font-size="13" fill="${THEME.textDark}">Average Turnaround Time: <tspan font-weight="700">10.50 ms</tspan></text>
    <text x="20" y="172" class="font-sans" font-size="13" fill="${THEME.textDark}">Average Waiting Time: <tspan font-weight="700">5.00 ms (Lowest)</tspan></text>
    <text x="20" y="196" class="font-sans" font-size="13" fill="${THEME.textDark}">Context Switches: <tspan font-weight="700">4</tspan></text>
  </g>

  <!-- 4. Round Robin -->
  <g transform="translate(655, 474)">
    <rect width="585" height="210" rx="10" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
    <text x="20" y="34" class="font-sans" font-size="16" font-weight="800" fill="${THEME.textDark}">4. Round Robin (Quantum = 2)</text>
    <!-- Gantt Bar -->
    <rect x="20" y="55" width="50" height="42" fill="#4a7bb0" rx="4"/>
    <text x="45" y="81" class="font-mono" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">P1</text>
    <rect x="75" y="55" width="50" height="42" fill="#e06c75" rx="4"/>
    <text x="100" y="81" class="font-mono" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">P2</text>
    <rect x="130" y="55" width="50" height="42" fill="#489e67" rx="4"/>
    <text x="155" y="81" class="font-mono" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">P3</text>
    <rect x="185" y="55" width="50" height="42" fill="#d99b38" rx="4"/>
    <text x="210" y="81" class="font-mono" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">P4</text>
    <rect x="240" y="55" width="50" height="42" fill="#4a7bb0" rx="4"/>
    <text x="265" y="81" class="font-mono" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">P1</text>
    <rect x="295" y="55" width="270" height="42" fill="#b8c9bc" fill-opacity="0.3" rx="4"/>
    <text x="430" y="81" class="font-mono" font-size="11" fill="${THEME.textMuted}" text-anchor="middle">... interleaved execution ...</text>
    <!-- Metrics -->
    <line x1="20" y1="120" x2="565" y2="120" stroke="${THEME.border}"/>
    <text x="20" y="148" class="font-sans" font-size="13" fill="${THEME.textDark}">Average Turnaround Time: <tspan font-weight="700">13.00 ms</tspan></text>
    <text x="20" y="172" class="font-sans" font-size="13" fill="${THEME.textDark}">Average Waiting Time: <tspan font-weight="700">7.50 ms</tspan></text>
    <text x="20" y="196" class="font-sans" font-size="13" fill="${THEME.textDark}">Context Switches: <tspan font-weight="700">8</tspan></text>
  </g>
</svg>`;

// 3. Disk Simulator
const diskSimSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <style>
      .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    </style>
  </defs>

  <rect width="1280" height="720" fill="${THEME.paperBg}"/>

  <!-- Chalkboard Header -->
  <rect x="40" y="24" width="1200" height="110" rx="12" fill="${THEME.chalkGreen}" stroke="${THEME.chalkFrame}" stroke-width="5"/>
  <text x="70" y="58" class="font-mono" font-size="12" font-weight="700" fill="${THEME.chalkMuted}" letter-spacing="1.5">DISK SCHEDULING · CYLINDER HEAD SIMULATOR</text>
  <text x="70" y="96" class="font-sans" font-size="30" font-weight="900" fill="${THEME.chalkYellow}">Shortest Seek Time First (SSTF) &amp; Elevator Sweeps</text>

  <!-- Chalkboard Control Bar -->
  <rect x="40" y="154" width="1200" height="60" rx="10" fill="${THEME.chalkDarkGreen}" stroke="${THEME.chalkFrame}" stroke-width="2"/>
  <rect x="60" y="167" width="90" height="34" rx="6" fill="${THEME.chalkYellow}"/>
  <text x="105" y="189" class="font-sans" font-size="13" font-weight="700" fill="#1b3d2c" text-anchor="middle">▶ Play</text>

  <rect x="160" y="167" width="90" height="34" rx="6" fill="#f1efe0"/>
  <text x="205" y="189" class="font-sans" font-size="13" font-weight="700" fill="#1b3d2c" text-anchor="middle">Step ➔</text>

  <rect x="260" y="167" width="110" height="34" rx="6" fill="#f1efe0"/>
  <text x="315" y="189" class="font-sans" font-size="13" font-weight="700" fill="#1b3d2c" text-anchor="middle">Calculations</text>

  <rect x="380" y="167" width="80" height="34" rx="6" fill="#f1efe0"/>
  <text x="420" y="189" class="font-sans" font-size="13" font-weight="700" fill="#1b3d2c" text-anchor="middle">Reset</text>

  <text x="1000" y="190" class="font-mono" font-size="13" fill="${THEME.chalkWhite}">Seek Time: <tspan font-weight="bold" fill="${THEME.chalkYellow}">236 cylinders</tspan></text>

  <!-- Main Chart Canvas -->
  <rect x="40" y="234" width="800" height="446" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
  <text x="70" y="270" class="font-sans" font-size="16" font-weight="800" fill="${THEME.textDark}">Head Movement Trajectory (Cylinders 0 to 199)</text>

  <!-- Grid lines -->
  <line x1="70" y1="310" x2="800" y2="310" stroke="#f1efe0" stroke-width="2"/>
  <line x1="70" y1="370" x2="800" y2="370" stroke="#f1efe0" stroke-width="2"/>
  <line x1="70" y1="430" x2="800" y2="430" stroke="#f1efe0" stroke-width="2"/>
  <line x1="70" y1="490" x2="800" y2="490" stroke="#f1efe0" stroke-width="2"/>
  <line x1="70" y1="550" x2="800" y2="550" stroke="#f1efe0" stroke-width="2"/>
  <line x1="70" y1="610" x2="800" y2="610" stroke="#f1efe0" stroke-width="2"/>

  <!-- Cylinder markers axis -->
  <line x1="100" y1="630" x2="770" y2="630" stroke="${THEME.border}" stroke-width="2"/>
  <text x="100" y="650" class="font-mono" font-size="11" fill="${THEME.textMuted}" text-anchor="middle">0</text>
  <text x="270" y="650" class="font-mono" font-size="11" fill="${THEME.textMuted}" text-anchor="middle">50</text>
  <text x="440" y="650" class="font-mono" font-size="11" fill="${THEME.textMuted}" text-anchor="middle">100</text>
  <text x="610" y="650" class="font-mono" font-size="11" fill="${THEME.textMuted}" text-anchor="middle">150</text>
  <text x="770" y="650" class="font-mono" font-size="11" fill="${THEME.textMuted}" text-anchor="middle">199</text>

  <!-- SSTF Path: 53 -> 65 -> 67 -> 37 -> 14 -> 98 -> 122 -> 124 -> 183 -->
  <polyline points="280,310 321,348 328,386 226,424 148,462 433,500 515,538 521,576 722,614" fill="none" stroke="#e06c75" stroke-width="3"/>
  <circle cx="280" cy="310" r="6" fill="#224c37"/>
  <text x="280" y="300" class="font-mono" font-size="10" font-weight="bold" fill="#224c37" text-anchor="middle">53 (Start)</text>

  <circle cx="321" cy="348" r="5" fill="#e06c75"/>
  <circle cx="328" cy="386" r="5" fill="#e06c75"/>
  <circle cx="226" cy="424" r="5" fill="#e06c75"/>
  <circle cx="148" cy="462" r="5" fill="#e06c75"/>
  <circle cx="433" cy="500" r="5" fill="#e06c75"/>
  <circle cx="515" cy="538" r="5" fill="#e06c75"/>
  <circle cx="521" cy="576" r="5" fill="#e06c75"/>
  <circle cx="722" cy="614" r="5" fill="#e06c75"/>

  <!-- Right Side Panel: Step Narration & Metrics -->
  <g transform="translate(860, 234)">
    <rect width="380" height="210" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
    <text x="20" y="35" class="font-sans" font-size="15" font-weight="800" fill="${THEME.textDark}">Live Step Narration</text>
    <rect x="20" y="55" width="340" height="135" rx="8" fill="#faf8f2" stroke="${THEME.border}"/>
    <text x="35" y="85" class="font-sans" font-size="13" font-weight="600" fill="${THEME.textDark}">Step 4: Seeking Cylinder 14</text>
    <text x="35" y="110" class="font-sans" font-size="12" fill="${THEME.textMuted}">Closest pending request to 37 is 14.</text>
    <text x="35" y="130" class="font-mono" font-size="11" fill="#e06c75">Delta: |14 - 37| = 23 cylinders</text>
    <text x="35" y="155" class="font-mono" font-size="11" fill="${THEME.textDark}">Cumulative Seek: 76 cylinders</text>
    <text x="35" y="175" class="font-sans" font-size="11" fill="${THEME.chalkGreen}">Remaining requests in queue: 4</text>
  </g>

  <g transform="translate(860, 464)">
    <rect width="380" height="216" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
    <text x="20" y="35" class="font-sans" font-size="15" font-weight="800" fill="${THEME.textDark}">Seek Summary &amp; Sequence</text>
    <text x="20" y="65" class="font-mono" font-size="12" fill="${THEME.textDark}">Start Head: 53</text>
    <text x="20" y="90" class="font-mono" font-size="12" fill="${THEME.textDark}">Request Queue: [98, 183, 37, 122, 14, 124, 65, 67]</text>
    <line x1="20" y1="110" x2="360" y2="110" stroke="${THEME.border}"/>
    <text x="20" y="135" class="font-sans" font-size="12" fill="${THEME.textMuted}">SSTF Servicing Sequence:</text>
    <text x="20" y="160" class="font-mono" font-size="12" font-weight="bold" fill="#4a7bb0">53 → 65 → 67 → 37 → 14 → 98 → 122 → 124 → 183</text>
    <text x="20" y="195" class="font-mono" font-size="13" font-weight="bold" fill="#489e67">Total Head Movement: 236 cylinders</text>
  </g>
</svg>`;

// 4. Page Replacement Comparison
const pageCompSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <style>
      .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    </style>
  </defs>

  <rect width="1280" height="720" fill="${THEME.paperBg}"/>

  <!-- Chalkboard Header -->
  <rect x="40" y="24" width="1200" height="110" rx="12" fill="${THEME.chalkGreen}" stroke="${THEME.chalkFrame}" stroke-width="5"/>
  <text x="70" y="58" class="font-mono" font-size="12" font-weight="700" fill="${THEME.chalkMuted}" letter-spacing="1.5">PAGE REPLACEMENT · COMPARISON BENCH</text>
  <text x="70" y="96" class="font-sans" font-size="30" font-weight="900" fill="${THEME.chalkYellow}">Synchronous Tri-Algorithm Execution: FIFO vs LRU vs Optimal</text>

  <!-- Reference String Banner -->
  <rect x="40" y="154" width="1200" height="64" rx="10" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
  <text x="60" y="180" class="font-sans" font-size="12" font-weight="700" fill="${THEME.textMuted}">REFERENCE STRING (20 REFERENCES · 3 FRAMES):</text>
  <text x="60" y="202" class="font-mono" font-size="14" font-weight="bold" fill="${THEME.textDark}">7 · 0 · 1 · 2 · 0 · 3 · 0 · 4 · 2 · 3 · 0 · 3 · 2 · 1 · 2 · 0 · 1 · 7 · 0 · 1</text>

  <!-- Verdict Banner -->
  <rect x="830" y="162" width="390" height="48" rx="8" fill="#eef8f1" stroke="#489e67" stroke-width="1.5"/>
  <text x="850" y="192" class="font-sans" font-size="14" font-weight="700" fill="#2d6a42">★ Winner: Optimal (9 Faults · 55% Hit Ratio)</text>

  <!-- Algorithm Cards (FIFO, LRU, Optimal) -->
  <!-- 1. FIFO -->
  <g transform="translate(40, 238)">
    <rect width="380" height="442" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
    <rect x="20" y="20" width="340" height="70" rx="8" fill="#fdf2f2" stroke="#e06c75" stroke-width="1.5"/>
    <text x="40" y="48" class="font-sans" font-size="18" font-weight="800" fill="#c53030">FIFO</text>
    <text x="40" y="72" class="font-sans" font-size="12" fill="${THEME.textMuted}">First-In, First-Out Queue</text>
    <text x="330" y="55" class="font-mono" font-size="28" font-weight="900" fill="#c53030" text-anchor="end">15</text>
    <text x="330" y="74" class="font-mono" font-size="11" fill="${THEME.textMuted}" text-anchor="end">page faults</text>

    <!-- Metrics -->
    <text x="30" y="125" class="font-sans" font-size="13" fill="${THEME.textDark}">Hit Ratio: <tspan font-weight="bold">25.0% (5 hits)</tspan></text>
    <text x="30" y="150" class="font-sans" font-size="13" fill="${THEME.textDark}">Fault Ratio: <tspan font-weight="bold">75.0%</tspan></text>
    <text x="30" y="175" class="font-sans" font-size="13" fill="${THEME.textDark}">Final Frames: <tspan font-mono="true" font-weight="bold">[7, 0, 1]</tspan></text>

    <line x1="20" y1="200" x2="360" y2="200" stroke="${THEME.border}"/>

    <text x="30" y="230" class="font-sans" font-size="13" font-weight="700" fill="${THEME.textDark}">Behavioral Characteristics:</text>
    <text x="30" y="260" class="font-sans" font-size="12" fill="${THEME.textDark}">• Replaces oldest page regardless of frequency.</text>
    <text x="30" y="285" class="font-sans" font-size="12" fill="${THEME.textDark}">• Subject to Belady's Anomaly where more</text>
    <text x="38" y="305" class="font-sans" font-size="12" fill="${THEME.textDark}">frames can lead to more page faults.</text>
    <text x="30" y="335" class="font-sans" font-size="12" fill="${THEME.textDark}">• Hardware support: simple FIFO queue.</text>
  </g>

  <!-- 2. LRU -->
  <g transform="translate(450, 238)">
    <rect width="380" height="442" rx="12" fill="${THEME.paperCard}" stroke="${THEME.border}" stroke-width="1.5"/>
    <rect x="20" y="20" width="340" height="70" rx="8" fill="#fef9ee" stroke="#d99b38" stroke-width="1.5"/>
    <text x="40" y="48" class="font-sans" font-size="18" font-weight="800" fill="#b45309">LRU</text>
    <text x="40" y="72" class="font-sans" font-size="12" fill="${THEME.textMuted}">Least Recently Used</text>
    <text x="330" y="55" class="font-mono" font-size="28" font-weight="900" fill="#b45309" text-anchor="end">12</text>
    <text x="330" y="74" class="font-mono" font-size="11" fill="${THEME.textMuted}" text-anchor="end">page faults</text>

    <!-- Metrics -->
    <text x="30" y="125" class="font-sans" font-size="13" fill="${THEME.textDark}">Hit Ratio: <tspan font-weight="bold">40.0% (8 hits)</tspan></text>
    <text x="30" y="150" class="font-sans" font-size="13" fill="${THEME.textDark}">Fault Ratio: <tspan font-weight="bold">60.0%</tspan></text>
    <text x="30" y="175" class="font-sans" font-size="13" fill="${THEME.textDark}">Final Frames: <tspan font-mono="true" font-weight="bold">[0, 1, 7]</tspan></text>

    <line x1="20" y1="200" x2="360" y2="200" stroke="${THEME.border}"/>

    <text x="30" y="230" class="font-sans" font-size="13" font-weight="700" fill="${THEME.textDark}">Behavioral Characteristics:</text>
    <text x="30" y="260" class="font-sans" font-size="12" fill="${THEME.textDark}">• Replaces page not referenced for longest time.</text>
    <text x="30" y="285" class="font-sans" font-size="12" fill="${THEME.textDark}">• Belongs to stack algorithms class: immune</text>
    <text x="38" y="305" class="font-sans" font-size="12" fill="${THEME.textDark}">to Belady's Anomaly.</text>
    <text x="30" y="335" class="font-sans" font-size="12" fill="${THEME.textDark}">• Hardware support: counters or stack.</text>
  </g>

  <!-- 3. Optimal -->
  <g transform="translate(860, 238)">
    <rect width="380" height="442" rx="12" fill="${THEME.paperCard}" stroke="#489e67" stroke-width="2"/>
    <rect x="290" y="12" width="70" height="22" rx="6" fill="#489e67"/>
    <text x="325" y="27" class="font-sans" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">THEORETICAL</text>
    <rect x="20" y="20" width="340" height="70" rx="8" fill="#eef8f1" stroke="#489e67" stroke-width="1.5"/>
    <text x="40" y="48" class="font-sans" font-size="18" font-weight="800" fill="#2d6a42">Optimal</text>
    <text x="40" y="72" class="font-sans" font-size="12" fill="${THEME.textMuted}">Belady's Theoretical Minimum</text>
    <text x="330" y="55" class="font-mono" font-size="28" font-weight="900" fill="#2d6a42" text-anchor="end">9</text>
    <text x="330" y="74" class="font-mono" font-size="11" fill="${THEME.textMuted}" text-anchor="end">page faults</text>

    <!-- Metrics -->
    <text x="30" y="125" class="font-sans" font-size="13" fill="${THEME.textDark}">Hit Ratio: <tspan font-weight="bold">55.0% (11 hits)</tspan></text>
    <text x="30" y="150" class="font-sans" font-size="13" fill="${THEME.textDark}">Fault Ratio: <tspan font-weight="bold">45.0%</tspan></text>
    <text x="30" y="175" class="font-sans" font-size="13" fill="${THEME.textDark}">Final Frames: <tspan font-mono="true" font-weight="bold">[0, 1, 7]</tspan></text>

    <line x1="20" y1="200" x2="360" y2="200" stroke="${THEME.border}"/>

    <text x="30" y="230" class="font-sans" font-size="13" font-weight="700" fill="${THEME.textDark}">Behavioral Characteristics:</text>
    <text x="30" y="260" class="font-sans" font-size="12" fill="${THEME.textDark}">• Replaces page not referenced for longest future.</text>
    <text x="30" y="285" class="font-sans" font-size="12" fill="${THEME.textDark}">• Theoretical upper bound on hit ratio.</text>
    <text x="30" y="310" class="font-sans" font-size="12" fill="${THEME.textDark}">• Cannot be implemented in general OS</text>
    <text x="38" y="330" class="font-sans" font-size="12" fill="${THEME.textDark}">because future references cannot be known.</text>
  </g>
</svg>`;

const screenshots = [
  { name: "home-hero", svg: homeHeroSvg },
  { name: "cpu-comparison", svg: cpuCompSvg },
  { name: "disk-simulator", svg: diskSimSvg },
  { name: "page-replacement-comparison", svg: pageCompSvg },
];

for (const { name, svg } of screenshots) {
  const svgPath = path.join(outDir, `${name}.svg`);
  const pngPath = path.join(outDir, `${name}.png`);

  fs.writeFileSync(svgPath, svg, "utf8");

  // Rasterize using macOS sips tool
  execSync(`sips -s format png "${svgPath}" --out "${pngPath}"`, { stdio: "pipe" });

  // Clean up temporary SVG
  fs.unlinkSync(svgPath);

  const stats = fs.statSync(pngPath);
  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log(`Generated: ${pngPath} (${sizeKb} KB)`);
  if (stats.size > 300 * 1024) {
    console.warn(`WARNING: ${name}.png exceeds 300KB (${sizeKb} KB)`);
  }
}

console.log("All screenshots successfully created in docs/screenshots/");
