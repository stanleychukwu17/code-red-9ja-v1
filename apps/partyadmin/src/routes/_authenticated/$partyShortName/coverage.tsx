import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/coverage",
)({
  component: CoverageRoute,
});

function CoverageRoute() {
  return <Outlet />;
}
