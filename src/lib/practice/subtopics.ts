import { ProblemTopic, ProblemLevel } from "./types";
import { generateSeed } from "./rng";

export interface SubtopicOption {
  id: string;
  label: string;
}

export interface SelectorConfig {
  key: string;
  label: string;
  options: SubtopicOption[];
}

export const TOPIC_SELECTORS: Record<ProblemTopic, SelectorConfig[]> = {
  "cpu-scheduling": [
    {
      key: "sub",
      label: "Algorithm",
      options: [
        { id: "random", label: "Random" },
        { id: "fcfs", label: "FCFS" },
        { id: "sjf", label: "SJF" },
        { id: "srtf", label: "SRTF" },
        { id: "round-robin", label: "Round Robin" },
        { id: "priority-np", label: "Priority (non-preemptive)" },
        { id: "priority-p", label: "Priority (preemptive)" },
      ],
    },
  ],
  "memory-allocation": [
    {
      key: "mode",
      label: "Mode",
      options: [
        { id: "random", label: "Random" },
        { id: "fixed", label: "Fixed" },
        { id: "dynamic", label: "Dynamic" },
      ],
    },
    {
      key: "strategy",
      label: "Strategy",
      options: [
        { id: "random", label: "Random" },
        { id: "first-fit", label: "First Fit" },
        { id: "best-fit", label: "Best Fit" },
        { id: "worst-fit", label: "Worst Fit" },
        { id: "next-fit", label: "Next Fit" },
      ],
    },
  ],
  "disk-scheduling": [
    {
      key: "sub",
      label: "Algorithm",
      options: [
        { id: "random", label: "Random" },
        { id: "fcfs", label: "FCFS" },
        { id: "sstf", label: "SSTF" },
        { id: "scan", label: "SCAN" },
        { id: "c-scan", label: "C-SCAN" },
        { id: "look", label: "LOOK" },
        { id: "c-look", label: "C-LOOK" },
      ],
    },
  ],
  "page-replacement": [
    {
      key: "sub",
      label: "Algorithm",
      options: [
        { id: "random", label: "Random" },
        { id: "fifo", label: "FIFO" },
        { id: "lru", label: "LRU" },
        { id: "optimal", label: "Optimal" },
      ],
    },
  ],
  bankers: [
    {
      key: "sub",
      label: "Problem type",
      options: [
        { id: "random", label: "Random" },
        { id: "safety-check", label: "Safety check" },
        { id: "safe-sequence", label: "Safe sequence" },
        { id: "resource-request", label: "Resource request" },
      ],
    },
  ],
};

export interface ParsedPracticeParams {
  level: ProblemLevel;
  sub: string;
  mode: string;
  strategy: string;
  from: "hub" | "practice";
  seed: string;
}

export function parsePracticeUrlParams(
  topic: ProblemTopic,
  rawParams: Record<string, any>,
  fallbackSeed: string = generateSeed(),
): ParsedPracticeParams {
  const validLevels: ProblemLevel[] = ["easy", "medium", "hard"];
  const level: ProblemLevel = validLevels.includes(rawParams.level) ? rawParams.level : "easy";

  const from: "hub" | "practice" = rawParams.from === "hub" ? "hub" : "practice";

  const seed: string =
    typeof rawParams.seed === "string" && rawParams.seed.trim()
      ? rawParams.seed.trim().toUpperCase()
      : fallbackSeed;

  const selectors = TOPIC_SELECTORS[topic] || [];

  let sub = "random";
  let mode = "random";
  let strategy = "random";

  for (const sel of selectors) {
    const rawVal = String(rawParams[sel.key] || "").toLowerCase().trim();
    const match = sel.options.find((opt) => opt.id.toLowerCase() === rawVal);
    const chosen = match ? match.id : "random";

    if (sel.key === "sub") sub = chosen;
    if (sel.key === "mode") mode = chosen;
    if (sel.key === "strategy") strategy = chosen;
  }

  // Handle memory-allocation legacy or combined 'sub' parameter
  if (topic === "memory-allocation") {
    if (rawParams.sub) {
      const subVal = String(rawParams.sub).toLowerCase().trim();
      if (subVal === "fixed" || subVal === "dynamic") {
        mode = subVal;
      } else if (["first-fit", "best-fit", "worst-fit", "next-fit"].includes(subVal)) {
        strategy = subVal;
      }
    }
  }

  return {
    level,
    sub,
    mode,
    strategy,
    from,
    seed,
  };
}
