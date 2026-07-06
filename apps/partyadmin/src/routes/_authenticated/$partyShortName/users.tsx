import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$partyShortName/users")({
  component: UsersRoute,
});

function UsersRoute() {
  return <Outlet />;
}
