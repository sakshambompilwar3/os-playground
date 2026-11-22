#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

console.log("==================================================");
console.log("Running Automated Contrast & Legibility Audit...");
console.log("==================================================");

const res = spawnSync("npx", ["vitest", "run", "src/test/contrast-audit.test.tsx", "--testTimeout=300000"], {
  stdio: "inherit",
  encoding: "utf-8",
});

const reportPath = path.resolve(process.cwd(), "docs/contrast-report.md");
if (fs.existsSync(reportPath)) {
  const content = fs.readFileSync(reportPath, "utf-8");
  console.log("\nAudit report generated successfully at docs/contrast-report.md\n");
  const lines = content.split("\n");
  const summaryLines = lines.slice(0, 55).join("\n");
  console.log(summaryLines);
} else {
  console.error("Warning: docs/contrast-report.md was not generated.");
}

process.exit(res.status || 0);
