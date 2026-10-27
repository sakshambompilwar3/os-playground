import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Banker's Algorithm Playground — OS Class" },
      { name: "description", content: "A classroom-style playground to learn Dijkstra's Banker's Algorithm for deadlock avoidance." },
      { property: "og:title", content: "Banker's Algorithm Playground — OS Class" },
      { property: "og:description", content: "Learn deadlock avoidance interactively: simulate, request resources, and quiz yourself." },
    ],
  }),
  component: Home,
});

const CHALK = ["Need = Max − Allocation", "Request ≤ Need ?", "Request ≤ Available ?", "Safe state ⇒ no deadlock"];

function ChalkText() {
  const [idx, setIdx] = useState(0);
  const [len, setLen] = useState(0);
  useEffect(() => {
    const full = CHALK[idx];
    const t = setTimeout(() => {
      if (len < full.length) setLen(len + 1);
      else { setLen(0); setIdx((idx + 1) % CHALK.length); }
    }, len < full.length ? 70 : 1600);
    return () => clearTimeout(t);
  }, [len, idx]);
  return <span className="font-hand text-4xl md:text-5xl">{CHALK[idx].slice(0, len)}<span className="animate-blink">|</span></span>;
}

const notes = [
  { to: "/learn", title: "Learn", text: "The theory, with drawings", color: "bg-highlight", r: "-3deg" },
  { to: "/simulator", title: "Simulator", text: "Step through the safety check", color: "bg-accent/70", r: "2deg" },
  { to: "/request", title: "Requests", text: "Grant or deny a process", color: "bg-success/40", r: "-1.5deg" },
  { to: "/deadlock", title: "Deadlock Lab", text: "Watch processes get stuck", color: "bg-primary/25", r: "3deg" },
  { to: "/quiz", title: "Pop Quiz", text: "Test before the exam!", color: "bg-destructive/30", r: "-2deg" },
] as const;

function Home() {
  return (
    <div className="space-y-14">
      {/* chalkboard */}
      <section className="chalkboard relative overflow-hidden rounded-md px-6 py-14 md:px-14">
        <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">CS-301 · Operating Systems · Lecture 7</p>
        <h1 className="mt-4 font-hand text-6xl font-bold leading-none md:text-8xl">Banker's Algorithm</h1>
        <svg viewBox="0 0 600 30" className="mt-2 h-6 w-80 md:w-[28rem]" aria-hidden>
          <path d="M5 20 C 150 5, 300 30, 595 12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="draw" />
        </svg>
        <div className="mt-8 min-h-14"><ChalkText /></div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/simulator" className="press paper-card bg-highlight px-5 py-3 font-bold text-foreground">Start the simulator →</Link>
          <Link to="/learn" className="press paper-card px-5 py-3 font-bold text-foreground">Open the notes</Link>
        </div>
        {/* chalk + eraser */}
        <div className="absolute bottom-3 right-6 flex items-end gap-3">
          <span className="block h-3 w-16 rounded-full bg-chalk-foreground/90" />
          <span className="block h-6 w-20 rounded-sm bg-accent" />
        </div>
      </section>

      {/* sticky notes */}
      <section>
        <h2 className="font-hand text-4xl font-bold">Today's <span className="marker">homework</span></h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {notes.map((n, i) => (
            <Link
              key={n.to}
              to={n.to}
              className={`animate-float group relative block min-h-40 p-5 shadow-[var(--shadow-paper)] transition-transform hover:scale-105 ${n.color}`}
              style={{ ["--r" as string]: n.r, animationDelay: `${i * 0.4}s` }}
            >
              <span className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 rotate-2 bg-paper/70" />
              <p className="font-hand text-3xl font-bold">{n.title}</p>
              <p className="mt-2 text-sm">{n.text}</p>
              <p className="mt-4 font-mono text-xs opacity-0 transition-opacity group-hover:opacity-100">open →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* notebook */}
      <section className="notebook rounded-md py-8 pl-20 pr-8 leading-8">
        <p className="font-hand text-3xl font-bold text-primary">Class notes — why "banker"?</p>
        <p className="font-hand text-2xl">A bank never lends out cash in a way that leaves it unable to satisfy <span className="marker">all</span> its customers.</p>
        <p className="font-hand text-2xl">The OS does the same: it only grants a resource request if the system stays in a <b>safe state</b>.</p>
        <p className="font-hand text-2xl text-accent-foreground">→ invented by Edsger Dijkstra, 1965 ✎</p>
      </section>
    </div>
  );
}
