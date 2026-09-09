import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useElectionRealtime } from "@repo/ui/hooks/useElectionRealtime";
import { createFileRoute } from "@tanstack/react-router";
import { GeneralPage } from "./page-components/GeneralPage";
import { LGAElectionSupervisorPage } from "./page-components/LGAElectionSupervisorPage";
import { PollingAgentPage } from "./page-components/PollingAgentPage";
import { StateElectionSupervisorPage } from "./page-components/StateElectionSupervisorPage";
import { WardElectionSupervisorPage } from "./page-components/WardElectionSupervisorPage";

/**
 * Route definition for authenticated dashboard home (`/_authenticated/_home/`).
 */
export const Route = createFileRoute("/_authenticated/_home/")({
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
  const { selectedElection } = useElection();
  const { selectedSupervisorAssignment, selectedAssignment } = useAssignments();

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

  // Branch 1: Regional Supervisors (State, LGA, or Ward)
  if (selectedSupervisorAssignment) {
    if (selectedSupervisorAssignment.type === "state") {
      return <StateElectionSupervisorPage />;
    }
    if (selectedSupervisorAssignment.type === "lga") {
      return <LGAElectionSupervisorPage />;
    }
    if (selectedSupervisorAssignment.type === "ward") {
      return <WardElectionSupervisorPage />;
    }
  }

  // Branch 2: Assigned Polling Unit Agent
  if (selectedAssignment) {
    return <PollingAgentPage />;
  }

  // Branch 3: General Citizen / Unassigned Voter
  return <GeneralPage />;
}
