import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/quiz/cpu-scheduling")({
  head: () => ({
    meta: [
      { title: "Quiz: CPU Scheduling | OS Playground" },
      {
        name: "description",
        content:
          "Multiple-choice quiz on FCFS, SJF, SRTF, Round Robin, Priority scheduling, and Gantt charts.",
      },
      { property: "og:title", content: "Quiz: CPU Scheduling | OS Playground" },
      {
        property: "og:description",
        content:
          "Multiple-choice quiz on FCFS, SJF, SRTF, Round Robin, Priority scheduling, and Gantt charts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CpuSchedulingQuiz,
});

const QUESTIONS = [
  {
    q: "For a set of processes that all arrive at time 0, which algorithm gives the minimum average waiting time?",
    a: ["FCFS", "SJF", "Round Robin", "Priority"],
    c: 1,
    exp: "Running the shortest jobs first minimizes total waiting; this is provably optimal when all processes arrive together (SRTF extends it when arrivals differ).",
  },
  {
    q: "P1 (BT 24), P2 (BT 3) and P3 (BT 3) all arrive at time 0 and run under FCFS in that order. What is the average waiting time?",
    a: ["3 ms", "10 ms", "17 ms", "27 ms"],
    c: 2,
    exp: "WT = 0, 24, 27, so (0 + 24 + 27) / 3 = 17. The short jobs wait behind the long one: the convoy effect.",
  },
  {
    q: "The same three processes now run under SJF. What is the average waiting time?",
    a: ["3 ms", "6 ms", "9 ms", "17 ms"],
    c: 0,
    exp: "The order is P2, P3, P1, so WT = 0, 3, 6 and (0 + 3 + 6) / 3 = 3.",
  },
  {
    q: "Round Robin with time quantum 4: P1 (BT 24), P2 (BT 3), P3 (BT 3), all arriving at 0. What is the waiting time of P1?",
    a: ["4 ms", "6 ms", "10 ms", "17 ms"],
    c: 1,
    exp: "Gantt P1 0-4, P2 4-7, P3 7-10, then P1 runs 10-30 alone. CT = 30, TAT = 30, WT = 30 - 24 = 6.",
  },
  {
    q: "Using SRTF, what is the average waiting time for A (AT 0, BT 5), B (1, 3), C (2, 8), D (3, 6)?",
    a: ["5.75 ms", "5.25 ms", "5.0 ms", "4.5 ms"],
    c: 2,
    exp: "Gantt A 0-1, B 1-4, A 4-8, D 8-14, C 14-22. WT: A = 3, B = 0, C = 12, D = 5, so 20 / 4 = 5.0.",
  },
  {
    q: "Which technique prevents starvation of low-priority processes in Priority Scheduling?",
    a: ["Aging", "Context switching", "Time slicing", "Swapping"],
    c: 0,
    exp: "Aging gradually raises the priority of a process the longer it waits, so it eventually runs.",
  },
];

function CpuSchedulingQuiz() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= QUESTIONS.length;

  if (done) {
    return (
      <div className="chalkboard mx-auto max-w-xl rounded-md p-10 text-center">
        <p className="font-hand text-5xl font-bold">
          Grade: {score}/{QUESTIONS.length}
        </p>
        <p className="mt-3 font-hand text-2xl">
          {score === QUESTIONS.length
            ? "A+ ⭐ Master Scheduler!"
            : score >= 4
              ? "Nice work — ready for the midterm!"
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
            to="/cpu-scheduling"
            className="press paper-card px-5 py-2 font-bold text-foreground"
          >
            CPU Scheduling Hub
          </Link>
          <Link to="/quiz" className="press paper-card px-5 py-2 font-bold text-foreground">
            all quizzes
          </Link>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[i]!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/cpu-scheduling" className="hover:underline">
              ← CPU Scheduling Hub
            </Link>
            <span>·</span>
            <Link to="/quiz" className="hover:underline">
              all quizzes
            </Link>
          </div>
          <h1 className="mt-1 font-hand text-6xl font-bold">CPU Scheduling Quiz</h1>
        </div>
        <span className="paper-card px-3 py-1 font-mono text-sm">
          {i + 1}/{QUESTIONS.length} · score {score}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-paper">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(i / QUESTIONS.length) * 100}%` }}
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
                    : "opacity-60";
            return (
              <button
                key={a}
                disabled={pick !== null}
                onClick={() => {
                  setPick(k);
                  if (k === q.c) setScore((s) => s + 1);
                }}
                className={`press paper-card px-4 py-2.5 text-left font-medium transition-colors ${state}`}
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
              onClick={() => {
                setI((prev) => prev + 1);
                setPick(null);
              }}
              className="press paper-card bg-highlight px-5 py-2 font-bold text-foreground"
            >
              next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
