import type { Matrix } from "./bankers";

export const resourceNames = (count: number) => Array.from({ length: count }, (_, i) => i < 26 ? String.fromCharCode(65 + i) : `R${i}`);
export const validCount = (value: number) => Number.isSafeInteger(value) && value > 0;
export const resizeMatrix = (matrix: Matrix, processes: number, resources: number): Matrix => Array.from({ length: processes }, (_, i) => Array.from({ length: resources }, (_, j) => matrix[i]?.[j] ?? 0));