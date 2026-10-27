import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Home" },
  { to: "/learn", label: "Learn" },
  { to: "/simulator", label: "Simulator" },
  { to: "/request", label: "Requests" },
  { to: "/deadlock", label: "Deadlock Lab" },
  { to: "/quiz", label: "Quiz" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-foreground bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-auto flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-foreground bg-highlight font-mono text-sm font-bold">B₳</span>
          <span className="font-hand text-2xl font-bold">Banker's Playground</span>
        </Link>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: true }}
            className="rounded-md border-2 border-transparent px-3 py-1 text-sm font-medium transition-colors hover:border-foreground"
            activeProps={{ className: "!border-foreground bg-highlight" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
