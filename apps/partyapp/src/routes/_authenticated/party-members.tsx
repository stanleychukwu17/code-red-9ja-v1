import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/party-members")({
  component: PartyMembersRoute,
});

function PartyMembersRoute() {
  return <Outlet />;
}
