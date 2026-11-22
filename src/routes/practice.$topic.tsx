import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { OS_TOPICS, OSTopic } from "@/lib/topics";
import { generateVerified } from "@/lib/practice/gate";
import { generateSeed, normalizeSeed } from "@/lib/practice/rng";
import { checkAnswer, CheckAnswerResult } from "@/lib/practice/checker";
import { Problem, ProblemLevel, ProblemTopic, PracticeGenerationError } from "@/lib/practice/types";
import { TOPIC_SELECTORS, parsePracticeUrlParams } from "@/lib/practice/subtopics";
import { assignProcessColors, assignPageColors } from "@/lib/palette";
import { SchedulingGantt } from "@/components/SchedulingGantt";
import { MemoryMap } from "@/components/MemoryMap";
import { DiskHeadChart } from "@/components/DiskHeadChart";
import { MatrixTable } from "@/components/MatrixTable";
import { FrameTable } from "@/components/PagingDetails";
import {
  Copy,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Eye,
  ArrowLeft,
  Award,
  Sparkles,
  Info,
} from "lucide-react";

interface PracticeSearchParams {
  level?: ProblemLevel;
  seed?: string;
  sub?: string;
  mode?: string;
  strategy?: string;
  from?: "hub" | "practice";
}

export const Route = createFileRoute("/practice/$topic")({
  validateSearch: (search: Record<string, unknown>): PracticeSearchParams => {
    const rawLevel = String(search.level || "").toLowerCase();
    const level: ProblemLevel =
      rawLevel === "medium" || rawLevel === "hard" ? rawLevel : "easy";
    const rawSeed = search.seed ? String(search.seed) : undefined;
    const rawSub = search.sub ? String(search.sub) : undefined;
    const rawMode = search.mode ? String(search.mode) : undefined;
    const rawStrategy = search.strategy ? String(search.strategy) : undefined;
    const rawFrom = search.from === "hub" ? "hub" : "practice";

    return {
      level,
      seed: rawSeed,
      sub: rawSub,
      mode: rawMode,
      strategy: rawStrategy,
      from: rawFrom,
    };
  },
  head: ({ params }) => {
    const topic = OS_TOPICS.find((t) => t.slug === params.topic);
    const title = topic ? `Practice: ${topic.title} | OS Playground` : "Practice | OS Playground";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Interactive randomized practice problems for ${topic?.title ?? "Operating Systems"} with automatic checking and step-by-step worked solutions.`,
        },
        { property: "og:title", content: title },
      ],
    };
  },
  component: PracticeTopicPage,
});

function PracticeTopicPage() {
  const { topic: topicSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const topic = useMemo(() => OS_TOPICS.find((t) => t.slug === topicSlug), [topicSlug]);
  const topicKey = (topic?.slug || "cpu-scheduling") as ProblemTopic;

  const initialFallbackSeed = useMemo(() => generateSeed(), []);
  const parsedParams = useMemo(() => {
    return parsePracticeUrlParams(topicKey, search, initialFallbackSeed);
  }, [topicKey, search, initialFallbackSeed]);

  const { level, sub, mode, strategy, from, seed: currentSeed } = parsedParams;

  // Synchronize URL with initial seed and options if search was partial
  useEffect(() => {
    if (!search.seed) {
      navigate({
        search: {
          level,
          sub,
          mode,
          strategy,
          seed: currentSeed,
          from,
        },
        replace: true,
      });
    }
  }, [search.seed, currentSeed, level, sub, mode, strategy, from, navigate]);

  // User input state
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [checkResults, setCheckResults] = useState<Record<string, CheckAnswerResult>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackAnnouncement, setFeedbackAnnouncement] = useState("");

  // Score state
  const [sessionScore, setSessionScore] = useState({
    solvedFirstTry: 0,
    attempted: 0,
    streak: 0,
  });

  // Track if current problem was already counted in attempted
  const [problemAttemptedTracked, setProblemAttemptedTracked] = useState(false);
  // Track questions checked on first try
  const [firstTryTracked, setFirstTryTracked] = useState<Record<string, boolean>>({});

  // Reset answer states on new seed / level / options
  useEffect(() => {
    setUserAnswers({});
    setCheckResults({});
    setRevealedHints({});
    setSolutionRevealed(false);
    setProblemAttemptedTracked(false);
    setFirstTryTracked({});
    setFeedbackAnnouncement("");
  }, [currentSeed, level, sub, mode, strategy]);

  // Generate verified problem
  const { problem, error } = useMemo(() => {
    if (!topic) return { problem: null, error: "Invalid topic" };
    try {
      const p = generateVerified(topicKey, level, currentSeed, {
        sub,
        mode,
        strategy,
      });
      return { problem: p, error: null };
    } catch (err: any) {
      return { problem: null, error: err.message || "Failed to generate problem" };
    }
  }, [topic, topicKey, level, currentSeed, sub, mode, strategy]);

  // Visual chart colors
  const processPaletteColors = useMemo(() => {
    if (!problem?.rawParams) return {};
    if (problem.rawParams.references) {
      return assignPageColors(problem.rawParams.references);
    }
    const procs =
      problem.rawParams.processes ||
      problem.rawParams.blocks ||
      [];
    const items = procs.map((p: any) => ({
      id: String(p.id),
      name: String(p.name || p.id),
    }));
    return assignProcessColors(items);
  }, [problem]);

  const handleLevelChange = (newLevel: ProblemLevel) => {
    const newSeed = generateSeed();
    navigate({
      search: {
        level: newLevel,
        sub,
        mode,
        strategy,
        seed: newSeed,
        from,
      },
    });
  };

  const handleSelectorChange = (key: string, value: string) => {
    const newSeed = generateSeed();
    const newSearch: Record<string, string> = {
      level,
      sub,
      mode,
      strategy,
      seed: newSeed,
      from,
    };
    newSearch[key] = value;
    navigate({
      search: newSearch,
    });
  };

  const handleNewProblem = () => {
    let newSeed = generateSeed();
    const hasRandom = sub === "random" || mode === "random" || strategy === "random";

    if (hasRandom && problem?.subtopic) {
      const prevSubtopic = problem.subtopic;
      for (let attempt = 0; attempt < 40; attempt++) {
        try {
          const testP = generateVerified(topicKey, level, newSeed, {
            sub,
            mode,
            strategy,
          });
          if (testP.subtopic && testP.subtopic !== prevSubtopic) {
            break;
          }
        } catch {
          // ignore verification test fail during search
        }
        newSeed = generateSeed();
      }
    }

    navigate({
      search: {
        level,
        sub,
        mode,
        strategy,
        seed: newSeed,
        from,
      },
    });
  };

  const handleReplayCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    const clean = normalizeSeed(codeInput);
    setCodeInput("");
    navigate({
      search: {
        level,
        sub,
        mode,
        strategy,
        seed: clean,
        from,
      },
    });
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCheckQuestion = (questionId: string) => {
    if (!problem) return;
    const q = problem.questions.find((item) => item.id === questionId);
    if (!q) return;

    const rawInput = userAnswers[questionId] || "";
    const result = checkAnswer(q, rawInput);
    setCheckResults((prev) => ({ ...prev, [questionId]: result }));

    // Announce for screen readers
    setFeedbackAnnouncement(`Question "${q.text}": ${result.status === "correct" ? "Correct!" : result.message || result.status}`);

    // Score tracking
    if (!problemAttemptedTracked) {
      setSessionScore((prev) => ({ ...prev, attempted: prev.attempted + 1 }));
      setProblemAttemptedTracked(true);
    }

    if (result.correct && !solutionRevealed && !firstTryTracked[questionId]) {
      setFirstTryTracked((prev) => ({ ...prev, [questionId]: true }));
      setSessionScore((prev) => ({
        ...prev,
        solvedFirstTry: prev.solvedFirstTry + 1,
        streak: prev.streak + 1,
      }));
    } else if (!result.correct) {
      setSessionScore((prev) => ({ ...prev, streak: 0 }));
    }
  };

  const handleRevealSolution = () => {
    setSolutionRevealed(true);
    setFeedbackAnnouncement("Worked solution and answers revealed.");
  };

  const selectors = TOPIC_SELECTORS[topicKey] || [];

  const allQuestionsChecked =
    problem &&
    problem.questions.length > 1 &&
    problem.questions.every((q) => checkResults[q.id] && checkResults[q.id]?.status !== "invalid");

  const correctQuestionsCount = problem
    ? problem.questions.filter((q) => checkResults[q.id]?.status === "correct").length
    : 0;

  if (!topic) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <h1 className="font-hand text-5xl font-bold">Topic Not Found</h1>
        <p className="mt-4 text-muted-foreground">The requested practice topic does not exist.</p>
        <Link to="/practice" className="mt-6 inline-block font-bold underline">
          ← Back to Practice Mode
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Throttled screen reader live feedback */}
      <div className="sr-only" aria-live="polite">
        {feedbackAnnouncement}
      </div>

      {/* Back link */}
      <div>
        <Link
          to={from === "hub" ? `/${topic.slug}` : "/practice"}
          className="inline-flex min-h-[44px] items-center gap-1.5 font-hand text-xl font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          <span>{from === "hub" ? `← Back to ${topic.title} Hub` : "← Back to Practice"}</span>
        </Link>
      </div>

      {/* Chalkboard Hero Header */}
      <section className="chalkboard relative overflow-hidden rounded-lg p-6 sm:p-8 text-cream shadow-[var(--shadow-chalk)]">
        <span className="font-mono text-xs font-semibold tracking-wider text-chalk-yellow uppercase">
          OPERATING SYSTEMS · PRACTICE
        </span>
        <h1 className="mt-2 font-hand text-4xl sm:text-6xl font-bold tracking-tight text-chalk-white">
          {topic.title}
        </h1>
        <p className="mt-2 max-w-2xl font-hand text-xl text-chalk-yellow/90">
          Solve fresh deterministic problems, check your math, and study complete worked solutions.
        </p>

        {/* Score & Streak Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-md border border-chalk-border/40 bg-black/30 px-4 py-2 text-sm font-mono text-chalk-white">
          <div className="flex items-center gap-1.5">
            <Award className="h-4 w-4 text-chalk-yellow" aria-hidden="true" />
            <span>Solved (1st try): <strong className="text-chalk-yellow">{sessionScore.solvedFirstTry}</strong></span>
          </div>
          <div className="h-4 w-px bg-chalk-border/40" />
          <div>
            <span>Attempted: <strong>{sessionScore.attempted}</strong></span>
          </div>
          <div className="h-4 w-px bg-chalk-border/40" />
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-chalk-cyan" aria-hidden="true" />
            <span>Streak: <strong className="text-chalk-cyan">{sessionScore.streak}</strong></span>
          </div>
        </div>
      </section>

      {/* Control Bar: Difficulty Segmented Control, Subtopic Selectors, Seed chip, New Problem & Code input */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-foreground bg-paper p-4 shadow-[var(--shadow-paper)]">
        {/* Selectors Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Difficulty segmented control */}
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs font-bold text-muted-foreground hidden lg:inline">
              Level:
            </span>
            <div className="flex items-center gap-1 rounded-md border-2 border-foreground bg-secondary/40 p-1">
              {(["easy", "medium", "hard"] as ProblemLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleLevelChange(lvl)}
                  className={`min-h-[44px] min-w-[64px] sm:min-w-[76px] rounded px-3 py-1 font-mono text-xs font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    level === lvl
                      ? "border-2 border-foreground bg-highlight shadow-[1px_1px_0_var(--foreground)]"
                      : "hover:bg-paper/80"
                  }`}
                  aria-pressed={level === lvl}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Subtopic selectors */}
          {selectors.map((sel) => {
            const currentVal =
              sel.key === "mode" ? mode : sel.key === "strategy" ? strategy : sub;

            return (
              <div key={sel.key} className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-muted-foreground hidden xl:inline">
                  {sel.label}:
                </span>
                {/* Desktop segmented control */}
                <div className="hidden md:flex items-center gap-1 rounded-md border-2 border-foreground bg-secondary/40 p-1">
                  {sel.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectorChange(sel.key, opt.id)}
                      className={`min-h-[44px] rounded px-2.5 py-1 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        currentVal === opt.id
                          ? "border-2 border-foreground bg-highlight shadow-[1px_1px_0_var(--foreground)]"
                          : "hover:bg-paper/80"
                      }`}
                      aria-pressed={currentVal === opt.id}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Mobile / Narrow screen select */}
                <div className="flex md:hidden items-center gap-1">
                  <label htmlFor={`select-${sel.key}`} className="font-mono text-xs font-bold sr-only sm:not-sr-only">
                    {sel.label}:
                  </label>
                  <select
                    id={`select-${sel.key}`}
                    value={currentVal}
                    onChange={(e) => handleSelectorChange(sel.key, e.target.value)}
                    aria-label={sel.label}
                    className="min-h-[44px] rounded-md border-2 border-foreground bg-paper px-2 py-1 font-mono text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {sel.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Seed Info & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seed Chip */}
          <div className="flex min-h-[44px] items-center gap-1.5 rounded-md border-2 border-foreground bg-paper px-3 py-1 font-mono text-xs font-bold">
            <span className="text-muted-foreground">Code:</span>
            <span>{currentSeed}</span>
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy shareable link"
              className="press ml-1 inline-flex h-8 w-8 items-center justify-center rounded hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Copy shareable link"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* New Problem Button */}
          <button
            type="button"
            onClick={handleNewProblem}
            className="press flex min-h-[44px] items-center gap-1.5 rounded-md border-2 border-foreground bg-cream px-3.5 py-1.5 font-hand text-lg font-bold shadow-[2px_2px_0_var(--foreground)] hover:bg-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Next Problem</span>
          </button>

          {/* Replay Code Form */}
          <form onSubmit={handleReplayCode} className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Code (e.g. 7K2M9P)"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              maxLength={8}
              className="min-h-[44px] w-28 rounded-md border-2 border-foreground bg-paper px-2 py-1 font-mono text-xs uppercase placeholder:normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              className="press flex min-h-[44px] items-center rounded-md border-2 border-foreground bg-secondary px-3 py-1 font-mono text-xs font-bold shadow-[1px_1px_0_var(--foreground)] hover:bg-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Go
            </button>
          </form>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div className="paper-card border-2 border-foreground bg-accent/30 p-6 text-center">
          <p className="font-hand text-3xl font-bold">Could Not Verify Problem</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "Verification between independent solvers rejected this specific seed configuration."}
          </p>
          <button
            type="button"
            onClick={handleNewProblem}
            className="press mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-md border-2 border-foreground bg-highlight px-4 py-2 font-hand text-xl font-bold shadow-[2px_2px_0_var(--foreground)]"
          >
            Try Another Problem
          </button>
        </div>
      )}

      {/* Problem Content */}
      {problem && (
        <div className="space-y-8">
          {/* Statement Paper Card */}
          <section className="relative rounded-lg border-2 border-foreground bg-paper p-6 sm:p-8 shadow-[var(--shadow-paper)]">
            <span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-1 bg-secondary/80 pointer-events-none" />

            <h2 className="font-hand text-3xl font-bold">{problem.title}</h2>
            <p className="mt-3 text-base text-foreground leading-relaxed">{problem.statement.intro}</p>

            {/* Data Tables */}
            {problem.statement.dataTables && problem.statement.dataTables.length > 0 && (
              <div className="mt-6 space-y-4">
                {problem.statement.dataTables.map((table, tIdx) => (
                  <div key={tIdx} className="overflow-hidden rounded-md border-2 border-foreground/80 bg-paper">
                    {table.caption && (
                      <div className="border-b border-foreground/60 bg-secondary/40 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider">
                        {table.caption}
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs sm:text-sm">
                        <thead className="border-b border-foreground/40 bg-secondary/20">
                          <tr>
                            {table.headers.map((h, hIdx) => (
                              <th key={hIdx} className="px-3 py-2 font-bold text-foreground">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/20">
                          {table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-secondary/10">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-3 py-2 text-foreground">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rules Used List */}
            {problem.statement.rules && problem.statement.rules.length > 0 && (
              <div className="mt-6 rounded-md border-l-4 border-foreground bg-secondary/30 p-4 font-mono text-xs">
                <span className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Rules Used in This Problem:
                </span>
                <ul className="list-inside list-disc space-y-1 text-ink-muted">
                  {problem.statement.rules.map((rule, rIdx) => (
                    <li key={rIdx}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Questions Section */}
          <section className="space-y-6">
            <h3 className="font-hand text-3xl font-bold">Your Tasks</h3>

            <div className="space-y-6">
              {problem.questions.map((q, idx) => {
                const answerValue = userAnswers[q.id] || "";
                const checkRes = checkResults[q.id];
                const isHintRevealed = revealedHints[q.id];

                return (
                  <div
                    key={q.id}
                    className="rounded-lg border-2 border-foreground bg-paper p-5 sm:p-6 shadow-[var(--shadow-paper)]"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-xs font-bold uppercase text-muted-foreground">
                        Question {idx + 1} of {problem.questions.length}
                      </span>
                      {q.hint && (
                        <button
                          type="button"
                          onClick={() => setRevealedHints((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                          className="press inline-flex min-h-[44px] items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                        >
                          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{isHintRevealed ? "Hide hint" : "Need a hint?"}</span>
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-base font-medium text-foreground">{q.text}</p>

                    {/* Hint callout */}
                    {isHintRevealed && q.hint && (
                      <div className="mt-3 rounded border border-chalk-border bg-highlight/30 p-3 font-mono text-xs text-foreground">
                        <strong>Hint:</strong> {q.hint}
                      </div>
                    )}

                    {/* Input Controls */}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {q.answerType === "number" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={answerValue}
                            onChange={(e) =>
                              setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCheckQuestion(q.id);
                            }}
                            placeholder="e.g. 5.75 or 23/4"
                            className={`min-h-[44px] w-48 rounded-md border-2 ${
                              checkRes?.status === "correct"
                                ? "border-[var(--chalk)] ring-2 ring-[var(--chalk)]/30"
                                : checkRes?.status === "incorrect"
                                ? "border-[#a64024] ring-2 ring-[#a64024]/30"
                                : "border-foreground"
                            } bg-paper px-3 py-1 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                          />
                          {q.unit && (
                            <span className="font-mono text-xs font-bold text-muted-foreground px-2 py-1 bg-secondary/50 rounded border border-foreground/30">
                              {q.unit}
                            </span>
                          )}
                        </div>
                      )}

                      {q.answerType === "choice" && q.choices && (
                        <div className="flex flex-wrap items-center gap-2">
                          {q.choices.map((choice) => (
                            <button
                              key={choice.id}
                              type="button"
                              onClick={() =>
                                setUserAnswers((prev) => ({ ...prev, [q.id]: choice.id }))
                              }
                              className={`press flex min-h-[44px] items-center gap-2 rounded-md border-2 ${
                                answerValue.toLowerCase() === choice.id.toLowerCase()
                                  ? checkRes?.status === "correct"
                                    ? "border-[var(--chalk)] bg-highlight font-bold shadow-[2px_2px_0_var(--foreground)]"
                                    : checkRes?.status === "incorrect"
                                    ? "border-[#a64024] bg-highlight font-bold shadow-[2px_2px_0_var(--foreground)]"
                                    : "border-foreground bg-highlight font-bold shadow-[2px_2px_0_var(--foreground)]"
                                  : "border-foreground bg-paper hover:bg-secondary/40"
                              } px-4 py-2 font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                              aria-pressed={answerValue.toLowerCase() === choice.id.toLowerCase()}
                            >
                              <span>{choice.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {q.answerType === "sequence" && (
                        <div className="w-full sm:w-auto">
                          <input
                            type="text"
                            value={answerValue}
                            onChange={(e) =>
                              setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCheckQuestion(q.id);
                            }}
                            placeholder="e.g. P1, P2, P3 or P1 -> P2 -> P3"
                            className={`min-h-[44px] w-full sm:w-72 rounded-md border-2 ${
                              checkRes?.status === "correct"
                                ? "border-[var(--chalk)] ring-2 ring-[var(--chalk)]/30"
                                : checkRes?.status === "incorrect"
                                ? "border-[#a64024] ring-2 ring-[#a64024]/30"
                                : "border-foreground"
                            } bg-paper px-3 py-1 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                          />
                        </div>
                      )}

                      {q.answerType === "set" && (
                        <div className="w-full sm:w-auto">
                          <input
                            type="text"
                            value={answerValue}
                            onChange={(e) =>
                              setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCheckQuestion(q.id);
                            }}
                            placeholder="e.g. 1, 3, 4"
                            className={`min-h-[44px] w-full sm:w-64 rounded-md border-2 ${
                              checkRes?.status === "correct"
                                ? "border-[var(--chalk)] ring-2 ring-[var(--chalk)]/30"
                                : checkRes?.status === "incorrect"
                                ? "border-[#a64024] ring-2 ring-[#a64024]/30"
                                : "border-foreground"
                            } bg-paper px-3 py-1 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                          />
                        </div>
                      )}

                      {/* Check Button */}
                      <button
                        type="button"
                        onClick={() => handleCheckQuestion(q.id)}
                        className="press flex min-h-[44px] items-center rounded-md border-2 border-foreground bg-cream px-4 py-2 font-hand text-lg font-bold shadow-[2px_2px_0_var(--foreground)] hover:bg-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Check
                      </button>
                    </div>

                    {/* Verdict Banner (Task 2) */}
                    {checkRes && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="mt-3"
                      >
                        {checkRes.status === "correct" && (
                          <div className="rounded-md border-2 border-foreground bg-[var(--chalk)] p-4 text-[var(--chalk-foreground)] shadow-[2px_2px_0_var(--foreground)] motion-safe:animate-in motion-safe:fade-in-50 motion-safe:zoom-in-95 duration-150">
                            <div className="flex items-center gap-2">
                              <Check className="h-6 w-6 shrink-0 text-chalk-yellow" aria-hidden="true" />
                              <h5 className="font-hand text-2xl font-bold tracking-wide">Correct!</h5>
                            </div>
                            <p className="mt-1 text-sm font-mono text-cream/95 leading-relaxed">
                              {checkRes.message && checkRes.message !== "Correct!"
                                ? checkRes.message
                                : "Great work! Your answer matches the algorithm derivation."}
                            </p>
                          </div>
                        )}

                        {checkRes.status === "incorrect" && (
                          <div className="rounded-md border-2 border-foreground bg-[#a64024] p-4 text-cream shadow-[2px_2px_0_var(--foreground)] motion-safe:animate-in motion-safe:fade-in-50 motion-safe:zoom-in-95 duration-150">
                            <div className="flex items-center gap-2">
                              <X className="h-6 w-6 shrink-0 text-cream" aria-hidden="true" />
                              <h5 className="font-hand text-2xl font-bold tracking-wide">Not quite</h5>
                            </div>
                            <p className="mt-1 text-sm font-mono text-cream/95 leading-relaxed">
                              {checkRes.message || "Check your calculations and try again."}
                            </p>
                          </div>
                        )}

                        {checkRes.status === "invalid" && (
                          <div className="rounded-md border-2 border-foreground bg-foreground p-3.5 text-paper shadow-[2px_2px_0_var(--foreground)] motion-safe:animate-in motion-safe:fade-in-50 motion-safe:zoom-in-95 duration-150">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 shrink-0 text-highlight" aria-hidden="true" />
                              <h5 className="font-hand text-xl font-bold">Please enter an answer</h5>
                            </div>
                            <p className="mt-1 text-xs font-mono text-paper/90 leading-relaxed">
                              {checkRes.message || "Please provide an answer before checking."}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Solution Answer Reveal when Show Solution clicked */}
                    {solutionRevealed && (
                      <div className="mt-3 rounded border border-foreground/40 bg-secondary/30 p-2.5 font-mono text-xs">
                        <span className="font-bold text-muted-foreground">Expected answer: </span>
                        <strong className="text-foreground">
                          {Array.isArray(q.expected) ? q.expected.join(", ") : String(q.expected)}
                        </strong>
                        {q.unit ? ` ${q.unit}` : ""}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* All questions checked summary line */}
              {allQuestionsChecked && (
                <div className="rounded-md border-2 border-foreground bg-secondary/40 p-3 text-center font-mono text-sm font-bold shadow-[1px_1px_0_var(--foreground)]">
                  Summary: {correctQuestionsCount} of {problem.questions.length} correct
                </div>
              )}
            </div>
          </section>

          {/* Bottom Action Bar: Show Solution, Next Problem */}
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-foreground bg-paper p-4 shadow-[var(--shadow-paper)]">
            <button
              type="button"
              onClick={handleRevealSolution}
              disabled={solutionRevealed}
              className="press flex min-h-[44px] items-center gap-2 rounded-md border-2 border-foreground bg-secondary px-4 py-2 font-hand text-xl font-bold shadow-[2px_2px_0_var(--foreground)] hover:bg-highlight disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Eye className="h-5 w-5" aria-hidden="true" />
              <span>{solutionRevealed ? "Solution Revealed" : "Show Solution"}</span>
            </button>

            <button
              type="button"
              onClick={handleNewProblem}
              className="press flex min-h-[44px] items-center gap-2 rounded-md border-2 border-foreground bg-highlight px-5 py-2 font-hand text-xl font-bold shadow-[2px_2px_0_var(--foreground)] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
              <span>Next Problem →</span>
            </button>
          </section>

          {/* Worked Solution Drawer / Card */}
          {solutionRevealed && (
            <section className="space-y-6 rounded-lg border-2 border-foreground bg-paper p-6 sm:p-8 shadow-[var(--shadow-paper)]">
              <div className="border-b-2 border-foreground pb-4">
                <span className="font-mono text-xs font-bold uppercase text-muted-foreground">
                  WORKED SOLUTION & TRACE
                </span>
                <h3 className="font-hand text-4xl font-bold mt-1">Complete Step-by-Step Solution</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Detailed derivation calculated directly from the algorithm's trace.
                </p>
              </div>

              {problem.solution.map((step, sIdx) => (
                <div key={sIdx} className="space-y-3 rounded-md border border-foreground/30 bg-secondary/10 p-4">
                  <h4 className="font-hand text-2xl font-bold text-foreground">
                    {sIdx + 1}. {step.title}
                  </h4>
                  <p className="text-sm text-foreground font-mono whitespace-pre-line leading-relaxed">
                    {step.text}
                  </p>

                  {/* Render step table if present */}
                  {step.table && (
                    <div className="overflow-x-auto rounded border border-foreground/30 bg-paper mt-3">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-secondary/40 border-b border-foreground/30">
                          <tr>
                            {step.table.headers.map((h, i) => (
                              <th key={i} className="px-2.5 py-1.5 font-bold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/20">
                          {step.table.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-2.5 py-1.5">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Render visual chart if present */}
                  {step.visual && (
                    <div className="mt-4 overflow-x-auto rounded border-2 border-foreground bg-paper p-4">
                      {step.visual.type === "gantt" && (
                        <div>
                          <p className="font-mono text-xs font-bold uppercase text-muted-foreground mb-2">
                            Gantt Chart Timeline
                          </p>
                          <SchedulingGantt
                            gantt={step.visual.payload.gantt}
                            colors={processPaletteColors}
                            totalTime={
                              step.visual.payload.gantt[step.visual.payload.gantt.length - 1]?.endTime || 20
                            }
                            currentTime={
                              step.visual.payload.gantt[step.visual.payload.gantt.length - 1]?.endTime || 20
                            }
                            started={true}
                            variant="paper"
                          />
                        </div>
                      )}

                      {step.visual.type === "memory" && (
                        <div>
                          <p className="font-mono text-xs font-bold uppercase text-muted-foreground mb-2">
                            Memory Partitions & Allocation
                          </p>
                          <MemoryMap
                            segments={step.visual.payload.segments}
                            initialSegments={step.visual.payload.initialSegments}
                            totalMemory={step.visual.payload.summary.totalMemory}
                            colors={processPaletteColors}
                            mode={problem.rawParams.mode}
                            variant="paper"
                          />
                        </div>
                      )}

                      {step.visual.type === "disk" && (
                        <div>
                          <p className="font-mono text-xs font-bold uppercase text-muted-foreground mb-2">
                            Head Trajectory Chart
                          </p>
                          <DiskHeadChart
                            totalCylinders={step.visual.payload.cylinders}
                            lastCylinder={step.visual.payload.cylinders - 1}
                            startHead={step.visual.payload.head}
                            segments={step.visual.payload.result.segments}
                            activeStep={step.visual.payload.result.segments.length}
                            colors={processPaletteColors}
                            displayNames={Object.fromEntries(
                              problem.rawParams.requests.map((c: number, idx: number) => [`R${idx + 1}`, `R${idx + 1}`]),
                            )}
                            variant="paper"
                          />
                        </div>
                      )}

                      {step.visual.type === "paging" && (
                        <div>
                          <p className="font-mono text-xs font-bold uppercase text-muted-foreground mb-2">
                            Physical Frame History Table
                          </p>
                          <FrameTable
                            result={step.visual.payload.result}
                            currentStepIndex={step.visual.payload.result.steps.length}
                            colors={processPaletteColors}
                            variant="paper"
                          />
                        </div>
                      )}

                      {step.visual.type === "bankers" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <MatrixTable
                            title="Allocation Matrix"
                            resources={problem.statement.rules[0]?.replace("Resource types: ", "").split(", ") || ["A", "B"]}
                            data={step.visual.payload.alloc}
                          />
                          <MatrixTable
                            title="Need Matrix"
                            resources={problem.statement.rules[0]?.replace("Resource types: ", "").split(", ") || ["A", "B"]}
                            data={step.visual.payload.need}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
