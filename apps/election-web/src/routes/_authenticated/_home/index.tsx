import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useElectionRealtime } from "@repo/ui/hooks/useElectionRealtime";
import { createFileRoute } from "@tanstack/react-router";
import { GeneralPage } from "./page-components/GeneralPage";
import { LGAElectionSupervisorPage } from "./page-components/LGAElectionSupervisorPage";
import { PollingAgentPage } from "./page-components/PollingAgentPage";
import { StateElectionSupervisorPage } from "./page-components/StateElectionSupervisorPage";
import { WardElectionSupervisorPage } from "./page-components/WardElectionSupervisorPage";
import { getPageHeader } from "#/lib/shared/meta";

/**
 * Route definition for authenticated dashboard home (`/_authenticated/_home/`).
 */
export const Route = createFileRoute("/_authenticated/_home/")({
  head: () => getPageHeader({ title: "Home" }),
  component: RouteComponent,
});

/**
 * Dashboard Home Route Orchestrator.
 *
 * Dynamically renders the appropriate dashboard view based on the user's role:
 * 1. State Supervisor (`StateElectionSupervisorPage`)
 * 2. LGA Supervisor (`LGAElectionSupervisorPage`)
 * 3. Ward Supervisor (`WardElectionSupervisorPage`)
 * 4. Polling Unit Agent (`PollingAgentPage`)
 * 5. General Citizen / Voter (`GeneralPage`)
 *
 * Also initiates real-time WebSocket subscriptions via Pusher for live
 * election results, incident alerts, and agent status broadcasts.
 */
function RouteComponent() {
  const { selectedSupervisorAssignment, selectedAssignment } = useAssignments();
  const { selectedElection } = useElection();

  // Connect real-time WebSocket updates for election supervisor & voter dashboard
  useElectionRealtime({
    electionId: selectedElection?.id,
    stateId:
      selectedSupervisorAssignment?.data?.state_id ??
      selectedAssignment?.state_id,
    lgaId:
      selectedSupervisorAssignment?.data?.lga_id ?? selectedAssignment?.lga_id,
    wardId:
      selectedSupervisorAssignment?.data?.ward_id ??
      selectedAssignment?.ward_id,
    pollingUnitId: selectedAssignment?.polling_unit_id,
    clientConfig: {
      key: import.meta.env.VITE_PUSHER_KEY,
      cluster: import.meta.env.VITE_PUSHER_CLUSTER || "eu",
    },
  });

  let content = <GeneralPage />;

  // Branch 1: Regional Supervisors (State, LGA, or Ward)
  if (selectedSupervisorAssignment) {
    if (selectedSupervisorAssignment.type === "state") {
      content = <StateElectionSupervisorPage />;
    } else if (selectedSupervisorAssignment.type === "lga") {
      content = <LGAElectionSupervisorPage />;
    } else if (selectedSupervisorAssignment.type === "ward") {
      content = <WardElectionSupervisorPage />;
    }
  } else if (selectedAssignment) {
    content = <PollingAgentPage />;
  }

  return content;
}
