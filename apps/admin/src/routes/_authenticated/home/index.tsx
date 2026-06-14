import { useAppSelector } from "#/redux/hooks";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  return <div className="">Home</div>;
}
