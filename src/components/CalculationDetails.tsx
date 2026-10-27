import { computeNeed, runSafety, type Matrix } from "@/lib/bankers";

const vector = (values: number[]) => `[${values.join(", ")}]`;

export function CalculationDetails({ available, max, alloc, resources }: { available: number[]; max: Matrix; alloc: Matrix; resources: string[] }) {
  const result = runSafety(available, max, alloc);
  const invalid = computeNeed(max, alloc).some((row) => row.some((v) => v < 0));
  return <div className="min-w-0 space-y-5 text-sm">
    <section>
      <h3 className="font-hand text-2xl font-bold">1. Calculate Need = Max − Allocation</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left font-mono">
          <thead><tr><th className="p-2">Process</th>{resources.map((r) => <th key={r} className="p-2">{r}</th>)}</tr></thead>
          <tbody>{max.map((row, i) => <tr key={i} className="border-t"><th className="p-2">P{i}</th>{row.map((v, j) => <td key={j} className="whitespace-nowrap p-2">{v} − {alloc[i]?.[j] ?? 0} = <b>{result.need[i]?.[j]}</b></td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
    {invalid ? <p role="alert" className="text-destructive">Invalid input: Allocation must not exceed Max. Correct the negative Need values before calculating safety.</p> : <>
      <section><h3 className="font-hand text-2xl font-bold">2. Initialize</h3><p className="mt-2 break-words font-mono">Work = Available = {vector(available)}. Finish = false for all {max.length} processes.</p></section>
      <section><h3 className="font-hand text-2xl font-bold">3. Check every unfinished process</h3>
        <ol className="mt-3 space-y-3">{result.checks.map((check, i) => <li key={i} className="border-l-4 border-primary pl-3">
          <p className="font-bold">Check {i + 1} · P{check.process} {check.canFinish ? "— can finish" : "— must wait"}</p>
          <p className="mt-1 break-words font-mono">Need {vector(check.need)} ≤ Work {vector(check.workBefore)}?</p>
          <p className="mt-1 break-words font-mono">{check.need.map((v, j) => `${resources[j]}: ${v} ≤ ${check.workBefore[j]} ${v <= (check.workBefore[j] ?? 0) ? "✓" : "✗"}`).join(" · ")}</p>
          {check.canFinish ? <p className="mt-1 break-words font-mono">Finish[P{check.process}] = true. Work = {vector(check.workBefore)} + Allocation {vector(alloc[check.process] ?? [])} = {vector(check.workAfter)}.</p> : <p className="mt-1">Leave Finish false and Work unchanged. Continue scanning.</p>}
        </li>)}</ol>
      </section>
      <section className="border-t-2 pt-3"><h3 className="font-hand text-2xl font-bold">4. Final result: {result.safe ? "SAFE" : "UNSAFE"}</h3>
        <p className="mt-2 break-words font-mono">Finish = [{max.map((_, i) => result.sequence.includes(i) ? "true" : "false").join(", ")}].</p>
        {result.safe ? <p className="mt-2 break-words">Safe sequence: ⟨{result.sequence.map((p) => `P${p}`).join(" → ")}⟩. All processes can complete.</p> : <p className="mt-2">A full scan made no progress. Unfinished: {max.map((_, i) => i).filter((i) => !result.sequence.includes(i)).map((i) => `P${i}`).join(", ")}. No complete safe sequence exists; unsafe does not necessarily mean already deadlocked.</p>}
      </section>
    </>}
  </div>;
}