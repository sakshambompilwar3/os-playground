import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/synchronization/producer-consumer")({
  beforeLoad: () => {
    throw redirect({ to: "/labs" });
  },
  component: () => null,
});
