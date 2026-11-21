import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/comparison/synchronization")({
  beforeLoad: () => {
    throw redirect({ to: "/labs" });
  },
  component: () => null,
});
