import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MatrixTable, VectorRow } from "@/components/MatrixTable";
import { SAMPLE, runSafety, type Matrix } from "@/lib/bankers";
import { resourceNames, resizeMatrix, validCount } from "@/lib/simulator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalculationDetails } from "@/components/CalculationDetails";
import { Calculator, Play, Pause, RotateCcw, StepForward, Shuffle } from "lucide-react";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Banker's Safety Simulator | OS Playground" },
      {
        name: "description",
        content:
          "Edit Max, Allocation, and Available matrices, then step through Dijkstra's safety algorithm with complete calculation traces.",
      },
      { property: "og:title", content: "Banker's Safety Simulator | OS Playground" },
      {
        property: "og:description",
        content:
          "Edit Max, Allocation, and Available matrices, then step through Dijkstra's safety algorithm with complete calculation traces.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Simulator,
});

function Simulator() {
  const [n, setN] = useState(5);
  const [r, setR] = useState(3);
  const [max, setMax] = useState<Matrix>(SAMPLE.max);
  const [alloc, setAlloc] = useState<Matrix>(SAMPLE.alloc);
  const [avail, setAvail] = useState<number[]>(SAMPLE.available);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [processCount, setProcessCount] = useState("5");
  const [resourceCount, setResourceCount] = useState("3");
  const [sizeError, setSizeError] = useState("");
  const [calculations, setCalculations] = useState(false);

  const resources = resourceNames(r);
  const result = useMemo(() => runSafety(avail, max, alloc), [avail, max, alloc]);
  const total = result.steps.length;
  const invalid = result.need.some((row) => row.some((v) => v < 0));

  useEffect(() => { setStep(-1); setPlaying(false); }, [avail, max, alloc]);
  useEffect(() => {
    if (!playing) return;
    if (step >= total) { setPlaying(false); return; }
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [playing, step, total]);

  const applySize = (nn: number, rr: number) => {
    if (!validCount(nn) || !validCount(rr)) { setSizeError("Enter positive whole numbers for both counts."); return; }
    setSizeError("");
    setStep(-1);
    setPlaying(false);
    setN(nn); setR(rr);
    setMax((m) => resizeMatrix(m, nn, rr)); setAlloc((m) => resizeMatrix(m, nn, rr));
    setAvail((a) => Array.from({ length: rr }, (_, j) => a[j] ?? 0));
  };

  const handleProcessChange = (valStr: string) => {
    setProcessCount(valStr);
    if (valStr.trim() === "") return;
    const val = Number(valStr);
    if (!Number.isNaN(val) && Number.isInteger(val) && val >= 1 && val <= 10) {
      applySize(val, r);
    }
  };

  const handleProcessBlur = () => {
    let val = Math.floor(Number(processCount));
    if (Number.isNaN(val) || val < 1) val = 1;
    if (val > 10) val = 10;
    setProcessCount(String(val));
    applySize(val, r);
  };

  const handleResourceChange = (valStr: string) => {
    setResourceCount(valStr);
    if (valStr.trim() === "") return;
    const val = Number(valStr);
    if (!Number.isNaN(val) && Number.isInteger(val) && val >= 1 && val <= 6) {
      applySize(n, val);
    }
  };

  const handleResourceBlur = () => {
    let val = Math.floor(Number(resourceCount));
    if (Number.isNaN(val) || val < 1) val = 1;
    if (val > 6) val = 6;
    setResourceCount(String(val));
    applySize(n, val);
  };

  const randomize = () => {
    setStep(-1);
    setPlaying(false);
    const mx = Array.from({ length: n }, () => Array.from({ length: r }, () => Math.floor(Math.random() * 8) + 1));
    setMax(mx);
    setAlloc(mx.map((row) => row.map((v) => Math.floor(Math.random() * (v + 1)))));
    setAvail(Array.from({ length: r }, () => Math.floor(Math.random() * 5)));
  };

  const loadExample = () => {
    setStep(-1);
    setPlaying(false);
    setProcessCount("5");
    setResourceCount("3");
    setN(5);
    setR(3);
    setMax(SAMPLE.max);
    setAlloc(SAMPLE.alloc);
    setAvail(SAMPLE.available);
  };

  const current = step >= 0 && step < total ? result.steps[step] : null;
  const done = result.sequence.slice(0, Math.max(0, Math.min(step + 1, total)));
  const work = current ? current.workAfter : step >= total ? result.steps.at(-1)?.workAfter ?? avail : avail;
  const finished = step >= total;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/bankers" className="text-sm text-muted-foreground hover:underline">
          ← back to Banker's Algorithm
        </Link>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-6xl font-bold">Safety simulator</h1>
          <p className="text-muted-foreground">Edit the numbers, then press play to find a safe sequence.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
          <label className="flex items-center gap-2">processes
            <input
              aria-label="Number of processes"
              type="number"
              min={1}
              max={10}
              step={1}
              value={processCount}
              onChange={(e) => handleProcessChange(e.target.value)}
              onBlur={handleProcessBlur}
              className="w-20 rounded-md border-2 border-input bg-paper p-2"
            />
          </label>
          <label className="flex items-center gap-2">resources
            <input
              aria-label="Number of resources"
              type="number"
              min={1}
              max={6}
              step={1}
              value={resourceCount}
              onChange={(e) => handleResourceChange(e.target.value)}
              onBlur={handleResourceBlur}
              className="w-20 rounded-md border-2 border-input bg-paper p-2"
            />
          </label>
          <Button variant="outline" onClick={() => { handleProcessBlur(); handleResourceBlur(); }}>Apply counts</Button>
          <Button variant="outline" onClick={randomize}><Shuffle />Random</Button>
          <Button variant="outline" onClick={loadExample}>Load example</Button>
        </div>
      </div>
      {sizeError && <p role="alert" className="text-destructive">{sizeError}</p>}
      {invalid && <p role="alert" className="text-destructive">Allocation cannot exceed Max. Correct the highlighted negative Need values before playing.</p>}

      <VectorRow label="Available:" resources={resources} values={avail} onChange={(j, v) => setAvail(avail.map((x, k) => (k === j ? v : x)))} />

      <div className="grid min-w-0 gap-5 lg:grid-cols-3">
        <MatrixTable title="Max" resources={resources} data={max} editable onChange={(i, j, v) => setMax(max.map((row, a) => row.map((x, b) => (a === i && b === j ? v : x))))} />
        <MatrixTable title="Allocation" resources={resources} data={alloc} editable onChange={(i, j, v) => setAlloc(alloc.map((row, a) => row.map((x, b) => (a === i && b === j ? v : x))))} />
        <MatrixTable title="Need (auto)" resources={resources} data={result.need} activeRow={current?.process ?? null} doneRows={done} />
      </div>

      <div className="chalkboard rounded-md p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={invalid} onClick={() => { if (finished) setStep(-1); setPlaying(!playing); }} className="bg-highlight text-foreground">{playing ? <Pause /> : finished ? <RotateCcw /> : <Play />}{playing ? "Pause" : finished ? "Replay" : "Play"}</Button>
          <Button variant="outline" onClick={() => { setPlaying(false); setCalculations(true); }}><Calculator />Calculations</Button>
          <Button variant="outline" onClick={() => setStep((s) => Math.min(s + 1, total))} disabled={finished || invalid}><StepForward />Step</Button>
          <Button variant="outline" onClick={() => { setStep(-1); setPlaying(false); }}><RotateCcw />Reset</Button>
          <span className="min-w-0 break-words font-mono text-sm sm:ml-auto">Work = [{work.join(", ")}]</span>
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
          {current && <>P{current.process}: Need [{result.need[current.process]?.join(",")}] ≤ Work [{current.workBefore.join(",")}] ✓ — finishes and releases [{alloc[current.process]?.join(",")}]</>}
          {finished && (result.safe
            ? <>✅ SAFE! Sequence: ⟨{result.sequence.map((p) => `P${p}`).join(", ")}⟩</>
            : <>⚠️ UNSAFE — no process can proceed with Work [{work.join(",")}]. Stuck: {max.map((_, i) => i).filter((i) => !result.sequence.includes(i)).map((i) => `P${i}`).join(", ")}</>)}
        </p>
      </div>
      <Dialog open={calculations} onOpenChange={setCalculations}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto bg-paper"><DialogHeader><DialogTitle className="font-hand text-3xl">All calculations</DialogTitle><DialogDescription>Safety check · {n} processes · {r} resources</DialogDescription></DialogHeader><CalculationDetails available={avail} max={max} alloc={alloc} resources={resources} /></DialogContent></Dialog>
    </div>
  );
}
