import { createFileRoute } from "@tanstack/react-router";
import { TopicHub } from "@/components/TopicHub";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/bankers")({
  head: () => ({
    meta: [
      { title: "Banker's Algorithm — OS Class" },
      { name: "description", content: "Explore the Banker's Algorithm: notes, safety simulator, resource requests, deadlock lab, and pop quiz." },
      { property: "og:title", content: "Banker's Algorithm — OS Class" },
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
      lectureLabel="CS-301 · Operating Systems · Table of Contents"
      unitLabel={topic.unitLabel}
      quote={topic.quote}
      entries={topic.hubEntries}
    />
  );
}
