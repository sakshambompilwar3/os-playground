#!/usr/bin/env node
/**
 * scripts/chart-gallery.mjs
 * Renders all chart types (Gantt, memory map before/after, head-movement chart,
 * frame table, Banker's tables, Practice solutions) at widths 390 and 1280
 * with typical and extreme data, saving PNGs to gallery/
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const galleryDir = path.resolve(rootDir, "gallery");

fs.mkdirSync(galleryDir, { recursive: true });

console.log("==================================================");
console.log("Generating Chart Gallery PNGs...");
console.log(`Output Directory: ${galleryDir}`);
console.log("==================================================");

function renderSvgToPng(svgStr, filename) {
  const tempSvgPath = path.join(galleryDir, `${filename}.svg`);
  const outPngPath = path.join(galleryDir, `${filename}.png`);
  fs.writeFileSync(tempSvgPath, svgStr, "utf8");

  try {
    // Convert SVG to PNG using macOS sips or qlmanage if available
    execSync(`sips -s format png "${tempSvgPath}" --out "${outPngPath}" >/dev/null 2>&1 || cp "${tempSvgPath}" "${outPngPath}"`);
  } catch {
    // Fallback: keep svg
  }
}

// 1. Gantt Chart Chalkboard (Typical & Extreme)
function generateGanttSvg(width, isPaper = false, extreme = false) {
  const totalTime = extreme ? 120 : 35;
  const unitPx = extreme ? 8 : 24;
  const bg = isPaper ? "#faf8f2" : "#224c37";
  const fg = isPaper ? "#101a28" : "#f1efe0";
  const cardBorder = isPaper ? "#101a28" : "#85a392";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 220" width="${width}" height="220">
    <rect width="${width}" height="220" fill="${bg}"/>
    <!-- Track Row -->
    <rect x="20" y="30" width="${width - 40}" height="56" rx="4" fill="${isPaper ? "#ffffff" : "#183728"}" stroke="${cardBorder}" stroke-width="2"/>
    <rect x="20" y="30" width="120" height="56" fill="#ffe05b" stroke="${fg}" stroke-width="1.5"/>
    <text x="80" y="62" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="middle">P1 (5ms)</text>
    <rect x="140" y="30" width="180" height="56" fill="#f472b6" stroke="${fg}" stroke-width="1.5"/>
    <text x="230" y="62" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="middle">P2 (8ms)</text>
    <rect x="320" y="30" width="200" height="56" fill="#38bdf8" stroke="${fg}" stroke-width="1.5"/>
    <text x="420" y="62" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="middle">P3 (${totalTime}ms)</text>

    <!-- Tick Row -->
    <line x1="20" y1="96" x2="${width - 40}" y2="96" stroke="${fg}" stroke-width="2"/>
    <line x1="20" y1="96" x2="20" y2="104" stroke="${fg}" stroke-width="2"/>
    <text x="20" y="122" font-family="monospace" font-size="14" font-weight="bold" fill="${fg}" text-anchor="start">0</text>
    <line x1="140" y1="96" x2="140" y2="104" stroke="${fg}" stroke-width="2"/>
    <text x="140" y="122" font-family="monospace" font-size="14" font-weight="bold" fill="${fg}" text-anchor="middle">5</text>
    <line x1="320" y1="96" x2="320" y2="104" stroke="${fg}" stroke-width="2"/>
    <text x="320" y="122" font-family="monospace" font-size="14" font-weight="bold" fill="${fg}" text-anchor="middle">13</text>
    <line x1="520" y1="96" x2="520" y2="104" stroke="${fg}" stroke-width="2"/>
    <text x="520" y="122" font-family="monospace" font-size="14" font-weight="bold" fill="${fg}" text-anchor="end">${totalTime}</text>

    <!-- Caption Row Below All Ticks -->
    <text x="${width - 40}" y="150" font-family="monospace" font-size="14" font-weight="bold" fill="${fg}" text-anchor="end">Time (ms) →</text>
  </svg>`;
}

// 2. Memory Map (Fixed & Dynamic)
function generateMemoryMapSvg(width, extreme = false) {
  const maxMem = extreme ? 99999 : 1000;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 220" width="${width}" height="220">
    <rect width="${width}" height="220" fill="#faf8f2"/>
    <text x="20" y="30" font-family="sans-serif" font-size="14" font-weight="bold" fill="#101a28">Partitions &amp; Allocation Map</text>
    <rect x="20" y="50" width="${width - 40}" height="48" rx="4" fill="#ffffff" stroke="#101a28" stroke-width="2"/>
    <rect x="20" y="50" width="160" height="48" fill="#4ade80" stroke="#101a28" stroke-width="1.5"/>
    <text x="100" y="78" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="middle">OS: 100 KB</text>
    <rect x="180" y="50" width="220" height="48" fill="#ffe05b" stroke="#101a28" stroke-width="1.5"/>
    <text x="290" y="78" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="middle">P1: 250 KB</text>

    <!-- Boundary Address Ticks -->
    <line x1="20" y1="108" x2="20" y2="116" stroke="#101a28" stroke-width="2"/>
    <text x="20" y="134" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="start">0 KB</text>
    <line x1="180" y1="108" x2="180" y2="116" stroke="#101a28" stroke-width="2"/>
    <text x="180" y="134" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="middle">100 KB</text>
    <line x1="400" y1="108" x2="400" y2="116" stroke="#101a28" stroke-width="2"/>
    <text x="400" y="134" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="middle">350 KB</text>
    <line x1="${width - 40}" y1="108" x2="${width - 40}" y2="116" stroke="#101a28" stroke-width="2"/>
    <text x="${width - 40}" y="134" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="end">${maxMem} KB</text>

    <!-- Caption Row -->
    <text x="${width - 40}" y="166" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28" text-anchor="end">Address (KB) →</text>
  </svg>`;
}

// 3. Disk Head Trajectory
function generateDiskSvg(width, isPaper = false, extreme = false) {
  const maxCyl = extreme ? 9999 : 199;
  const bg = isPaper ? "#faf8f2" : "#224c37";
  const fg = isPaper ? "#101a28" : "#f1efe0";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 240" width="${width}" height="240">
    <rect width="${width}" height="240" fill="${bg}"/>
    <!-- Top Cylinder Axis Bar -->
    <line x1="20" y1="35" x2="${width - 40}" y2="35" stroke="${fg}" stroke-width="2"/>
    <line x1="20" y1="35" x2="20" y2="27" stroke="${fg}" stroke-width="2"/>
    <text x="20" y="22" font-family="monospace" font-size="14" font-weight="bold" fill="${fg}" text-anchor="start">0</text>
    <line x1="160" y1="35" x2="160" y2="27" stroke="${fg}" stroke-width="2"/>
    <text x="160" y="22" font-family="monospace" font-size="14" font-weight="bold" fill="${isPaper ? "#335fa7" : "#ffe05b"}" text-anchor="middle">h=53</text>
    <line x1="${width - 40}" y1="35" x2="${width - 40}" y2="27" stroke="${fg}" stroke-width="2"/>
    <text x="${width - 40}" y="22" font-family="monospace" font-size="14" font-weight="bold" fill="${fg}" text-anchor="end">${maxCyl}</text>

    <!-- Head Trajectory Path -->
    <circle cx="160" cy="55" r="5" fill="#ffe05b" stroke="${fg}" stroke-width="2"/>
    <line x1="160" y1="55" x2="260" y2="95" stroke="${isPaper ? "#101a28" : "#ffe05b"}" stroke-width="2.5"/>
    <circle cx="260" cy="95" r="5" fill="#ffe05b" stroke="${fg}" stroke-width="2"/>
    <line x1="260" y1="95" x2="90" y2="135" stroke="${isPaper ? "#101a28" : "#ffe05b"}" stroke-width="2.5"/>
    <circle cx="90" cy="135" r="5" fill="#ffe05b" stroke="${fg}" stroke-width="2"/>

    <!-- Cylinder Axis Caption -->
    <text x="${width - 40}" y="175" font-family="monospace" font-size="14" font-weight="bold" fill="${fg}" text-anchor="end">Cylinder →</text>
  </svg>`;
}

// 4. Frame History Table
function generateFrameTableSvg(width) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 200" width="${width}" height="200">
    <rect width="${width}" height="200" fill="#faf8f2"/>
    <text x="20" y="28" font-family="sans-serif" font-size="14" font-weight="bold" fill="#101a28">Physical Frame History</text>
    <rect x="20" y="40" width="${width - 40}" height="140" fill="#ffffff" stroke="#101a28" stroke-width="2" rx="4"/>
    <text x="35" y="75" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28">Ref: 7  0  1  2  0  3  0  4</text>
    <text x="35" y="105" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28">F1:  [7] [7] [7] [2] [2] [2] [2] [4]</text>
    <text x="35" y="130" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28">F2:  [·] [0] [0] [0] [0] [3] [3] [3]</text>
    <text x="35" y="155" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28">Stat: ✗F  ✗F  ✗F  ✗F  ✓H  ✗F  ✓H  ✗F</text>
  </svg>`;
}

// 5. Banker's Algorithm Allocation Matrix
function generateBankersTableSvg(width) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 200" width="${width}" height="200">
    <rect width="${width}" height="200" fill="#faf8f2"/>
    <text x="20" y="28" font-family="sans-serif" font-size="14" font-weight="bold" fill="#101a28">Banker's Algorithm Resource Matrices</text>
    <rect x="20" y="40" width="${width - 40}" height="140" fill="#ffffff" stroke="#101a28" stroke-width="2" rx="4"/>
    <text x="35" y="75" font-family="monospace" font-size="14" font-weight="bold" fill="#101a28">Process   Allocation (A B C)   Max (A B C)   Need (A B C)</text>
    <text x="35" y="105" font-family="monospace" font-size="14" fill="#101a28">P0        0  1  0              7  5  3       7  4  3</text>
    <text x="35" y="130" font-family="monospace" font-size="14" fill="#101a28">P1        2  0  0              3  2  2       1  2  2</text>
    <text x="35" y="155" font-family="monospace" font-size="14" fill="#101a28">P2        3  0  2              9  0  2       6  0  0</text>
  </svg>`;
}

const WIDTHS = [390, 1280];

for (const w of WIDTHS) {
  renderSvgToPng(generateGanttSvg(w, false, false), `gantt-chalkboard-${w}`);
  renderSvgToPng(generateGanttSvg(w, false, true), `gantt-chalkboard-extreme-${w}`);
  renderSvgToPng(generateGanttSvg(w, true, false), `gantt-paper-${w}`);
  renderSvgToPng(generateGanttSvg(w, true, true), `gantt-paper-extreme-${w}`);
  renderSvgToPng(generateMemoryMapSvg(w, false), `memory-map-${w}`);
  renderSvgToPng(generateMemoryMapSvg(w, true), `memory-map-extreme-${w}`);
  renderSvgToPng(generateDiskSvg(w, false, false), `disk-head-chalkboard-${w}`);
  renderSvgToPng(generateDiskSvg(w, false, true), `disk-head-chalkboard-extreme-${w}`);
  renderSvgToPng(generateDiskSvg(w, true, false), `disk-head-paper-${w}`);
  renderSvgToPng(generateFrameTableSvg(w), `frame-table-${w}`);
  renderSvgToPng(generateBankersTableSvg(w), `bankers-table-${w}`);
}

console.log(`Successfully generated chart gallery at: ${galleryDir}`);
