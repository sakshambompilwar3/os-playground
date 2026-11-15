import { describe, expect, it } from "vitest";
import {
  type ChartLabelItem,
  type ChartLayoutBounds,
  type ChartLayoutOptions,
  chooseNiceTicks,
  computeChartLayout,
  doBoxesIntersect,
  estimateTextWidth,
  generateLaneSequence,
  truncateLabel,
} from "@/lib/chartLayout";

describe("chartLayout pure layout module", () => {
  const defaultBounds: ChartLayoutBounds = {
    minX: 50,
    maxX: 750,
    rowY: (r) => 40 + r * 35,
  };

  const defaultOptions: ChartLayoutOptions = {
    bounds: defaultBounds,
    labelHeight: 18,
    minGap: 8,
    maxLanes: 5,
    measureText: (text) => estimateTextWidth(text, 7.5),
  };

  describe("helper functions", () => {
    it("generates correct alternating lane sequence", () => {
      expect(generateLaneSequence(1)).toEqual([0]);
      expect(generateLaneSequence(3)).toEqual([0, 1, -1]);
      expect(generateLaneSequence(5)).toEqual([0, 1, -1, 2, -2]);
      expect(generateLaneSequence(7)).toEqual([0, 1, -1, 2, -2, 3, -3]);
    });

    it("truncates labels longer than 10 chars", () => {
      expect(truncateLabel("Short")).toBe("Short");
      expect(truncateLabel("TenChars!!")).toBe("TenChars!!");
      expect(truncateLabel("ElevenChars")).toBe("ElevenCha…");
      expect(truncateLabel("ExtremelyLongProcessName")).toBe("Extremely…");
    });

    it("correctly determines box intersections with gap", () => {
      const b1 = { x: 10, y: 10, width: 20, height: 20 };
      const b2 = { x: 35, y: 10, width: 20, height: 20 };
      // Gap between b1 (ends at 30) and b2 (starts at 35) is 5
      expect(doBoxesIntersect(b1, b2, 4)).toBe(false);
      expect(doBoxesIntersect(b1, b2, 6)).toBe(true);
    });
  });

  describe("hand-made edge cases", () => {
    it("handles two labels at the exact same anchor without overlap", () => {
      const items: ChartLabelItem[] = [
        { id: "A", text: "App A (100)", anchorX: 400, row: 1, priority: 10 },
        { id: "B", text: "App B (100)", anchorX: 400, row: 1, priority: 5 },
      ];

      const res = computeChartLayout(items, defaultOptions);
      expect(res.placedBoxes).toHaveLength(2);
      expect(res.collapsedBadges).toHaveLength(0);

      // Verify boxes do not intersect
      expect(doBoxesIntersect(res.placedBoxes[0]!, res.placedBoxes[1]!, defaultOptions.minGap)).toBe(
        false,
      );
      // High priority item is in lane 0
      const boxA = res.placedBoxes.find((b) => b.id === "A")!;
      const boxB = res.placedBoxes.find((b) => b.id === "B")!;
      expect(boxA.lane).toBe(0);
      expect(boxB.lane).not.toBe(0); // Shifted to another lane
      expect(boxB.leaderLine).toBe(true);
    });

    it("handles labels near both outer edges without clipping or crossing bounds", () => {
      const items: ChartLabelItem[] = [
        { id: "LeftEdge", text: "StartAtZero (0)", anchorX: 50, row: 0, priority: 50 },
        { id: "RightEdge", text: "EndAtMax (199)", anchorX: 750, row: 1, priority: 40 },
      ];

      const res = computeChartLayout(items, defaultOptions);
      for (const box of res.placedBoxes) {
        expect(box.x).toBeGreaterThanOrEqual(defaultBounds.minX);
        expect(box.x + box.width).toBeLessThanOrEqual(defaultBounds.maxX);
      }
    });

    it("handles many labels at nearly the same anchor across lanes", () => {
      const items: ChartLabelItem[] = [
        { id: "C1", text: "P1 (120)", anchorX: 300, row: 1, priority: 5 },
        { id: "C2", text: "P2 (121)", anchorX: 302, row: 1, priority: 5 },
        { id: "C3", text: "P3 (120)", anchorX: 301, row: 1, priority: 5 },
        { id: "C4", text: "P4 (122)", anchorX: 303, row: 1, priority: 5 },
      ];

      const res = computeChartLayout(items, defaultOptions);
      // All 4 should be placed into different lanes
      expect(res.placedBoxes).toHaveLength(4);
      for (let i = 0; i < res.placedBoxes.length; i++) {
        for (let j = i + 1; j < res.placedBoxes.length; j++) {
          expect(
            doBoxesIntersect(res.placedBoxes[i]!, res.placedBoxes[j]!, defaultOptions.minGap),
          ).toBe(false);
        }
      }
    });

    it("handles extremely long label clamped within bounds", () => {
      const longText = "VeryLongApplicationRequestNameThatExceedsNormalLength (999)";
      const items: ChartLabelItem[] = [
        { id: "Long", text: longText, anchorX: 740, row: 2, priority: 10 },
      ];

      const res = computeChartLayout(items, defaultOptions);
      expect(res.placedBoxes).toHaveLength(1);
      const b = res.placedBoxes[0]!;
      expect(b.x).toBeGreaterThanOrEqual(defaultBounds.minX);
      expect(b.x + b.width).toBeLessThanOrEqual(defaultBounds.maxX);
    });

    it("forces badge fallback when lanes are exhausted", () => {
      // 8 items at the exact same anchor with maxLanes = 3
      const items: ChartLabelItem[] = Array.from({ length: 8 }, (_, i) => ({
        id: `Item-${i}`,
        text: `Proc${i} (150)`,
        anchorX: 400,
        row: 1,
        priority: 10 - i,
      }));

      const tightOptions: ChartLayoutOptions = {
        ...defaultOptions,
        maxLanes: 3, // only lanes 0, 1, -1
      };

      const res = computeChartLayout(items, tightOptions);
      expect(res.placedBoxes.length).toBeLessThan(8);
      expect(res.collapsedBadges.length).toBeGreaterThan(0);
      expect(res.placedBoxes.length + res.collapsedBadges.length).toBe(8);
      expect(res.legendItems.length).toBe(res.collapsedBadges.length);

      // Verify no box or badge overlaps
      for (let i = 0; i < res.placedBoxes.length; i++) {
        for (let j = i + 1; j < res.placedBoxes.length; j++) {
          expect(
            doBoxesIntersect(res.placedBoxes[i]!, res.placedBoxes[j]!, tightOptions.minGap),
          ).toBe(false);
        }
        for (const badge of res.collapsedBadges) {
          const badgeBox = {
            x: badge.x,
            y: badge.y,
            width: badge.radius * 2,
            height: badge.radius * 2,
          };
          expect(doBoxesIntersect(res.placedBoxes[i]!, badgeBox, tightOptions.minGap)).toBe(false);
        }
      }

      for (let i = 0; i < res.collapsedBadges.length; i++) {
        for (let j = i + 1; j < res.collapsedBadges.length; j++) {
          const b1 = {
            x: res.collapsedBadges[i]!.x,
            y: res.collapsedBadges[i]!.y,
            width: res.collapsedBadges[i]!.radius * 2,
            height: res.collapsedBadges[i]!.radius * 2,
          };
          const b2 = {
            x: res.collapsedBadges[j]!.x,
            y: res.collapsedBadges[j]!.y,
            width: res.collapsedBadges[j]!.radius * 2,
            height: res.collapsedBadges[j]!.radius * 2,
          };
          expect(doBoxesIntersect(b1, b2, tightOptions.minGap)).toBe(false);
        }
      }
    });
  });

  describe("500 randomized layout invariant runs", () => {
    it("guarantees zero overlaps, within bounds, no dropped items, and deterministic placement", () => {
      // Seeded-like deterministic pseudo-random generator
      let seed = 123456789;
      const rng = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      for (let run = 0; run < 500; run++) {
        const width = 200 + rng() * 1800; // 200 to 2000
        const minX = 20 + rng() * 50;
        const maxX = minX + width;
        const bounds: ChartLayoutBounds = {
          minX,
          maxX,
          rowY: (r) => 30 + r * 28,
        };

        const itemCount = 1 + Math.floor(rng() * 20); // 1 to 20 items
        const items: ChartLabelItem[] = [];

        for (let i = 0; i < itemCount; i++) {
          // Anchors include duplicates, 0, minX, maxX
          let anchorX: number;
          const choice = rng();
          if (choice < 0.1) anchorX = minX;
          else if (choice < 0.2) anchorX = maxX;
          else if (choice < 0.4 && items.length > 0) anchorX = items[0]!.anchorX; // duplicate
          else anchorX = minX + rng() * width;

          const textLen = 2 + Math.floor(rng() * 30);
          const text = `App${i}_` + "X".repeat(textLen);
          const priority = Math.floor(rng() * 100);

          items.push({
            id: `item_${i}`,
            text,
            anchorX,
            row: Math.floor(rng() * 6),
            priority,
          });
        }

        // Set one item as highest priority
        const maxPriority = 1000;
        items[0]!.priority = maxPriority;

        const options: ChartLayoutOptions = {
          bounds,
          labelHeight: 16,
          minGap: 6,
          maxLanes: 5,
          measureText: (txt) => 10 + txt.length * 7,
        };

        const res1 = computeChartLayout(items, options);
        const res2 = computeChartLayout(items, options);

        // 1. Output is strictly deterministic for same input
        expect(res1.placedBoxes).toEqual(res2.placedBoxes);
        expect(res1.collapsedBadges).toEqual(res2.collapsedBadges);

        // 2. Each item is either placed or collapsed (none dropped)
        expect(res1.placedBoxes.length + res1.collapsedBadges.length).toBe(itemCount);

        // 3. Highest priority item never moves from preferred centered position
        const highestItem = items[0]!;
        const highestBox = res1.placedBoxes.find((b) => b.id === highestItem.id);
        expect(highestBox).toBeDefined();
        if (highestBox) {
          expect(highestBox.lane).toBe(0);
          const textW = options.measureText(highestItem.text);
          const boxW = Math.min(width, textW + 8);
          const expectedX = Math.max(bounds.minX, Math.min(bounds.maxX - boxW, highestItem.anchorX - boxW / 2));
          expect(highestBox.x).toBeCloseTo(expectedX, 1);
        }

        // 4. Every box lies strictly inside bounds
        for (const box of res1.placedBoxes) {
          expect(box.x).toBeGreaterThanOrEqual(bounds.minX - 0.001);
          expect(box.x + box.width).toBeLessThanOrEqual(bounds.maxX + 0.001);
        }

        // 5. No two placed boxes overlap (with minGap)
        for (let i = 0; i < res1.placedBoxes.length; i++) {
          for (let j = i + 1; j < res1.placedBoxes.length; j++) {
            const overlap = doBoxesIntersect(res1.placedBoxes[i]!, res1.placedBoxes[j]!, options.minGap);
            expect(overlap).toBe(false);
          }
        }

        // 6. No box overlaps with any badge
        for (const box of res1.placedBoxes) {
          for (const badge of res1.collapsedBadges) {
            const badgeBox = {
              x: badge.x,
              y: badge.y,
              width: badge.radius * 2,
              height: badge.radius * 2,
            };
            const overlap = doBoxesIntersect(box, badgeBox, options.minGap);
            expect(overlap).toBe(false);
          }
        }

        // 7. No two badges overlap
        for (let i = 0; i < res1.collapsedBadges.length; i++) {
          for (let j = i + 1; j < res1.collapsedBadges.length; j++) {
            const b1 = {
              x: res1.collapsedBadges[i]!.x,
              y: res1.collapsedBadges[i]!.y,
              width: res1.collapsedBadges[i]!.radius * 2,
              height: res1.collapsedBadges[i]!.radius * 2,
            };
            const b2 = {
              x: res1.collapsedBadges[j]!.x,
              y: res1.collapsedBadges[j]!.y,
              width: res1.collapsedBadges[j]!.radius * 2,
              height: res1.collapsedBadges[j]!.radius * 2,
            };
            const overlap = doBoxesIntersect(b1, b2, options.minGap);
            expect(overlap).toBe(false);
          }
        }
      }
    });
  });

  describe("tick chooser (chooseNiceTicks)", () => {
    it("always keeps 0, last cylinder E, and head start h, with no duplicates and no overlap", () => {
      const testCases = [
        { totalCylinders: 200, startHead: 53, width: 620 },
        { totalCylinders: 200, startHead: 0, width: 620 },
        { totalCylinders: 200, startHead: 199, width: 620 },
        { totalCylinders: 50, startHead: 25, width: 400 },
        { totalCylinders: 1000, startHead: 350, width: 800 },
        { totalCylinders: 5000, startHead: 2450, width: 1000 },
        { totalCylinders: 2, startHead: 1, width: 300 },
      ];

      const measureText = (text: string) => estimateTextWidth(text, 7.5);
      const minGap = 8;

      for (const tc of testCases) {
        const bounds = { minX: 50, maxX: 50 + tc.width };
        const ticks = chooseNiceTicks(tc.totalCylinders, tc.startHead, bounds, measureText, minGap);

        const E = tc.totalCylinders - 1;

        // 1. Tick 0 is present
        const has0 = ticks.some((t) => t.cylinder === 0);
        expect(has0).toBe(true);

        // 2. Tick E is present
        const hasE = ticks.some((t) => t.cylinder === E);
        expect(hasE).toBe(true);

        // 3. Head start is present and marked or has label
        const headTick = ticks.find((t) => t.cylinder === tc.startHead);
        expect(headTick).toBeDefined();
        expect(headTick?.isHead).toBe(true);
        expect(headTick?.label).toContain("h=");

        // 4. No cylinder number is repeated
        const cylinders = ticks.map((t) => t.cylinder);
        const uniqueCylinders = new Set(cylinders);
        expect(uniqueCylinders.size).toBe(cylinders.length);

        // 5. Ticks on the same yOffset never overlap horizontally
        for (let i = 0; i < ticks.length; i++) {
          for (let j = i + 1; j < ticks.length; j++) {
            const t1 = ticks[i]!;
            const t2 = ticks[j]!;
            if (t1.yOffset === t2.yOffset) {
              const w1 = measureText(t1.label);
              const w2 = measureText(t2.label);
              const left1 = t1.x - w1 / 2;
              const right1 = t1.x + w1 / 2;
              const left2 = t2.x - w2 / 2;
              const right2 = t2.x + w2 / 2;

              const overlaps = left1 < right2 + minGap && right1 > left2 - minGap;
              expect(overlaps).toBe(false);
            }
          }
        }
      }
    });
  });

  describe("manual verification suite (20+ runs per algo/dir, extremes, widths 375/768/1280)", () => {
    it("runs 20+ runs for every algorithm and direction with zero overlap and zero clipping", () => {
      const algorithms = ["fcfs", "sstf", "scan", "c-scan", "look", "c-look"] as const;
      const directions = ["higher", "lower"] as const;
      const widths = [375, 768, 1280];

      let seed = 456789;
      const rng = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      for (const algo of algorithms) {
        for (const dir of directions) {
          for (let r = 0; r < 20; r++) {
            const width = widths[r % widths.length]!;
            const totalCylinders = 50 + Math.floor(rng() * 450);
            const startHead = Math.floor(rng() * (totalCylinders - 1));
            const reqCount = 3 + Math.floor(rng() * 12);

            const items: ChartLabelItem[] = [];
            const plotWidth = Math.max(580, width - 140);
            const bounds: ChartLayoutBounds = {
              minX: 0,
              maxX: plotWidth,
              rowY: (rowIdx) => 45 + rowIdx * 36,
            };

            const E = totalCylinders - 1;
            const headX = (startHead / E) * plotWidth;
            items.push({
              id: "HEAD_START",
              text: `Start (${startHead})`,
              anchorX: headX,
              row: 0,
              priority: 100,
            });

            for (let i = 0; i < reqCount; i++) {
              const cyl = Math.floor(rng() * totalCylinders);
              const anchorX = (cyl / E) * plotWidth;
              items.push({
                id: `R${i + 1}`,
                text: `App${i + 1} (${cyl})`,
                anchorX,
                row: i + 1,
                priority: 50,
              });
            }

            const options: ChartLayoutOptions = {
              bounds,
              labelHeight: 18,
              minGap: 8,
              maxLanes: 5,
              measureText: (txt) => estimateTextWidth(txt, 7.5),
            };

            const res = computeChartLayout(items, options);

            // Assert no overlaps between placed boxes
            for (let i = 0; i < res.placedBoxes.length; i++) {
              for (let j = i + 1; j < res.placedBoxes.length; j++) {
                expect(doBoxesIntersect(res.placedBoxes[i]!, res.placedBoxes[j]!, options.minGap)).toBe(
                  false,
                );
              }
              // Assert inside bounds
              expect(res.placedBoxes[i]!.x).toBeGreaterThanOrEqual(bounds.minX - 0.001);
              expect(res.placedBoxes[i]!.x + res.placedBoxes[i]!.width).toBeLessThanOrEqual(
                bounds.maxX + 0.001,
              );
            }

            // Assert no overlap between badges and boxes
            for (const box of res.placedBoxes) {
              for (const badge of res.collapsedBadges) {
                const badgeBox = {
                  x: badge.x,
                  y: badge.y,
                  width: badge.radius * 2,
                  height: badge.radius * 2,
                };
                expect(doBoxesIntersect(box, badgeBox, options.minGap)).toBe(false);
              }
            }

            // Assert ticks
            const ticks = chooseNiceTicks(
              totalCylinders,
              startHead,
              bounds,
              (t) => estimateTextWidth(t, 7.5),
              8,
            );
            expect(ticks.some((t) => t.cylinder === 0)).toBe(true);
            expect(ticks.some((t) => t.cylinder === E)).toBe(true);
          }
        }
      }
    });

    it("verifies extremes: cylinders 2 and 9999, 1 and 15 requests, tight range, both ends, long names", () => {
      const extremes = [
        // 1. Cylinders = 2, 1 request
        { totalCylinders: 2, startHead: 0, cyls: [1], names: ["Solo"] },
        // 2. Cylinders = 9999, 15 requests
        {
          totalCylinders: 9999,
          startHead: 5000,
          cyls: Array.from({ length: 15 }, (_, i) => i * 650),
          names: Array.from({ length: 15 }, (_, i) => `Proc${i}`),
        },
        // 3. All requests in tiny range [100, 102]
        {
          totalCylinders: 200,
          startHead: 100,
          cyls: [100, 101, 100, 102, 101, 100, 102, 101],
          names: ["A", "B", "C", "D", "E", "F", "G", "H"],
        },
        // 4. Requests at both ends (0 and E)
        {
          totalCylinders: 200,
          startHead: 50,
          cyls: [0, 0, 199, 199, 0, 199],
          names: ["End0A", "End0B", "EndMaxA", "EndMaxB", "End0C", "EndMaxC"],
        },
        // 5. Extremely long names (> 25 characters)
        {
          totalCylinders: 200,
          startHead: 50,
          cyls: [20, 150],
          names: [
            "SupercalifragilisticexpialidociousApp",
            "InternationalizationAndLocalizationDaemon",
          ],
        },
      ];

      for (const ext of extremes) {
        for (const width of [375, 768, 1280]) {
          const plotWidth = Math.max(580, width - 140);
          const bounds: ChartLayoutBounds = {
            minX: 0,
            maxX: plotWidth,
            rowY: (rowIdx) => 45 + rowIdx * 36,
          };
          const E = Math.max(1, ext.totalCylinders - 1);

          const items: ChartLabelItem[] = [
            {
              id: "HEAD_START",
              text: `Start (${ext.startHead})`,
              anchorX: (ext.startHead / E) * plotWidth,
              row: 0,
              priority: 100,
            },
          ];

          ext.cyls.forEach((cyl, idx) => {
            const rawName = ext.names[idx] || `P${idx}`;
            const truncated = truncateLabel(rawName, 10);
            items.push({
              id: `R${idx}`,
              text: `${truncated} (${cyl})`,
              fullName: `${rawName} (${cyl})`,
              anchorX: (cyl / E) * plotWidth,
              row: idx + 1,
              priority: 50,
            });
          });

          const options: ChartLayoutOptions = {
            bounds,
            labelHeight: 18,
            minGap: 8,
            maxLanes: 5,
            measureText: (txt) => estimateTextWidth(txt, 7.5),
          };

          const res = computeChartLayout(items, options);

          // Assert no overlaps
          for (let i = 0; i < res.placedBoxes.length; i++) {
            for (let j = i + 1; j < res.placedBoxes.length; j++) {
              expect(doBoxesIntersect(res.placedBoxes[i]!, res.placedBoxes[j]!, options.minGap)).toBe(
                false,
              );
            }
            expect(res.placedBoxes[i]!.x).toBeGreaterThanOrEqual(bounds.minX - 0.001);
            expect(res.placedBoxes[i]!.x + res.placedBoxes[i]!.width).toBeLessThanOrEqual(
              bounds.maxX + 0.001,
            );
          }

          // Assert ticks
          const ticks = chooseNiceTicks(
            ext.totalCylinders,
            ext.startHead,
            bounds,
            (t) => estimateTextWidth(t, 7.5),
            8,
          );
          expect(ticks.some((t) => t.cylinder === 0)).toBe(true);
          expect(ticks.some((t) => t.cylinder === E)).toBe(true);
        }
      }
    });
  });
});
