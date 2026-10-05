import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Election Agents Root Route
 *
 * Serves as the landing entrypoint for the agent directory, immediately redirecting
 * party administrators to the default Polling Unit Agents performance roster (`/agents/polling-agent`).
 */
export const Route = createFileRoute("/_authenticated/$partyShortName/agents/")(
  {
    component: RouteComponent,
  },
);

function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate({
      to: "/$partyShortName/agents/polling-agent",
      params: { partyShortName },
      replace: true,
    });
  }, [partyShortName, navigate]);

  return (
    <div className="py-12 text-center text-c-50 text-[15px]">
      Loading election agents...
    </div>
  );
}
