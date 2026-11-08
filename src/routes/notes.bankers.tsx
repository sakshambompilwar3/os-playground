import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { learningNotes as cards } from "@/lib/learning-notes";

export const Route = createFileRoute("/notes/bankers")({
  head: () => ({
    meta: [
      { title: "Learn the Banker's Algorithm — Notes" },
      { name: "description", content: "Plain-language notes on safe states, Need, Available and the safety algorithm." },
      { property: "og:title", content: "Learn the Banker's Algorithm" },
      { property: "og:description", content: "Flip through notebook-style cards explaining deadlock avoidance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BankersNotes,
});

function BankersNotes() {
  const [open, setOpen] = useState(0);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link to="/bankers" className="hover:underline">← Banker's Hub</Link>
          <span>·</span>
          <Link to="/notes" className="hover:underline">all notes</Link>
        </div>
        <h1 className="font-hand text-6xl font-bold">The notes</h1>
        <p className="text-muted-foreground">Tap a page to read it.</p>
        {cards.map((c, i) => (
          <button
            key={c.t}
            onClick={() => setOpen(i)}
            className={`press paper-card block w-full px-4 py-3 text-left font-hand text-2xl ${open === i ? "bg-highlight" : ""}`}
          >
            {c.t}
          </button>
        ))}
      </div>
      <div key={open} className="notebook animate-rise min-h-96 rounded-md py-8 pl-20 pr-8 leading-8">
        <p className="font-hand text-4xl font-bold text-primary">{cards[open]!.t}</p>
        <p className="mt-4 font-hand text-3xl">{cards[open]!.b}</p>
        <div className="mt-8 flex gap-3">
          <button disabled={open === 0} onClick={() => setOpen(open - 1)} className="press paper-card px-4 py-2 text-sm disabled:opacity-40">← prev</button>
          {open < cards.length - 1 ? (
            <button onClick={() => setOpen(open + 1)} className="press paper-card bg-highlight px-4 py-2 text-sm">next →</button>
          ) : (
            <Link to="/simulator" className="press paper-card bg-highlight px-4 py-2 text-sm">Try it in the simulator →</Link>
          )}
        </div>
      </div>
    </div>
  );
}
