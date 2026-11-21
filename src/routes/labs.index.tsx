import { createFileRoute } from "@tanstack/react-router";
import { TopicHub } from "@/components/TopicHub";
import { LAB_HUB_ENTRIES } from "@/lib/labs";

export const Route = createFileRoute("/labs/")({
  head: () => ({
    meta: [
      { title: "Labs | OS Playground" },
      {
        name: "description",
        content: "Hands-on experiments: watch deadlocks, buffers and philosophers in action.",
      },
      { property: "og:title", content: "Labs | OS Playground" },
      {
        property: "og:description",
        content: "Hands-on experiments: watch deadlocks, buffers and philosophers in action.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LabsHub,
});

function LabsHub() {
  return (
    <TopicHub
      title="Labs"
      lectureLabel="OPERATING SYSTEMS · LABS"
      subtitle="Hands-on experiments: watch deadlocks, buffers and philosophers in action."
      entries={LAB_HUB_ENTRIES}
    />
  );
}
