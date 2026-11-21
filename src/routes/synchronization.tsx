import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/synchronization")({
  component: () => <Outlet />,
});
