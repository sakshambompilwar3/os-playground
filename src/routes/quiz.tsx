import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Pop Quiz — Banker's Algorithm" },
      { name: "description", content: "Quick multiple-choice quiz on deadlock avoidance and the Banker's Algorithm." },
      { property: "og:title", content: "Banker's Algorithm Pop Quiz" },
      { property: "og:description", content: "Test yourself before the OS exam." },
    ],
  }),
  component: Quiz,
});

const Q = [
  { q: "Need is calculated as…", a: ["Max + Allocation", "Max − Allocation", "Available − Max", "Allocation − Available"], c: 1 },
  { q: "Banker's Algorithm is a deadlock ___ technique.", a: ["prevention", "detection", "avoidance", "recovery"], c: 2 },
  { q: "If Request > Available, the process…", a: ["is killed", "must wait", "gets it anyway", "raises an error"], c: 1 },
  { q: "An unsafe state means…", a: ["deadlock has happened", "deadlock may happen", "no process can run", "the CPU is idle"], c: 1 },
  { q: "Time complexity of the safety algorithm?", a: ["O(n)", "O(m·n)", "O(m·n²)", "O(2ⁿ)"], c: 2 },
  { q: "With Available [3,3,2] in the textbook example, the first safe process is…", a: ["P0", "P1", "P2", "P4"], c: 1 },
];

function Quiz() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= Q.length;

  if (done)
    return (
      <div className="chalkboard mx-auto max-w-xl rounded-md p-10 text-center">
        <p className="font-hand text-5xl font-bold">Grade: {score}/{Q.length}</p>
        <p className="mt-3 font-hand text-2xl">{score === Q.length ? "A+ ⭐ Teacher's pet!" : score >= 4 ? "Nice work — almost there!" : "Revisit the notes and try again ✎"}</p>
        <button onClick={() => { setI(0); setScore(0); setPick(null); }} className="press paper-card mt-6 bg-highlight px-5 py-2 font-bold text-foreground">retake</button>
      </div>
    );

  const q = Q[i]!;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-hand text-6xl font-bold">Pop quiz</h1>
        <span className="paper-card px-3 py-1 font-mono text-sm">{i + 1}/{Q.length} · score {score}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-paper">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(i / Q.length) * 100}%` }} />
      </div>
      <div key={i} className="notebook animate-rise rounded-md py-6 pl-20 pr-6">
        <p className="font-hand text-3xl font-bold leading-8">{q.q}</p>
        <div className="mt-6 grid gap-3">
          {q.a.map((a, k) => {
            const state = pick === null ? "" : k === q.c ? "bg-success/30" : k === pick ? "bg-destructive/30" : "opacity-60";
            return (
              <button
                key={a}
                disabled={pick !== null}
                onClick={() => { setPick(k); if (k === q.c) setScore(score + 1); }}
                className={`press paper-card px-4 py-2 text-left font-medium ${state}`}
              >
                {String.fromCharCode(65 + k)}. {a}
              </button>
            );
          })}
        </div>
        {pick !== null && (
          <button onClick={() => { setI(i + 1); setPick(null); }} className="press paper-card animate-rise mt-6 bg-highlight px-5 py-2 font-bold">next →</button>
        )}
      </div>
    </div>
  );
}
