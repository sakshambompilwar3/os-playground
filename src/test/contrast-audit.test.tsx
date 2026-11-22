import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import * as fs from "node:fs";
import * as path from "node:path";
import { routeTree } from "@/routeTree.gen";
import { auditContainer, type AuditFinding } from "@/lib/audit/contrastChecker";

vi.mock("@/components/PageTransition", () => ({
  PageTransition: () => null,
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const allFindings: AuditFinding[] = [];

function createTestRouter(initialEntry: string) {
  return createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
}

async function auditRoute(routePath: string, states: string[] = ["initial"]) {
  console.log(`Auditing ${routePath}...`);
  console.time(`total ${routePath}`);
  cleanup();
  const router = createTestRouter(routePath);
  await router.load();
  const { container } = render(<RouterProvider router={router} />);

  // Initial state for 390 and 1280
  const initFindings = auditContainer(container, routePath, "initial", 1280);
  allFindings.push(...initFindings);
  allFindings.push(...initFindings.map((f) => ({ ...f, viewport: 390 })));

  if (states.includes("simulator")) {
    const allButtons = Array.from(container.querySelectorAll("button"));
    const loadExampleBtn = allButtons.find((b) => /load example/i.test(b.textContent || ""));
    if (loadExampleBtn) {
      act(() => {
        fireEvent.click(loadExampleBtn);
      });
      const exFindings = auditContainer(container, routePath, "after-load-example", 1280);
      allFindings.push(...exFindings);
      allFindings.push(...exFindings.map((f) => ({ ...f, viewport: 390 })));
    }

    const stepBtn = allButtons.find((b) => /^step/i.test(b.textContent?.trim() || ""));
    if (stepBtn) {
      act(() => {
        fireEvent.click(stepBtn);
      });
      const stepFindings = auditContainer(container, routePath, "mid-run", 1280);
      allFindings.push(...stepFindings);
      allFindings.push(...stepFindings.map((f) => ({ ...f, viewport: 390 })));
    }
  }

  if (states.includes("comparison")) {
    const allButtons = Array.from(container.querySelectorAll("button"));
    const stepBtn = allButtons.find((b) => /^step/i.test(b.textContent?.trim() || ""));
    if (stepBtn) {
      act(() => {
        fireEvent.click(stepBtn);
      });
      const cStep = auditContainer(container, routePath, "comparison-stepped", 1280);
      allFindings.push(...cStep);
      allFindings.push(...cStep.map((f) => ({ ...f, viewport: 390 })));
    }
    const verdictBtn = allButtons.find((b) => /verdict|show verdict/i.test(b.textContent || ""));
    if (verdictBtn) {
      act(() => {
        fireEvent.click(verdictBtn);
      });
      const cVerdict = auditContainer(container, routePath, "comparison-verdict", 1280);
      allFindings.push(...cVerdict);
      allFindings.push(...cVerdict.map((f) => ({ ...f, viewport: 390 })));
    }
  }

  if (states.includes("quiz")) {
    const optionBtn = container.querySelector("button[role='radio'], button.press, label");
    if (optionBtn) {
      act(() => {
        fireEvent.click(optionBtn);
      });
      const qAns = auditContainer(container, routePath, "quiz-answered", 1280);
      allFindings.push(...qAns);
      allFindings.push(...qAns.map((f) => ({ ...f, viewport: 390 })));
    }
  }

  if (states.includes("practice")) {
    const allButtons = Array.from(container.querySelectorAll("button"));
    const showSolBtn = allButtons.find((b) => /solution|show/i.test(b.textContent || ""));
    if (showSolBtn) {
      act(() => {
        fireEvent.click(showSolBtn);
      });
      const pSol = auditContainer(container, routePath, "practice-solution", 1280);
      allFindings.push(...pSol);
      allFindings.push(...pSol.map((f) => ({ ...f, viewport: 390 })));
    }
  }

  if (states.includes("lab")) {
    const allButtons = Array.from(container.querySelectorAll("button"));
    const loadBtn = allButtons.find((b) => /load example/i.test(b.textContent || ""));
    if (loadBtn) {
      act(() => {
        fireEvent.click(loadBtn);
      });
    }
    const stepBtn = allButtons.find((b) => /step|next/i.test(b.textContent || ""));
    if (stepBtn) {
      act(() => {
        fireEvent.click(stepBtn);
      });
    }
    const lStep = auditContainer(container, routePath, "lab-stepped", 1280);
    allFindings.push(...lStep);
    allFindings.push(...lStep.map((f) => ({ ...f, viewport: 390 })));
  }
}

describe("Automated Legibility and Contrast Audit (Task 1)", () => {
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
      "/notes/bankers",
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
    const uniqueFindingsMap = new Map<string, AuditFinding>();
    for (const f of allFindings) {
      const key = `${f.route}|${f.viewport}|${f.selector}|${f.problem}`;
      if (!uniqueFindingsMap.has(key)) {
        uniqueFindingsMap.set(key, f);
      }
    }
    const uniqueFindings = Array.from(uniqueFindingsMap.values());

    const reportPath = path.resolve(process.cwd(), "docs/contrast-report.md");
    let md = `# Automated Legibility & Contrast Audit Report\n\n`;
    md += `**Total Unique Findings**: ${uniqueFindings.length}\n`;
    md += `Generated at: ${new Date().toISOString()}\n\n`;

    const byRoute: Record<string, AuditFinding[]> = {};
    for (const f of uniqueFindings) {
      if (!byRoute[f.route]) byRoute[f.route] = [];
      byRoute[f.route]!.push(f);
    }

    md += `## Baseline Findings by Route\n\n`;
    md += `| Route | Findings Count |\n| :--- | :--- |\n`;
    const sortedRoutes = Object.keys(byRoute).sort();
    for (const route of sortedRoutes) {
      const count = byRoute[route]?.length || 0;
      md += `| \`${route}\` | ${count} |\n`;
    }

    md += `\n## Detailed Violations Table\n\n`;
    md += `| Route | State | Viewport | Element / Selector | Text | Ratio | Size | Problem |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const f of uniqueFindings) {
      const cleanText = f.text.replace(/\|/g, "\\|").replace(/\n/g, " ");
      const cleanSel = f.selector.replace(/\|/g, "\\|");
      md += `| \`${f.route}\` | ${f.state} | ${f.viewport}px | \`${cleanSel}\` | "${cleanText}" | ${f.ratio > 0 ? `${f.ratio}:1` : "N/A"} | ${f.size}px | ${f.problem} |\n`;
    }

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, md, "utf8");

    console.log(`\n=== Contrast Audit Completed ===`);
    console.log(`Total Unique Findings: ${uniqueFindings.length}`);
    console.log(`Report written to ${reportPath}\n`);

    expect(uniqueFindings.length).toBe(0);
  });
});
