import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/comparison/disk-scheduling")({
  head: () => ({
    meta: [
      { title: "Disk Scheduling Comparison — OS Playground" },
      {
        name: "description",
        content: "Compare FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK head movements side-by-side.",
      },
      { property: "og:title", content: "Disk Scheduling Comparison — OS Playground" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiskSchedulingComparisonPlaceholder,
});

function DiskSchedulingComparisonPlaceholder() {
  return (
    <div className="space-y-8">
      <div>
        <Link to="/disk-scheduling" className="text-sm text-muted-foreground hover:underline">
          ← back to Disk Scheduling
        </Link>
        <h1 className="mt-2 font-hand text-6xl font-bold">Disk Scheduling Comparison</h1>
        <p className="text-muted-foreground">Which algorithm travels least?</p>
      </div>
      <div className="chalkboard rounded-md px-6 py-10 md:px-12">
        <p className="font-hand text-4xl font-bold">Coming soon ✏️</p>
        <p className="mt-3 font-hand text-2xl opacity-80">
          Side-by-side head travel charts and comparison matrix are on the way.
        </p>
      </div>
      <div className="notebook animate-rise min-h-48 rounded-md py-8 pl-20 pr-8 leading-8">
        <p className="font-hand text-3xl font-bold text-primary">Comparison</p>
        <p className="mt-3 font-hand text-2xl text-muted-foreground">
          This section is under construction — check back after the next lecture!
        </p>
      </div>
    </div>
  );
}
