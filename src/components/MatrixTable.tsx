import type { Matrix } from "@/lib/bankers";

interface Props {
  title: string;
  resources: string[];
  data: Matrix;
  editable?: boolean;
  onChange?: (i: number, j: number, v: number) => void;
  activeRow?: number | null;
  doneRows?: number[];
}

export function MatrixTable({ title, resources, data, editable, onChange, activeRow, doneRows = [] }: Props) {
  return (
    <div className="paper-card overflow-hidden">
      <p className="border-b-2 border-foreground bg-secondary px-3 py-1.5 font-hand text-xl font-bold">{title}</p>
      <div className="max-h-[32rem] overflow-auto"><table className="w-full font-mono text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-muted-foreground">#</th>
            {resources.map((r) => <th key={r} className="px-2 py-1">{r}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={`transition-colors duration-300 ${activeRow === i ? "bg-highlight" : doneRows.includes(i) ? "bg-success/15" : ""}`}>
              <td className="px-2 py-1 font-bold">P{i}</td>
              {row.map((v, j) => (
                <td key={j} className="px-1 py-1 text-center">
                  {editable ? (
                    <input
                      type="number"
                      min={0}
                      step={1}
                      aria-label={`${title} P${i} ${resources[j]}`}
                      value={v}
                      onChange={(e) => onChange?.(i, j, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                      className="w-12 rounded border-2 border-input bg-background px-1 text-center focus:border-primary focus:outline-none"
                    />
                  ) : (
                    <span className={v < 0 ? "font-bold text-destructive" : ""}>{v}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

export function VectorRow({ label, resources, values, onChange }: { label: string; resources: string[]; values: number[]; onChange?: (j: number, v: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
      <span className="font-hand text-xl font-bold">{label}</span>
      {values.map((v, j) => (
        <label key={j} className="flex items-center gap-1 rounded-md border-2 border-foreground bg-paper px-2 py-1">
          <span className="text-muted-foreground">{resources[j]}</span>
          {onChange ? (
            <input type="number" min={0} step={1} aria-label={`${label} ${resources[j]}`} value={v} onChange={(e) => onChange(j, Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="w-12 bg-transparent text-center focus:outline-none" />
          ) : (
            <span key={v} className="animate-cell inline-block w-6 text-center font-bold">{v}</span>
          )}
        </label>
      ))}
    </div>
  );
}
