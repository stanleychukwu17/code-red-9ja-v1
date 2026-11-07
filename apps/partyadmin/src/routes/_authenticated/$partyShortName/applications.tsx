import { createFileRoute, Outlet } from "@tanstack/react-router";
import { validateApplicationsSearch } from "./applications/-data";

export const Route = createFileRoute("/_authenticated/$partyShortName/applications")({
  validateSearch: validateApplicationsSearch,
  component: ApplicationsRoute,
});

function ApplicationsRoute() {
  return <Outlet />;
}
