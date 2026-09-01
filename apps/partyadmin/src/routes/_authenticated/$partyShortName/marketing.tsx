import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$partyShortName/marketing")({
  component: MarketingRoute,
});

function MarketingRoute() {
  return <Outlet />;
}
