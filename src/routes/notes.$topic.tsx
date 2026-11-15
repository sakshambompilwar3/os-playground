import { createFileRoute, Link } from "@tanstack/react-router";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/notes/$topic")({
  head: ({ params }) => {
    const topic = OS_TOPICS.find((t) => t.slug === params.topic);
    const title = topic ? `${topic.title} Notes` : "Notes";
    const desc = `Visual study notes and chalkboard diagrams for ${topic?.title ?? "Operating Systems"}.`;
    return {
      meta: [
        { title: `${title} | OS Playground` },
        { name: "description", content: desc },
        { property: "og:title", content: `${title} | OS Playground` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: TopicNotes,
});

function TopicNotes() {
  const { topic: slug } = Route.useParams();
  const topic = OS_TOPICS.find((t) => t.slug === slug);
  const title = topic?.title ?? slug;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {topic && (
            <>
              <Link to={`/${topic.slug}` as "/"} className="hover:underline">← back to {topic.title}</Link>
              <span>·</span>
            </>
          )}
          <Link to="/notes" className="hover:underline">all notes</Link>
        </div>
        <h1 className="mt-2 font-hand text-6xl font-bold">{title}</h1>
        <p className="text-muted-foreground">Study notes</p>
      </div>
      <div className="notebook animate-rise min-h-64 rounded-md py-8 pl-20 pr-8 leading-8">
        <p className="font-hand text-4xl font-bold text-primary">Notes</p>
        <p className="mt-4 font-hand text-3xl">Notes coming soon ✏️</p>
        <p className="mt-2 font-hand text-2xl text-muted-foreground">
          This section is under construction — check back after the next lecture!
        </p>
      </div>
    </div>
  );
}
