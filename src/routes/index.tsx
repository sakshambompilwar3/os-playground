import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { OS_TOPICS } from "@/lib/topics";
import { OS_LABS } from "@/lib/labs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OS Playground | Learn Operating Systems by Playing" },
      {
        name: "description",
        content:
          "Simulators, notes and quizzes for Operating Systems: Banker's Algorithm, CPU Scheduling, Memory Allocation, Disk Scheduling, and Page Replacement.",
      },
      { property: "og:title", content: "OS Playground | Learn Operating Systems by Playing" },
      {
        property: "og:description",
        content:
          "Simulators, notes and quizzes for Operating Systems: Banker's Algorithm, CPU Scheduling, Memory Allocation, Disk Scheduling, and Page Replacement.",
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
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-chalk-muted font-bold">
            {currentTopic.lectureLabel}
          </p>
          <h1 className="mt-4 font-hand text-5xl sm:text-7xl md:text-8xl font-bold leading-none break-words">
            {currentTopic.title}
          </h1>
          <svg viewBox="0 0 600 30" className="mt-2 h-6 w-full max-w-sm sm:max-w-md md:w-[28rem]" aria-hidden="true">
            <path
              d="M5 20 C 150 5, 300 30, 595 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="draw"
            />
          </svg>
          <div className="mt-6 sm:mt-8 min-h-14">
            <ChalkTagline text={currentTopic.tagline} />
          </div>
          <div className="mt-8 sm:mt-10 flex flex-wrap gap-3">
            <Link
              to={currentTopic.simulatorLink}
              className="press paper-card flex min-h-[44px] items-center justify-center bg-highlight px-5 py-3 font-bold text-foreground"
            >
              Start the simulator →
            </Link>
            <Link
              to={currentTopic.notesLink}
              className="press paper-card flex min-h-[44px] items-center justify-center px-5 py-3 font-bold text-foreground"
            >
              Open the notes
            </Link>
          </div>
        </div>

        {/* chalk controls (arrows + dots) */}
        <div className="absolute bottom-3 left-4 sm:left-14 flex items-center gap-2 sm:gap-3 font-hand text-xl text-chalk-muted sm:bottom-4">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous topic slide"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 py-1 text-chalk-muted hover:text-chalk-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk-foreground"
          >
            ← prev
          </button>
          <div className="flex items-center gap-1" aria-label={`Slide ${slide + 1} of ${total}`}>
            {OS_TOPICS.map((t, idx) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setSlide(idx)}
                aria-label={`Go to ${t.title}`}
                className="flex min-h-[44px] min-w-[28px] items-center justify-center p-1 focus-visible:outline-none"
              >
                <span
                  className={`block h-2.5 rounded-full transition-all ${
                    idx === slide
                      ? "w-5 bg-chalk-foreground"
                      : "w-2.5 bg-chalk-muted hover:bg-chalk-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next topic slide"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 py-1 text-chalk-muted hover:text-chalk-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk-foreground"
          >
            next →
          </button>
        </div>

        {/* chalk + eraser */}
        <div className="absolute bottom-3 right-6 flex items-end gap-3 pointer-events-none">
          <span className="block h-3 w-16 rounded-full bg-chalk-foreground" />
          <span className="block h-6 w-20 rounded-sm bg-accent" />
        </div>
      </section>

      {/* topic cards (preserved exactly) */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-hand text-4xl font-bold">Pick a <span className="marker">topic</span></h2>
            <p className="mt-1 font-hand text-xl text-muted-foreground">
              Simulators, notes and quizzes for Operating Systems. Or jump into{" "}
              <Link to="/practice" className="font-bold underline decoration-2 hover:text-foreground">
                Practice Mode →
              </Link>
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                <p className="mt-4 font-mono text-xs font-bold text-foreground">open →</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* labs cards */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-hand text-4xl font-bold">Labs</h2>
            <p className="mt-1 font-hand text-xl text-muted-foreground">Hands-on experiments you can play with</p>
          </div>
          <Link to="/labs" className="font-hand text-xl text-primary hover:underline">
            See all labs →
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {OS_LABS.map((lab, i) => (
            <Link
              key={lab.slug}
              to={lab.to}
              className={`animate-float group relative block min-h-44 p-5 shadow-[var(--shadow-paper)] transition-transform hover:scale-105 ${lab.color ?? "bg-highlight"}`}
              style={{ ["--r" as string]: lab.rotation ?? "0deg", animationDelay: `${i * 0.4}s` }}
            >
              <span className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 rotate-2 bg-paper/70" />
              <p className="font-hand text-3xl font-bold">{lab.title}</p>
              <p className="mt-2 text-sm">{lab.description}</p>
              <p className="mt-4 font-mono text-xs font-bold text-foreground">open lab →</p>
            </Link>
          ))}
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
