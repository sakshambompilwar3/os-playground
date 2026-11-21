import { createFileRoute } from "@tanstack/react-router";
import { TopicHub } from "@/components/TopicHub";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/synchronization/")({
  head: () => ({
    meta: [
      { title: "Process Synchronization | OS Playground" },
      {
        name: "description",
        content:
          "Interactive simulators and learning lab for classical synchronization: Bounded Buffer, Semaphores, and Dining Philosophers.",
      },
      { property: "og:title", content: "Process Synchronization | OS Playground" },
      {
        property: "og:description",
        content:
          "Interactive simulators and learning lab for classical synchronization: Bounded Buffer, Semaphores, and Dining Philosophers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SynchronizationHub,
});

const topic = OS_TOPICS.find((t) => t.slug === "synchronization")!;

function SynchronizationHub() {
  return (
    <TopicHub
      title={topic.title}
      lectureLabel={`${topic.lectureLabel} · Table of Contents`}
      unitLabel={topic.unitLabel}
      entries={topic.hubEntries}
    />
  );
}
