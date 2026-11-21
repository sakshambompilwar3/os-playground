import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/synchronization/comparison")({
  beforeLoad: () => {
    throw redirect({ to: "/labs" });
  },
  component: () => null,
});
