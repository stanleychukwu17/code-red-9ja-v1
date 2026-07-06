import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/elections")({
  component: ElectionsRoute,
});

function ElectionsRoute() {
  return <Outlet />;
}
