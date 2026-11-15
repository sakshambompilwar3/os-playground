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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="paper-card max-w-md p-8 text-center">
        <h1 className="font-mono text-6xl font-bold">404</h1>
        <p className="mt-2 font-hand text-2xl">Segmentation fault: page not found</p>
        <Link to="/" className="press paper-card mt-6 inline-block bg-highlight px-4 py-2 font-medium">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="paper-card max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again or head home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="press paper-card bg-highlight px-4 py-2 text-sm">Try again</button>
          <a href="/" className="press paper-card px-4 py-2 text-sm">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <QueryClientProvider client={queryClient}>
      <SiteNav />
      <PageTransition />
      <main key={path} className="page-enter mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
      <footer className="pb-8 text-center font-hand text-xl text-muted-foreground">
        OS Playground, built for Operating Systems students ✏️ ·{" "}
        <Link to="/notes" className="underline hover:text-foreground">Notes</Link> ·{" "}
        <Link to="/quiz" className="underline hover:text-foreground">Quiz</Link>
      </footer>
    </QueryClientProvider>
  );
}
