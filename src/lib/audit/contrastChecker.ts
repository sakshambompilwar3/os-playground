/**
 * WCAG 2.1 Contrast and Legibility Checker
 */

export interface AuditFinding {
  route: string;
  state: string;
  viewport: number;
  selector: string;
  text: string;
  ratio: number;
  size: number;
  problem: string;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Color conversion math
function oklchToRgb(L: number, C: number, hDeg: number): RGB {
  const hRad = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const rLin = +4.0767434729 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const gamma = (u: number) => {
    const uc = Math.max(0, Math.min(1, u));
    return uc <= 0.0031308 ? 12.92 * uc : 1.055 * uc ** (1 / 2.4) - 0.055;
  };

  return {
    r: Math.round(gamma(rLin) * 255),
    g: Math.round(gamma(gLin) * 255),
    b: Math.round(gamma(bLin) * 255),
    a: 1,
  };
}

// Theme variables mapped to sRGB
export const THEME_COLORS: Record<string, RGB> = {
  background: { r: 243, g: 234, b: 217, a: 1 }, // oklch(0.94 0.025 85)
  paper: { r: 249, g: 243, b: 229, a: 1 }, // oklch(0.965 0.02 88)
  card: { r: 249, g: 243, b: 229, a: 1 },
  popover: { r: 249, g: 243, b: 229, a: 1 },
  foreground: { r: 16, g: 26, b: 40, a: 1 }, // oklch(0.20 0.04 260)
  "card-foreground": { r: 16, g: 26, b: 40, a: 1 },
  "popover-foreground": { r: 16, g: 26, b: 40, a: 1 },
  primary: { r: 51, g: 95, b: 167, a: 1 }, // oklch(0.45 0.13 255)
  "primary-foreground": { r: 253, g: 248, b: 236, a: 1 },
  secondary: { r: 233, g: 221, b: 198, a: 1 },
  "secondary-foreground": { r: 16, g: 26, b: 40, a: 1 },
  muted: { r: 230, g: 223, b: 212, a: 1 },
  "muted-foreground": { r: 58, g: 70, b: 88, a: 1 }, // oklch(0.38 0.04 260)
  chalk: { r: 34, g: 76, b: 55, a: 1 }, // oklch(0.38 0.06 160)
  "chalk-foreground": { r: 253, g: 248, b: 236, a: 1 },
  "chalk-text": { r: 253, g: 248, b: 236, a: 1 },
  accent: { r: 220, g: 117, b: 62, a: 1 },
  "accent-foreground": { r: 16, g: 26, b: 40, a: 1 },
  highlight: { r: 255, g: 224, b: 91, a: 1 },
  "chalk-yellow": { r: 255, g: 224, b: 91, a: 1 },
  "chalk-cyan": { r: 125, g: 211, b: 252, a: 1 },
  "chalk-pink": { r: 244, g: 114, b: 182, a: 1 },
  success: { r: 35, g: 118, b: 67, a: 1 }, // oklch(0.50 0.13 150)
  "success-foreground": { r: 253, g: 248, b: 236, a: 1 },
  destructive: { r: 170, g: 59, b: 52, a: 1 },
  "destructive-foreground": { r: 253, g: 248, b: 236, a: 1 },

  // Semantic tokens introduced in Task 2:
  ink: { r: 16, g: 26, b: 40, a: 1 }, // oklch(0.20 0.04 260)
  "ink-muted": { r: 58, g: 70, b: 88, a: 1 }, // oklch(0.38 0.04 260)
  "chalk-muted": { r: 204, g: 222, b: 209, a: 1 }, // oklch(0.85 0.03 140)
  "on-accent": { r: 12, g: 22, b: 35, a: 1 }, // oklch(0.18 0.04 260)
};

export function parseColor(colorStr: string): RGB | null {
  if (!colorStr || colorStr === "transparent" || colorStr === "inherit") return null;

  if (colorStr.startsWith("#")) {
    const hex = colorStr.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  const rgbMatch = colorStr.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/);
  if (rgbMatch) {
    return {
      r: parseFloat(rgbMatch[1]!),
      g: parseFloat(rgbMatch[2]!),
      b: parseFloat(rgbMatch[3]!),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  const oklchMatch = colorStr.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\s*\)/);
  if (oklchMatch) {
    const res = oklchToRgb(parseFloat(oklchMatch[1]!), parseFloat(oklchMatch[2]!), parseFloat(oklchMatch[3]!));
    if (oklchMatch[4] !== undefined) {
      res.a = parseFloat(oklchMatch[4]);
    }
    return res;
  }

  const varMatch = colorStr.match(/var\(--([a-zA-Z0-9_-]+)\)/);
  if (varMatch) {
    const varName = varMatch[1]!.replace(/^color-/, "");
    if (THEME_COLORS[varName]) {
      return { ...THEME_COLORS[varName] };
    }
  }

  return null;
}

export function relativeLuminance(rgb: RGB): number {
  const ch = (val: number) => {
    const c = Math.max(0, Math.min(1, val / 255));
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b);
}

export function contrastRatio(c1: RGB, c2: RGB): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

export function compositeOver(fg: RGB, bg: RGB): RGB {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const r = Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a);
  const g = Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a);
  const b = Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a);
  return { r, g, b, a };
}

export function extractStyleFromClass(className: string): {
  color?: RGB;
  bg?: RGB;
  fontSize?: number;
  opacity?: number;
  isBold?: boolean;
  hasPattern?: boolean;
} {
  const res: {
    color?: RGB;
    bg?: RGB;
    fontSize?: number;
    opacity?: number;
    isBold?: boolean;
    hasPattern?: boolean;
  } = {};

  if (!className) return res;
  const tokens = className.split(/\s+/);

  for (const token of tokens) {
    const opMatch = token.match(/^opacity-(\d+)$/);
    if (opMatch) {
      res.opacity = parseInt(opMatch[1]!, 10) / 100;
    }

    if (token === "text-[10px]") res.fontSize = 10;
    else if (token === "text-[11px]") res.fontSize = 11;
    else if (token === "text-xs") res.fontSize = 12;
    else if (token === "text-[13px]") res.fontSize = 13;
    else if (token === "text-sm") res.fontSize = 14;
    else if (token === "text-base") res.fontSize = 16;
    else if (token === "text-lg") res.fontSize = 18;
    else if (token === "text-xl") res.fontSize = 20;
    else if (token === "text-2xl") res.fontSize = 24;
    else if (token === "text-3xl") res.fontSize = 30;
    else if (token === "text-4xl") res.fontSize = 36;
    else if (token === "text-5xl") res.fontSize = 48;
    else if (token === "text-6xl") res.fontSize = 60;

    if (token.includes("font-bold") || token.includes("font-semibold") || token.includes("font-black")) {
      res.isBold = true;
    }

    if (token === "notebook" || token.includes("hatch") || token.includes("stripe")) {
      res.hasPattern = true;
    }

    if (token.startsWith("text-")) {
      const rest = token.slice(5);
      const [colName, alpha] = rest.split("/");
      if (colName && THEME_COLORS[colName]) {
        const base = { ...THEME_COLORS[colName] };
        if (alpha) {
          base.a = parseInt(alpha, 10) / 100;
        }
        res.color = base;
      }
    }

    if (token === "paper-card" || token === "notebook") {
      res.bg = { ...THEME_COLORS.paper! };
    }

    if (token.startsWith("bg-")) {
      const rest = token.slice(3);
      const [colName, alpha] = rest.split("/");
      if (colName && THEME_COLORS[colName]) {
        const base = { ...THEME_COLORS[colName] };
        if (alpha) {
          base.a = parseInt(alpha, 10) / 100;
        }
        res.bg = base;
      } else if (colName === "white") {
        res.bg = { r: 255, g: 255, b: 255, a: alpha ? parseInt(alpha, 10) / 100 : 1 };
      } else if (colName === "black") {
        res.bg = { r: 0, g: 0, b: 0, a: alpha ? parseInt(alpha, 10) / 100 : 1 };
      }
    }
  }

  return res;
}

interface ContextState {
  bgRgb: RGB;
  totalOpacity: number;
  hasPattern: boolean;
  isChalkboard: boolean;
  inheritedFontSize: number;
  isInsideChart: boolean;
  isInsideButtonOrRounded: boolean;
}

export function auditContainer(
  container: Element,
  route: string,
  state: string,
  viewport: number,
  allowlist: Set<string> = new Set()
): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const initialContext: ContextState = {
    bgRgb: { ...THEME_COLORS.paper! },
    totalOpacity: 1,
    hasPattern: false,
    isChalkboard: false,
    inheritedFontSize: 16,
    isInsideChart: false,
    isInsideButtonOrRounded: false,
  };

  function traverse(el: Element, ctx: ContextState) {
    const tagName = el.tagName.toLowerCase();
    if (["script", "style", "noscript", "meta", "link", "defs", "pattern"].includes(tagName)) {
      return;
    }

    if (el.getAttribute("aria-hidden") === "true") {
      return;
    }

    const cls = el.getAttribute("class") || "";
    const styleAttr = el.getAttribute("style") || "";
    const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
    const classParsed = extractStyleFromClass(cls);

    let selfOpacity = 1;
    const styleOpMatch = styleAttr.match(/opacity:\s*([0-9.]+)/);
    if (styleOpMatch) selfOpacity = parseFloat(styleOpMatch[1]!);
    else if (classParsed.opacity !== undefined) selfOpacity = classParsed.opacity;

    const nextTotalOpacity = ctx.totalOpacity * selfOpacity;
    const nextIsChalkboard = ctx.isChalkboard || cls.includes("chalkboard") || cls.includes("chalk-board");
    const nextHasPattern = ctx.hasPattern || cls.includes("notebook") || cls.includes("hatch") || cls.includes("stripe");
    const nextIsInsideChart = ctx.isInsideChart || ariaLabel.includes("chart") || el.hasAttribute("data-chart");
    const nextIsInsideButtonOrRounded = ctx.isInsideButtonOrRounded || tagName === "button" || cls.includes("rounded");

    let nextBgRgb = ctx.bgRgb;
    if (cls.includes("paper-card") || cls.includes("notebook")) {
      nextBgRgb = { ...THEME_COLORS.paper! };
    } else if (cls.includes("chalkboard") || cls.includes("chalk-board")) {
      nextBgRgb = { ...THEME_COLORS.chalk! };
    } else {
      let styleBg: RGB | null = null;
      const styleBgMatch = styleAttr.match(/background(?:-color)?:\s*([^;]+)/);
      if (styleBgMatch) {
        styleBg = parseColor(styleBgMatch[1]!.trim());
      }
      const effBg = styleBg || classParsed.bg;
      if (effBg) {
        if (effBg.a < 1) {
          nextBgRgb = compositeOver(effBg, ctx.bgRgb);
        } else {
          nextBgRgb = effBg;
        }
      }
    }

    if (tagName === "text" && el.previousElementSibling) {
      const prevEl = el.previousElementSibling;
      const prevTag = prevEl.tagName.toLowerCase();
      if (prevTag === "rect" || prevTag === "circle" || prevTag === "path") {
        const prevFill = prevEl.getAttribute("fill");
        if (prevFill && prevFill !== "none" && prevFill !== "transparent") {
          const chipBg = parseColor(prevFill);
          if (chipBg) {
            nextBgRgb = chipBg;
          }
        }
      }
    }

    let nextFontSize = ctx.inheritedFontSize;
    if (classParsed.fontSize) {
      nextFontSize = classParsed.fontSize;
    } else {
      const fsMatch = styleAttr.match(/font-size:\s*([0-9.]+)px/);
      if (fsMatch) nextFontSize = parseFloat(fsMatch[1]!);
      else if (tagName === "text") {
        const svgFs = el.getAttribute("font-size") || el.getAttribute("fontSize");
        if (svgFs) nextFontSize = parseFloat(svgFs);
        else nextFontSize = 12;
      }
    }

    // Check direct text
    let text = "";
    for (let i = 0; i < el.childNodes.length; i++) {
      const n = el.childNodes[i]!;
      if (n.nodeType === 3) text += n.textContent || "";
    }
    text = text.trim();
    if (!text && tagName === "text") {
      text = (el.textContent || "").trim();
    }

    if (text) {
      const idAttr = el.getAttribute("id") ? `#${el.getAttribute("id")}` : "";
      const selector = `${tagName}${idAttr}${cls ? `.${cls.split(/\s+/).slice(0, 3).join(".")}` : ""}`;

      if (!allowlist.has(selector) && !allowlist.has(text)) {
        const isChartTickOrLabel =
          cls.includes("tick") ||
          cls.includes("axis") ||
          cls.includes("cylinder") ||
          (cls.includes("time") && !cls.includes("seek")) ||
          (tagName === "text" && (cls.includes("tick") || cls.includes("axis") || text.includes("→") || text.includes("cyl")));

        if (nextFontSize < 12) {
          findings.push({
            route,
            state,
            viewport,
            selector,
            text: text.slice(0, 30),
            ratio: 0,
            size: nextFontSize,
            problem: `Font size ${nextFontSize}px is below 12px minimum`,
          });
        } else if (isChartTickOrLabel && nextFontSize < 14) {
          findings.push({
            route,
            state,
            viewport,
            selector,
            text: text.slice(0, 30),
            ratio: 0,
            size: nextFontSize,
            problem: `Chart tick/label font size ${nextFontSize}px is below 14px minimum`,
          });
        }

        if (nextHasPattern && !classParsed.bg && !nextIsInsideButtonOrRounded) {
          if (cls.includes("hatch") || cls.includes("internal frag") || text.includes("internal frag") || text.includes("hole")) {
            findings.push({
              route,
              state,
              viewport,
              selector,
              text: text.slice(0, 30),
              ratio: 0,
              size: nextFontSize,
              problem: "Text over pattern/hatch background without a solid chip",
            });
          }
        }

        // Color & contrast
        let fgRgb: RGB | null = classParsed.color || null;
        if (!fgRgb) {
          const styleColMatch = styleAttr.match(/color:\s*([^;]+)/);
          if (styleColMatch) {
            fgRgb = parseColor(styleColMatch[1]!.trim());
          } else if (tagName === "text") {
            const fill = el.getAttribute("fill");
            if (fill && fill !== "none" && fill !== "currentColor") {
              fgRgb = parseColor(fill);
            }
          }
        }
        if (!fgRgb) {
          fgRgb = nextIsChalkboard ? { ...THEME_COLORS["chalk-foreground"]! } : { ...THEME_COLORS.foreground! };
        }

        fgRgb.a = (fgRgb.a || 1) * nextTotalOpacity;
        const effectiveFg = compositeOver(fgRgb, nextBgRgb);
        const ratio = Math.round(contrastRatio(effectiveFg, nextBgRgb) * 100) / 100;

        const isDisabled = el.hasAttribute("disabled") || cls.includes("disabled");
        const isLarge = nextFontSize >= 24 || (nextFontSize >= 18.66 && classParsed.isBold);
        const minRatio = isDisabled ? 3.0 : isLarge ? 3.0 : 4.5;

        if (ratio < minRatio) {
          findings.push({
            route,
            state,
            viewport,
            selector,
            text: text.slice(0, 30),
            ratio,
            size: nextFontSize,
            problem: `Contrast ${ratio}:1 below required ${minRatio}:1 (${isDisabled ? "disabled" : isLarge ? "large" : "normal"} text)`,
          });
        }
      }
    }

    // Recurse on children
    const nextContext: ContextState = {
      bgRgb: nextBgRgb,
      totalOpacity: nextTotalOpacity,
      hasPattern: nextHasPattern,
      isChalkboard: nextIsChalkboard,
      inheritedFontSize: nextFontSize,
      isInsideChart: nextIsInsideChart,
      isInsideButtonOrRounded: nextIsInsideButtonOrRounded,
    };

    for (let i = 0; i < el.children.length; i++) {
      traverse(el.children[i]!, nextContext);
    }
  }

  traverse(container, initialContext);
  return findings;
}
