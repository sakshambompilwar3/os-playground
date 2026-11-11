import { createFileRoute } from "@tanstack/react-router";
import { TopicHub } from "@/components/TopicHub";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/cpu-scheduling/")({
  head: () => ({
    meta: [
      { title: "CPU Scheduling — OS Class" },
      { name: "description", content: "Explore CPU scheduling algorithms: FCFS, SJF, Round Robin and more." },
      { property: "og:title", content: "CPU Scheduling — OS Class" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CpuSchedulingHub,
});

const topic = OS_TOPICS.find((t) => t.slug === "cpu-scheduling")!;

function CpuSchedulingHub() {
  return (
    <TopicHub
      title={topic.title}
      lectureLabel={`${topic.lectureLabel} · Table of Contents`}
      unitLabel={topic.unitLabel}
      entries={topic.hubEntries}
    />
  );
}
