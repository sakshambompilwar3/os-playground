import type { DiskSegment } from "@/lib/disk";
import type { PaletteColor } from "@/lib/palette";

export interface DiskHeadChartProps {
  totalCylinders: number;
  lastCylinder: number;
  startHead: number;
  segments: DiskSegment[];
  activeStep: number; // 0 to segments.length
  colors: Record<string, PaletteColor>;
  displayNames: Record<string, string>;
}

export function DiskHeadChart({
  lastCylinder,
  startHead,
  segments,
  activeStep,
  colors,
  displayNames,
}: DiskHeadChartProps) {
  const E = Math.max(1, lastCylinder);
  const padLeft = 70;
  const padRight = 70;
  const plotWidth = 620;
  const svgWidth = padLeft + plotWidth + padRight;

  const topOffset = 45;
  const rowHeight = 36;
  const totalRows = Math.max(1, segments.length);
  const svgHeight = topOffset + (totalRows + 1) * rowHeight + 30;

  const getX = (cyl: number) => {
    const clamped = Math.max(0, Math.min(E, cyl));
    return padLeft + (clamped / E) * plotWidth;
  };

  const getY = (rowIdx: number) => {
    return topOffset + rowIdx * rowHeight;
  };

  // Adaptive ticks along top horizontal axis:
  // Must include 0, E, and startHead, plus nice round steps
  const candidateTicks: number[] = [0, startHead, E];
  const stepSize = E <= 50 ? 10 : E <= 150 ? 25 : E <= 300 ? 50 : E <= 1000 ? 100 : 500;
  for (let c = stepSize; c < E; c += stepSize) {
    candidateTicks.push(c);
  }

  // Filter ticks that are too close to each other to avoid text collisions
  const sortedTicks = Array.from(new Set(candidateTicks)).sort((a, b) => a - b);
  const visibleTicks: number[] = [];
  for (const tick of sortedTicks) {
    const x = getX(tick);
    const tooClose = visibleTicks.some((prev) => Math.abs(getX(prev) - x) < 32);
    // Always keep 0, startHead, and E
    if (tick === 0 || tick === E || tick === startHead || !tooClose) {
      visibleTicks.push(tick);
    }
  }

  // Head position at active step
  const currentHeadPos =
    activeStep === 0
      ? { x: getX(startHead), y: getY(0), cyl: startHead }
      : {
          x: getX(segments[activeStep - 1]!.to),
          y: getY(activeStep),
          cyl: segments[activeStep - 1]!.to,
        };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[760px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full select-none text-chalk-foreground"
          role="img"
          aria-label="Disk head movement chart"
        >
          {/* Background grid lines for vertical cylinder ticks */}
          {visibleTicks.map((tick) => {
            const x = getX(tick);
            const isKeyTick = tick === 0 || tick === E || tick === startHead;
            return (
              <g key={`grid-${tick}`}>
                <line
                  x1={x}
                  y1={topOffset - 8}
                  x2={x}
                  y2={svgHeight - 20}
                  stroke="currentColor"
                  strokeOpacity={isKeyTick ? 0.25 : 0.08}
                  strokeDasharray={isKeyTick ? undefined : "3 3"}
                  strokeWidth={isKeyTick ? 1.5 : 1}
                />
                <text
                  x={x}
                  y={topOffset - 15}
                  textAnchor="middle"
                  className={`font-mono ${
                    isKeyTick ? "text-[11px] font-bold" : "text-[10px] opacity-75"
                  }`}
                  fill={tick === startHead ? "var(--highlight)" : "currentColor"}
                >
                  {tick === startHead ? `h=${tick}` : tick}
                </text>
              </g>
            );
          })}

          {/* Top Axis Bar */}
          <line
            x1={padLeft}
            y1={topOffset - 8}
            x2={padLeft + plotWidth}
            y2={topOffset - 8}
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth={2}
          />

          {/* Start Head Dot on Row 0 */}
          <circle
            cx={getX(startHead)}
            y={getY(0)}
            r={5}
            fill="var(--highlight)"
            stroke="var(--foreground)"
            strokeWidth={2}
          />
          <text
            x={getX(startHead) + (startHead > E * 0.75 ? -10 : 10)}
            y={getY(0) + 4}
            textAnchor={startHead > E * 0.75 ? "end" : "start"}
            className="font-mono text-[11px] font-bold"
            fill="var(--highlight)"
          >
            Start ({startHead})
          </text>

          {/* Path lines connecting head movements */}
          {segments.map((seg, idx) => {
            const rowFrom = idx;
            const rowTo = idx + 1;
            const x1 = getX(seg.from);
            const y1 = getY(rowFrom);
            const x2 = getX(seg.to);
            const y2 = getY(rowTo);

            const isExecuted = idx < activeStep;
            const isCurrentlyActive = idx === activeStep - 1;
            const color = seg.requestId ? colors[seg.requestId] : undefined;
            const strokeColor =
              seg.kind === "serve"
                ? color?.bg || "var(--highlight)"
                : "rgba(255, 255, 255, 0.85)";

            return (
              <g key={`seg-${idx}`}>
                {/* Horizontal row guide line */}
                <line
                  x1={padLeft}
                  y1={y2}
                  x2={padLeft + plotWidth}
                  y2={y2}
                  stroke="currentColor"
                  strokeOpacity={0.07}
                  strokeWidth={1}
                />

                {/* Connecting movement path line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  strokeWidth={isCurrentlyActive ? 3.5 : isExecuted ? 2.5 : 1.2}
                  strokeOpacity={isExecuted ? 1 : 0.25}
                  strokeDasharray={seg.kind === "jump" ? "6 4" : undefined}
                />

                {/* Served / End / Jump node at endpoint */}
                {seg.kind === "serve" ? (
                  <g opacity={isExecuted ? 1 : 0.35}>
                    <circle
                      cx={x2}
                      cy={y2}
                      r={isCurrentlyActive ? 6.5 : 5}
                      fill={color?.bg || "var(--highlight)"}
                      stroke="var(--foreground)"
                      strokeWidth={2}
                    />
                    {/* Label */}
                    <text
                      x={x2 + (x2 > padLeft + plotWidth * 0.78 ? -10 : 10)}
                      y={y2 + 4}
                      textAnchor={x2 > padLeft + plotWidth * 0.78 ? "end" : "start"}
                      className="font-mono text-[10px] font-bold"
                      fill={color?.bg || "currentColor"}
                    >
                      {displayNames[seg.requestId || ""] || seg.requestName} ({seg.to})
                    </text>
                  </g>
                ) : seg.kind === "end" ? (
                  <g opacity={isExecuted ? 1 : 0.35}>
                    <rect
                      x={x2 - 4.5}
                      y={y2 - 4.5}
                      width={9}
                      height={9}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    />
                    <text
                      x={x2 + (x2 > padLeft + plotWidth * 0.5 ? -10 : 10)}
                      y={y2 + 4}
                      textAnchor={x2 > padLeft + plotWidth * 0.5 ? "end" : "start"}
                      className="font-mono text-[10px] text-chalk-foreground/80 italic"
                      fill="currentColor"
                    >
                      end ({seg.to})
                    </text>
                  </g>
                ) : (
                  <g opacity={isExecuted ? 1 : 0.35}>
                    <circle
                      cx={x2}
                      cy={y2}
                      r={4}
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="2 2"
                      strokeWidth={1.5}
                    />
                    <text
                      x={x2 + (x2 > padLeft + plotWidth * 0.5 ? -10 : 10)}
                      y={y2 + 4}
                      textAnchor={x2 > padLeft + plotWidth * 0.5 ? "end" : "start"}
                      className="font-mono text-[9px] text-chalk-foreground/75 italic"
                      fill="currentColor"
                    >
                      jump ({seg.to}) {seg.countedInTotal ? "(counted)" : "(not counted)"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Active head marker pointer */}
          <g>
            <circle
              cx={currentHeadPos.x}
              cy={currentHeadPos.y}
              r={9}
              fill="none"
              stroke="var(--highlight)"
              strokeWidth={2}
              className="animate-pulse"
            />
            <circle cx={currentHeadPos.x} cy={currentHeadPos.y} r={3} fill="var(--highlight)" />
          </g>
        </svg>
      </div>
    </div>
  );
}
