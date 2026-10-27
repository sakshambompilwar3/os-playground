import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

const KINDS = ["terminal", "cpu", "memory", "scheduler"] as const;
type Kind = (typeof KINDS)[number];

const LABELS: Record<string, string> = {
  "/": "home.sys",
  "/learn": "learn.md",
  "/simulator": "safety_check.exe",
  "/request": "request_handler.bin",
  "/deadlock": "deadlock.lab",
  "/quiz": "quiz.sh",
};

function Terminal({ path }: { path: string }) {
  const lines = [`$ cd ${path}`, "> fork() ... pid 4012", "> allocating resources [A B C]", `> exec ${LABELS[path] ?? "page"}`];
  return (
    <div className="w-[min(560px,90vw)] rounded-lg border-2 border-chalk-foreground/40 p-6 font-mono text-sm">
      {lines.map((l, i) => (
        <p key={l} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>{l}</p>
      ))}
      <span className="animate-blink">▌</span>
    </div>
  );
}

function Cpu() {
  return (
    <div className="flex flex-col items-center gap-4 font-mono">
      <div className="relative grid h-36 w-36 grid-cols-2 gap-2 rounded-lg border-4 border-chalk-foreground p-3">
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className="animate-cell rounded-sm bg-highlight/80" style={{ animationDelay: `${c * 80}ms` }} />
        ))}
        {[...Array(5)].map((_, i) => (
          <span key={i} className="absolute -left-4 h-1 w-3 bg-chalk-foreground" style={{ top: `${15 + i * 17}%` }} />
        ))}
        {[...Array(5)].map((_, i) => (
          <span key={`r${i}`} className="absolute -right-4 h-1 w-3 bg-chalk-foreground" style={{ top: `${15 + i * 17}%` }} />
        ))}
      </div>
      <p className="text-sm">CPU context switch…</p>
    </div>
  );
}

function Memory() {
  return (
    <div className="flex flex-col items-center gap-4 font-mono">
      <div className="grid grid-cols-8 gap-1.5">
        {[...Array(32)].map((_, i) => (
          <div key={i} className={`animate-cell h-6 w-6 rounded-sm ${i % 3 === 0 ? "bg-accent" : i % 5 === 0 ? "bg-highlight" : "bg-chalk-foreground/30"}`} style={{ animationDelay: `${i * 12}ms` }} />
        ))}
      </div>
      <p className="text-sm">paging in frames…</p>
    </div>
  );
}

function Scheduler() {
  return (
    <div className="w-[min(480px,90vw)] space-y-3 font-mono text-sm">
      {["P0", "P1", "P2", "P3"].map((p, i) => (
        <div key={p} className="flex items-center gap-3">
          <span className="w-6">{p}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-sm bg-chalk-foreground/15">
            <div className="animate-bar h-full bg-highlight" style={{ animationDelay: `${i * 120}ms` }} />
          </div>
        </div>
      ))}
      <p className="pt-2 text-center">round-robin dispatch…</p>
    </div>
  );
}

export function PageTransition() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const first = useRef(true);
  const count = useRef(0);
  const [state, setState] = useState<{ kind: Kind; key: number } | null>(null);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    count.current += 1;
    setState({ kind: KINDS[count.current % KINDS.length], key: count.current });
    const t = setTimeout(() => setState(null), 1150);
    return () => clearTimeout(t);
  }, [path]);

  if (!state) return null;
  return (
    <div key={state.key} className="overlay-anim chalkboard pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
      {state.kind === "terminal" && <Terminal path={path} />}
      {state.kind === "cpu" && <Cpu />}
      {state.kind === "memory" && <Memory />}
      {state.kind === "scheduler" && <Scheduler />}
    </div>
  );
}
