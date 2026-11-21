import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/synchronization/dining-philosophers")({
  beforeLoad: () => {
    throw redirect({ to: "/labs" });
  },
  component: () => null,
});
