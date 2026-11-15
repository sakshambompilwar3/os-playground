/**
 * Pure layout module for the Disk Scheduling head-movement chart.
 * Contains no UI/DOM code. Handles collision resolution, lane assignment,
 * leader lines, guaranteed fallback badges, and adaptive tick marks.
 */

export interface ChartLabelItem {
  id: string;
  text: string;
  anchorX: number;
  row: number; // Row index: 0 for head start, 1..N for movement steps
  priority: number; // Higher numbers = higher priority (placed first, never moved)
  color?: string;
  fullName?: string;
}

export interface PlacedBox {
  id: string;
  x: number; // Top-left x
  y: number; // Top-left y
  width: number;
  height: number;
  lane: number; // 0 = centered on row, +1 = below, -1 = above, etc.
  side: "left" | "right" | "center";
  leaderLine: boolean;
  anchorX: number;
  anchorY: number;
  text: string;
  fullName?: string;
  color?: string;
  isBadge: boolean;
  badgeIndex?: number;
}

export interface CollapsedBadge {
  id: string;
  badgeIndex: number;
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  radius: number;
  fullName: string;
  text: string;
  color?: string;
}

export interface ChartLayoutBounds {
  minX: number;
  maxX: number;
  rowY: (row: number) => number;
}

export interface ChartLayoutOptions {
  bounds: ChartLayoutBounds;
  labelHeight: number;
  minGap: number;
  maxLanes: number; // Maximum number of lane offsets to explore (e.g. 5: 0, 1, -1, 2, -2)
  laneHeightStep?: number; // Vertical distance between lanes, defaults to labelHeight + minGap
  measureText: (text: string) => number;
  badgeRadius?: number;
}

export interface ChartLayoutResult {
  placedBoxes: PlacedBox[];
  collapsedBadges: CollapsedBadge[];
  legendItems: { index: number; id: string; text: string; fullName: string; color?: string }[];
  extents: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Standard fallback text-width estimator for non-browser environments.
 * Uses ~7.5px per character for standard 11px monospace chalk font.
 */
export function estimateTextWidth(text: string, charWidth = 7.5): number {
  return Math.max(12, Math.round(text.length * charWidth));
}

/**
 * Checks whether two 2D boxes intersect, taking a minimum gap into account.
 */
export function doBoxesIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap: number,
): boolean {
  const aLeft = a.x - gap / 2;
  const aRight = a.x + a.width + gap / 2;
  const aTop = a.y - gap / 2;
  const aBottom = a.y + a.height + gap / 2;

  const bLeft = b.x - gap / 2;
  const bRight = b.x + b.width + gap / 2;
  const bTop = b.y - gap / 2;
  const bBottom = b.y + b.height + gap / 2;

  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

/**
 * Generates alternating lane sequence: 0, 1, -1, 2, -2, 3, -3... up to maxLanes.
 */
export function generateLaneSequence(maxLanes: number): number[] {
  const lanes: number[] = [0];
  let step = 1;
  while (lanes.length < maxLanes) {
    lanes.push(step);
    if (lanes.length < maxLanes) {
      lanes.push(-step);
    }
    step += 1;
  }
  return lanes;
}

/**
 * Truncates label text longer than maxLen with an ellipsis.
 */
export function truncateLabel(text: string, maxLen = 10): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(1, maxLen - 1))}…`;
}

/**
 * Computes deterministic non-overlapping layout for chart labels with guaranteed fallback.
 */
export function computeChartLayout(
  items: ChartLabelItem[],
  options: ChartLayoutOptions,
): ChartLayoutResult {
  const {
    bounds,
    labelHeight,
    minGap,
    maxLanes,
    laneHeightStep = labelHeight + minGap,
    measureText,
    badgeRadius = 7.5,
  } = options;

  const placedBoxes: PlacedBox[] = [];
  const collapsedBadges: CollapsedBadge[] = [];
  const legendItems: ChartLayoutResult["legendItems"] = [];

  const laneOffsets = generateLaneSequence(maxLanes);

  // Sort items: higher priority first; for equal priority, sort by anchorX, then id for determinism
  const sortedItems = [...items].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.anchorX !== b.anchorX) return a.anchorX - b.anchorX;
    return a.id.localeCompare(b.id);
  });

  const availableWidth = bounds.maxX - bounds.minX;

  for (const item of sortedItems) {
    const textWidth = measureText(item.text);
    const boxWidth = Math.min(availableWidth, textWidth + 8); // +8 for padding
    const anchorY = bounds.rowY(item.row);

    let placed = false;

    // Highest priority items (e.g. head start) try centered placement in lane 0 first
    // Then try right of anchor, left of anchor, in alternating lane sequence
    for (const lane of laneOffsets) {
      const y = anchorY + lane * laneHeightStep - labelHeight / 2;

      // Determine preferred candidate order: centered placement first, then flip to opposite side
      const candidateSides: Array<{ side: "center" | "right" | "left"; x: number }> = [
        { side: "center", x: item.anchorX - boxWidth / 2 },
      ];

      const isRightHeavy = item.anchorX > bounds.minX + availableWidth * 0.55;
      if (isRightHeavy) {
        candidateSides.push(
          { side: "left", x: item.anchorX - boxWidth - 8 },
          { side: "right", x: item.anchorX + 8 },
        );
      } else {
        candidateSides.push(
          { side: "right", x: item.anchorX + 8 },
          { side: "left", x: item.anchorX - boxWidth - 8 },
        );
      }

      for (const cand of candidateSides) {
        // Clamp strictly within bounds
        const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX - boxWidth, cand.x));

        const testBox = {
          x: clampedX,
          y,
          width: boxWidth,
          height: labelHeight,
        };

        // Check intersection with all already placed boxes and collapsed badges
        const overlapsBox = placedBoxes.some((existing) =>
          doBoxesIntersect(testBox, existing, minGap),
        );
        const overlapsBadge = collapsedBadges.some((existing) =>
          doBoxesIntersect(
            testBox,
            {
              x: existing.x,
              y: existing.y,
              width: existing.radius * 2,
              height: existing.radius * 2,
            },
            minGap,
          ),
        );

        if (!overlapsBox && !overlapsBadge) {
          // Found non-overlapping valid placement
          const anchorInsideBox = item.anchorX >= clampedX && item.anchorX <= clampedX + boxWidth;
          const movedAway = lane !== 0 || !anchorInsideBox;

          placedBoxes.push({
            id: item.id,
            x: clampedX,
            y,
            width: boxWidth,
            height: labelHeight,
            lane,
            side: cand.side,
            leaderLine: movedAway,
            anchorX: item.anchorX,
            anchorY,
            text: item.text,
            fullName: item.fullName,
            color: item.color,
            isBadge: false,
          });

          placed = true;
          break;
        }
      }

      if (placed) break;
    }

    // GUARANTEED FALLBACK: If item could not be placed within maxLanes without overlapping,
    // collapse into a small numbered badge at its anchor and list in the legend
    if (!placed) {
      const badgeIndex = legendItems.length + 1;
      const badgeDiameter = badgeRadius * 2;
      const baseBadgeX = Math.max(
        bounds.minX,
        Math.min(bounds.maxX - badgeDiameter, item.anchorX - badgeRadius),
      );
      const baseBadgeY = anchorY - badgeRadius;

      // Stacking collision resolution for badges: try at base, then stack vertically
      let badgeY = baseBadgeY;
      let badgePlaced = false;
      const verticalShifts = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5];

      for (const shift of verticalShifts) {
        const testY = baseBadgeY + shift * (badgeDiameter + minGap);
        const testBadgeBox = {
          x: baseBadgeX,
          y: testY,
          width: badgeDiameter,
          height: badgeDiameter,
        };

        const overlapsBox = placedBoxes.some((b) => doBoxesIntersect(testBadgeBox, b, minGap));
        const overlapsBadge = collapsedBadges.some((b) =>
          doBoxesIntersect(
            testBadgeBox,
            { x: b.x, y: b.y, width: badgeDiameter, height: badgeDiameter },
            minGap,
          ),
        );

        if (!overlapsBox && !overlapsBadge) {
          badgeY = testY;
          badgePlaced = true;
          break;
        }
      }

      // If all tight shifts overlap existing elements, find next free vertical slot
      if (!badgePlaced) {
        let stepCount = 6;
        while (!badgePlaced && stepCount < 200) {
          for (const sign of [1, -1]) {
            const testY = baseBadgeY + sign * stepCount * (badgeDiameter + minGap);
            const testBadgeBox = {
              x: baseBadgeX,
              y: testY,
              width: badgeDiameter,
              height: badgeDiameter,
            };
            const overlapsBox = placedBoxes.some((b) => doBoxesIntersect(testBadgeBox, b, minGap));
            const overlapsBadge = collapsedBadges.some((b) =>
              doBoxesIntersect(
                testBadgeBox,
                { x: b.x, y: b.y, width: badgeDiameter, height: badgeDiameter },
                minGap,
              ),
            );
            if (!overlapsBox && !overlapsBadge) {
              badgeY = testY;
              badgePlaced = true;
              break;
            }
          }
          stepCount += 1;
        }
      }

      collapsedBadges.push({
        id: item.id,
        badgeIndex,
        anchorX: item.anchorX,
        anchorY,
        x: baseBadgeX,
        y: badgeY,
        radius: badgeRadius,
        fullName: item.fullName || item.text,
        text: item.text,
        color: item.color,
      });

      legendItems.push({
        index: badgeIndex,
        id: item.id,
        text: item.text,
        fullName: item.fullName || item.text,
        color: item.color,
      });
    }
  }

  // Compute extents across all placed boxes and badges
  let minX = bounds.minX;
  let maxX = bounds.maxX;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const b of placedBoxes) {
    if (b.x < minX) minX = b.x;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y < minY) minY = b.y;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }

  for (const b of collapsedBadges) {
    if (b.x < minX) minX = b.x;
    if (b.x + b.radius * 2 > maxX) maxX = b.x + b.radius * 2;
    if (b.y < minY) minY = b.y;
    if (b.y + b.radius * 2 > maxY) maxY = b.y + b.radius * 2;
  }

  if (minY === Infinity) minY = 0;
  if (maxY === -Infinity) maxY = 100;

  return {
    placedBoxes,
    collapsedBadges,
    legendItems,
    extents: { minX, maxX, minY, maxY },
  };
}

export interface TickItem {
  cylinder: number;
  x: number;
  yOffset: number;
  label: string;
  isHead: boolean;
  isBoundary: boolean;
}

/**
 * Chooses nice, non-overlapping cylinder tick values (1, 2, 5 times 10^k).
 * Always preserves 0, last cylinder E, and head start h.
 * Replaces the head start tick label with "h=" label rather than repeating it.
 * Never prints duplicate numbers and strictly eliminates collisions.
 */
export function chooseNiceTicks(
  totalCylinders: number,
  startHead: number,
  bounds: { minX: number; maxX: number },
  measureText: (text: string) => number,
  minGap = 8,
): TickItem[] {
  const E = Math.max(1, totalCylinders - 1);
  const h = Math.max(0, Math.min(E, Math.round(startHead)));
  const width = Math.max(1, bounds.maxX - bounds.minX);

  const getX = (cyl: number) => {
    const clamped = Math.max(0, Math.min(E, cyl));
    return bounds.minX + (clamped / E) * width;
  };

  // Determine standard tick label width
  const sampleLabel = String(E);
  const tickWidth = measureText(sampleLabel);
  const tickSlot = tickWidth + minGap;
  const maxPossibleTicks = Math.max(3, Math.floor(width / Math.max(16, tickSlot)));

  // Nice steps: 1, 2, 5 * 10^k
  const roughStep = Math.max(1, E / maxPossibleTicks);
  const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const fraction = roughStep / power;

  let niceMultiplier = 1;
  if (fraction > 5) {
    niceMultiplier = 10;
  } else if (fraction > 2) {
    niceMultiplier = 5;
  } else if (fraction > 1) {
    niceMultiplier = 2;
  }
  const niceStep = Math.max(1, niceMultiplier * power);

  // Generate candidate tick values: multiples of niceStep
  const candidateCylinders: number[] = [];
  for (let c = niceStep; c < E; c += niceStep) {
    candidateCylinders.push(c);
  }

  // Mandatory ticks: 0, E, and head start (with priority)
  // Store as intervals [left, right] to ensure zero overlap
  const keptTicks: TickItem[] = [];
  const occupiedIntervals: Array<{ left: number; right: number; yOffset: number }> = [];

  const tryAddTick = (
    cyl: number,
    label: string,
    isHead: boolean,
    isBoundary: boolean,
    force = false,
  ): boolean => {
    // Avoid duplicate cylinder entries
    if (keptTicks.some((t) => t.cylinder === cyl)) return false;

    const x = getX(cyl);
    const textW = measureText(label);
    const left = x - textW / 2;
    const right = x + textW / 2;

    let yOffset = 0;
    const overlapsAtZero = occupiedIntervals.some(
      (occ) => occ.yOffset === 0 && left < occ.right + minGap && right > occ.left - minGap,
    );

    if (overlapsAtZero) {
      if (isHead) {
        // Head start can stagger vertically so it never collides with boundary ticks
        yOffset = 14;
        const overlapsAtStagger = occupiedIntervals.some(
          (occ) => occ.yOffset === 14 && left < occ.right + minGap && right > occ.left - minGap,
        );
        if (overlapsAtStagger && !force) {
          return false;
        }
      } else if (!force) {
        return false;
      }
    }

    keptTicks.push({
      cylinder: cyl,
      x,
      yOffset,
      label,
      isHead,
      isBoundary,
    });

    occupiedIntervals.push({ left, right, yOffset });
    return true;
  };

  // 1. Mandatory Tick 1: 0 (boundary)
  tryAddTick(0, "0", h === 0, true, true);

  // 2. Mandatory Tick 2: E (boundary)
  if (E !== 0) {
    tryAddTick(E, String(E), h === E, true, true);
  }

  // 3. Mandatory Tick 3: Head start h
  if (h !== 0 && h !== E) {
    tryAddTick(h, `h=${h}`, true, false, true);
  } else if (h === 0) {
    // Replace 0 tick label with head label
    const tick0 = keptTicks.find((t) => t.cylinder === 0);
    if (tick0) {
      tick0.label = "h=0";
      tick0.isHead = true;
    }
  } else if (h === E) {
    // Replace E tick label with head label
    const tickE = keptTicks.find((t) => t.cylinder === E);
    if (tickE) {
      tickE.label = `h=${E}`;
      tickE.isHead = true;
    }
  }

  // 4. Fill in candidate ticks that do not collide with mandatory or already kept ticks
  for (const c of candidateCylinders) {
    tryAddTick(c, String(c), false, false, false);
  }

  // Sort kept ticks strictly by cylinder for rendering
  return keptTicks.sort((a, b) => a.cylinder - b.cylinder);
}
