import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/cpu-scheduling")({
  component: () => <Outlet />,
});
