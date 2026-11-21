import { createFileRoute } from "@tanstack/react-router";
import { PageReplacementComparisonPage } from "./comparison.page-replacement";

export const Route = createFileRoute("/page-replacement/comparison")({
  head: () => ({
    meta: [
      { title: "Page Replacement Comparison | OS Playground" },
      {
        name: "description",
        content:
          "Compare FIFO, LRU, and Optimal page replacement algorithms side by side with synchronized frame step execution and automated best algorithm verdict.",
      },
      { property: "og:title", content: "Page Replacement Comparison | OS Playground" },
      {
        property: "og:description",
        content:
          "Compare FIFO, LRU, and Optimal page replacement algorithms side by side with synchronized frame step execution and automated best algorithm verdict.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PageReplacementComparisonPage,
});
