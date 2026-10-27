import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/deadlock")({
  head: () => ({
    meta: [
      { title: "Deadlock Lab — Banker's Algorithm" },
      { name: "description", content: "See a circular wait form between processes, and how the Banker prevents it." },
      { property: "og:title", content: "Deadlock Lab" },
      { property: "og:description", content: "Animated resource allocation graph showing circular wait." },
    ],
  }),
  component: Deadlock,
});

// 3 processes, 3 resources around a circle
const P = [{ x: 150, y: 60 }, { x: 290, y: 280 }, { x: 10, y: 280 }];
const Rz = [{ x: 260, y: 130 }, { x: 150, y: 330 }, { x: 40, y: 130 }];

function Deadlock() {
  const [phase, setPhase] = useState(0); // 0 idle, 1 hold, 2 wait(deadlock), 3 banker
  const steps = [
    "Three processes, three single-instance resources. Press next.",
    "Each process grabs one resource (hold)…",
    "…then each waits for the next one. Circular wait → DEADLOCK! 💀",
    "With the Banker: P2's request is denied since it leads to an unsafe state. P0 finishes, everyone proceeds ✓",
  ];
  const holding = phase >= 1;
  const waiting = phase === 2;
  const banker = phase === 3;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="space-y-5">
        <h1 className="font-hand text-6xl font-bold">Deadlock lab</h1>
        <p key={phase} className="animate-rise notebook rounded-md py-4 pl-20 pr-6 font-hand text-2xl leading-8">{steps[phase]}</p>
        <div className="flex gap-3">
          <button onClick={() => setPhase((p) => (p + 1) % 4)} className="press paper-card bg-highlight px-5 py-2 font-bold">{phase === 3 ? "↺ restart" : "next →"}</button>
          <button onClick={() => setPhase(3)} className="press paper-card px-5 py-2">use the Banker</button>
        </div>
      </div>
      <div className={`paper-card p-4 ${waiting ? "animate-wiggle" : ""}`}>
        <svg viewBox="-20 20 360 360" className="w-full">
          <defs>
            <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker>
          </defs>
          {P.map((p, i) => {
            const held = Rz[(i + 2) % 3];
            const want = Rz[i];
            return (
              <g key={i}>
                {holding && !(banker && i === 2) && <line x1={held.x + 20} y1={held.y + 20} x2={p.x + 20} y2={p.y + 20} stroke="var(--success)" strokeWidth="4" markerEnd="url(#ar)" className="draw" />}
                {waiting && <line x1={p.x + 20} y1={p.y + 20} x2={want.x + 20} y2={want.y + 20} stroke="var(--destructive)" strokeWidth="4" strokeDasharray="8 6" markerEnd="url(#ar)" />}
              </g>
            );
          })}
          {Rz.map((r, i) => (
            <g key={`r${i}`}>
              <rect x={r.x} y={r.y} width="40" height="40" rx="6" fill="var(--highlight)" stroke="var(--foreground)" strokeWidth="2.5" />
              <text x={r.x + 20} y={r.y + 26} textAnchor="middle" className="font-mono text-sm font-bold" fill="var(--foreground)">R{i}</text>
            </g>
          ))}
          {P.map((p, i) => (
            <g key={`p${i}`}>
              <circle cx={p.x + 20} cy={p.y + 20} r="24" fill={banker ? "var(--success)" : waiting ? "var(--destructive)" : "var(--paper)"} stroke="var(--foreground)" strokeWidth="2.5" style={{ transition: "fill .5s" }} />
              <text x={p.x + 20} y={p.y + 26} textAnchor="middle" className="font-mono text-sm font-bold" fill="var(--foreground)">P{i}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
