import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/quiz/synchronization")({
  head: () => ({
    meta: [
      { title: "Quiz: Process Synchronization | OS Playground" },
      {
        name: "description",
        content:
          "Multiple-choice quiz on race conditions, mutual exclusion, counting semaphores, producer-consumer bounded buffer, and dining philosophers.",
      },
      { property: "og:title", content: "Quiz: Process Synchronization | OS Playground" },
      {
        property: "og:description",
        content:
          "Multiple-choice quiz on race conditions, mutual exclusion, counting semaphores, producer-consumer bounded buffer, and dining philosophers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SynchronizationQuiz,
});

export const SYNCHRONIZATION_QUIZ_QUESTIONS = [
  {
    q: "Two threads each run count = count + 1 on a shared variable, with no synchronization. What can go wrong?",
    a: [
      "A lost update: both read the same old value, so one increment is lost",
      "Nothing, because the hardware makes it atomic",
      "The threads always deadlock",
      "The operating system terminates one thread",
    ],
    c: 0,
    exp: "count = count + 1 is a load, an add and a store. If two threads interleave, both can load the same old value and one update disappears.",
  },
  {
    q: "A bounded buffer of size N is protected with semaphores. What are the correct initial values of empty, full and mutex?",
    a: [
      "empty = 0, full = N, mutex = 1",
      "empty = N, full = 0, mutex = 1",
      "empty = N, full = N, mutex = 0",
      "empty = 1, full = 1, mutex = 1",
    ],
    c: 1,
    exp: "at the start all N slots are empty and none is full; mutex is 1 so one thread may enter the critical section.",
  },
  {
    q: "In the producer, wait(mutex) is accidentally placed before wait(empty) and the buffer is full. What happens?",
    a: [
      "Nothing changes",
      "Deadlock: the producer holds the mutex while waiting for an empty slot, so no consumer can enter to free one",
      "The buffer overflows",
      "A consumer reads a wrong item",
    ],
    c: 1,
    exp: "the producer waits for an empty slot while holding the mutex, and a consumer needs that mutex to make a slot empty, so both wait forever.",
  },
  {
    q: "Five philosophers each pick up their left fork first and then their right fork. All five pick up their left fork at the same time. What happens?",
    a: [
      "Deadlock",
      "Everyone eats in turn",
      "Only one philosopher starves",
      "The forks are shared automatically",
    ],
    c: 0,
    exp: "every philosopher holds one fork and waits for the fork held by the next philosopher, which is a circular wait.",
  },
  {
    q: "Which of these does NOT prevent deadlock in the dining philosophers problem?",
    a: [
      "Number the forks and always pick up the lower-numbered fork first",
      "Let at most 4 of the 5 philosophers sit at the table",
      "Let even philosophers pick the left fork first and odd philosophers the right fork first",
      "Let every philosopher pick the left fork first and then the right fork",
    ],
    c: 3,
    exp: "that is the naive rule, which allows a circular wait. The other three each make a full circle of waiting impossible.",
  },
  {
    q: "What does the Ostrich algorithm do about deadlocks?",
    a: [
      "It ignores them, assuming they are rare",
      "It prevents them by numbering resources",
      "It detects and kills one process",
      "It uses the Banker's algorithm",
    ],
    c: 0,
    exp: "the Ostrich algorithm accepts the risk of an occasional deadlock because prevention and detection are costly.",
  },
];

function SynchronizationQuiz() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const done = i >= SYNCHRONIZATION_QUIZ_QUESTIONS.length;

  if (done) {
    return (
      <div className="chalkboard mx-auto max-w-xl rounded-md p-10 text-center">
        <h1 className="font-hand text-5xl font-bold">Grade: {score}/{SYNCHRONIZATION_QUIZ_QUESTIONS.length}</h1>
        <p className="mt-3 font-hand text-2xl">
          {score === SYNCHRONIZATION_QUIZ_QUESTIONS.length
            ? "A+ ⭐ Synchronization Guru!"
            : score >= 4
              ? "Good job — review semaphore ordering and fork rules!"
              : "Revisit the notes and try again ✎"}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setI(0);
              setScore(0);
              setPick(null);
            }}
            className="press paper-card bg-highlight px-5 py-2.5 font-bold text-foreground min-h-[44px]"
          >
            retake
          </button>
          <Link
            to="/synchronization"
            className="press paper-card px-5 py-2.5 font-bold text-foreground min-h-[44px] flex items-center"
          >
            Synchronization Hub
          </Link>
          <Link
            to="/quiz"
            className="press paper-card px-5 py-2.5 font-bold text-foreground min-h-[44px] flex items-center"
          >
            all quizzes
          </Link>
        </div>
      </div>
    );
  }

  const q = SYNCHRONIZATION_QUIZ_QUESTIONS[i]!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/synchronization" className="hover:underline">
              ← Synchronization Hub
            </Link>
            <span>·</span>
            <Link to="/quiz" className="hover:underline">
              all quizzes
            </Link>
          </div>
          <h1 className="mt-1 font-hand text-4xl font-bold">Process Synchronization Quiz</h1>
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          {i + 1}/{SYNCHRONIZATION_QUIZ_QUESTIONS.length} · score {score}
        </span>
      </div>

      <div className="paper-card space-y-4 p-6">
        <p className="font-hand text-2xl font-bold">{q.q}</p>
        <div className="space-y-2">
          {q.a.map((a, k) => {
            const answered = pick !== null;
            const isSelected = pick === k;
            const isCorrect = k === q.c;
            let state = "hover:bg-highlight/40";
            if (answered) {
              if (isCorrect) state = "bg-success/30 font-bold border-success text-foreground";
              else if (isSelected) state = "bg-destructive/30 border-destructive text-foreground";
              else state = "opacity-50";
            }
            return (
              <button
                key={k}
                type="button"
                disabled={answered}
                onClick={() => {
                  setPick(k);
                  if (k === q.c) setScore((s) => s + 1);
                }}
                className={`press paper-card flex min-h-[44px] items-center px-4 py-2.5 text-left font-medium transition-colors w-full ${state}`}
              >
                {String.fromCharCode(65 + k)}. {a}
              </button>
            );
          })}
        </div>

        {pick !== null && (
          <div className="animate-rise space-y-3 pt-2">
            <div className="rounded border-2 border-primary/30 bg-primary/5 p-3 text-sm">
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
