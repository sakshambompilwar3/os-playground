import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { THEME_COLORS, contrastRatio } from "../lib/audit/contrastChecker";

describe("Semantic Text Tokens & Contrast Ratios (Task 2)", () => {
  it("verifies that all primary and muted text tokens meet WCAG AA against their surfaces", () => {
    // 1. Paper surfaces
    const paper = THEME_COLORS["paper"];
    const ink = THEME_COLORS["ink"];
    const inkMuted = THEME_COLORS["ink-muted"];
    const foreground = THEME_COLORS["foreground"];
    const mutedForeground = THEME_COLORS["muted-foreground"];

    expect(paper).toBeDefined();
    expect(ink).toBeDefined();
    expect(inkMuted).toBeDefined();

    // Primary ink on paper must exceed 7:1
    const inkPaperRatio = contrastRatio(ink, paper);
    expect(inkPaperRatio).toBeGreaterThanOrEqual(7.0);

    // Foreground on paper must exceed 7:1
    const fgPaperRatio = contrastRatio(foreground, paper);
    expect(fgPaperRatio).toBeGreaterThanOrEqual(7.0);

    // Muted ink on paper must exceed 4.5:1
    const inkMutedPaperRatio = contrastRatio(inkMuted, paper);
    expect(inkMutedPaperRatio).toBeGreaterThanOrEqual(4.5);

    // Muted foreground on paper must exceed 4.5:1
    const mutedFgPaperRatio = contrastRatio(mutedForeground, paper);
    expect(mutedFgPaperRatio).toBeGreaterThanOrEqual(4.5);

    // 2. Chalkboard surface
    const chalkboard = THEME_COLORS["chalk"];
    const chalkFg = THEME_COLORS["chalk-foreground"];
    const chalkMuted = THEME_COLORS["chalk-muted"];

    expect(chalkboard).toBeDefined();
    expect(chalkFg).toBeDefined();
    expect(chalkMuted).toBeDefined();

    // Primary chalk on chalkboard must exceed 7:1
    const chalkRatio = contrastRatio(chalkFg, chalkboard);
    expect(chalkRatio).toBeGreaterThanOrEqual(7.0);

    // Muted chalk on chalkboard must exceed 4.5:1
    const chalkMutedRatio = contrastRatio(chalkMuted, chalkboard);
    expect(chalkMutedRatio).toBeGreaterThanOrEqual(4.5);

    // 3. Accent surfaces
    const highlight = THEME_COLORS["highlight"];
    const accent = THEME_COLORS["accent"];
    const onAccent = THEME_COLORS["on-accent"];

    expect(highlight).toBeDefined();
    expect(accent).toBeDefined();
    expect(onAccent).toBeDefined();

    // On-accent on highlight (yellow) must exceed 4.5:1
    const onHighlightRatio = contrastRatio(onAccent, highlight);
    expect(onHighlightRatio).toBeGreaterThanOrEqual(4.5);

    // On-accent on pencil orange accent must exceed 4.5:1
    const onAccentRatio = contrastRatio(onAccent, accent);
    expect(onAccentRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("statically scans src/ for opacity text fading outside disabled states", () => {
    const srcDir = path.resolve(__dirname, "..");
    const extensions = [".tsx", ".ts", ".css"];
    const violations: { file: string; line: number; match: string }[] = [];

    // Utility classes that fade text via alpha
    // Disallowed outside disabled states:
    // - text-(muted-foreground|chalk-foreground|foreground|ink)/(\d+) where \d+ <= 84
    // - standalone opacity-(\d+) where \d+ <= 84 on text elements
    const alphaPattern =
      /(?:text-(?:muted-foreground|chalk-foreground|foreground|ink)\/(?:[1-7]\d|80|84)\b)|(?<!disabled:|peer-disabled:|group-disabled:|aria-disabled:)\bopacity-(?:[1-7]\d|80|84)\b/;

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== ".git") {
            scanDir(fullPath);
          }
        } else if (extensions.includes(path.extname(entry.name))) {
          // Skip test files, audit checkers, and scripts
          if (
            entry.name.includes(".test.") ||
            entry.name.includes("contrastChecker") ||
            entry.name.includes("PageTransition")
          ) {
            continue;
          }
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            // Ignore comments
            if (line.trim().startsWith("//") || line.trim().startsWith("/*")) return;
            // Ignore non-text UI decorations (like dividers, shadows, slider tracks)
            if (
              line.includes("border-") ||
              line.includes("bg-") ||
              line.includes("shadow-") ||
              line.includes("ring-")
            ) {
              // check if the line contains a forbidden text- utility
              const textMatch = line.match(
                /\btext-(?:muted-foreground|chalk-foreground|foreground|ink)\/(?:[1-7]\d|80|84)\b/
              );
              if (textMatch) {
                violations.push({
                  file: path.relative(srcDir, fullPath),
                  line: idx + 1,
                  match: textMatch[0],
                });
              }
              return;
            }
            const match = line.match(alphaPattern);
            if (match) {
              // Skip if line has disabled / aria-disabled
              if (
                line.includes("disabled") ||
                line.includes("aria-disabled") ||
                line.includes("pointer-events-none")
              ) {
                return;
              }
              violations.push({
                file: path.relative(srcDir, fullPath),
                line: idx + 1,
                match: match[0],
              });
            }
          });
        }
      }
    }

    scanDir(srcDir);

    if (violations.length > 0) {
      const summary = violations
        .slice(0, 15)
        .map((v) => `${v.file}:${v.line} -> ${v.match}`)
        .join("\n");
      expect.fail(
        `Found ${violations.length} instances of text fading with opacity outside disabled states:\n${summary}`
      );
    }
  });
});
