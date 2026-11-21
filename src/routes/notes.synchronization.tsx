import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useState } from "react";
import { SYNCHRONIZATION_NOTES as cards } from "@/lib/sync-notes";

export const Route = createFileRoute("/notes/synchronization")({
  head: () => ({
    meta: [
      { title: "Process Synchronization Notes | OS Playground" },
      {
        name: "description",
        content:
          "Visual lecture notes on process synchronization: race conditions, critical sections, semaphores, bounded buffer producer-consumer, and dining philosophers.",
      },
      { property: "og:title", content: "Process Synchronization Notes | OS Playground" },
      {
        property: "og:description",
        content:
          "Visual lecture notes on process synchronization: race conditions, critical sections, semaphores, bounded buffer producer-consumer, and dining philosophers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SynchronizationNotes,
});

function SynchronizationNotes() {
  const [open, setOpen] = useState(0);
  const card = cards[open]!;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Link to="/synchronization" className="hover:underline">
              ← Synchronization Hub
            </Link>
            <span>·</span>
            <Link to="/notes" className="hover:underline">
              all notes
            </Link>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="press paper-card no-print inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-foreground"
            aria-label="Print notes"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
          </button>
        </div>
        <h1 className="font-hand text-5xl md:text-6xl font-bold">The notes</h1>
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
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="notebook animate-rise min-h-96 rounded-md py-8 pl-16 pr-6 sm:pl-20 sm:pr-8 leading-8">
        <p className="font-hand text-4xl font-bold text-primary">{card.title}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground uppercase tracking-wider">
          {card.subtitle}
        </p>

        <div className="mt-4 space-y-3 font-sans text-sm">
          {card.content.map((paragraph, idx) => (
            <p key={idx} className="leading-relaxed text-foreground/90">
              {paragraph}
            </p>
          ))}

          {card.takeaway && (
            <div className="mt-6 rounded border-2 border-foreground/20 bg-background/70 p-3">
              <p className="font-hand text-xl text-primary font-bold">
                ✎ Key Takeaway:
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                {card.takeaway}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            disabled={open === 0}
            onClick={() => setOpen((o) => Math.max(0, o - 1))}
            className="press paper-card px-4 py-2 text-sm disabled:opacity-40"
          >
            ← prev
          </button>
          <button
            disabled={open === cards.length - 1}
            onClick={() => setOpen((o) => Math.min(cards.length - 1, o + 1))}
            className="press paper-card bg-highlight px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
          >
            next →
          </button>
        </div>
      </div>
    </div>
  );
}
