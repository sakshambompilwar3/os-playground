import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/chatbot")({
  head: () => ({
    meta: [
      { title: "AI Chatbot — OS Playground" },
      { name: "description", content: "Ask the AI chatbot your OS questions." },
      { property: "og:title", content: "AI Chatbot — OS Playground" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chatbot,
});

function Chatbot() {
  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="text-sm text-muted-foreground hover:underline">← back to topics</Link>
        <h1 className="mt-2 font-hand text-6xl font-bold">AI Chatbot</h1>
        <p className="text-muted-foreground">Ask me anything about Operating Systems</p>
      </div>
      <div className="chalkboard rounded-md px-6 py-14 md:px-14">
        <p className="font-hand text-4xl font-bold">Coming soon ✏️</p>
        <p className="mt-4 font-hand text-3xl">
          This section is under construction — check back after the next lecture!
        </p>
      </div>
      <div className="notebook rounded-md py-8 pl-20 pr-8 leading-8">
        <p className="font-hand text-3xl font-bold text-primary">What will the chatbot do?</p>
        <p className="font-hand text-2xl">Answer your questions about deadlock avoidance, CPU scheduling, memory allocation, and disk scheduling — powered by AI.</p>
      </div>
    </div>
  );
}
