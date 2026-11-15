import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/deadlock-lab")({
  beforeLoad: () => {
    throw redirect({ to: "/deadlock" });
  },
  component: () => null,
});
