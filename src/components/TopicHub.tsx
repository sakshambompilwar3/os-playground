import { Link } from "@tanstack/react-router";
import type { HubEntry } from "@/lib/topics";

export type { HubEntry };

export interface TopicHubProps {
  title: string;
  lectureLabel?: string | undefined;
  unitLabel?: string | undefined;
  quote?: string | undefined;
  entries: HubEntry[];
}

export function TopicHub({ title, lectureLabel, unitLabel, quote, entries }: TopicHubProps) {
  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground hover:underline">
          ← back to topics
        </Link>
        <h1 className="mt-1 font-hand text-5xl md:text-6xl font-bold">{title}</h1>
        <p className="text-muted-foreground">
          {lectureLabel ?? "CS-301 · Operating Systems · Table of Contents"}
        </p>
      </div>

      {/* Notebook contents page */}
      <section className="notebook relative rounded-md py-10 pl-16 pr-6 sm:pl-24 sm:pr-12 md:pl-28 md:pr-16">
        {/* Binder holes on the left */}
        <div aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 space-y-16 sm:left-6">
          <div className="h-4 w-4 rounded-full border-2 border-foreground/30 bg-background shadow-inner" />
          <div className="h-4 w-4 rounded-full border-2 border-foreground/30 bg-background shadow-inner" />
          <div className="h-4 w-4 rounded-full border-2 border-foreground/30 bg-background shadow-inner" />
        </div>

        <div className="border-b-2 border-foreground/20 pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-hand text-4xl font-bold tracking-wide text-primary sm:text-5xl">
              Table of Contents
            </h2>
            {unitLabel && (
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {unitLabel}
              </span>
            )}
          </div>
          <p className="mt-1 font-hand text-xl text-muted-foreground">
            Select a chapter to jump to that activity:
          </p>
        </div>

        <ol className="mt-6 divide-y divide-rule/50">
          {entries.map((entry) => (
            <li key={entry.to} className="py-2.5">
              <Link
                to={entry.to}
                className="group flex flex-col justify-between gap-1 rounded-sm px-2 py-3 transition-colors sm:flex-row sm:items-baseline sm:gap-4 sm:py-2 hover:bg-highlight/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-baseline gap-3">
                  <span className="w-7 font-mono text-base font-bold text-accent-foreground sm:text-lg">
                    {entry.num}
                  </span>
                  <span className="font-hand text-3xl font-bold text-foreground transition-all duration-150 group-hover:text-primary group-hover:underline decoration-wavy decoration-accent decoration-2 underline-offset-4 group-focus-visible:underline">
                    {entry.title}
                  </span>
                  {entry.comingSoon && (
                    <span className="rounded-full border border-foreground/30 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      coming soon
                    </span>
                  )}
                </div>

                {/* Dotted leader line on larger screens */}
                <span
                  aria-hidden
                  className="hidden flex-1 border-b border-dotted border-foreground/40 sm:block mx-2 self-end mb-1"
                />

                <div className="flex items-center justify-between gap-3 pl-10 sm:pl-0 sm:justify-end">
                  <span className="font-sans text-xs text-muted-foreground sm:text-sm">
                    {entry.desc}
                  </span>
                  <span
                    aria-hidden
                    className="font-hand text-2xl font-bold text-foreground transition-transform duration-150 group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5"
                  >
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>

        {quote && (
          <div className="mt-8 border-t border-foreground/20 pt-4 text-right">
            <span className="font-hand text-xl text-muted-foreground">
              {quote}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
