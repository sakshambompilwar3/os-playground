import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/disk-scheduling")({
  component: () => <Outlet />,
});
