import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/bodies")({
  component: BodiesRoute,
});

function BodiesRoute() {
  return <Outlet />;
}
