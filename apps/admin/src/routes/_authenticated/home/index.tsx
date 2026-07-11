import { getPageHeader } from "#/lib/shared/meta";
import { useAppSelector } from "#/redux/hooks";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/home/")({
  head: () => getPageHeader({
    title: "Home"
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const user = useAppSelector((state) => state.auth.user);

  return <div className="">Home</div>;
}
