import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CPU_SCHEDULING_NOTES as cards } from "@/lib/cpu-scheduling-notes";

export const Route = createFileRoute("/notes/cpu-scheduling")({
  head: () => ({
    meta: [
      { title: "Learn CPU Scheduling — Notes & Visual Diagrams" },
      {
        name: "description",
        content:
          "Plain-language student notes on FCFS, SJF, SRTF, Round Robin, Priority, Gantt charts, and metrics.",
      },
      { property: "og:title", content: "Learn CPU Scheduling — OS Notes" },
      {
        property: "og:description",
        content: "Notebook-style cards explaining CPU scheduling algorithms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CpuSchedulingNotes,
});

function CpuSchedulingNotes() {
  const [open, setOpen] = useState(0);
  const card = cards[open]!;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr]">
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link to="/cpu-scheduling" className="hover:underline">
            ← CPU Scheduling Hub
          </Link>
          <span>·</span>
          <Link to="/notes" className="hover:underline">
            all notes
          </Link>
        </div>
        <h1 className="font-hand text-6xl font-bold">The notes</h1>
        <p className="text-muted-foreground">Tap a section to read it.</p>
        <div className="space-y-2">
          {cards.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setOpen(i)}
              className={`press paper-card block w-full px-4 py-3 text-left font-hand text-2xl transition-colors ${
                open === i ? "bg-highlight" : ""
              }`}
            >
              {c.t}
            </button>
          ))}
        </div>
      </div>

      <div
        key={open}
        className="notebook animate-rise min-h-96 rounded-md py-8 pl-16 pr-6 sm:pl-20 sm:pr-8 leading-8"
      >
        <p className="font-hand text-4xl font-bold text-primary">{card.t}</p>
        <p className="mt-4 font-hand text-3xl leading-relaxed">{card.b}</p>
        {card.extra}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            disabled={open === 0}
            onClick={() => setOpen((o) => o - 1)}
            className="press paper-card px-4 py-2 text-sm disabled:opacity-40"
          >
            ← prev
          </button>
          {open < cards.length - 1 ? (
            <button
              onClick={() => setOpen((o) => o + 1)}
              className="press paper-card bg-highlight px-4 py-2 text-sm font-bold text-foreground"
            >
              next →
            </button>
          ) : (
            <Link
              to="/cpu-scheduling/simulator"
              className="press paper-card bg-highlight px-4 py-2 text-sm font-bold text-foreground"
            >
              Try it in the simulator →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
