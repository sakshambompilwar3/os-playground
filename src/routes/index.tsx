import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { OS_TOPICS } from "@/lib/topics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OS Playground | Learn Operating Systems by Playing" },
      {
        name: "description",
        content:
          "Simulators, notes and quizzes for Operating Systems: Banker's Algorithm, CPU Scheduling, Memory Allocation, and Disk Scheduling.",
      },
      { property: "og:title", content: "OS Playground | Learn Operating Systems by Playing" },
      {
        property: "og:description",
        content:
          "Simulators, notes and quizzes for Operating Systems: Banker's Algorithm, CPU Scheduling, Memory Allocation, and Disk Scheduling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function ChalkTagline({ text }: { text: string }) {
  const [len, setLen] = useState(0);

  useEffect(() => {
    setLen(0);
  }, [text]);

  useEffect(() => {
    if (len >= text.length) return;
    const t = setTimeout(() => {
      setLen((l) => l + 1);
    }, 45);
    return () => clearTimeout(t);
  }, [len, text]);

  return (
    <span className="font-hand text-4xl md:text-5xl">
      {text.slice(0, len)}
      <span className="animate-blink">|</span>
    </span>
  );
}

function Home() {
  const [slide, setSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const boardRef = useRef<HTMLElement>(null);

  const total = OS_TOPICS.length;
  const currentTopic = OS_TOPICS[slide]!;

  const nextSlide = useCallback(() => {
    setSlide((s) => (s + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setSlide((s) => (s - 1 + total) % total);
  }, [total]);

  // Auto-advance every ~7s unless paused or reduced-motion is requested
  useEffect(() => {
    if (isPaused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Keyboard navigation when board is focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextSlide();
    }
  };

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const diff = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (diff > 45) {
      prevSlide();
    } else if (diff < -45) {
      nextSlide();
    }
    touchStartX.current = null;
  };

  return (
    <div className="space-y-14">
      {/* chalkboard hero carousel */}
      <section
        ref={boardRef}
        tabIndex={0}
        aria-label="OS Topics Interactive Blackboard"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        className="chalkboard relative overflow-hidden rounded-md px-6 py-14 outline-none focus-visible:ring-2 focus-visible:ring-chalk-foreground/50 md:px-14"
      >
        <div key={currentTopic.slug} className="animate-rise">
          <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">
            {currentTopic.lectureLabel}
          </p>
          <h1 className="mt-4 font-hand text-6xl font-bold leading-none md:text-8xl">
            {currentTopic.title}
          </h1>
          <svg viewBox="0 0 600 30" className="mt-2 h-6 w-80 md:w-[28rem]" aria-hidden>
            <path
              d="M5 20 C 150 5, 300 30, 595 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="draw"
            />
          </svg>
          <div className="mt-8 min-h-14">
            <ChalkTagline text={currentTopic.tagline} />
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to={currentTopic.simulatorLink}
              className="press paper-card bg-highlight px-5 py-3 font-bold text-foreground"
            >
              Start the simulator →
            </Link>
            <Link
              to={currentTopic.notesLink}
              className="press paper-card px-5 py-3 font-bold text-foreground"
            >
              Open the notes
            </Link>
          </div>
        </div>

        {/* chalk controls (arrows + dots) - faint chalk marks styled, top of chalk/eraser */}
        <div className="absolute bottom-3 left-6 flex items-center gap-3 font-hand text-xl text-chalk-foreground/70 sm:bottom-4 sm:left-14">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous topic slide"
            className="rounded px-2 py-0.5 transition-opacity hover:opacity-100 opacity-60 focus-visible:opacity-100"
          >
            ← prev
          </button>
          <div className="flex items-center gap-1.5" aria-label={`Slide ${slide + 1} of ${total}`}>
            {OS_TOPICS.map((t, idx) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setSlide(idx)}
                aria-label={`Go to ${t.title}`}
                className={`h-2.5 rounded-full transition-all ${
                  idx === slide
                    ? "w-5 bg-chalk-foreground/90"
                    : "w-2.5 bg-chalk-foreground/30 hover:bg-chalk-foreground/60"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next topic slide"
            className="rounded px-2 py-0.5 transition-opacity hover:opacity-100 opacity-60 focus-visible:opacity-100"
          >
            next →
          </button>
        </div>

        {/* chalk + eraser */}
        <div className="absolute bottom-3 right-6 flex items-end gap-3 pointer-events-none">
          <span className="block h-3 w-16 rounded-full bg-chalk-foreground/90" />
          <span className="block h-6 w-20 rounded-sm bg-accent" />
        </div>
      </section>

      {/* topic cards (preserved exactly) */}
      <section>
        <h2 className="font-hand text-4xl font-bold">Pick a <span className="marker">topic</span></h2>
        <p className="mt-1 font-hand text-xl text-muted-foreground">Simulators, notes and quizzes for Operating Systems. Pick a topic to start.</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {OS_TOPICS.map((topic, i) => {
            const to = `/${topic.slug}`;
            return (
              <Link
                key={topic.slug}
                to={to}
                className={`animate-float group relative block min-h-44 p-5 shadow-[var(--shadow-paper)] transition-transform hover:scale-105 ${topic.color}`}
                style={{ ["--r" as string]: topic.rotation, animationDelay: `${i * 0.4}s` }}
              >
                <span className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 rotate-2 bg-paper/70" />
                <p className="font-hand text-3xl font-bold">{topic.title}</p>
                <p className="mt-2 text-sm">{topic.description}</p>
                {!topic.ready && (
                  <span className="mt-3 inline-block rounded-full border-2 border-foreground/30 px-2 py-0.5 font-mono text-xs">coming soon</span>
                )}
                <p className="mt-4 font-mono text-xs opacity-0 transition-opacity group-hover:opacity-100">open →</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* notebook */}
      <section className="notebook rounded-md py-8 pl-20 pr-8 leading-8">
        <p className="font-hand text-3xl font-bold text-primary">Class notes — what is an Operating System?</p>
        <p className="font-hand text-2xl">An operating system manages shared hardware resources: <span className="marker">CPU, memory, disk, and devices</span>.</p>
        <p className="font-hand text-2xl">From scheduling processes to avoiding deadlocks and optimizing disk seeks, smart algorithms keep modern computers responsive and fair.</p>
        <p className="font-hand text-2xl text-accent-foreground">→ explore the simulators, compare tradeoffs, and master the concepts ✎</p>
      </section>
    </div>
  );
}
