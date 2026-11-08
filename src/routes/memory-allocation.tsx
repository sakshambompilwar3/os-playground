import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/memory-allocation")({
  head: () => ({
    meta: [
      { title: "Memory Allocation — OS Class" },
      { name: "description", content: "Learn memory allocation: paging, segmentation and page replacement algorithms." },
      { property: "og:title", content: "Memory Allocation — OS Class" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryAllocation,
});

const TABS = ["Learn", "Simulator", "Quiz"] as const;

function MemoryAllocation() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Learn");
  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="text-sm text-muted-foreground hover:underline">← back to topics</Link>
        <h1 className="mt-2 font-hand text-6xl font-bold">Memory Allocation</h1>
        <p className="text-muted-foreground">Paging, segmentation & page replacement</p>
      </div>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`press paper-card px-4 py-2 font-hand text-xl ${tab === t ? "bg-highlight" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="notebook animate-rise min-h-64 rounded-md py-8 pl-20 pr-8 leading-8">
        <p className="font-hand text-4xl font-bold text-primary">{tab}</p>
        <p className="mt-4 font-hand text-3xl">Coming soon ✏️</p>
        <p className="mt-2 font-hand text-2xl text-muted-foreground">
          This section is under construction — check back after the next lecture!
        </p>
      </div>
    </div>
  );
}
