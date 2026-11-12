import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/memory-allocation")({
  component: () => <Outlet />,
});
