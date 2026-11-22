import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import * as fs from "node:fs";
import * as path from "node:path";
import { routeTree } from "@/routeTree.gen";
import { auditLayout, type LayoutFinding } from "@/lib/audit/layoutChecker";

vi.mock("@/components/PageTransition", () => ({
  PageTransition: () => null,
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const allFindings: LayoutFinding[] = [];
const VIEWPORTS = [360, 390, 768, 1280];

function createTestRouter(initialEntry: string) {
  return createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

async function auditRoute(routePath: string, states: string[] = ["initial"]) {
  cleanup();
  const router = createTestRouter(routePath);
  await router.load();
  const { container } = render(<RouterProvider router={router} />);

  for (const vp of VIEWPORTS) {
    allFindings.push(...auditLayout(container, routePath, "initial", vp));
  }

  if (states.includes("simulator")) {
    const allButtons = Array.from(container.querySelectorAll("button"));
    const loadExampleBtn = allButtons.find((b) => /load example/i.test(b.textContent || ""));
    if (loadExampleBtn) {
      act(() => {
        fireEvent.click(loadExampleBtn);
      });
      for (const vp of VIEWPORTS) {
        allFindings.push(...auditLayout(container, routePath, "after-load-example", vp));
      }
    }

    const stepBtn = allButtons.find((b) => /^step/i.test(b.textContent?.trim() || ""));
    if (stepBtn) {
      act(() => {
        fireEvent.click(stepBtn);
      });
      for (const vp of VIEWPORTS) {
        allFindings.push(...auditLayout(container, routePath, "mid-run", vp));
      }
    }

    const calcBtn = allButtons.find((b) => /calculations/i.test(b.textContent || ""));
    if (calcBtn) {
      act(() => {
        fireEvent.click(calcBtn);
      });
      for (const vp of VIEWPORTS) {
        allFindings.push(...auditLayout(container, routePath, "calculations-open", vp));
      }
    }
  }

  if (states.includes("comparison")) {
    const allButtons = Array.from(container.querySelectorAll("button"));
    const stepBtn = allButtons.find((b) => /^step/i.test(b.textContent?.trim() || ""));
    if (stepBtn) {
      act(() => {
        fireEvent.click(stepBtn);
      });
      for (const vp of VIEWPORTS) {
        allFindings.push(...auditLayout(container, routePath, "comparison-stepped", vp));
      }
    }

    const calcBtn = allButtons.find((b) => /calculations/i.test(b.textContent || ""));
    if (calcBtn) {
      act(() => {
        fireEvent.click(calcBtn);
      });
      for (const vp of VIEWPORTS) {
        allFindings.push(...auditLayout(container, routePath, "comparison-verdict", vp));
      }
    }
  }

  if (states.includes("practice")) {
    const allButtons = Array.from(container.querySelectorAll("button"));
    const showSolutionBtn = allButtons.find((b) => /show solution|solution/i.test(b.textContent || ""));
    if (showSolutionBtn) {
      act(() => {
        fireEvent.click(showSolutionBtn);
      });
      for (const vp of VIEWPORTS) {
        allFindings.push(...auditLayout(container, routePath, "practice-solution", vp));
      }
    }
  }

  if (states.includes("quiz")) {
    const optButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.getAttribute("aria-pressed") !== null || b.className.includes("border-2"),
    );
    if (optButtons[0]) {
      act(() => {
        fireEvent.click(optButtons[0]!);
      });
      for (const vp of VIEWPORTS) {
        allFindings.push(...auditLayout(container, routePath, "quiz-answered", vp));
      }
    }
  }

  if (states.includes("lab")) {
    const allButtons = Array.from(container.querySelectorAll("button"));
    const stepBtn = allButtons.find((b) => /step|next/i.test(b.textContent || ""));
    if (stepBtn) {
      act(() => {
        fireEvent.click(stepBtn);
      });
      for (const vp of VIEWPORTS) {
        allFindings.push(...auditLayout(container, routePath, "lab-stepped", vp));
      }
    }
  }
}

describe("Automated Overlap and Misalignment Audit (Task 1)", () => {
  it("audits Home, Hubs, and Catalog routes", async () => {
    const routes = [
      "/",
      "/cpu-scheduling",
      "/memory-allocation",
      "/disk-scheduling",
      "/page-replacement",
      "/bankers",
      "/notes",
      "/quiz",
      "/practice",
      "/labs",
      "/404-non-existent-page",
    ];
    for (const r of routes) {
      await auditRoute(r);
    }
  });

  it("audits Simulator routes and calculation states", async () => {
    const simulators = [
      "/cpu-scheduling/simulator",
      "/memory-allocation/simulator",
      "/disk-scheduling/simulator",
      "/page-replacement/simulator",
      "/simulator",
    ];
    for (const s of simulators) {
      await auditRoute(s, ["simulator"]);
    }
  });

  it("audits Comparison routes and verdicts", async () => {
    const comparisons = [
      "/comparison/cpu-scheduling",
      "/comparison/memory-allocation",
      "/comparison/disk-scheduling",
      "/comparison/page-replacement",
    ];
    for (const c of comparisons) {
      await auditRoute(c, ["comparison"]);
    }
  });

  it("audits Notes routes", async () => {
    const notes = [
      "/notes/cpu-scheduling",
      "/notes/memory-allocation",
      "/notes/disk-scheduling",
      "/notes/page-replacement",
    ];
    for (const n of notes) {
      await auditRoute(n);
    }
  });

  it("audits Quiz routes", async () => {
    const quizzes = [
      "/quiz/cpu-scheduling",
      "/quiz/memory-allocation",
      "/quiz/disk-scheduling",
      "/quiz/page-replacement",
      "/quiz/bankers",
    ];
    for (const q of quizzes) {
      await auditRoute(q, ["quiz"]);
    }
  });

  it("audits Practice routes and solutions", async () => {
    const practiceTopics = [
      "/practice/cpu-scheduling",
      "/practice/memory-allocation",
      "/practice/disk-scheduling",
      "/practice/page-replacement",
      "/practice/bankers",
    ];
    for (const p of practiceTopics) {
      await auditRoute(p, ["practice"]);
    }
  });

  it("audits Lab routes and steps", async () => {
    const labs = [
      "/labs/deadlock",
      "/labs/producer-consumer",
      "/labs/dining-philosophers",
    ];
    for (const l of labs) {
      await auditRoute(l, ["lab"]);
    }
  });

  afterAll(() => {
    const uniqueFindingsMap = new Map<string, LayoutFinding>();
    for (const f of allFindings) {
      const key = `${f.route}|${f.viewport}|${f.rule}|${f.elementA}|${f.elementB}|${f.details}`;
      if (!uniqueFindingsMap.has(key)) {
        uniqueFindingsMap.set(key, f);
      }
    }
    const uniqueFindings = Array.from(uniqueFindingsMap.values());

    const reportPath = path.resolve(process.cwd(), "docs/layout-report.md");
    let md = `# Automated Layout & Alignment Audit Report\n\n`;
    md += `**Total Unique Findings**: ${uniqueFindings.length}\n`;
    md += `Generated at: ${new Date().toISOString()}\n\n`;

    const byRule: Record<string, number> = {};
    const byRoute: Record<string, number> = {};
    for (const f of uniqueFindings) {
      byRule[f.rule] = (byRule[f.rule] || 0) + 1;
      byRoute[f.route] = (byRoute[f.route] || 0) + 1;
    }

    md += `## Baseline Findings by Rule\n\n`;
    md += `| Rule | Findings Count |\n| :--- | :--- |\n`;
    for (const rule of Object.keys(byRule).sort()) {
      md += `| \`${rule}\` | ${byRule[rule]} |\n`;
    }

    md += `\n## Baseline Findings by Route\n\n`;
    md += `| Route | Findings Count |\n| :--- | :--- |\n`;
    for (const route of Object.keys(byRoute).sort()) {
      md += `| \`${route}\` | ${byRoute[route]} |\n`;
    }

    md += `\n## Detailed Violations Table\n\n`;
    md += `| Route | State | Viewport | Rule | Element A | Element B | Overlap (px) | Details |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const f of uniqueFindings) {
      const cleanA = f.elementA.replace(/\|/g, "\\|").replace(/\n/g, " ");
      const cleanB = f.elementB.replace(/\|/g, "\\|").replace(/\n/g, " ");
      const cleanDet = f.details.replace(/\|/g, "\\|").replace(/\n/g, " ");
      md += `| \`${f.route}\` | ${f.state} | ${f.viewport}px | \`${f.rule}\` | \`${cleanA}\` | \`${cleanB}\` | ${f.overlapPx}px | ${cleanDet} |\n`;
    }

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, md, "utf8");

    console.log(`\n=== Layout Audit Completed ===`);
    console.log(`Total Unique Findings: ${uniqueFindings.length}`);
    console.log(`Report written to ${reportPath}\n`);
  });
});
