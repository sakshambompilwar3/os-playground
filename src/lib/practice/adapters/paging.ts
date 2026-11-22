import { simulatePaging, PagingAlgorithm, PagingResult } from "../../paging";

export interface PagingAdapterInput {
  algorithm: PagingAlgorithm;
  references: number[];
  frameCount: number;
}

export interface PagingAdapterOutput {
  faults: number;
  hits: number;
  hitRatioPercent: number;
  finalPages: number[];
  evictedPagesByStep: Record<number, number>; // stepIndex (1-based) -> evicted page
  rawResult: PagingResult;
}

export function runPagingProductionSolver(input: PagingAdapterInput): PagingAdapterOutput {
  const res = simulatePaging(input.algorithm, input.references, input.frameCount);

  const evictedPagesByStep: Record<number, number> = {};
  for (const step of res.steps) {
    if (step.evictedPage !== null) {
      evictedPagesByStep[step.stepNumber] = step.evictedPage;
    }
  }

  const finalPages = res.finalFrames.filter((p): p is number => p !== null);

  return {
    faults: res.faults,
    hits: res.hits,
    hitRatioPercent: Number((res.hitRatio * 100).toFixed(2)),
    finalPages,
    evictedPagesByStep,
    rawResult: res,
  };
}
