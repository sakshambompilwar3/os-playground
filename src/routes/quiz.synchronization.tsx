import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/quiz/synchronization")({
  beforeLoad: () => {
    throw redirect({ to: "/labs" });
  },
  component: () => null,
});
