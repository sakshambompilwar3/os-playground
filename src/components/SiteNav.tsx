import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { OS_TOPICS } from "@/lib/topics";

/** Banker's sub-pages shown in a dropdown. */
const bankerTopic = OS_TOPICS.find((t) => t.slug === "bankers")!;
const bankerPaths = bankerTopic.subLinks!.map((l) => l.to);

export function SiteNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // close on navigation
  useEffect(() => { setOpen(false); }, [path]);

  const isBankerActive = bankerPaths.includes(path);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-foreground bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-auto flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-foreground bg-highlight font-mono text-sm font-bold">B₳</span>
          <span className="font-hand text-2xl font-bold">OS Playground</span>
        </Link>

        <Link
          to="/"
          activeOptions={{ exact: true }}
          className="rounded-md border-2 border-transparent px-3 py-1 text-sm font-medium transition-colors hover:border-foreground"
          activeProps={{ className: "!border-foreground bg-highlight" }}
        >
          Home
        </Link>

        {/* Banker's Algorithm dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className={`rounded-md border-2 px-3 py-1 text-sm font-medium transition-colors hover:border-foreground ${isBankerActive ? "border-foreground bg-highlight" : "border-transparent"}`}
          >
            Banker's ▾
          </button>
          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-40 rounded-md border-2 border-foreground bg-paper p-1 shadow-md">
              {bankerTopic.subLinks!.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`block rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-highlight ${path === l.to ? "bg-highlight" : ""}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Placeholder topic links */}
        {OS_TOPICS.filter((t) => !t.ready).map((t) => (
          <Link
            key={t.slug}
            to={`/${t.slug}`}
            activeOptions={{ exact: true }}
            className="rounded-md border-2 border-transparent px-3 py-1 text-sm font-medium transition-colors hover:border-foreground"
            activeProps={{ className: "!border-foreground bg-highlight" }}
          >
            {t.shortTitle}
          </Link>
        ))}
      </nav>
    </header>
  );
}
