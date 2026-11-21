import { createFileRoute } from "@tanstack/react-router";
import { TopicHub } from "@/components/TopicHub";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/page-replacement/")({
  head: () => ({
    meta: [
      { title: "Page Replacement | OS Playground" },
      {
        name: "description",
        content:
          "Simulate and compare virtual memory page replacement algorithms: FIFO, LRU, and Optimal.",
      },
      { property: "og:title", content: "Page Replacement | OS Playground" },
      {
        property: "og:description",
        content:
          "Simulate and compare virtual memory page replacement algorithms: FIFO, LRU, and Optimal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PageReplacementHub,
});

const topic = OS_TOPICS.find((t) => t.slug === "page-replacement")!;

function PageReplacementHub() {
  return (
    <TopicHub
      title={topic.title}
      lectureLabel={`${topic.lectureLabel} · Table of Contents`}
      unitLabel={topic.unitLabel}
      entries={topic.hubEntries}
    />
  );
}
