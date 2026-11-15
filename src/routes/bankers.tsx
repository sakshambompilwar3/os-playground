import { createFileRoute } from "@tanstack/react-router";
import { TopicHub } from "@/components/TopicHub";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/bankers")({
  head: () => ({
    meta: [
      { title: "Banker's Algorithm | OS Playground" },
      {
        name: "description",
        content:
          "Explore the Banker's Algorithm: notes, safety simulator, resource requests, deadlock lab, and pop quiz.",
      },
      { property: "og:title", content: "Banker's Algorithm | OS Playground" },
      {
        property: "og:description",
        content:
          "Explore the Banker's Algorithm: notes, safety simulator, resource requests, deadlock lab, and pop quiz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BankersHub,
});

const topic = OS_TOPICS.find((t) => t.slug === "bankers")!;

function BankersHub() {
  return (
    <TopicHub
      title={topic.title}
      lectureLabel={`${topic.lectureLabel} · Table of Contents`}
      unitLabel={topic.unitLabel}
      quote={topic.quote}
      entries={topic.hubEntries}
    />
  );
}
