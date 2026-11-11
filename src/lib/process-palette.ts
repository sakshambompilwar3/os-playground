import type { ProcessInput } from "./scheduling";

export interface PaletteColor {
  id: string;
  label: string;
  bg: string;
  ink: string;
}

/**
 * 10 muted chalk-friendly colors derived from the site's warm parchment & ink palette.
 * Dark ink (`--foreground`, oklch(0.27 0.04 260)) meets >= 6.5:1 contrast on every swatch.
 */
export const PROCESS_PALETTE: PaletteColor[] = [
  { id: "yellow", label: "Sticky yellow", bg: "var(--highlight)", ink: "var(--foreground)" },
  { id: "red", label: "Muted red", bg: "oklch(0.80 0.12 22)", ink: "var(--foreground)" },
  { id: "green", label: "Chalk green", bg: "oklch(0.84 0.11 150)", ink: "var(--foreground)" },
  { id: "blue", label: "Ink blue-grey", bg: "oklch(0.83 0.09 250)", ink: "var(--foreground)" },
  { id: "orange", label: "Pencil peach", bg: "oklch(0.82 0.12 52)", ink: "var(--foreground)" },
  { id: "coral", label: "Warm coral", bg: "oklch(0.81 0.11 36)", ink: "var(--foreground)" },
  { id: "lavender", label: "Soft lavender", bg: "oklch(0.83 0.09 295)", ink: "var(--foreground)" },
  { id: "teal", label: "Mint teal", bg: "oklch(0.84 0.08 190)", ink: "var(--foreground)" },
  { id: "pink", label: "Note pink", bg: "oklch(0.83 0.10 345)", ink: "var(--foreground)" },
  { id: "sage", label: "Sage chalk", bg: "oklch(0.85 0.06 115)", ink: "var(--foreground)" },
];

export const APP_NAME_POOL: string[] = [
  "Netflix",
  "Chrome",
  "Spotify",
  "YouTube",
  "WhatsApp",
  "VS Code",
  "Zoom",
  "Slack",
  "Discord",
  "Photoshop",
  "Word",
  "Excel",
  "Terminal",
  "Safari",
  "Steam",
  "Notes",
  "Calendar",
  "Maps",
];

const PREFERRED_PALETTE_ID: Record<string, string> = {
  netflix: "red",
  youtube: "coral",
  spotify: "green",
  whatsapp: "green",
  excel: "green",
  chrome: "yellow",
  notes: "yellow",
  zoom: "blue",
  word: "blue",
  safari: "blue",
  "vs code": "lavender",
  vscode: "lavender",
  discord: "lavender",
  photoshop: "lavender",
  slack: "pink",
  steam: "pink",
  terminal: "teal",
  maps: "teal",
  calendar: "sage",
  firefox: "orange",
  vlc: "orange",
};

const PALETTE_INDEX_BY_ID = new Map(PROCESS_PALETTE.map((c, idx) => [c.id, idx]));

/**
 * Assigns a distinct palette color to every process in the list.
 * Pass 1 honors well-known app hue preferences; pass 2 assigns remaining free colors.
 */
export function assignProcessColors(
  processes: Pick<ProcessInput, "id" | "name">[],
): Record<string, PaletteColor> {
  const result: Record<string, PaletteColor> = {};
  const usedIndices = new Set<number>();

  // Pass 1: preferred hues for recognized app names
  for (const proc of processes) {
    const key = proc.name.trim().toLowerCase();
    const prefId = PREFERRED_PALETTE_ID[key];
    if (!prefId) continue;
    const idx = PALETTE_INDEX_BY_ID.get(prefId);
    if (idx !== undefined && !usedIndices.has(idx)) {
      usedIndices.add(idx);
      result[proc.id] = PROCESS_PALETTE[idx]!;
    }
  }

  // Pass 2: assign next free color for remaining processes
  for (const proc of processes) {
    if (result[proc.id]) continue;
    let freeIdx = PROCESS_PALETTE.findIndex((_, idx) => !usedIndices.has(idx));
    if (freeIdx === -1) {
      // Fallback only if > 10 processes
      freeIdx = Object.keys(result).length % PROCESS_PALETTE.length;
    }
    usedIndices.add(freeIdx);
    result[proc.id] = PROCESS_PALETTE[freeIdx]!;
  }

  return result;
}

/**
 * Picks `count` unique names from APP_NAME_POOL avoiding `excludeNames` where possible.
 */
export function pickUniqueAppNames(count: number, excludeNames: Iterable<string> = []): string[] {
  const excluded = new Set(Array.from(excludeNames, (n) => n.trim().toLowerCase()));
  const available = APP_NAME_POOL.filter((name) => !excluded.has(name.toLowerCase()));
  const pool = available.length >= count ? [...available] : [...APP_NAME_POOL];

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }

  return Array.from({ length: count }, (_, idx) => pool[idx % pool.length]!);
}

export const DEFAULT_EXAMPLE_PROCESSES: ProcessInput[] = [
  { id: "P1", name: "Netflix", arrivalTime: 0, burstTime: 5, priority: 2 },
  { id: "P2", name: "Chrome", arrivalTime: 1, burstTime: 3, priority: 1 },
  { id: "P3", name: "Spotify", arrivalTime: 2, burstTime: 8, priority: 3 },
  { id: "P4", name: "Zoom", arrivalTime: 3, burstTime: 6, priority: 0 },
];
