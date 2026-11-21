import { createFileRoute } from "@tanstack/react-router";
import { SynchronizationComparisonPage } from "./comparison.synchronization";

export const Route = createFileRoute("/synchronization/comparison")({
  head: () => ({
    meta: [
      { title: "Process Synchronization Comparison | OS Playground" },
      {
        name: "description",
        content:
          "Compare Naive, Ordered Hierarchy, Room Limit, and Asymmetric Dining Philosophers strategies side by side with deadlock detection and best strategy verdict.",
      },
      { property: "og:title", content: "Process Synchronization Comparison | OS Playground" },
      {
        property: "og:description",
        content:
          "Compare Naive, Ordered Hierarchy, Room Limit, and Asymmetric Dining Philosophers strategies side by side with deadlock detection and best strategy verdict.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SynchronizationComparisonPage,
});
