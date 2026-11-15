import { createFileRoute } from "@tanstack/react-router";
import { CpuSchedulingComparison } from "./comparison.cpu-scheduling";

export const Route = createFileRoute("/cpu-scheduling/comparison")({
  head: () => ({
    meta: [
      { title: "CPU Scheduling Comparison | OS Playground" },
      {
        name: "description",
        content:
          "Compare FCFS, SJF, SRTF, Round Robin, and Priority scheduling side by side with synchronized Gantt charts and best algorithm verdicts.",
      },
      { property: "og:title", content: "CPU Scheduling Comparison | OS Playground" },
      {
        property: "og:description",
        content:
          "Compare FCFS, SJF, SRTF, Round Robin, and Priority scheduling side by side with synchronized Gantt charts and best algorithm verdicts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CpuSchedulingComparison,
});
