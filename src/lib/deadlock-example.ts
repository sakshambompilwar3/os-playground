import { requestResources } from "./bankers";

// State immediately before P2 acquires the last free resource R1.
export const DEADLOCK_EXAMPLE = {
  resources: ["R0", "R1", "R2"],
  available: [0, 1, 0],
  max: [[1, 0, 1], [1, 1, 0], [0, 1, 1]],
  alloc: [[0, 0, 1], [1, 0, 0], [0, 0, 0]],
  request: [0, 1, 0],
};
export const bankerDecision = () => requestResources(2, DEADLOCK_EXAMPLE.request, DEADLOCK_EXAMPLE.available, DEADLOCK_EXAMPLE.max, DEADLOCK_EXAMPLE.alloc);