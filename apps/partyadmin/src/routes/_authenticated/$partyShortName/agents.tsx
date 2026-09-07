import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$partyShortName/agents")({
  component: AgentsRoute,
});

function AgentsRoute() {
  return <Outlet />;
}
