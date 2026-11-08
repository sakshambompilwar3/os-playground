import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function SiteNav() {
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

        <Link
          to="/notes"
          className="rounded-md border-2 border-transparent px-3 py-1 text-sm font-medium transition-colors hover:border-foreground"
          activeProps={{ className: "!border-foreground bg-highlight" }}
        >
          Notes
        </Link>

        <Link
          to="/quiz"
          className="rounded-md border-2 border-transparent px-3 py-1 text-sm font-medium transition-colors hover:border-foreground"
          activeProps={{ className: "!border-foreground bg-highlight" }}
        >
          Quiz
        </Link>

        <Link
          to="/chatbot"
          className="press rounded-md border-2 border-foreground bg-highlight px-3 py-1 text-sm font-bold transition-colors hover:bg-accent"
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI Chatbot
          </span>
        </Link>
      </nav>
    </header>
  );
}
