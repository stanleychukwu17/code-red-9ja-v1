import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/wallet" as never)({
  component: WalletRoute,
});

function WalletRoute() {
  return <Outlet />;
}
