import { createFileRoute } from "@tanstack/react-router";
import { TopicHub } from "@/components/TopicHub";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/disk-scheduling/")({
  head: () => ({
    meta: [
      { title: "Disk Scheduling | OS Playground" },
      {
        name: "description",
        content:
          "Explore disk scheduling algorithms: FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK.",
      },
      { property: "og:title", content: "Disk Scheduling | OS Playground" },
      {
        property: "og:description",
        content:
          "Explore disk scheduling algorithms: FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiskSchedulingHub,
});

const topic = OS_TOPICS.find((t) => t.slug === "disk-scheduling")!;

function DiskSchedulingHub() {
  return (
    <TopicHub
      title={topic.title}
      lectureLabel={`${topic.lectureLabel} · Table of Contents`}
      unitLabel={topic.unitLabel}
      entries={topic.hubEntries}
    />
  );
}
