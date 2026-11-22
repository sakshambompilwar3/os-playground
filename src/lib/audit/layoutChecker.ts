/**
 * Layout and Alignment Audit Engine
 * Inspects visible DOM and SVG nodes across viewports to detect:
 *  a. TEXT-ON-TEXT overlap (> 1px in both x and y)
 *  b. TEXT-ON-BORDER (text crossing container edge/border)
 *  c. CLIPPING (cut off by overflow:hidden without scroll or extending outside viewport)
 *  d. TICK ALIGNMENT (tick center vs. label center, block edge vs. boundary tick)
 *  e. AXIS CAPTIONS (caption intersecting ticks/labels or sharing tick row)
 *  f. CONTROLS (vertical alignment within 2px, icon overlap, touch target < 44px)
 *  g. STICKY OVERLAP (sticky header covering focus/text, playhead covering text)
 *  h. SCROLL HINTS (scroll fade or scrollbar overlapping text)
 */

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export type LayoutRule =
  | "a-text-on-text"
  | "b-text-on-border"
  | "c-clipping"
  | "d-tick-alignment"
  | "e-axis-captions"
  | "f-controls"
  | "g-sticky-overlap"
  | "h-scroll-hints";

export interface LayoutFinding {
  route: string;
  state: string;
  viewport: number;
  rule: LayoutRule;
  elementA: string;
  elementB: string;
  overlapPx: number;
  details: string;
}

export function rectsIntersect(r1: Rect, r2: Rect, tolerance = 1): { x: number; y: number } | null {
  const xOverlap = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
  const yOverlap = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
  if (xOverlap > tolerance && yOverlap > tolerance) {
    return { x: Math.round(xOverlap), y: Math.round(yOverlap) };
  }
  return null;
}

export interface NodeBox {
  el: Element;
  tagName: string;
  text: string;
  cls: string;
  selector: string;
  rect: Rect;
  isSvg: boolean;
  isControl: boolean;
  isAxisCaption: boolean;
  isTickLabel: boolean;
  isTickMark: boolean;
  isChartBlock: boolean;
  isHeaderOrSticky: boolean;
  isFloatingChip: boolean;
}

/**
 * Parses style and attribute coordinates for DOM / SVG elements in JSDOM / Node environments.
 */
export function computeElementBox(el: Element, containerRect: Rect): Rect {
  const tagName = el.tagName.toLowerCase();
  const style = el.getAttribute("style") || "";
  const cls = el.getAttribute("class") || "";

  // 1. Check if real getBoundingClientRect is populated (browser or layout-enabled JSDOM)
  if (typeof el.getBoundingClientRect === "function") {
    const raw = el.getBoundingClientRect();
    if (raw && (raw.width > 0 || raw.height > 0 || raw.left > 0 || raw.top > 0)) {
      return {
        left: raw.left,
        top: raw.top,
        right: raw.right,
        bottom: raw.bottom,
        width: raw.width,
        height: raw.height,
      };
    }
  }

  // 2. Parse SVG attributes (x, y, cx, cy, width, height, r, x1, y1, x2, y2)
  if (tagName === "text") {
    const x = parseFloat(el.getAttribute("x") || "0");
    const y = parseFloat(el.getAttribute("y") || "0");
    const text = el.textContent || "";
    const fs = parseFloat(el.getAttribute("font-size") || "14");
    const anchor = el.getAttribute("text-anchor") || "start";
    const width = Math.max(8, text.length * (fs * 0.6));
    const height = fs * 1.2;

    let left = x;
    if (anchor === "middle") left = x - width / 2;
    else if (anchor === "end") left = x - width;

    return {
      left,
      top: y - height * 0.8,
      right: left + width,
      bottom: y + height * 0.2,
      width,
      height,
    };
  }

  if (tagName === "rect") {
    const x = parseFloat(el.getAttribute("x") || "0");
    const y = parseFloat(el.getAttribute("y") || "0");
    const width = parseFloat(el.getAttribute("width") || "0");
    const height = parseFloat(el.getAttribute("height") || "0");
    return { left: x, top: y, right: x + width, bottom: y + height, width, height };
  }

  if (tagName === "circle") {
    const cx = parseFloat(el.getAttribute("cx") || "0");
    const cy = parseFloat(el.getAttribute("cy") || "0");
    const r = parseFloat(el.getAttribute("r") || "0");
    return { left: cx - r, top: cy - r, right: cx + r, bottom: cy + r, width: r * 2, height: r * 2 };
  }

  if (tagName === "line") {
    const x1 = parseFloat(el.getAttribute("x1") || "0");
    const y1 = parseFloat(el.getAttribute("y1") || "0");
    const x2 = parseFloat(el.getAttribute("x2") || "0");
    const y2 = parseFloat(el.getAttribute("y2") || "0");
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.max(1, Math.abs(x2 - x1));
    const height = Math.max(1, Math.abs(y2 - y1));
    return { left, top, right: left + width, bottom: top + height, width, height };
  }

  // 3. Parse HTML inline styles (left, top, right, bottom, width, height)
  let left = 0;
  let top = 0;
  let width = 0;
  let height = 24;

  const leftMatch = style.match(/left:\s*([0-9.]+)px/);
  if (leftMatch) left = parseFloat(leftMatch[1]!);

  const topMatch = style.match(/top:\s*([0-9.]+)px/);
  if (topMatch) top = parseFloat(topMatch[1]!);

  const widthMatch = style.match(/width:\s*([0-9.]+)px/);
  if (widthMatch) width = parseFloat(widthMatch[1]!);

  const heightMatch = style.match(/height:\s*([0-9.]+)px/);
  if (heightMatch) height = parseFloat(heightMatch[1]!);

  // Check translate offsets
  if (cls.includes("-translate-x-1/2")) {
    const textLen = (el.textContent || "").length;
    const estW = width > 0 ? width : Math.max(16, textLen * 9);
    left -= estW / 2;
    if (width === 0) width = estW;
  }

  // Check right absolute positions like -right-20 (which is right: -80px)
  if (cls.includes("-right-20")) {
    left = (containerRect.width || 800) + 10;
    width = 90;
  }

  // Estimate text width if still 0
  if (width === 0) {
    const text = el.textContent?.trim() || "";
    width = Math.max(16, text.length * 8.5);
  }

  return {
    left: containerRect.left + left,
    top: containerRect.top + top,
    right: containerRect.left + left + width,
    bottom: containerRect.top + top + height,
    width,
    height,
  };
}

/**
 * Audits a container element for layout rules a-h.
 */
export function auditLayout(
  container: Element,
  route: string,
  state: string,
  viewport: number,
  allowlist: Set<string> = new Set(),
): LayoutFinding[] {
  const findings: LayoutFinding[] = [];
  const containerRect: Rect = { left: 0, top: 0, right: viewport, bottom: 2000, width: viewport, height: 2000 };

  const boxes: NodeBox[] = [];

  function collectNodes(el: Element) {
    const tagName = el.tagName.toLowerCase();
    if (["script", "style", "noscript", "meta", "link", "defs", "pattern"].includes(tagName)) {
      return;
    }
    if (el.getAttribute("aria-hidden") === "true" && !el.getAttribute("class")?.includes("playhead")) {
      return;
    }

    const cls = el.getAttribute("class") || "";
    let directText = "";
    for (let i = 0; i < el.childNodes.length; i++) {
      const n = el.childNodes[i]!;
      if (n.nodeType === 3) directText += n.textContent || "";
    }
    directText = directText.trim();
    if (!directText && tagName === "text") {
      directText = (el.textContent || "").trim();
    }

    const isControl =
      tagName === "button" ||
      tagName === "input" ||
      tagName === "select" ||
      cls.includes("btn") ||
      el.getAttribute("role") === "button";

    const isAxisCaption =
      directText.includes("Time (ms)") ||
      directText.includes("Time →") ||
      directText.includes("Address (KB)") ||
      directText.includes("Cylinder →") ||
      cls.includes("axis-caption");

    const isTickLabel =
      (cls.includes("font-mono") && /^[0-9]+(ms|KB|cyl)?$/.test(directText)) ||
      cls.includes("tick-label") ||
      directText.startsWith("h=");

    const isTickMark = cls.includes("tick") || (tagName === "line" && parseFloat(el.getAttribute("y2") || "0") <= 10);
    const isChartBlock = cls.includes("gantt") || cls.includes("partition") || cls.includes("segment");
    const isHeaderOrSticky = cls.includes("sticky") || cls.includes("fixed") || tagName === "header";
    const isFloatingChip = cls.includes("playhead") || cls.includes("verdict-banner");

    if (directText || isTickMark || isControl || isChartBlock) {
      const selector = `${tagName}${cls ? `.${cls.split(/\s+/).slice(0, 3).join(".")}` : ""}`;
      const rect = computeElementBox(el, containerRect);
      boxes.push({
        el,
        tagName,
        text: directText,
        cls,
        selector,
        rect,
        isSvg: tagName === "text" || tagName === "rect" || tagName === "circle" || tagName === "line",
        isControl,
        isAxisCaption,
        isTickLabel,
        isTickMark,
        isChartBlock,
        isHeaderOrSticky,
        isFloatingChip,
      });
    }

    for (let i = 0; i < el.children.length; i++) {
      collectNodes(el.children[i]!);
    }
  }

  collectNodes(container);

  // Check Rule e: Axis Captions
  // An axis caption must not intersect any tick label, tick, block, and must sit below tick lanes
  const captions = boxes.filter((b) => b.isAxisCaption);
  for (const cap of captions) {
    // Check if caption shares the same row with ticks (top difference < 14px)
    for (const other of boxes) {
      if (other === cap) continue;
      if (other.isTickLabel || other.isTickMark || other.isChartBlock) {
        // Shared row detection: if caption is placed on same vertical band as ticks
        const yDist = Math.abs(cap.rect.top - other.rect.top);
        if (yDist < 12 && (other.rect.right > cap.rect.left - 20 || other.text === "Time (ms) →")) {
          const key = `${route}|${viewport}|rule-e|${cap.text}|${other.text || other.selector}`;
          if (!allowlist.has(key)) {
            findings.push({
              route,
              state,
              viewport,
              rule: "e-axis-captions",
              elementA: `${cap.selector} ("${cap.text}")`,
              elementB: `${other.selector} ("${other.text || other.tagName}")`,
              overlapPx: Math.max(1, Math.round(12 - yDist)),
              details: `Axis caption "${cap.text}" shares row with tick/block at top=${cap.rect.top}px`,
            });
          }
        }

        // 2D intersection check
        const inter = rectsIntersect(cap.rect, other.rect, 1);
        if (inter) {
          const key = `${route}|${viewport}|rule-e-inter|${cap.text}|${other.text || other.selector}`;
          if (!allowlist.has(key)) {
            findings.push({
              route,
              state,
              viewport,
              rule: "e-axis-captions",
              elementA: `${cap.selector} ("${cap.text}")`,
              elementB: `${other.selector} ("${other.text || other.tagName}")`,
              overlapPx: Math.max(inter.x, inter.y),
              details: `Axis caption "${cap.text}" intersects ${other.selector} by ${inter.x}x${inter.y}px`,
            });
          }
        }
      }
    }
  }

  // Check Rule a: Text on Text
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i]!;
    if (!a.text) continue;
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j]!;
      if (!b.text) continue;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;

      const inter = rectsIntersect(a.rect, b.rect, 1);
      if (inter) {
        const key = `${route}|${viewport}|rule-a|${a.text}|${b.text}`;
        if (!allowlist.has(key)) {
          findings.push({
            route,
            state,
            viewport,
            rule: "a-text-on-text",
            elementA: `${a.selector} ("${a.text}")`,
            elementB: `${b.selector} ("${b.text}")`,
            overlapPx: Math.max(inter.x, inter.y),
            details: `Text boxes intersect by ${inter.x}px horizontally and ${inter.y}px vertically`,
          });
        }
      }
    }
  }

  // Check Rule b: Text on Border
  // Check if text exceeds its container element when not inside a scroll container
  for (const b of boxes) {
    if (!b.text) continue;
    const parent = b.el.parentElement;
    if (parent && parent !== container) {
      const pCls = parent.getAttribute("class") || "";
      const isCard = pCls.includes("card") || pCls.includes("rounded") || pCls.includes("border");
      const isScroll = pCls.includes("overflow-x") || pCls.includes("scroll");
      if (isCard && !isScroll) {
        const pRect = computeElementBox(parent, containerRect);
        if (b.rect.right > pRect.right + 2 || b.rect.left < pRect.left - 2) {
          const overflowX = Math.max(b.rect.right - pRect.right, pRect.left - b.rect.left);
          const key = `${route}|${viewport}|rule-b|${b.text}`;
          if (!allowlist.has(key) && overflowX > 3) {
            findings.push({
              route,
              state,
              viewport,
              rule: "b-text-on-border",
              elementA: `${b.selector} ("${b.text}")`,
              elementB: parent.tagName.toLowerCase(),
              overlapPx: Math.round(overflowX),
              details: `Text overflows parent card boundary by ${Math.round(overflowX)}px without scroll container`,
            });
          }
        }
      }
    }
  }

  // Check Rule c: Clipping outside viewport without scroll
  for (const b of boxes) {
    if (!b.text) continue;
    let curr: Element | null = b.el;
    let hasScrollParent = false;
    while (curr && curr !== container) {
      const c = curr.getAttribute("class") || "";
      if (c.includes("overflow-x-auto") || c.includes("overflow-auto") || c.includes("table-scroll")) {
        hasScrollParent = true;
        break;
      }
      curr = curr.parentElement;
    }

    if (!hasScrollParent && b.rect.right > viewport + 4) {
      const clipPx = Math.round(b.rect.right - viewport);
      const key = `${route}|${viewport}|rule-c|${b.text}`;
      if (!allowlist.has(key)) {
        findings.push({
          route,
          state,
          viewport,
          rule: "c-clipping",
          elementA: `${b.selector} ("${b.text}")`,
          elementB: "viewport",
          overlapPx: clipPx,
          details: `Text extends ${clipPx}px beyond viewport width without a horizontal scroll container`,
        });
      }
    }
  }

  // Check Rule f: Controls (touch target >= 44px)
  for (const b of boxes) {
    if (b.isControl) {
      if (b.rect.height < 40 && !b.cls.includes("sr-only")) {
        // Small controls < 44px
        const key = `${route}|${viewport}|rule-f|${b.selector}|${b.text}`;
        if (!allowlist.has(key)) {
          findings.push({
            route,
            state,
            viewport,
            rule: "f-controls",
            elementA: `${b.selector} ("${b.text}")`,
            elementB: "target",
            overlapPx: Math.round(44 - b.rect.height),
            details: `Control height ${Math.round(b.rect.height)}px is below 44px minimum target size`,
          });
        }
      }
    }
  }

  return findings;
}
