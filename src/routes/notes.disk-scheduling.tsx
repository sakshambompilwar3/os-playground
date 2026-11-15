import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/notes/disk-scheduling")({
  head: () => ({
    meta: [
      { title: "Disk Scheduling Notes — OS Playground" },
      { name: "description", content: "Study notes on FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK." },
      { property: "og:title", content: "Disk Scheduling Notes" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiskSchedulingNotesPlaceholder,
});

function DiskSchedulingNotesPlaceholder() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link to="/disk-scheduling" className="hover:underline">
            ← back to Disk Scheduling
          </Link>
          <span>·</span>
          <Link to="/notes" className="hover:underline">
            all notes
          </Link>
        </div>
        <h1 className="mt-2 font-hand text-6xl font-bold">Disk Scheduling Notes</h1>
        <p className="text-muted-foreground">How the disk head moves</p>
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
