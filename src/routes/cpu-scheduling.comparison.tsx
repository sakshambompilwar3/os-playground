import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cpu-scheduling/comparison")({
  head: () => ({
    meta: [
      { title: "CPU Scheduling Comparison — OS Class" },
      { name: "description", content: "Compare FCFS, SJF, Priority and Round Robin CPU scheduling algorithms." },
      { property: "og:title", content: "CPU Scheduling Comparison — OS Class" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CpuSchedulingComparison,
});

function CpuSchedulingComparison() {
  return (
    <div className="space-y-8">
      <div>
        <Link to="/cpu-scheduling" className="text-sm text-muted-foreground hover:underline">
          ← back to CPU Scheduling
        </Link>
        <h1 className="mt-2 font-hand text-6xl font-bold">Algorithm Comparison</h1>
        <p className="text-muted-foreground">Which algorithm wins?</p>
      </div>
      <div className="chalkboard rounded-md px-6 py-10 md:px-12">
        <p className="font-hand text-4xl font-bold">Coming soon ✏️</p>
        <p className="mt-3 font-hand text-2xl opacity-80">
          Side-by-side waiting time, turnaround time, and context-switch comparisons are on the way.
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
