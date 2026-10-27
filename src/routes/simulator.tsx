import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MatrixTable, VectorRow } from "@/components/MatrixTable";
import { SAMPLE, runSafety, type Matrix } from "@/lib/bankers";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Safety Simulator — Banker's Algorithm" },
      { name: "description", content: "Edit Max, Allocation and Available, then step through the safety algorithm." },
      { property: "og:title", content: "Banker's Safety Simulator" },
      { property: "og:description", content: "Step-by-step animated safe sequence finder." },
    ],
  }),
  component: Simulator,
});

const RES = ["A", "B", "C", "D", "E"];
const resize = (m: Matrix, n: number, r: number) => Array.from({ length: n }, (_, i) => Array.from({ length: r }, (_, j) => m[i]?.[j] ?? 0));

function Simulator() {
  const [n, setN] = useState(5);
  const [r, setR] = useState(3);
  const [max, setMax] = useState<Matrix>(SAMPLE.max);
  const [alloc, setAlloc] = useState<Matrix>(SAMPLE.alloc);
  const [avail, setAvail] = useState<number[]>(SAMPLE.available);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const resources = RES.slice(0, r);
  const result = useMemo(() => runSafety(avail, max, alloc), [avail, max, alloc]);
  const total = result.steps.length;

  useEffect(() => { setStep(-1); setPlaying(false); }, [avail, max, alloc]);
  useEffect(() => {
    if (!playing) return;
    if (step >= total) { setPlaying(false); return; }
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [playing, step, total]);

  const applySize = (nn: number, rr: number) => {
    setN(nn); setR(rr);
    setMax((m) => resize(m, nn, rr)); setAlloc((m) => resize(m, nn, rr));
    setAvail((a) => Array.from({ length: rr }, (_, j) => a[j] ?? 0));
  };
  const randomize = () => {
    const mx = Array.from({ length: n }, () => Array.from({ length: r }, () => Math.floor(Math.random() * 8) + 1));
    setMax(mx);
    setAlloc(mx.map((row) => row.map((v) => Math.floor(Math.random() * (v + 1)))));
    setAvail(Array.from({ length: r }, () => Math.floor(Math.random() * 5)));
  };

  const current = step >= 0 && step < total ? result.steps[step] : null;
  const done = result.sequence.slice(0, Math.max(0, Math.min(step + 1, total)));
  const work = current ? current.workAfter : step >= total && total ? result.steps[total - 1]!.workAfter : avail;
  const finished = step >= total;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-6xl font-bold">Safety simulator</h1>
          <p className="text-muted-foreground">Edit the numbers, then press play to find a safe sequence.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
          <label className="paper-card flex items-center gap-2 px-3 py-1.5">processes
            <input type="range" min={2} max={8} value={n} onChange={(e) => applySize(+e.target.value, r)} /> {n}
          </label>
          <label className="paper-card flex items-center gap-2 px-3 py-1.5">resources
            <input type="range" min={1} max={5} value={r} onChange={(e) => applySize(n, +e.target.value)} /> {r}
          </label>
          <button onClick={randomize} className="press paper-card px-3 py-1.5">🎲 random</button>
          <button onClick={() => { applySize(5, 3); setMax(SAMPLE.max); setAlloc(SAMPLE.alloc); setAvail(SAMPLE.available); }} className="press paper-card px-3 py-1.5">textbook</button>
        </div>
      </div>

      <VectorRow label="Available:" resources={resources} values={avail} onChange={(j, v) => setAvail(avail.map((x, k) => (k === j ? v : x)))} />

      <div className="grid gap-5 md:grid-cols-3">
        <MatrixTable title="Max" resources={resources} data={max} editable onChange={(i, j, v) => setMax(max.map((row, a) => row.map((x, b) => (a === i && b === j ? v : x))))} />
        <MatrixTable title="Allocation" resources={resources} data={alloc} editable onChange={(i, j, v) => setAlloc(alloc.map((row, a) => row.map((x, b) => (a === i && b === j ? v : x))))} />
        <MatrixTable title="Need (auto)" resources={resources} data={result.need} activeRow={current?.process ?? null} doneRows={done} />
      </div>

      <div className="chalkboard rounded-md p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => { if (finished) setStep(-1); setPlaying(!playing); }} className="press paper-card bg-highlight px-4 py-2 font-bold text-foreground">{playing ? "❚❚ pause" : finished ? "↺ replay" : "▶ play"}</button>
          <button onClick={() => setStep((s) => Math.min(s + 1, total))} disabled={finished} className="press paper-card px-4 py-2 text-foreground disabled:opacity-50">step →</button>
          <button onClick={() => { setStep(-1); setPlaying(false); }} className="press paper-card px-4 py-2 text-foreground">reset</button>
          <span className="ml-auto font-mono text-sm">Work = [{work.join(", ")}]</span>
        </div>

        <div className="mt-6 flex min-h-16 flex-wrap items-center gap-3">
          {done.map((p, i) => (
            <span key={p} className="flex items-center gap-3">
              <span className={`animate-cell grid h-14 w-14 place-items-center rounded-full border-2 border-chalk-foreground font-mono text-lg font-bold ${i === done.length - 1 && !finished ? "animate-ring bg-highlight text-foreground" : ""}`}>P{p}</span>
              {i < done.length - 1 && <span className="font-hand text-3xl">→</span>}
            </span>
          ))}
          {step < 0 && <span className="font-hand text-3xl opacity-70">press play to begin…</span>}
        </div>

        <p key={step} className="animate-rise mt-4 font-hand text-2xl">
          {current && <>P{current.process}: Need [{result.need[current.process]!.join(",")}] ≤ Work [{current.workBefore.join(",")}] ✓ — finishes and releases [{alloc[current.process]!.join(",")}]</>}
          {finished && (result.safe
            ? <>✅ SAFE! Sequence: ⟨{result.sequence.map((p) => `P${p}`).join(", ")}⟩</>
            : <>⚠️ UNSAFE — no process can proceed with Work [{work.join(",")}]. Stuck: {max.map((_, i) => i).filter((i) => !result.sequence.includes(i)).map((i) => `P${i}`).join(", ")}</>)}
        </p>
      </div>
    </div>
  );
}
