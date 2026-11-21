import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalculationDetails } from "@/components/CalculationDetails";
import { DEADLOCK_EXAMPLE as example } from "@/lib/deadlock-example";

export const Route = createFileRoute("/labs/deadlock")({
  head: () => ({
    meta: [
      { title: "Deadlock Lab | OS Playground" },
      {
        name: "description",
        content:
          "Compare unconstrained resource allocation against Dijkstra's Banker's avoidance to watch circular wait form in real time.",
      },
      { property: "og:title", content: "Deadlock Lab | OS Playground" },
      {
        property: "og:description",
        content:
          "Compare unconstrained resource allocation against Dijkstra's Banker's avoidance to watch circular wait form in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeadlockLabPage,
});

// 3 processes, 3 resources around a circle
const P = [{ x: 150, y: 60 }, { x: 290, y: 280 }, { x: 10, y: 280 }];
const Rz = [{ x: 260, y: 130 }, { x: 150, y: 330 }, { x: 40, y: 130 }];

function DeadlockLabPage() {
  const [phase, setPhase] = useState(0); // 0 idle, 1 hold, 2 wait(deadlock), 3 banker
  const [details, setDetails] = useState(false);
  const steps = [
    "Three processes, three single-instance resources. Press next.",
    "Each process grabs one resource (hold)…",
    "…then each waits for the next one. Circular wait → DEADLOCK! 💀",
    "The Banker checks before deadlock forms: defer P2’s request for R1. P1 finishes first, then P0, then P2. Safe sequence: P1 → P0 → P2 ✓",
  ];
  const holding = phase >= 1;
  const waiting = phase === 2;
  const banker = phase === 3;

  return (
    <div className="space-y-6">
      <Link to="/labs" className="text-sm text-muted-foreground hover:underline">
        ← back to Labs
      </Link>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <h1 className="font-hand text-5xl md:text-6xl font-bold">Deadlock Lab</h1>
          <p key={phase} className="animate-rise notebook rounded-md py-4 pl-20 pr-6 font-hand text-2xl leading-8">{steps[phase]}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPhase((p) => (p + 1) % 4)} className="bg-highlight">{phase === 3 ? "↺ restart" : "next →"}</Button>
            <Button variant="outline" onClick={() => { setPhase(3); setDetails(true); }}>use the Banker</Button>
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
              if (!held || !want) return null;
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
                <circle cx={p.x + 20} cy={p.y + 20} r="24" fill={banker && i === 1 ? "var(--success)" : waiting ? "var(--destructive)" : "var(--paper)"} stroke="var(--foreground)" strokeWidth="2.5" style={{ transition: "fill .5s" }} />
                <text x={p.x + 20} y={p.y + 26} textAnchor="middle" className="font-mono text-sm font-bold" fill="var(--foreground)">P{i}</text>
              </g>
            ))}
          </svg>
        </div>
        <Dialog open={details} onOpenChange={setDetails}>
          <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto bg-paper">
            <DialogHeader>
              <DialogTitle className="font-hand text-3xl">The Banker · every step</DialogTitle>
              <DialogDescription>One instance each of R0, R1 and R2. Check before the final allocation, not after deadlock.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 text-sm">
              <section>
                <h3 className="font-hand text-2xl font-bold">1. Pause before P2 takes R1</h3>
                <p className="mt-2">P0 holds R2 and needs R0. P1 holds R0 and needs R1. P2 holds nothing and will need R1 and R2. Available = [0, 1, 0].</p>
                <p className="mt-2">Max: P0 [1, 0, 1], P1 [1, 1, 0], P2 [0, 1, 1]. Allocation: P0 [0, 0, 1], P1 [1, 0, 0], P2 [0, 0, 0].</p>
              </section>
              <section>
                <h3 className="font-hand text-2xl font-bold">2. Validate P2’s request [0, 1, 0]</h3>
                <p className="mt-2 font-mono">Request ≤ Need [0, 1, 1] ✓. Request ≤ Available [0, 1, 0] ✓.</p>
              </section>
              <section>
                <h3 className="font-hand text-2xl font-bold">3. Tentatively grant and test</h3>
                <p className="my-2 font-mono">Available = [0, 1, 0] − [0, 1, 0] = [0, 0, 0]. P2 Allocation = [0, 1, 0].</p>
                <CalculationDetails available={[0, 0, 0]} max={example.max} alloc={[[0, 0, 1], [1, 0, 0], [0, 1, 0]]} resources={example.resources} />
              </section>
              <section>
                <h3 className="font-hand text-2xl font-bold">4. Roll back; P2 waits</h3>
                <p className="mt-2">The tentative state is unsafe. Restore Available [0, 1, 0] and P2 Allocation [0, 0, 0]. The Banker does not preempt resources from an existing deadlock.</p>
              </section>
              <section>
                <h3 className="font-hand text-2xl font-bold">5. Verify the restored state</h3>
                <CalculationDetails available={example.available} max={example.max} alloc={example.alloc} resources={example.resources} />
              </section>
              <section className="border-t pt-3">
                <h3 className="font-hand text-2xl font-bold">6. Let the safe sequence complete</h3>
                <p className="mt-2">Give R1 to P1; P1 finishes and releases R0 and R1. Give R0 to P0; P0 finishes and releases R0 and R2. Then give R1 and R2 to P2; P2 finishes. All three resources are free. Circular wait never forms.</p>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
