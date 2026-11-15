import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/quiz/disk-scheduling")({
  head: () => ({
    meta: [
      { title: "Disk Scheduling Quiz — OS Playground" },
      { name: "description", content: "Pop quiz testing disk head movement algorithms." },
      { property: "og:title", content: "Disk Scheduling Quiz" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiskSchedulingQuizPlaceholder,
});

function DiskSchedulingQuizPlaceholder() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link to="/disk-scheduling" className="hover:underline">
            ← back to Disk Scheduling
          </Link>
          <span>·</span>
          <Link to="/quiz" className="hover:underline">
            all quizzes
          </Link>
        </div>
        <h1 className="mt-2 font-hand text-6xl font-bold">Disk Scheduling Quiz</h1>
        <p className="text-muted-foreground">Pop Quiz</p>
      </div>
      <div className="notebook animate-rise min-h-64 rounded-md py-8 pl-20 pr-8 leading-8">
        <p className="font-hand text-4xl font-bold text-primary">Pop Quiz</p>
        <p className="mt-4 font-hand text-3xl">Quiz coming soon ✏️</p>
        <p className="mt-2 font-hand text-2xl text-muted-foreground">
          This quiz is being drafted by the professor — check back after the lecture!
        </p>
      </div>
    </div>
  );
}
