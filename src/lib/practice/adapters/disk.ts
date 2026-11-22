import {
  simulateDiskScheduling,
  DiskRequestInput,
  DiskAlgorithm,
  DiskDirection,
  DiskSimulationResult,
} from "../../disk";

export interface DiskAdapterInput {
  cylinders: number;
  head: number;
  requests: number[];
  algorithm: DiskAlgorithm;
  direction: DiskDirection;
}

export interface DiskAdapterOutput {
  totalHeadMovement: number;
  cylinderServedThird: number;
  averageSeekPerRequest: number;
  servedSequence: number[];
  stepLog: { from: number; to: number; movement: number }[];
  rawResult: DiskSimulationResult;
}

export function runDiskProductionSolver(input: DiskAdapterInput): DiskAdapterOutput {
  const reqInputs: DiskRequestInput[] = input.requests.map((cyl, idx) => ({
    id: `R${idx + 1}`,
    cylinder: cyl,
  }));

  const res = simulateDiskScheduling(
    input.cylinders,
    input.head,
    reqInputs,
    input.algorithm,
    input.direction,
  );

  const servedSequence: number[] = [];
  const stepLog: { from: number; to: number; movement: number }[] = [];

  for (const seg of res.segments) {
    stepLog.push({
      from: seg.from,
      to: seg.to,
      movement: seg.distance,
    });
    if (seg.kind === "serve") {
      servedSequence.push(seg.to);
    }
  }

  const cylinderServedThird = servedSequence[2] ?? servedSequence[servedSequence.length - 1] ?? 0;
  const avgSeek = input.requests.length > 0 ? res.totalHeadMovement / input.requests.length : 0;

  return {
    totalHeadMovement: res.totalHeadMovement,
    cylinderServedThird,
    averageSeekPerRequest: Number(avgSeek.toFixed(2)),
    servedSequence,
    stepLog,
    rawResult: res,
  };
}
