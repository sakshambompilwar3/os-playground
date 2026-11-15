import type { ProcessInput } from "./scheduling";

export { APP_NAME_POOL, pickUniqueAppNames } from "./names";
export { PROCESS_PALETTE, assignProcessColors, type PaletteColor } from "./palette";

export const DEFAULT_EXAMPLE_PROCESSES: ProcessInput[] = [
  { id: "P1", name: "Netflix", arrivalTime: 0, burstTime: 5, priority: 2 },
  { id: "P2", name: "Chrome", arrivalTime: 1, burstTime: 3, priority: 1 },
  { id: "P3", name: "Spotify", arrivalTime: 2, burstTime: 8, priority: 3 },
  { id: "P4", name: "Zoom", arrivalTime: 3, burstTime: 6, priority: 0 },
];
