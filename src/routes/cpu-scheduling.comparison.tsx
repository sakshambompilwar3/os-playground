import { createFileRoute } from "@tanstack/react-router";
import { CpuSchedulingComparison } from "./comparison.cpu-scheduling";

export const Route = createFileRoute("/cpu-scheduling/comparison")({
  head: () => ({
    meta: [
      { title: "CPU Scheduling Comparison — OS Playground" },
      {
        name: "description",
        content:
          "Run FCFS, SJF, SRTF, Round Robin, and Priority on the exact same input simultaneously with synchronized Gantt charts.",
      },
      { property: "og:title", content: "CPU Scheduling Comparison" },
      {
        property: "og:description",
        content: "Side-by-side real-time comparison of CPU scheduling algorithms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CpuSchedulingComparison,
});
