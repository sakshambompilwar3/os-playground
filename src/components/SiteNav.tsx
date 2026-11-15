import { Link } from "@tanstack/react-router";
import { Sparkles, Menu, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

export function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    toggleButtonRef.current?.focus();
  }, []);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeMenu]);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-foreground bg-paper/95 backdrop-blur pt-[env(safe-area-inset-top)]">
      <nav aria-label="Main Navigation" className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
        {/* Brand logo & wordmark */}
        <Link
          to="/"
          onClick={() => setIsOpen(false)}
          className="flex min-h-[44px] items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-foreground bg-highlight font-mono text-sm font-bold shadow-[2px_2px_0_var(--foreground)]">
            OS
          </span>
          <span className="font-hand text-2xl font-bold tracking-tight">OS Playground</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden sm:flex items-center gap-2">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="flex min-h-[44px] items-center rounded-md border-2 border-transparent px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{ className: "!border-foreground bg-highlight font-bold" }}
          >
            Home
          </Link>

          <Link
            to="/notes"
            className="flex min-h-[44px] items-center rounded-md border-2 border-transparent px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{ className: "!border-foreground bg-highlight font-bold" }}
          >
            Notes
          </Link>

          <Link
            to="/quiz"
            className="flex min-h-[44px] items-center rounded-md border-2 border-transparent px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{ className: "!border-foreground bg-highlight font-bold" }}
          >
            Quiz
          </Link>

          <Link
            to="/chatbot"
            className="press flex min-h-[44px] items-center rounded-md border-2 border-foreground bg-highlight px-3.5 py-1.5 text-sm font-bold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-[2px_2px_0_var(--foreground)]"
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI Chatbot
            </span>
          </Link>
        </div>

        {/* Mobile controls: AI Chatbot always visible + Hamburger toggle */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            to="/chatbot"
            onClick={() => setIsOpen(false)}
            aria-label="Open AI Chatbot"
            className="press flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border-2 border-foreground bg-highlight px-2.5 py-1.5 text-xs font-bold transition-colors shadow-[2px_2px_0_var(--foreground)]"
          >
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>AI Chat</span>
            </span>
          </Link>

          <button
            ref={toggleButtonRef}
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls="mobile-nav-menu"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            className="press flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border-2 border-foreground bg-paper p-2 text-foreground transition-colors hover:bg-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-[2px_2px_0_var(--foreground)]"
          >
            {isOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {isOpen && (
        <div
          id="mobile-nav-menu"
          role="region"
          aria-label="Mobile Navigation Menu"
          className="sm:hidden border-t-2 border-foreground bg-paper px-4 py-4 shadow-lg animate-rise"
        >
          <div className="flex flex-col gap-2">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              onClick={closeMenu}
              className="flex min-h-[44px] items-center rounded-md border-2 border-transparent px-4 py-2 font-hand text-2xl font-bold transition-colors hover:border-foreground hover:bg-highlight"
              activeProps={{ className: "!border-foreground bg-highlight font-bold" }}
            >
              Home
            </Link>

            <Link
              to="/notes"
              onClick={closeMenu}
              className="flex min-h-[44px] items-center rounded-md border-2 border-transparent px-4 py-2 font-hand text-2xl font-bold transition-colors hover:border-foreground hover:bg-highlight"
              activeProps={{ className: "!border-foreground bg-highlight font-bold" }}
            >
              Notes
            </Link>

            <Link
              to="/quiz"
              onClick={closeMenu}
              className="flex min-h-[44px] items-center rounded-md border-2 border-transparent px-4 py-2 font-hand text-2xl font-bold transition-colors hover:border-foreground hover:bg-highlight"
              activeProps={{ className: "!border-foreground bg-highlight font-bold" }}
            >
              Quiz
            </Link>

            <Link
              to="/chatbot"
              onClick={closeMenu}
              className="flex min-h-[44px] items-center gap-2 rounded-md border-2 border-foreground bg-highlight px-4 py-2 font-hand text-2xl font-bold transition-colors"
            >
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              AI Chatbot
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
