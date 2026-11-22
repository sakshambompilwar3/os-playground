import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/quiz/disk-scheduling")({
  head: () => ({
    meta: [
      { title: "Quiz: Disk Scheduling | OS Playground" },
      {
        name: "description",
        content:
          "Multiple-choice quiz on FCFS, SSTF, SCAN, C-SCAN, LOOK, disk geometry, and seek time optimization.",
      },
      { property: "og:title", content: "Quiz: Disk Scheduling | OS Playground" },
      {
        property: "og:description",
        content:
          "Multiple-choice quiz on FCFS, SSTF, SCAN, C-SCAN, LOOK, disk geometry, and seek time optimization.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiskSchedulingQuiz,
});

export const DISK_QUIZ_QUESTIONS = [
  {
    q: "Which part of the disk access time do disk scheduling algorithms mainly try to reduce?",
    a: ["Seek time", "Transfer time", "Rotational latency", "Boot time"],
    c: 0,
    exp: "seek time is the time to move the head to the requested cylinder, and it usually dominates, so scheduling aims to reduce head movement.",
  },
  {
    q: "A disk has cylinders 0 to 199 and the head is at 53. The request queue is 98, 183, 37, 122, 14, 124, 65, 67. What is the total head movement under FCFS?",
    a: ["236", "299", "331", "640"],
    c: 3,
    exp: "the movements are 45 + 85 + 146 + 85 + 108 + 110 + 59 + 2 = 640 cylinders.",
  },
  {
    q: "What does C-SCAN do when the head reaches the last cylinder?",
    a: [
      "It reverses and serves requests on the way back",
      "It jumps to the first cylinder without serving requests and continues in the same direction",
      "It stops until new requests arrive",
      "It serves the nearest pending request",
    ],
    c: 1,
    exp: "C-SCAN only serves requests in one direction, which gives more uniform waiting times than SCAN.",
  },
  {
    q: "Same disk, head at 53, same queue (98, 183, 37, 122, 14, 124, 65, 67). The head moves toward higher cylinders under SCAN. What is the total head movement?",
    a: ["236", "299", "331", "382"],
    c: 2,
    exp: "the head goes from 53 to the last cylinder 199 (146), then reverses and goes down to 14 (185), so 146 + 185 = 331.",
  },
  {
    q: "Same disk, head at 53 and the same queue, moving toward higher cylinders under LOOK. What is the total head movement?",
    a: ["208", "236", "299", "331"],
    c: 2,
    exp: "the head goes from 53 to the highest request 183 (130), then reverses to 14 (169), so 130 + 169 = 299. LOOK saves movement because it does not travel to cylinder 199.",
  },
  {
    q: "Which of these algorithms can cause starvation of far-away requests?",
    a: ["FCFS", "SSTF", "SCAN", "C-SCAN"],
    c: 1,
    exp: "SSTF always serves the nearest request, so a distant request can wait indefinitely if new requests keep arriving close to the head.",
  },
];

function DiskSchedulingQuiz() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= DISK_QUIZ_QUESTIONS.length;

  if (done) {
    return (
      <div className="chalkboard mx-auto max-w-xl rounded-md p-10 text-center">
        <p className="font-hand text-5xl font-bold">
          Grade: {score}/{DISK_QUIZ_QUESTIONS.length}
        </p>
        <p className="mt-3 font-hand text-2xl">
          {score === DISK_QUIZ_QUESTIONS.length
            ? "A+ ⭐ Disk Master!"
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
            to="/disk-scheduling"
            className="press paper-card px-5 py-2 font-bold text-foreground"
          >
            Disk Scheduling Hub
          </Link>
          <Link to="/quiz" className="press paper-card px-5 py-2 font-bold text-foreground">
            all quizzes
          </Link>
        </div>
      </div>
    );
  }

  const q = DISK_QUIZ_QUESTIONS[i]!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/disk-scheduling" className="hover:underline">
              ← Disk Scheduling Hub
            </Link>
            <span>·</span>
            <Link to="/quiz" className="hover:underline">
              all quizzes
            </Link>
          </div>
          <h1 className="mt-1 font-hand text-6xl font-bold">Disk Scheduling Quiz</h1>
        </div>
        <span className="paper-card px-3 py-1 font-mono text-sm">
          {i + 1}/{DISK_QUIZ_QUESTIONS.length} · score {score}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full border-2 border-foreground bg-paper">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(i / DISK_QUIZ_QUESTIONS.length) * 100}%` }}
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
