import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn the Banker's Algorithm — Notes" },
      { name: "description", content: "Plain-language notes on safe states, Need, Available and the safety algorithm." },
      { property: "og:title", content: "Learn the Banker's Algorithm" },
      { property: "og:description", content: "Flip through notebook-style cards explaining deadlock avoidance." },
    ],
  }),
  component: Learn,
});

const cards = [
  { t: "1. Deadlock", b: "Processes wait forever for resources held by each other. Four conditions: mutual exclusion, hold & wait, no preemption, circular wait." },
  { t: "2. Avoidance", b: "Instead of detecting deadlock later, the OS checks every request ahead of time and refuses ones that could lead to trouble." },
  { t: "3. Data structures", b: "Available[m], Max[n][m], Allocation[n][m], and Need[n][m] = Max − Allocation." },
  { t: "4. Safety algorithm", b: "Work = Available. Find a process whose Need ≤ Work, pretend it finishes, add its Allocation back to Work. Repeat. If all finish → SAFE." },
  { t: "5. Request algorithm", b: "If Request ≤ Need and Request ≤ Available, pretend to grant it, then run the safety algorithm. Safe → grant. Unsafe → roll back and wait." },
  { t: "6. Limitations", b: "Needs the max demand in advance, a fixed number of processes and resources, and costs O(m·n²) per check." },
];

function Learn() {
  const [open, setOpen] = useState(0);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
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
