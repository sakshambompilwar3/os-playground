import { useState } from "react";
import { BookOpen, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { learningNotes } from "@/lib/learning-notes";

export function SimulatorNotes() {
  const [view, setView] = useState<"textbook" | "notes" | null>(null);
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<{ id: number; body: string }[]>([]);
  return <>
    <Button variant="outline" onClick={() => setView("textbook")}><BookOpen />Textbook</Button>
    <Button variant="outline" onClick={() => setView("notes")}><Plus />Add notes</Button>
    <Dialog open={view !== null} onOpenChange={(open) => { if (!open) setView(null); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto bg-paper">
        <DialogHeader><DialogTitle className="font-hand text-3xl">{view === "textbook" ? "The notes" : "My notes"}</DialogTitle><DialogDescription>{view === "textbook" ? "Banker’s Algorithm · Operating Systems" : "Notes for this simulator visit (cleared when you leave or refresh)."}</DialogDescription></DialogHeader>
        {view === "textbook" ? <div className="space-y-5">{learningNotes.map((note) => <section key={note.t} className="border-b pb-4"><h3 className="font-hand text-2xl font-bold text-primary">{note.t}</h3><p className="mt-2 leading-7">{note.b}</p></section>)}</div> : <div className="space-y-4">
          <label htmlFor="personal-note" className="font-bold">New note</label>
          <textarea id="personal-note" rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} className="w-full rounded-md border-2 border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button disabled={!draft.trim()} onClick={() => { setNotes((previous) => [...previous, { id: Date.now(), body: draft.trim() }]); setDraft(""); }}><Save />Save note</Button>
          <div aria-live="polite" className="space-y-3">{notes.map((note) => <article key={note.id} className="flex items-start gap-3 border-t pt-3"><p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{note.body}</p><Button variant="ghost" size="icon" aria-label="Delete note" title="Delete note" onClick={() => setNotes((previous) => previous.filter((n) => n.id !== note.id))}><Trash2 /></Button></article>)}</div>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}