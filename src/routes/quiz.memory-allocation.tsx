import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/quiz/memory-allocation")({
  head: () => ({
    meta: [
      { title: "Quiz: Memory Allocation | OS Playground" },
      {
        name: "description",
        content:
          "Multiple-choice quiz on First Fit, Best Fit, Worst Fit, Next Fit, fragmentation, and compaction.",
      },
      { property: "og:title", content: "Quiz: Memory Allocation | OS Playground" },
      {
        property: "og:description",
        content:
          "Multiple-choice quiz on First Fit, Best Fit, Worst Fit, Next Fit, fragmentation, and compaction.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryAllocationQuiz,
});

export const MEMORY_QUIZ_QUESTIONS = [
  {
    q: "A 212 KB process is placed in a 500 KB fixed partition. How much internal fragmentation is there?",
    a: ["0 KB", "212 KB", "288 KB", "500 KB"],
    c: 2,
    exp: "internal fragmentation = block size - process size = 500 - 212 = 288 KB.",
  },
  {
    q: "Which kind of fragmentation is the main problem of dynamic partitioning?",
    a: ["Internal fragmentation", "External fragmentation", "Both are equally common", "Neither"],
    c: 1,
    exp: "each process gets exactly its size, so nothing is wasted inside a block, but as processes leave, scattered holes appear that can be too small to use.",
  },
  {
    q: "Free holes in memory order are 100, 500, 200, 300 and 600 KB. Which hole does Best Fit choose for a 212 KB process?",
    a: ["200 KB", "300 KB", "500 KB", "600 KB"],
    c: 1,
    exp: "the holes that fit 212 KB are 500, 300 and 600; the smallest of them is 300 KB.",
  },
  {
    q: "With the same holes (100, 500, 200, 300, 600 KB), which hole does Worst Fit choose for a 212 KB process?",
    a: ["200 KB", "300 KB", "500 KB", "600 KB"],
    c: 3,
    exp: "Worst Fit picks the largest hole that fits, which is 600 KB.",
  },
  {
    q: "Dynamic partitioning with holes 100, 500, 200, 300, 600 KB and processes of 212, 417, 112 and 426 KB arriving in this order, using First Fit. Which process cannot be allocated?",
    a: ["212 KB", "417 KB", "112 KB", "426 KB"],
    c: 3,
    exp: "212 goes to the 500 hole (leftover 288), 417 goes to the 600 hole (leftover 183), 112 goes to the 288 hole (leftover 176). The holes are now 100, 176, 200, 300 and 183; the total free memory is 959 KB, but the largest hole is only 300 KB, so 426 KB cannot fit. That is external fragmentation.",
  },
  {
    q: "Which technique can fix external fragmentation in dynamic partitioning?",
    a: ["Compaction", "Worst Fit", "Fixed partitions", "Larger processes"],
    c: 0,
    exp: "compaction moves all processes together so the scattered holes merge into one large hole.",
  },
];

function MemoryAllocationQuiz() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= MEMORY_QUIZ_QUESTIONS.length;

  if (done) {
    return (
      <div className="chalkboard mx-auto max-w-xl rounded-md p-10 text-center">
        <p className="font-hand text-5xl font-bold">
          Grade: {score}/{MEMORY_QUIZ_QUESTIONS.length}
        </p>
        <p className="mt-3 font-hand text-2xl">
          {score === MEMORY_QUIZ_QUESTIONS.length
            ? "A+ ⭐ Memory Master!"
            : score >= 4
              ? "Nice work — almost there!"
              : "Revisit the notes and try again ✎"}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              setI(0);
              setScore(0);
              setPick(null);
            }}
            className="press paper-card bg-highlight px-5 py-2 font-bold text-foreground"
          >
            retake
          </button>
          <Link
            to="/memory-allocation"
            className="press paper-card px-5 py-2 font-bold text-foreground"
          >
            Memory Allocation Hub
          </Link>
          <Link to="/quiz" className="press paper-card px-5 py-2 font-bold text-foreground">
            all quizzes
          </Link>
        </div>
      </div>
    );
  }

  const q = MEMORY_QUIZ_QUESTIONS[i]!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/memory-allocation" className="hover:underline">
              ← Memory Allocation Hub
            </Link>
            <span>·</span>
            <Link to="/quiz" className="hover:underline">
              all quizzes
            </Link>
          </div>
          <h1 className="mt-1 font-hand text-6xl font-bold">Memory Allocation Quiz</h1>
        </div>
        <span className="paper-card px-3 py-1 font-mono text-sm">
          {i + 1}/{MEMORY_QUIZ_QUESTIONS.length} · score {score}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-paper">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(i / MEMORY_QUIZ_QUESTIONS.length) * 100}%` }}
        />
      </div>

      <div key={i} className="notebook animate-rise rounded-md py-6 pl-16 pr-6 sm:pl-20">
        <p className="font-hand text-3xl font-bold leading-8">{q.q}</p>
        <div className="mt-6 grid gap-3">
          {q.a.map((a, k) => {
            const state =
              pick === null
                ? ""
                : k === q.c
                  ? "bg-success/30 font-bold border-success"
                  : k === pick
                    ? "bg-destructive/30 border-destructive"
                    : "text-ink-muted";
            return (
              <button
                key={a}
                disabled={pick !== null}
                onClick={() => {
                  setPick(k);
                  if (k === q.c) setScore((s) => s + 1);
                }}
                className={`press paper-card flex min-h-[44px] items-center px-4 py-2.5 text-left font-medium transition-colors ${state}`}
              >
                {String.fromCharCode(65 + k)}. {a}
              </button>
            );
          })}
        </div>

        {pick !== null && (
          <div className="animate-rise mt-6 space-y-4">
            <div className="rounded-md border-2 border-foreground/20 bg-background/80 p-3 font-mono text-xs">
              <span className="font-bold text-primary">Explanation:</span> {q.exp}
            </div>
            <button
              type="button"
              onClick={() => {
                setI((prev) => prev + 1);
                setPick(null);
              }}
              className="press paper-card inline-flex min-h-[44px] items-center justify-center bg-highlight px-5 py-2.5 font-bold text-foreground"
            >
              next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
