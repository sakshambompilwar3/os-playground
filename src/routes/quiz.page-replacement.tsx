import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/quiz/page-replacement")({
  head: () => ({
    meta: [
      { title: "Quiz: Page Replacement | OS Playground" },
      {
        name: "description",
        content:
          "Multiple-choice quiz on virtual memory, FIFO, LRU, Optimal page replacement, Belady's anomaly, and page fault calculations.",
      },
      { property: "og:title", content: "Quiz: Page Replacement | OS Playground" },
      {
        property: "og:description",
        content:
          "Multiple-choice quiz on virtual memory, FIFO, LRU, Optimal page replacement, Belady's anomaly, and page fault calculations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PageReplacementQuiz,
});

export const PAGE_REPLACEMENT_QUIZ_QUESTIONS = [
  {
    q: "A process uses the reference string 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1 with 3 frames. How many page faults occur under FIFO?",
    a: ["9", "12", "15", "18"],
    c: 2,
    exp: "the faults happen at references 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 14, 15, 18, 19 and 20, which is 15 faults and 5 hits.",
  },
  {
    q: "Same string and 3 frames. How many page faults occur under LRU?",
    a: ["9", "10", "12", "15"],
    c: 2,
    exp: "LRU faults at references 1, 2, 3, 4, 6, 8, 9, 10, 11, 14, 16 and 18, which is 12 faults and 8 hits.",
  },
  {
    q: "Same string and 3 frames. How many page faults occur under the Optimal algorithm?",
    a: ["7", "9", "12", "15"],
    c: 1,
    exp: "Optimal faults at references 1, 2, 3, 4, 6, 8, 11, 14 and 18, which is 9 faults and 11 hits. No algorithm can do better on this string.",
  },
  {
    q: "With LRU and 3 frames, after the first 7 references of the string 7, 0, 1, 2, 0, 3, 0, ... the frames hold pages 0, 2 and 3. Page 4 is requested next. Which page is replaced?",
    a: ["Page 0", "Page 2", "Page 3", "None, there is a free frame"],
    c: 1,
    exp: "page 2 was last used at reference 4, page 3 at reference 6 and page 0 at reference 7, so page 2 is the least recently used.",
  },
  {
    q: "Which page replacement algorithm gives the fewest possible page faults but cannot be used in a real system because it needs to know future references?",
    a: ["FIFO", "LRU", "Optimal", "Random"],
    c: 2,
    exp: "it replaces the page that will not be used for the longest time, which needs knowledge of the future. It is used as a benchmark.",
  },
  {
    q: "For the reference string 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5, FIFO causes 9 page faults with 3 frames. How many page faults does FIFO cause with 4 frames?",
    a: ["6", "8", "9", "10"],
    c: 3,
    exp: "with 4 frames the faults happen at references 1, 2, 3, 4, 7, 8, 9, 10, 11 and 12, which is 10. More frames gave more faults. This is Belady's anomaly.",
  },
];

function PageReplacementQuiz() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const done = i >= PAGE_REPLACEMENT_QUIZ_QUESTIONS.length;

  if (done) {
    return (
      <div className="chalkboard mx-auto max-w-xl rounded-md p-10 text-center">
        <h1 className="font-hand text-5xl font-bold">Grade: {score}/{PAGE_REPLACEMENT_QUIZ_QUESTIONS.length}</h1>
        <p className="mt-3 font-hand text-2xl">
          {score === PAGE_REPLACEMENT_QUIZ_QUESTIONS.length
            ? "A+ ⭐ Demand Paging Master!"
            : score >= 4
              ? "Solid grasp — review Belady and EAT!"
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
            to="/page-replacement"
            className="press paper-card px-5 py-2.5 font-bold text-foreground min-h-[44px] flex items-center"
          >
            Page Replacement Hub
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

  const q = PAGE_REPLACEMENT_QUIZ_QUESTIONS[i]!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/page-replacement" className="hover:underline">
              ← Page Replacement Hub
            </Link>
            <span>·</span>
            <Link to="/quiz" className="hover:underline">
              all quizzes
            </Link>
          </div>
          <h1 className="mt-1 font-hand text-4xl font-bold">Page Replacement Quiz</h1>
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          {i + 1}/{PAGE_REPLACEMENT_QUIZ_QUESTIONS.length} · score {score}
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
