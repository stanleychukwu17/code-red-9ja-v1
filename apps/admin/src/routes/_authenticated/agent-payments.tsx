import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/agent-payments")({
  component: AgentPaymentsLayout,
});

function AgentPaymentsLayout() {
  return <Outlet />;
}
