import { createFileRoute } from "@tanstack/react-router";
import { TopicHub } from "@/components/TopicHub";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/memory-allocation/")({
  head: () => ({
    meta: [
      { title: "Memory Allocation | OS Playground" },
      {
        name: "description",
        content:
          "Explore contiguous memory allocation strategies: First Fit, Best Fit, Worst Fit, Next Fit, notes, and quiz.",
      },
      { property: "og:title", content: "Memory Allocation | OS Playground" },
      {
        property: "og:description",
        content:
          "Explore contiguous memory allocation strategies: First Fit, Best Fit, Worst Fit, Next Fit, notes, and quiz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryAllocationHub,
});

const topic = OS_TOPICS.find((t) => t.slug === "memory-allocation")!;

function MemoryAllocationHub() {
  return (
    <TopicHub
      title={topic.title}
      lectureLabel={`${topic.lectureLabel} · Table of Contents`}
      unitLabel={topic.unitLabel}
      entries={topic.hubEntries}
    />
  );
}
