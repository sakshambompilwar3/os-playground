import { createFileRoute, Link } from "@tanstack/react-router";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/notes/")({
  head: () => ({
    meta: [
      { title: "Notes | OS Playground" },
      {
        name: "description",
        content: "Browse visual lecture notes and chalkboard diagrams for all Operating Systems topics.",
      },
      { property: "og:title", content: "Notes | OS Playground" },
      {
        property: "og:description",
        content: "Browse visual lecture notes and chalkboard diagrams for all Operating Systems topics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotesIndex,
});

function NotesIndex() {
  return (
    <div className="space-y-8">
      <h1 className="font-hand text-6xl font-bold">Notes</h1>
      <p className="text-muted-foreground">Pick a topic to study.</p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {OS_TOPICS.map((topic, i) => (
          <Link
            key={topic.slug}
            to={`/notes/${topic.slug}`}
            className={`animate-float group relative block min-h-44 p-5 shadow-[var(--shadow-paper)] transition-transform hover:scale-105 ${topic.color}`}
            style={{ ["--r" as string]: topic.rotation, animationDelay: `${i * 0.4}s` }}
          >
            <span className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 rotate-2 bg-paper/70" />
            <p className="font-hand text-3xl font-bold">{topic.title}</p>
            <p className="mt-2 text-sm">{topic.description}</p>
            {!(topic.notesReady ?? topic.ready) && (
              <span className="mt-3 inline-block rounded-full border-2 border-foreground/30 px-2 py-0.5 font-mono text-xs">coming soon</span>
            )}
            <p className="mt-4 font-mono text-xs font-bold text-foreground">open →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
