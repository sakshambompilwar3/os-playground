import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ChartLabelItem,
  type ChartLayoutBounds,
  type ChartLayoutOptions,
  chooseNiceTicks,
  computeChartLayout,
  estimateTextWidth,
  truncateLabel,
} from "@/lib/chartLayout";
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
  hoveredRequestId?: string | null;
  onHoverRequest?: (id: string | null) => void;
  variant?: "chalkboard" | "paper";
}

function createTextMeasurer(): (text: string) => number {
  if (
    typeof document === "undefined" ||
    (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom"))
  ) {
    return (text: string) => estimateTextWidth(text, 7.5);
  }
  let canvas: HTMLCanvasElement | null = null;
  let hasWorkingCanvas = true;

  return (text: string) => {
    if (!hasWorkingCanvas) {
      return estimateTextWidth(text, 7.5);
    }
    try {
      if (!canvas) {
        canvas = document.createElement("canvas");
      }
      if (typeof canvas.getContext !== "function") {
        hasWorkingCanvas = false;
        return estimateTextWidth(text, 7.5);
      }
      const ctx = canvas.getContext("2d");
      if (ctx && typeof ctx.measureText === "function") {
        ctx.font = "bold 10px monospace";
        const metrics = ctx.measureText(text);
        return Math.ceil(metrics.width);
      }
    } catch {
      hasWorkingCanvas = false;
    }
    hasWorkingCanvas = false;
    return estimateTextWidth(text, 7.5);
  };
}

export function DiskHeadChart({
  totalCylinders,
  lastCylinder,
  startHead,
  segments,
  activeStep,
  colors,
  displayNames,
  hoveredRequestId,
  onHoverRequest,
  variant = "chalkboard",
}: DiskHeadChartProps) {
  const isPaper = variant === "paper";
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(760);
  const [localHoveredId, setLocalHoveredId] = useState<string | null>(null);

  // ResizeObserver to track container width adaptively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setContainerWidth(w);
      }
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const E = Math.max(1, lastCylinder);
  const totalRows = Math.max(1, segments.length);
  const rowHeight = 36;
  const initialTopOffset = 45;

  // Minimum width so requests are distinguishable without excessive collapsing
  const minPlotWidth = useMemo(() => {
    const cylFactor = Math.min(1200, Math.max(500, Math.round((totalCylinders / 200) * 600)));
    const reqFactor = Math.min(1200, Math.max(580, segments.length * 65));
    return Math.max(580, Math.min(1400, Math.max(cylFactor, reqFactor)));
  }, [totalCylinders, segments.length]);

  const plotWidth = Math.max(minPlotWidth, containerWidth - 140);

  const measureText = useMemo(() => createTextMeasurer(), []);

  // Compute layout once per run configuration (independent of activeStep for animation stability)
  const layout = useMemo(() => {
    const bounds: ChartLayoutBounds = {
      minX: 0,
      maxX: plotWidth,
      rowY: (rowIdx) => initialTopOffset + rowIdx * rowHeight,
    };

    const items: ChartLabelItem[] = [];

    // Row 0: Start head position (highest priority 100)
    const headX = (Math.max(0, Math.min(E, startHead)) / E) * plotWidth;
    items.push({
      id: "HEAD_START",
      text: `Start (${startHead})`,
      fullName: `Head Start (${startHead})`,
      anchorX: headX,
      row: 0,
      priority: 100,
      color: "var(--highlight)",
    });

    // Subsequent rows: 1..segments.length
    segments.forEach((seg, idx) => {
      const row = idx + 1;
      const anchorX = (Math.max(0, Math.min(E, seg.to)) / E) * plotWidth;

      if (seg.kind === "serve" && seg.requestId) {
        const full = displayNames[seg.requestId] || seg.requestName;
        const truncated = truncateLabel(full, 10);
        items.push({
          id: seg.requestId,
          text: `${truncated} (${seg.to})`,
          fullName: `${full} (${seg.to})`,
          anchorX,
          row,
          priority: 50,
          color: colors[seg.requestId]?.bg || "var(--highlight)",
        });
      } else if (seg.kind === "end") {
        items.push({
          id: `END_${idx}`,
          text: `end (${seg.to})`,
          fullName: `Disk boundary reached (${seg.to})`,
          anchorX,
          row,
          priority: 20,
          color: "rgba(255, 255, 255, 0.8)",
        });
      } else {
        items.push({
          id: `JUMP_${idx}`,
          text: `jump (${seg.to})`,
          fullName: `Return jump (${seg.to}) ${seg.countedInTotal ? "(counted)" : "(not counted)"}`,
          anchorX,
          row,
          priority: 15,
          color: "rgba(255, 255, 255, 0.75)",
        });
      }
    });

    const options: ChartLayoutOptions = {
      bounds,
      labelHeight: 18,
      minGap: 8,
      maxLanes: 5,
      measureText,
    };

    return computeChartLayout(items, options);
  }, [totalCylinders, E, startHead, segments, plotWidth, colors, displayNames, measureText]);

  // Compute dynamic inner padding from actual label extents to guarantee zero clipping
  const { padLeft, padRight, padTop, padBottom } = useMemo(() => {
    const ext = layout.extents;
    const basePadLeft = 70;
    const basePadRight = 70;
    const basePadTop = 45;
    const basePadBottom = 35;

    const leftOverhang = ext.minX < 0 ? Math.ceil(-ext.minX) + 16 : 0;
    const rightOverhang = ext.maxX > plotWidth ? Math.ceil(ext.maxX - plotWidth) + 16 : 0;
    const topOverhang = ext.minY < initialTopOffset ? Math.ceil(initialTopOffset - ext.minY) + 12 : 0;
    const totalContentY = initialTopOffset + (totalRows + 1) * rowHeight;
    const bottomOverhang = ext.maxY > totalContentY ? Math.ceil(ext.maxY - totalContentY) + 16 : 0;

    return {
      padLeft: Math.max(basePadLeft, leftOverhang + 12),
      padRight: Math.max(basePadRight, rightOverhang + 12),
      padTop: Math.max(basePadTop, basePadTop + topOverhang),
      padBottom: Math.max(basePadBottom, basePadBottom + bottomOverhang),
    };
  }, [layout.extents, plotWidth, totalRows]);

  const svgWidth = padLeft + plotWidth + padRight;
  const svgHeight = padTop + (totalRows + 1) * rowHeight + padBottom;

  const getX = (cyl: number) => {
    const clamped = Math.max(0, Math.min(E, cyl));
    return padLeft + (clamped / E) * plotWidth;
  };

  const getY = (rowIdx: number) => {
    return padTop + rowIdx * rowHeight;
  };

  // Adaptive ticks along top horizontal axis
  const visibleTicks = useMemo(() => {
    return chooseNiceTicks(
      totalCylinders,
      startHead,
      { minX: padLeft, maxX: padLeft + plotWidth },
      measureText,
      8,
    );
  }, [totalCylinders, startHead, padLeft, plotWidth, measureText]);

  // Head position at active step
  const currentHeadPos =
    activeStep === 0
      ? { x: getX(startHead), y: getY(0), cyl: startHead }
      : {
          x: getX(segments[activeStep - 1]!.to),
          y: getY(activeStep),
          cyl: segments[activeStep - 1]!.to,
        };

  const effectiveHoverId = hoveredRequestId || localHoveredId;

  return (
    <div
      ref={containerRef}
      className={`w-full space-y-3 ${
        isPaper ? "rounded-lg border-2 border-foreground bg-paper p-3.5 shadow-[var(--shadow-paper)]" : ""
      }`}
    >
      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth: `${svgWidth}px` }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            width={svgWidth}
            height={svgHeight}
            className={`w-full select-none overflow-visible ${
              isPaper ? "text-foreground" : "text-chalk-foreground"
            }`}
            role="img"
            aria-label="Disk head movement chart"
          >
            {/* Background grid lines for vertical cylinder ticks */}
            {visibleTicks.map((tick) => {
              const isKeyTick = tick.isBoundary || tick.isHead;
              return (
                <g key={`grid-${tick.cylinder}`}>
                  <line
                    x1={tick.x}
                    y1={padTop - 8}
                    x2={tick.x}
                    y2={svgHeight - padBottom}
                    stroke="currentColor"
                    strokeOpacity={isKeyTick ? 0.25 : 0.08}
                    strokeDasharray={isKeyTick ? undefined : "3 3"}
                    strokeWidth={isKeyTick ? 1.5 : 1}
                  />
                  <text
                    x={tick.x}
                    y={padTop - 15 + tick.yOffset}
                    textAnchor="middle"
                    className={`font-mono ${
                      isKeyTick ? "text-sm font-bold" : "text-sm font-semibold"
                    }`}
                    fill={
                      isPaper
                        ? tick.isHead
                          ? "var(--primary)"
                          : "var(--foreground)"
                        : tick.isHead
                          ? "var(--highlight)"
                          : "currentColor"
                    }
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}

            {/* Top Axis Bar & Caption */}
            <line
              x1={padLeft}
              y1={padTop - 8}
              x2={padLeft + plotWidth}
              y2={padTop - 8}
              stroke="currentColor"
              strokeOpacity={0.8}
              strokeWidth={2}
            />
            <text
              x={padLeft + plotWidth + 10}
              y={padTop - 4}
              textAnchor="start"
              className="font-mono text-sm font-bold"
              fill={isPaper ? "var(--ink-muted)" : "var(--chalk-muted)"}
            >
              Cylinder →
            </text>

            {/* Start Head Dot on Row 0 */}
            <circle
              cx={getX(startHead)}
              cy={getY(0)}
              r={5}
              fill="var(--highlight)"
              stroke="var(--foreground)"
              strokeWidth={2}
            />

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
              const isHovered = seg.requestId && seg.requestId === effectiveHoverId;
              const color = seg.requestId ? colors[seg.requestId] : undefined;
              const strokeColor =
                seg.kind === "serve"
                  ? isPaper
                    ? color?.ink || "var(--foreground)"
                    : color?.bg || "var(--highlight)"
                  : isPaper
                    ? "var(--muted-foreground)"
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
                    strokeWidth={
                      isHovered ? 4 : isCurrentlyActive ? 3.5 : isExecuted ? 2.5 : 1.2
                    }
                    strokeOpacity={isHovered ? 1 : isExecuted ? 1 : 0.25}
                    strokeDasharray={seg.kind === "jump" ? "6 4" : undefined}
                  />

                  {/* Served / End / Jump node at endpoint */}
                  {seg.kind === "serve" ? (
                    <g opacity={isExecuted || isHovered ? 1 : 0.35}>
                      <circle
                        cx={x2}
                        cy={y2}
                        r={isHovered ? 7.5 : isCurrentlyActive ? 6.5 : 5}
                        fill={color?.bg || "var(--highlight)"}
                        stroke={isHovered ? "var(--highlight)" : "var(--foreground)"}
                        strokeWidth={isHovered ? 2.5 : 2}
                        className="cursor-pointer"
                        onMouseEnter={() => {
                          setLocalHoveredId(seg.requestId || null);
                          onHoverRequest?.(seg.requestId || null);
                        }}
                        onMouseLeave={() => {
                          setLocalHoveredId(null);
                          onHoverRequest?.(null);
                        }}
                      >
                        <title>
                          {(seg.requestId && displayNames[seg.requestId]) || seg.requestName} (cylinder {seg.to})
                        </title>
                      </circle>
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
                    </g>
                  )}
                </g>
              );
            })}

            {/* Placed Label Boxes with Leader Lines and Background Chips */}
            {layout.placedBoxes.map((box) => {
              const shiftedX = padLeft + box.x;
              const shiftedY = padTop - initialTopOffset + box.y;
              const shiftedAnchorX = padLeft + box.anchorX;
              const shiftedAnchorY = padTop - initialTopOffset + box.anchorY;

              const isServingNow =
                box.id === "HEAD_START"
                  ? activeStep === 0
                  : segments[activeStep - 1]?.requestId === box.id;

              const isHovered = box.id === effectiveHoverId;
              const isHighlight = isHovered || isServingNow;

              return (
                <g key={`box-${box.id}`}>
                  {/* Leader line connecting moved box to anchor */}
                  {box.leaderLine && (
                    <line
                      x1={shiftedAnchorX}
                      y1={shiftedAnchorY}
                      x2={
                        shiftedX +
                        (box.side === "left"
                          ? box.width
                          : box.side === "right"
                            ? 0
                            : box.width / 2)
                      }
                      y2={shiftedY + box.height / 2}
                      stroke={box.color || "currentColor"}
                      strokeOpacity={isHighlight ? 0.85 : 0.4}
                      strokeWidth={isHighlight ? 1.5 : 1}
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Label Group with Background Chip */}
                  <g
                    className="cursor-pointer transition-opacity"
                    tabIndex={0}
                    role="button"
                    aria-label={box.fullName || box.text}
                    onMouseEnter={() => {
                      setLocalHoveredId(box.id);
                      onHoverRequest?.(box.id);
                    }}
                    onMouseLeave={() => {
                      setLocalHoveredId(null);
                      onHoverRequest?.(null);
                    }}
                  >
                    <title>{box.fullName || box.text}</title>
                    {/* Label Background Chip */}
                    <rect
                      x={shiftedX}
                      y={shiftedY}
                      width={box.width}
                      height={box.height}
                      rx={3}
                      ry={3}
                      fill={isPaper ? "var(--paper)" : "rgba(18, 38, 26, 0.95)"}
                      stroke={
                        isHighlight
                          ? "var(--highlight)"
                          : isPaper
                            ? "var(--foreground)"
                            : box.color || "rgba(255, 255, 255, 0.35)"
                      }
                      strokeOpacity={1}
                      strokeWidth={isHighlight ? 2 : 1.5}
                    />
                    <text
                      x={shiftedX + box.width / 2}
                      y={shiftedY + box.height / 2 + 4.5}
                      textAnchor="middle"
                      className="font-mono text-sm font-bold"
                      fill={
                        isPaper
                          ? "var(--foreground)"
                          : isHighlight
                            ? "var(--highlight)"
                            : box.color || "currentColor"
                      }
                    >
                      {box.text}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Collapsed Badges */}
            {layout.collapsedBadges.map((badge) => {
              const shiftedBadgeX = padLeft + badge.x;
              const shiftedBadgeY = padTop - initialTopOffset + badge.y;
              const isHovered = badge.id === effectiveHoverId;

              return (
                <g
                  key={`badge-${badge.id}`}
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`Badge ${badge.badgeIndex}: ${badge.fullName}`}
                  onMouseEnter={() => {
                    setLocalHoveredId(badge.id);
                    onHoverRequest?.(badge.id);
                  }}
                  onMouseLeave={() => {
                    setLocalHoveredId(null);
                    onHoverRequest?.(null);
                  }}
                >
                  <title>{`${badge.badgeIndex}: ${badge.fullName}`}</title>
                  <circle
                    cx={shiftedBadgeX + badge.radius}
                    cy={shiftedBadgeY + badge.radius}
                    r={isHovered ? badge.radius + 2 : badge.radius}
                    fill={badge.color || "var(--highlight)"}
                    stroke={isHovered ? "var(--highlight)" : "var(--foreground)"}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                  />
                  <text
                    x={shiftedBadgeX + badge.radius}
                    y={shiftedBadgeY + badge.radius + 4}
                    textAnchor="middle"
                    className="font-mono text-xs font-black"
                    fill="#0f2b1d"
                  >
                    {badge.badgeIndex}
                  </text>
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

      {/* Collapsed Items Legend (guaranteed fallback when items exceed maxLanes) */}
      {layout.legendItems.length > 0 && (
        <div
          className={`rounded border p-2.5 font-mono text-xs ${
            isPaper
              ? "border-foreground/30 bg-secondary/30 text-foreground"
              : "border-chalk-muted bg-black/20 text-chalk-foreground"
          }`}
        >
          <div
            className={`font-bold text-xs uppercase tracking-wider mb-1.5 ${
              isPaper ? "text-ink-muted" : "text-chalk-muted"
            }`}
          >
            Collapsed Requests (see chart badges):
          </div>
          <div className="flex flex-wrap gap-2">
            {layout.legendItems.map((item) => {
              const isHovered = item.id === effectiveHoverId;
              return (
                <span
                  key={`legend-${item.id}`}
                  onMouseEnter={() => {
                    setLocalHoveredId(item.id);
                    onHoverRequest?.(item.id);
                  }}
                  onMouseLeave={() => {
                    setLocalHoveredId(null);
                    onHoverRequest?.(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 border cursor-pointer transition-all ${
                    isHovered
                      ? isPaper
                        ? "border-foreground bg-highlight font-bold"
                        : "border-highlight bg-highlight/20 text-highlight font-bold"
                      : isPaper
                        ? "border-foreground/30 bg-paper text-foreground"
                        : "border-chalk-muted bg-black/30 text-chalk-foreground"
                  }`}
                  title={item.fullName}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold ${
                      isPaper ? "bg-foreground/15 text-foreground" : "bg-chalk-foreground/40 text-foreground"
                    }`}
                  >
                    {item.index}
                  </span>
                  <span>{item.fullName}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
