import { createFileRoute, Link } from "@tanstack/react-router";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/practice/")({
  head: () => ({
    meta: [
      { title: "Practice | OS Playground" },
      {
        name: "description",
        content:
          "Generate random practice problems for Operating Systems topics, verified by dual independent solvers with worked step-by-step solutions.",
      },
      { property: "og:title", content: "Practice | OS Playground" },
      {
        property: "og:description",
        content:
          "Generate random practice problems for Operating Systems topics, verified by dual independent solvers with worked step-by-step solutions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PracticeIndex,
});

function PracticeIndex() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-hand text-6xl font-bold">Practice Mode</h1>
        <p className="mt-1 text-muted-foreground">
          Sharpen your skills with deterministic, dual-solver verified practice problems and step-by-step solutions.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {OS_TOPICS.map((topic, i) => (
          <Link
            key={topic.slug}
            to={`/practice/${topic.slug}`}
            className={`animate-float group relative block min-h-44 p-5 shadow-[var(--shadow-paper)] transition-transform hover:scale-105 ${topic.color} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md`}
            style={{ ["--r" as string]: topic.rotation, animationDelay: `${i * 0.4}s` }}
          >
            <span className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 rotate-2 bg-paper/70 pointer-events-none" />
            <p className="font-hand text-3xl font-bold">{topic.title}</p>
            <p className="mt-2 text-sm text-foreground">{topic.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-foreground/30 bg-paper/50">
                5000+ seeds
              </span>
              <p className="font-mono text-xs font-bold text-foreground">
                practice →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
