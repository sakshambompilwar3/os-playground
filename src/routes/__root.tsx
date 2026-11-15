import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SiteNav } from "@/components/SiteNav";
import { PageTransition } from "@/components/PageTransition";
import {
  getAbsoluteUrl,
  SITE_DEFAULT_TITLE,
  SITE_DEFAULT_DESCRIPTION,
  SITE_NAME,
} from "../lib/site";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4 py-12">
      <div className="chalkboard relative max-w-lg rounded-md px-8 py-12 text-center shadow-lg md:px-14">
        <span className="font-mono text-xs uppercase tracking-widest text-chalk-foreground/70">
          Error 404 · Unmapped Address
        </span>
        <h1 className="mt-2 font-hand text-7xl font-bold md:text-8xl">404</h1>
        <p className="mt-3 font-hand text-3xl">Segmentation fault: page not found</p>
        <p className="mt-2 text-sm text-chalk-foreground/80">
          The requested page or resource could not be found in memory.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="press paper-card inline-flex min-h-[44px] items-center justify-center bg-highlight px-6 py-3 font-bold text-foreground"
          >
            ← Return to Campus Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error("Route runtime error:", error);
  const router = useRouter();
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4 py-12">
      <div className="chalkboard max-w-lg rounded-md px-8 py-10 text-center shadow-lg md:px-12">
        <span className="font-mono text-xs uppercase tracking-widest text-chalk-foreground/70">
          Kernel Panic · Handled Exception
        </span>
        <h1 className="mt-2 font-hand text-5xl font-bold md:text-6xl">This page didn't load</h1>
        <p className="mt-3 text-sm text-chalk-foreground/80">
          Something went wrong while running this component. Reload the page or head back home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="press paper-card min-h-[44px] min-w-[44px] bg-highlight px-5 py-2.5 text-sm font-bold text-foreground"
          >
            Try again
          </button>
          <Link
            to="/"
            className="press paper-card min-h-[44px] min-w-[44px] px-5 py-2.5 text-sm font-bold text-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function PendingComponent() {
  return (
    <div
      className="flex min-h-[40dvh] items-center justify-center px-4 py-12"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="paper-card px-8 py-6 text-center">
        <p className="font-hand text-3xl font-bold animate-pulse">
          Loading chalk notes &amp; simulator…
        </p>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#224c37" },
      { title: SITE_DEFAULT_TITLE },
      { name: "description", content: SITE_DEFAULT_DESCRIPTION },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: "website" },
      { property: "og:title", content: SITE_DEFAULT_TITLE },
      { property: "og:description", content: SITE_DEFAULT_DESCRIPTION },
      { property: "og:image", content: getAbsoluteUrl("/og-image.png") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_DEFAULT_TITLE },
      { name: "twitter:description", content: SITE_DEFAULT_DESCRIPTION },
      { name: "twitter:image", content: getAbsoluteUrl("/og-image.png") },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-highlight selection:text-foreground">
        <noscript>
          <div
            style={{
              padding: "1rem 1.5rem",
              background: "#224c37",
              color: "#f1efe0",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <strong>JavaScript Required:</strong> OS Playground requires JavaScript to run the
            interactive simulators and calculation traces.
          </div>
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-highlight focus:text-foreground focus:border-2 focus:border-foreground focus:rounded-md focus:font-bold focus:shadow-[var(--shadow-pop)]"
      >
        Skip to content
      </a>
      <SiteNav />
      <PageTransition />
      <main
        id="main-content"
        tabIndex={-1}
        key={path}
        className="page-enter mx-auto max-w-6xl px-4 py-8 sm:py-10 outline-none"
      >
        <Outlet />
      </main>
      <footer className="pb-8 text-center font-hand text-xl text-muted-foreground">
        OS Playground, built for Operating Systems students ✏️ ·{" "}
        <Link to="/notes" className="underline hover:text-foreground">
          Notes
        </Link>{" "}
        ·{" "}
        <Link to="/quiz" className="underline hover:text-foreground">
          Quiz
        </Link>
      </footer>
    </QueryClientProvider>
  );
}
