import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MatrixTable, VectorRow } from "@/components/MatrixTable";
import { SAMPLE, computeNeed, requestResources, type Matrix, type RequestOutcome } from "@/lib/bankers";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Resource Requests — Banker's Algorithm" },
      { name: "description", content: "Send resource requests from a process and see if the OS grants or denies them." },
      { property: "og:title", content: "Resource Request Handler" },
      { property: "og:description", content: "Play the OS: grant or deny requests while keeping the system safe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestPage,
});

const R = SAMPLE.resources;

function RequestPage() {
  const [avail, setAvail] = useState(SAMPLE.available);
  const [alloc, setAlloc] = useState<Matrix>(SAMPLE.alloc);
  const [pid, setPid] = useState(1);
  const [req, setReq] = useState([1, 0, 2]);
  const [log, setLog] = useState<{ id: number; text: string; outcome: RequestOutcome["status"] }[]>([]);
  const need = computeNeed(SAMPLE.max, alloc);

  const submit = () => {
    const o = requestResources(pid, req, avail, SAMPLE.max, alloc);
    const text = {
      "exceeds-need": `P${pid} asked for [${req}] — more than it declared it needs. ERROR.`,
      wait: `P${pid} asked for [${req}] — not enough available. P${pid} must WAIT.`,
      unsafe: `P${pid} asked for [${req}] — granting it would make the system UNSAFE. Denied.`,
      granted: `P${pid} got [${req}] ✓ Safe sequence: ⟨${o.status === "granted" ? o.result.sequence.map((p) => "P" + p).join(", ") : ""}⟩`,
    }[o.status];
    if (o.status === "granted") { setAvail(o.available); setAlloc(o.alloc); }
    setLog((l) => [{ id: Date.now(), text, outcome: o.status }, ...l].slice(0, 8));
  };

  const tone = { granted: "bg-success/20", wait: "bg-highlight/60", unsafe: "bg-destructive/20", "exceeds-need": "bg-destructive/30" };

  return (
    <div className="space-y-8">
      <div>
        <Link to="/bankers" className="text-sm text-muted-foreground hover:underline">
          ← back to Banker's Algorithm
        </Link>
        <h1 className="mt-2 font-hand text-6xl font-bold">You are the OS</h1>
        <p className="text-muted-foreground">Pick a process, type a request, and let the Banker decide.</p>
      </div>
      <VectorRow label="Available:" resources={R} values={avail} />
      <div className="grid gap-5 md:grid-cols-3">
        <MatrixTable title="Max" resources={R} data={SAMPLE.max} activeRow={pid} />
        <MatrixTable title="Allocation" resources={R} data={alloc} activeRow={pid} />
        <MatrixTable title="Need" resources={R} data={need} activeRow={pid} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="paper-card space-y-4 p-6">
          <p className="font-hand text-3xl font-bold">New request</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE.max.map((_, i) => (
              <button key={i} onClick={() => setPid(i)} className={`press paper-card px-3 py-1.5 font-mono ${pid === i ? "bg-highlight" : ""}`}>P{i}</button>
            ))}
          </div>
          <VectorRow label="Request:" resources={R} values={req} onChange={(j, v) => setReq(req.map((x, k) => (k === j ? v : x)))} />
          <div className="flex gap-3">
            <button onClick={submit} className="press paper-card bg-primary px-5 py-2 font-bold text-primary-foreground">Send request</button>
            <button onClick={() => { setAvail(SAMPLE.available); setAlloc(SAMPLE.alloc); setLog([]); }} className="press paper-card px-5 py-2">reset</button>
          </div>
        </div>
        <div className="chalkboard rounded-md p-6 font-mono text-sm">
          <p className="mb-3 opacity-70">$ tail -f /var/log/banker</p>
          {log.length === 0 && <p className="opacity-60">waiting for requests… <span className="animate-blink">▌</span></p>}
          <ul className="space-y-2">
            {log.map((l) => (
              <li key={l.id} className={`animate-rise rounded px-3 py-2 text-foreground ${tone[l.outcome]}`}>{l.text}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
